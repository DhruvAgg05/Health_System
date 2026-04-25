const fs = require("fs/promises");
const path = require("path");
const { pool } = require("../config/db");

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:4000";

const buildFileUrl = (filename) => `${APP_BASE_URL}/uploads/${filename}`;

const normalizeNullableText = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const validateFollowUpDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error("follow_up_date must be a valid date.");
    error.statusCode = 400;
    throw error;
  }

  return value;
};

const mapReport = (report) => ({
  id: report.id,
  user_id: report.user_id,
  title: report.title,
  type: report.type,
  file_url: report.file_url,
  doctor_name: report.doctor_name,
  notes: report.notes,
  follow_up_date: report.follow_up_date,
  created_at: report.created_at,
});

const ensureMedicalReportsTable = async () => {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS medical_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      type VARCHAR(50),
      file_url TEXT,
      doctor_name VARCHAR(255),
      notes TEXT,
      follow_up_date DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
};

const createMedicalReport = async ({ userId, body, file }) => {
  if (!file) {
    const error = new Error('A file is required in the "file" field.');
    error.statusCode = 400;
    throw error;
  }

  const title = normalizeNullableText(body.title);
  const type = normalizeNullableText(body.type);
  const doctorName = normalizeNullableText(body.doctor_name);
  const notes = normalizeNullableText(body.notes);
  const followUpDate = validateFollowUpDate(body.follow_up_date);
  const fileUrl = buildFileUrl(file.filename);

  try {
    const result = await pool.query(
      `INSERT INTO medical_reports (
        user_id,
        title,
        type,
        file_url,
        doctor_name,
        notes,
        follow_up_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, title, type, file_url, doctor_name, notes, follow_up_date, created_at`,
      [userId, title, type, fileUrl, doctorName, notes, followUpDate]
    );

    return mapReport(result.rows[0]);
  } catch (error) {
    await fs.unlink(path.join(__dirname, "..", "..", "uploads", file.filename)).catch(() => {});
    throw error;
  }
};

const getMedicalReports = async (userId) => {
  const result = await pool.query(
    `SELECT id, user_id, title, type, file_url, doctor_name, notes, follow_up_date, created_at
     FROM medical_reports
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map(mapReport);
};

module.exports = {
  ensureMedicalReportsTable,
  createMedicalReport,
  getMedicalReports,
};
