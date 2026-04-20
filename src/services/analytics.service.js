const { pool } = require("../config/db");

const MIN_DAYS = 30;
const MAX_DAYS = 90;

const roundPercentage = (value) => Math.round(value);

const formatNumber = (value) => Number(value.toFixed(1));

const parseDays = (days) => {
  if (days === undefined) {
    return MAX_DAYS;
  }

  const parsedDays = Number(days);

  if (!Number.isInteger(parsedDays) || parsedDays < MIN_DAYS || parsedDays > MAX_DAYS) {
    const error = new Error("days must be an integer between 30 and 90.");
    error.statusCode = 400;
    throw error;
  }

  return parsedDays;
};

const classifyFoodType = (foodType) => {
  const normalized = String(foodType || "").trim().toLowerCase();

  if (
    normalized.includes("home") ||
    normalized.includes("homemade") ||
    normalized.includes("house")
  ) {
    return "home";
  }

  if (
    normalized.includes("outside") ||
    normalized.includes("restaurant") ||
    normalized.includes("takeaway") ||
    normalized.includes("fast food") ||
    normalized.includes("dine out") ||
    normalized.includes("delivery")
  ) {
    return "outside";
  }

  return null;
};

const fetchLogsForAnalysis = async (userId, days) => {
  const result = await pool.query(
    `SELECT
        hl.id,
        hl.log_date,
        hl.mood,
        hl.sleep_hours,
        hl.food_type,
        hl.exercised,
        COALESCE(
          ARRAY_AGG(s.name ORDER BY s.name) FILTER (WHERE s.name IS NOT NULL),
          ARRAY[]::VARCHAR[]
        ) AS symptoms
      FROM health_logs hl
      LEFT JOIN log_symptoms ls ON ls.log_id = hl.id
      LEFT JOIN symptoms s ON s.id = ls.symptom_id
      WHERE hl.user_id = $1
        AND hl.log_date >= CURRENT_DATE - (($2::int) - 1)
      GROUP BY hl.id
      ORDER BY hl.log_date DESC`,
    [userId, days]
  );

  return result.rows.map((log) => ({
    id: log.id,
    log_date: log.log_date,
    mood: Number(log.mood),
    sleep_hours: Number(log.sleep_hours),
    food_type: log.food_type,
    exercised: log.exercised,
    symptoms: log.symptoms,
  }));
};

const formatRisk = (casesWithCondition, totalConditionCases) => {
  if (totalConditionCases === 0) {
    return "0%";
  }

  return `${roundPercentage((casesWithCondition / totalConditionCases) * 100)}%`;
};

const hasSymptom = (log, symptomName) =>
  log.symptoms.some((symptom) => String(symptom).toLowerCase() === symptomName);

const buildSleepPatterns = (logs) => {
  const lowSleepLogs = logs.filter((log) => log.sleep_hours < 6);
  const adequateSleepLogs = logs.filter((log) => log.sleep_hours >= 6);

  if (lowSleepLogs.length === 0 || adequateSleepLogs.length === 0) {
    return [];
  }

  const symptomStats = new Map();

  const trackSymptoms = (groupLogs, key) => {
    groupLogs.forEach((log) => {
      const dailySymptoms = new Set(log.symptoms);
      dailySymptoms.forEach((symptom) => {
        if (!symptomStats.has(symptom)) {
          symptomStats.set(symptom, {
            low: 0,
            adequate: 0,
          });
        }

        symptomStats.get(symptom)[key] += 1;
      });
    });
  };

  trackSymptoms(lowSleepLogs, "low");
  trackSymptoms(adequateSleepLogs, "adequate");

  const ranked = [...symptomStats.entries()]
    .map(([symptom, counts]) => {
      const lowPercentage = (counts.low / lowSleepLogs.length) * 100;
      const adequatePercentage = (counts.adequate / adequateSleepLogs.length) * 100;

      return {
        symptom,
        lowFrequency: counts.low,
        lowPercentage,
        adequatePercentage,
        difference: lowPercentage - adequatePercentage,
      };
    })
    .filter((item) => item.lowFrequency > 0)
    .sort((a, b) => b.difference - a.difference);

  const strongest = ranked[0];

  if (!strongest || strongest.difference <= 0) {
    return [];
  }

  return [
    `${strongest.symptom.charAt(0).toUpperCase() + strongest.symptom.slice(1)} occurs ${roundPercentage(
      strongest.lowPercentage
    )}% of days with less than 6 hours sleep (${strongest.lowFrequency}/${lowSleepLogs.length} days).`,
  ];
};

const buildFoodPatterns = (logs) => {
  const homeLogs = logs.filter((log) => classifyFoodType(log.food_type) === "home");
  const outsideLogs = logs.filter((log) => classifyFoodType(log.food_type) === "outside");

  if (homeLogs.length === 0 || outsideLogs.length === 0) {
    return [];
  }

  const symptomStats = new Map();

  const trackSymptoms = (groupLogs, key) => {
    groupLogs.forEach((log) => {
      const dailySymptoms = new Set(log.symptoms);
      dailySymptoms.forEach((symptom) => {
        if (!symptomStats.has(symptom)) {
          symptomStats.set(symptom, {
            home: 0,
            outside: 0,
          });
        }

        symptomStats.get(symptom)[key] += 1;
      });
    });
  };

  trackSymptoms(homeLogs, "home");
  trackSymptoms(outsideLogs, "outside");

  const ranked = [...symptomStats.entries()]
    .map(([symptom, counts]) => {
      const outsidePercentage = (counts.outside / outsideLogs.length) * 100;
      const homePercentage = (counts.home / homeLogs.length) * 100;

      return {
        symptom,
        outsideFrequency: counts.outside,
        outsidePercentage,
        homePercentage,
        difference: outsidePercentage - homePercentage,
      };
    })
    .filter((item) => item.outsideFrequency > 0)
    .sort((a, b) => b.difference - a.difference);

  const strongest = ranked[0];

  if (!strongest || strongest.difference <= 0) {
    return [];
  }

  return [
    `${strongest.symptom.charAt(0).toUpperCase() + strongest.symptom.slice(1)} appears on ${roundPercentage(
      strongest.outsidePercentage
    )}% of outside-food days (${strongest.outsideFrequency}/${outsideLogs.length} days).`,
  ];
};

const buildExercisePatterns = (logs) => {
  const exercisedLogs = logs.filter((log) => log.exercised);
  const nonExercisedLogs = logs.filter((log) => !log.exercised);

  if (exercisedLogs.length === 0 || nonExercisedLogs.length === 0) {
    return [];
  }

  const averageMood = (entries) =>
    entries.reduce((sum, log) => sum + log.mood, 0) / entries.length;

  const exerciseMood = averageMood(exercisedLogs);
  const nonExerciseMood = averageMood(nonExercisedLogs);

  if (exerciseMood === nonExerciseMood) {
    return [];
  }

  const higherGroup = exerciseMood > nonExerciseMood ? "exercise" : "no exercise";
  const lowerAverage = Math.max(nonExerciseMood, 0.1);
  const percentageDifference =
    (Math.abs(exerciseMood - nonExerciseMood) / lowerAverage) * 100;

  return [
    `Mood is higher on days with ${higherGroup === "exercise" ? "exercise" : "no exercise"} by ${roundPercentage(
      percentageDifference
    )}% on average (${formatNumber(exerciseMood)} vs ${formatNumber(nonExerciseMood)}).`,
  ];
};

const buildFallbackPattern = (logs, days) => {
  if (logs.length === 0) {
    return [`No health logs found in the last ${days} days.`];
  }

  return [`Not enough contrasting data in the last ${days} days to identify strong patterns yet.`];
};

const detectPatterns = async ({ userId, days }) => {
  const analysisDays = parseDays(days);
  const logs = await fetchLogsForAnalysis(userId, analysisDays);

  const patterns = [
    ...buildSleepPatterns(logs),
    ...buildFoodPatterns(logs),
    ...buildExercisePatterns(logs),
  ];

  return {
    patterns: patterns.length > 0 ? patterns : buildFallbackPattern(logs, analysisDays),
  };
};

const calculatePredictions = async ({ userId, days }) => {
  const analysisDays = parseDays(days);
  const logs = await fetchLogsForAnalysis(userId, analysisDays);

  const lowSleepLogs = logs.filter((log) => log.sleep_hours < 6);
  const outsideFoodLogs = logs.filter((log) => classifyFoodType(log.food_type) === "outside");
  const nonExerciseLogs = logs.filter((log) => log.exercised === false);

  const headacheCases = lowSleepLogs.filter((log) => hasSymptom(log, "headache")).length;
  const allergyCases = outsideFoodLogs.filter((log) => hasSymptom(log, "allergy")).length;
  const fatigueCases = nonExerciseLogs.filter((log) => hasSymptom(log, "fatigue")).length;

  return {
    predictions: [
      {
        type: "headache",
        risk: formatRisk(headacheCases, lowSleepLogs.length),
      },
      {
        type: "allergy",
        risk: formatRisk(allergyCases, outsideFoodLogs.length),
      },
      {
        type: "fatigue",
        risk: formatRisk(fatigueCases, nonExerciseLogs.length),
      },
    ],
  };
};

module.exports = {
  detectPatterns,
  calculatePredictions,
};
