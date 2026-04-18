const Groq = require("groq-sdk");
const { pool } = require("../config/db");

const DEFAULT_ANALYSIS_DAYS = 90;
const WEEKLY_SUMMARY_DAYS = 7;
const PRIMARY_MODEL_NAME = "llama3-8b-8192";
const FALLBACK_MODEL_NAME = "llama-3.1-8b-instant";

const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  maxRetries: 1,
  timeout: 20000,
});

const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const validateQuestion = (question) => {
  const normalizedQuestion = cleanText(question);

  if (!normalizedQuestion) {
    const error = new Error("question is required.");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedQuestion.length > 1000) {
    const error = new Error("question must be 1000 characters or less.");
    error.statusCode = 400;
    throw error;
  }

  return normalizedQuestion;
};

const fetchLogsForSummary = async (userId, days = DEFAULT_ANALYSIS_DAYS) => {
  const result = await pool.query(
    `SELECT
        hl.log_date,
        hl.mood,
        hl.sleep_hours,
        hl.food_type,
        hl.exercised,
        hl.outdoor_exposure,
        hl.notes,
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
    log_date: log.log_date,
    mood: Number(log.mood),
    sleep_hours: Number(log.sleep_hours),
    food_type: cleanText(log.food_type),
    exercised: log.exercised,
    outdoor_exposure: log.outdoor_exposure,
    notes: cleanText(log.notes),
    symptoms: log.symptoms,
  }));
};

const average = (values) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const percent = (count, total) => (total === 0 ? 0 : Math.round((count / total) * 100));

const topItems = (itemsMap, limit = 5) =>
  [...itemsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

const summarizeLogs = (logs) => {
  if (logs.length === 0) {
    return [
      "No health logs are available for this user in the last 90 days.",
      "There is not enough health data to answer trend-based questions yet.",
    ].join("\n");
  }

  const moodValues = logs.map((log) => log.mood);
  const sleepValues = logs.map((log) => log.sleep_hours);
  const exercisedCount = logs.filter((log) => log.exercised).length;
  const outdoorCount = logs.filter((log) => log.outdoor_exposure).length;
  const lowSleepCount = logs.filter((log) => log.sleep_hours < 6).length;
  const symptomCounts = new Map();
  const foodCounts = new Map();
  const noteThemes = [];

  logs.forEach((log) => {
    const normalizedFood = log.food_type.toLowerCase();
    foodCounts.set(normalizedFood, (foodCounts.get(normalizedFood) || 0) + 1);

    [...new Set(log.symptoms)].forEach((symptom) => {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1);
    });

    if (log.notes) {
      noteThemes.push(log.notes.slice(0, 120));
    }
  });

  const exerciseMood = average(logs.filter((log) => log.exercised).map((log) => log.mood));
  const restMood = average(logs.filter((log) => !log.exercised).map((log) => log.mood));
  const lowSleepSymptomDays = logs.filter(
    (log) => log.sleep_hours < 6 && log.symptoms.length > 0
  ).length;
  const symptomFreeDays = logs.filter((log) => log.symptoms.length === 0).length;
  const mostCommonSymptoms = topItems(symptomCounts)
    .map((item) => `${item.name} (${item.count} days, ${percent(item.count, logs.length)}%)`)
    .join(", ");
  const mostCommonFoodTypes = topItems(foodCounts, 4)
    .map((item) => `${item.name} (${item.count} days)`)
    .join(", ");

  return [
    `Health summary window: last ${DEFAULT_ANALYSIS_DAYS} calendar days, ${logs.length} total logs.`,
    `Average mood: ${average(moodValues).toFixed(1)} out of 5.`,
    `Average sleep: ${average(sleepValues).toFixed(1)} hours.`,
    `Exercise on ${exercisedCount}/${logs.length} days (${percent(exercisedCount, logs.length)}%).`,
    `Outdoor exposure on ${outdoorCount}/${logs.length} days (${percent(outdoorCount, logs.length)}%).`,
    `Sleep below 6 hours on ${lowSleepCount}/${logs.length} days (${percent(lowSleepCount, logs.length)}%).`,
    `Days with at least one symptom: ${logs.length - symptomFreeDays}/${logs.length}.`,
    `Low-sleep days with symptoms: ${lowSleepSymptomDays}/${lowSleepCount || 1}.`,
    `Most common symptoms: ${mostCommonSymptoms || "none reported"}.`,
    `Most common food types: ${mostCommonFoodTypes || "none reported"}.`,
    `Average mood on exercise days: ${exerciseMood.toFixed(1)}. Average mood on non-exercise days: ${restMood.toFixed(1)}.`,
    `Recent note snippets: ${noteThemes.slice(0, 5).join(" | ") || "No notes recorded."}`,
  ].join("\n");
};

const summarizeWeeklyLogs = (logs) => {
  if (logs.length === 0) {
    return [
      "Weekly summary window: last 7 calendar days.",
      "No health logs were recorded this week.",
      "There is not enough data to generate a weekly health summary yet.",
    ].join("\n");
  }

  const moodValues = logs.map((log) => log.mood);
  const sleepValues = logs.map((log) => log.sleep_hours);
  const exercisedCount = logs.filter((log) => log.exercised).length;
  const symptomCounts = new Map();

  logs.forEach((log) => {
    [...new Set(log.symptoms)].forEach((symptom) => {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1);
    });
  });

  const mostCommonSymptoms = topItems(symptomCounts, 3)
    .map((item) => `${item.name} (${item.count} days)`)
    .join(", ");

  return [
    "Weekly summary window: last 7 calendar days.",
    `Logs recorded this week: ${logs.length}.`,
    `Average mood: ${average(moodValues).toFixed(1)} out of 5.`,
    `Average sleep: ${average(sleepValues).toFixed(1)} hours.`,
    `Exercise frequency: ${exercisedCount}/${logs.length} days (${percent(exercisedCount, logs.length)}%).`,
    `Most common symptoms: ${mostCommonSymptoms || "none reported"}.`,
  ].join("\n");
};

const buildMessages = ({ summary, question }) => [
  {
    role: "system",
    content:
      "You are a supportive AI health analytics assistant. Use only the provided health summary. Do not claim to have medical certainty. Give concise, practical, non-diagnostic guidance in plain language. If the data is limited, say so clearly.",
  },
  {
    role: "user",
    content: `User health data summary:\n${summary}\n\nUser question:\n${question}\n\nAnswer in 3 short paragraphs or fewer. Avoid bullet points unless necessary.`,
  },
];

const buildWeeklySummaryMessages = (summary) => [
  {
    role: "system",
    content:
      "You are a supportive AI health analytics assistant. Use only the provided weekly health summary. Do not diagnose. Write one short paragraph in plain language with a clear weekly takeaway, mentioning sleep, mood, symptoms, and exercise when data exists.",
  },
  {
    role: "user",
    content: `Weekly health summary:\n${summary}\n\nWrite a concise weekly summary for the user. Keep it to 2 sentences maximum.`,
  },
];

const isDecommissionedModelError = (error) =>
  error &&
  typeof error.message === "string" &&
  error.message.toLowerCase().includes("decommissioned");

const createCompletion = async ({ summary, question }) => {
  const messages = buildMessages({ summary, question });
  return createCompletionFromMessages(messages);
};

const createCompletionFromMessages = async (messages) => {

  try {
    const completion = await groqClient.chat.completions.create({
      model: PRIMARY_MODEL_NAME,
      messages,
      temperature: 0.4,
      max_tokens: 400,
    });

    return {
      completion,
      model: PRIMARY_MODEL_NAME,
    };
  } catch (error) {
    if (!isDecommissionedModelError(error)) {
      throw error;
    }

    const completion = await groqClient.chat.completions.create({
      model: FALLBACK_MODEL_NAME,
      messages,
      temperature: 0.4,
      max_tokens: 400,
    });

    return {
      completion,
      model: FALLBACK_MODEL_NAME,
    };
  }
};

const answerUserQuestion = async ({ userId, question }) => {
  const normalizedQuestion = validateQuestion(question);

  if (!process.env.GROQ_API_KEY) {
    const error = new Error("GROQ_API_KEY is not configured in .env.");
    error.statusCode = 500;
    throw error;
  }

  const logs = await fetchLogsForSummary(userId);
  const summary = summarizeLogs(logs);

  try {
    const { completion, model } = await createCompletion({
      summary,
      question: normalizedQuestion,
    });
    const answer = cleanText(completion.choices?.[0]?.message?.content);

    if (!answer) {
      const error = new Error("Groq returned an empty response.");
      error.statusCode = 502;
      throw error;
    }

    return {
      response: answer,
      model,
    };
  } catch (error) {
    if (error && typeof error.status === "number") {
      const mappedStatus =
        error.status >= 400 && error.status < 500 ? error.status : 502;
      const wrappedError = new Error("Failed to get a response from Groq.");
      wrappedError.statusCode = mappedStatus;
      throw wrappedError;
    }

    if (!error.statusCode) {
      error.statusCode = 502;
      error.message = "Failed to get a response from Groq.";
    }

    throw error;
  }
};

const generateWeeklySummary = async ({ userId }) => {
  if (!process.env.GROQ_API_KEY) {
    const error = new Error("GROQ_API_KEY is not configured in .env.");
    error.statusCode = 500;
    throw error;
  }

  const logs = await fetchLogsForSummary(userId, WEEKLY_SUMMARY_DAYS);
  const weeklySummary = summarizeWeeklyLogs(logs);

  try {
    const { completion, model } = await createCompletionFromMessages(
      buildWeeklySummaryMessages(weeklySummary)
    );
    const response = cleanText(completion.choices?.[0]?.message?.content);

    if (!response) {
      const error = new Error("Groq returned an empty response.");
      error.statusCode = 502;
      throw error;
    }

    return {
      response,
      model,
    };
  } catch (error) {
    if (error && typeof error.status === "number") {
      const mappedStatus =
        error.status >= 400 && error.status < 500 ? error.status : 502;
      const wrappedError = new Error("Failed to get a response from Groq.");
      wrappedError.statusCode = mappedStatus;
      throw wrappedError;
    }

    if (!error.statusCode) {
      error.statusCode = 502;
      error.message = "Failed to get a response from Groq.";
    }

    throw error;
  }
};

module.exports = {
  answerUserQuestion,
  generateWeeklySummary,
};
