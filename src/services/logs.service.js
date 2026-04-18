const { pool } = require("../config/db");

const isBoolean = (value) => typeof value === "boolean";

const normalizeSymptoms = (symptoms) => {
  if (symptoms === undefined) {
    return [];
  }

  if (!Array.isArray(symptoms)) {
    const error = new Error("Symptoms must be an array of strings.");
    error.statusCode = 400;
    throw error;
  }

  const cleanedSymptoms = symptoms
    .map((symptom) => (typeof symptom === "string" ? symptom.trim() : ""))
    .filter(Boolean);

  if (cleanedSymptoms.length !== symptoms.length) {
    const error = new Error("Symptoms must contain only non-empty strings.");
    error.statusCode = 400;
    throw error;
  }

  return [...new Set(cleanedSymptoms.map((symptom) => symptom.toLowerCase()))];
};

const validatePayload = (payload) => {
  const {
    mood,
    sleep_hours: sleepHours,
    food_type: foodType,
    exercised,
    outdoor_exposure: outdoorExposure,
    notes,
  } = payload;

  if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
    const error = new Error("Mood must be an integer between 1 and 5.");
    error.statusCode = 400;
    throw error;
  }

  if (typeof sleepHours !== "number" || Number.isNaN(sleepHours) || sleepHours < 0 || sleepHours > 24) {
    const error = new Error("sleep_hours must be a number between 0 and 24.");
    error.statusCode = 400;
    throw error;
  }

  if (typeof foodType !== "string" || !foodType.trim()) {
    const error = new Error("food_type is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!isBoolean(exercised)) {
    const error = new Error("exercised must be a boolean.");
    error.statusCode = 400;
    throw error;
  }

  if (!isBoolean(outdoorExposure)) {
    const error = new Error("outdoor_exposure must be a boolean.");
    error.statusCode = 400;
    throw error;
  }

  if (notes !== undefined && typeof notes !== "string") {
    const error = new Error("notes must be a string.");
    error.statusCode = 400;
    throw error;
  }

  return {
    mood,
    sleepHours,
    foodType: foodType.trim(),
    exercised,
    outdoorExposure,
    notes: typeof notes === "string" ? notes.trim() : "",
    symptoms: normalizeSymptoms(payload.symptoms),
  };
};

const ensureHealthLogTables = async () => {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS health_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      log_date DATE NOT NULL DEFAULT CURRENT_DATE,
      mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
      sleep_hours NUMERIC(4, 2) NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
      food_type VARCHAR(100) NOT NULL,
      exercised BOOLEAN NOT NULL,
      outdoor_exposure BOOLEAN NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, log_date)
    )
  `);

  await pool.query(`
    ALTER TABLE health_logs
    ALTER COLUMN log_date SET DEFAULT CURRENT_DATE
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS symptoms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS log_symptoms (
      log_id UUID NOT NULL REFERENCES health_logs(id) ON DELETE CASCADE,
      symptom_id INTEGER NOT NULL REFERENCES symptoms(id) ON DELETE CASCADE,
      PRIMARY KEY (log_id, symptom_id)
    )
  `);
};

const createHealthLog = async ({ userId, payload }) => {
  const validated = validatePayload(payload);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingLog = await client.query(
      "SELECT id FROM health_logs WHERE user_id = $1 AND log_date = CURRENT_DATE",
      [userId]
    );

    if (existingLog.rows.length > 0) {
      const error = new Error("A health log has already been created for today.");
      error.statusCode = 409;
      throw error;
    }

    const insertLogResult = await client.query(
      `INSERT INTO health_logs
        (user_id, log_date, mood, sleep_hours, food_type, exercised, outdoor_exposure, notes)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, log_date, mood, sleep_hours, food_type, exercised, outdoor_exposure, notes, created_at`,
      [
        userId,
        validated.mood,
        validated.sleepHours,
        validated.foodType,
        validated.exercised,
        validated.outdoorExposure,
        validated.notes,
      ]
    );

    const log = insertLogResult.rows[0];

    for (const symptomName of validated.symptoms) {
      const symptomResult = await client.query(
        `INSERT INTO symptoms (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name`,
        [symptomName]
      );

      await client.query(
        "INSERT INTO log_symptoms (log_id, symptom_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [log.id, symptomResult.rows[0].id]
      );
    }

    await client.query("COMMIT");

    return {
      message: "Health log created successfully",
      log: {
        id: log.id,
        user_id: log.user_id,
        log_date: log.log_date,
        mood: log.mood,
        sleep_hours: Number(log.sleep_hours),
        food_type: log.food_type,
        exercised: log.exercised,
        outdoor_exposure: log.outdoor_exposure,
        notes: log.notes,
        symptoms: validated.symptoms,
        created_at: log.created_at,
      },
    };
  } catch (error) {
    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "A health log has already been created for today.";
    }

    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getRecentHealthLogs = async (userId) => {
  const result = await pool.query(
    `SELECT
        hl.id,
        hl.user_id,
        hl.log_date,
        hl.mood,
        hl.sleep_hours,
        hl.food_type,
        hl.exercised,
        hl.outdoor_exposure,
        hl.notes,
        hl.created_at,
        COALESCE(
          ARRAY_AGG(s.name ORDER BY s.name) FILTER (WHERE s.name IS NOT NULL),
          ARRAY[]::VARCHAR[]
        ) AS symptoms
      FROM health_logs hl
      LEFT JOIN log_symptoms ls ON ls.log_id = hl.id
      LEFT JOIN symptoms s ON s.id = ls.symptom_id
      WHERE hl.user_id = $1
      GROUP BY hl.id
      ORDER BY hl.log_date DESC, hl.created_at DESC
      LIMIT 30`,
    [userId]
  );

  return result.rows.map((log) => ({
    id: log.id,
    user_id: log.user_id,
    log_date: log.log_date,
    mood: log.mood,
    sleep_hours: Number(log.sleep_hours),
    food_type: log.food_type,
    exercised: log.exercised,
    outdoor_exposure: log.outdoor_exposure,
    notes: log.notes,
    symptoms: log.symptoms,
    created_at: log.created_at,
  }));
};

module.exports = {
  ensureHealthLogTables,
  createHealthLog,
  getRecentHealthLogs,
};
