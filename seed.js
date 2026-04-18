const { Pool } = require("pg");
require("dotenv").config();

// ============================================
// ✏️  SET YOUR USER ID HERE
// ============================================
const USER_ID = "f7d44970-95ac-4796-9426-9d362bc4b025"; // Dhruv
// ============================================

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const sampleLogs = [
  // 1. Low sleep + headache
  {
    log_date: "2026-04-07",
    mood: 2,
    sleep_hours: 3.5,
    food_type: "homemade",
    exercised: false,
    outdoor_exposure: false,
    notes: "Slept very late, woke up with a headache.",
    symptoms: ["headache", "fatigue"],
  },
  // 2. Good sleep + no symptoms
  {
    log_date: "2026-04-08",
    mood: 5,
    sleep_hours: 8,
    food_type: "homemade",
    exercised: true,
    outdoor_exposure: true,
    notes: "Great day, felt energetic and fresh.",
    symptoms: [],
  },
  // 3. Outside food + allergy
  {
    log_date: "2026-04-09",
    mood: 2,
    sleep_hours: 6,
    food_type: "outside",
    exercised: false,
    outdoor_exposure: true,
    notes: "Ate street food, had an allergic reaction.",
    symptoms: ["allergy", "nausea", "stomach ache"],
  },
  // 4. Exercise + good mood
  {
    log_date: "2026-04-10",
    mood: 5,
    sleep_hours: 7.5,
    food_type: "homemade",
    exercised: true,
    outdoor_exposure: true,
    notes: "Morning run and yoga, felt amazing all day.",
    symptoms: [],
  },
  // 5. Low sleep + stress
  {
    log_date: "2026-04-11",
    mood: 1,
    sleep_hours: 2,
    food_type: "skipped",
    exercised: false,
    outdoor_exposure: false,
    notes: "Exam stress, barely slept.",
    symptoms: ["headache", "anxiety", "fatigue"],
  },
  // 6. Moderate day
  {
    log_date: "2026-04-12",
    mood: 3,
    sleep_hours: 6,
    food_type: "homemade",
    exercised: false,
    outdoor_exposure: false,
    notes: "Average day, nothing special.",
    symptoms: ["back pain"],
  },
  // 7. Outside food + good mood
  {
    log_date: "2026-04-13",
    mood: 4,
    sleep_hours: 7,
    food_type: "restaurant",
    exercised: false,
    outdoor_exposure: true,
    notes: "Went out for dinner with friends, had a good time.",
    symptoms: [],
  },
  // 8. Exercise + mild soreness
  {
    log_date: "2026-04-14",
    mood: 4,
    sleep_hours: 7,
    food_type: "homemade",
    exercised: true,
    outdoor_exposure: true,
    notes: "Gym session — legs day, feeling sore but happy.",
    symptoms: ["muscle soreness"],
  },
  // 9. Poor sleep + cold symptoms
  {
    log_date: "2026-04-15",
    mood: 2,
    sleep_hours: 4,
    food_type: "homemade",
    exercised: false,
    outdoor_exposure: false,
    notes: "Caught a cold, stayed in bed most of the day.",
    symptoms: ["cold", "sore throat", "fatigue"],
  },
  // 10. Recovery day
  {
    log_date: "2026-04-16",
    mood: 3,
    sleep_hours: 9,
    food_type: "homemade",
    exercised: false,
    outdoor_exposure: false,
    notes: "Resting and recovering, lots of sleep.",
    symptoms: ["cold"],
  },
];

const seed = async () => {
  if (USER_ID === "PASTE_YOUR_USER_ID_HERE") {
    console.error("❌  Please set a valid USER_ID in seed.js before running.");
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log(`🌱  Seeding 10 health logs for user: ${USER_ID}\n`);

    for (const log of sampleLogs) {
      // Insert the health log
      const logResult = await client.query(
        `INSERT INTO health_logs
          (user_id, log_date, mood, sleep_hours, food_type, exercised, outdoor_exposure, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, log_date) DO UPDATE SET
           mood = EXCLUDED.mood,
           sleep_hours = EXCLUDED.sleep_hours,
           food_type = EXCLUDED.food_type,
           exercised = EXCLUDED.exercised,
           outdoor_exposure = EXCLUDED.outdoor_exposure,
           notes = EXCLUDED.notes
         RETURNING id, log_date`,
        [
          USER_ID,
          log.log_date,
          log.mood,
          log.sleep_hours,
          log.food_type,
          log.exercised,
          log.outdoor_exposure,
          log.notes,
        ]
      );

      const insertedLog = logResult.rows[0];

      // Clear old symptom links for this log (in case of upsert)
      await client.query("DELETE FROM log_symptoms WHERE log_id = $1", [
        insertedLog.id,
      ]);

      // Insert symptoms
      for (const symptomName of log.symptoms) {
        const symptomResult = await client.query(
          `INSERT INTO symptoms (name)
           VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [symptomName.toLowerCase()]
        );

        await client.query(
          "INSERT INTO log_symptoms (log_id, symptom_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [insertedLog.id, symptomResult.rows[0].id]
        );
      }

      const symptomList =
        log.symptoms.length > 0 ? log.symptoms.join(", ") : "none";
      console.log(
        `  ✅  ${insertedLog.log_date.toISOString().slice(0, 10)} | mood: ${log.mood} | sleep: ${log.sleep_hours}h | symptoms: ${symptomList}`
      );
    }

    await client.query("COMMIT");
    console.log("\n🎉  Seeding complete!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌  Seeding failed:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
