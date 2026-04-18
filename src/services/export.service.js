const PDFDocument = require("pdfkit");
const { getRecentHealthLogs } = require("./logs.service");
const { detectPatterns } = require("./analytics.service");
const { generateWeeklySummary } = require("./ai.service");

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const addSectionTitle = (doc, title) => {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#0F172A").text(title);
  doc.moveDown(0.3);
  doc.strokeColor("#CBD5E1").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.6);
};

const addBodyText = (doc, text, options = {}) => {
  doc
    .font("Helvetica")
    .fontSize(options.fontSize || 10.5)
    .fillColor("#334155")
    .text(text, {
      width: 495,
      lineGap: 3,
      ...options,
    });
};

const addBulletList = (doc, items) => {
  items.forEach((item) => {
    addBodyText(doc, `- ${item}`);
    doc.moveDown(0.25);
  });
};

const drawSummaryCard = (doc, entries) => {
  const startY = doc.y;
  const cardHeight = 86;

  doc.roundedRect(50, startY, 495, cardHeight, 8).fillAndStroke("#F8FAFC", "#E2E8F0");

  const columns = 4;
  const columnWidth = 495 / columns;

  entries.forEach((entry, index) => {
    const x = 50 + index * columnWidth + 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#0F172A")
      .text(entry.label, x, startY + 16, { width: columnWidth - 20, align: "left" });

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#1D4ED8")
      .text(entry.value, x, startY + 38, { width: columnWidth - 20, align: "left" });
  });

  doc.y = startY + cardHeight + 12;
};

const addTimeline = (doc, logs) => {
  if (logs.length === 0) {
    addBodyText(doc, "No logs available to include in the timeline.");
    return;
  }

  const timelineLogs = [...logs].reverse();

  timelineLogs.forEach((log, index) => {
    if (doc.y > 700) {
      doc.addPage();
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .fillColor("#0F172A")
      .text(`${formatDate(log.log_date)}  |  Mood ${log.mood}/5  |  Sleep ${log.sleep_hours}h`);

    const flags = [
      `Food: ${log.food_type}`,
      `Exercise: ${log.exercised ? "Yes" : "No"}`,
      `Outdoor: ${log.outdoor_exposure ? "Yes" : "No"}`,
    ];

    addBodyText(doc, flags.join("   |   "), { fontSize: 10 });

    if (log.symptoms.length > 0) {
      addBodyText(doc, `Symptoms: ${log.symptoms.join(", ")}`, { fontSize: 10 });
    }

    if (log.notes) {
      addBodyText(doc, `Notes: ${log.notes}`, { fontSize: 10 });
    }

    if (index < timelineLogs.length - 1) {
      doc.moveDown(0.35);
      doc.strokeColor("#E2E8F0").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
    }
  });
};

const collectPdfBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

const buildSummaryStats = (logs) => {
  if (logs.length === 0) {
    return [
      { label: "Logs", value: "0" },
      { label: "Avg Mood", value: "N/A" },
      { label: "Avg Sleep", value: "N/A" },
      { label: "Exercise", value: "N/A" },
    ];
  }

  const avgMood = (
    logs.reduce((sum, log) => sum + Number(log.mood), 0) / logs.length
  ).toFixed(1);
  const avgSleep = (
    logs.reduce((sum, log) => sum + Number(log.sleep_hours), 0) / logs.length
  ).toFixed(1);
  const exerciseDays = logs.filter((log) => log.exercised).length;

  return [
    { label: "Logs", value: String(logs.length) },
    { label: "Avg Mood", value: `${avgMood}/5` },
    { label: "Avg Sleep", value: `${avgSleep}h` },
    { label: "Exercise", value: `${exerciseDays}/${logs.length}` },
  ];
};

const generatePdfReport = async ({ userId }) => {
  const [logs, patternResult, aiSummary] = await Promise.all([
    getRecentHealthLogs(userId),
    detectPatterns({ userId }),
    generateWeeklySummary({ userId }),
  ]);

  const doc = new PDFDocument({
    margin: 50,
    size: "A4",
    info: {
      Title: "Health Analytics Report",
      Author: "AI Health Analytics Platform",
    },
  });

  const pdfBufferPromise = collectPdfBuffer(doc);

  doc.rect(0, 0, doc.page.width, 110).fill("#0F172A");
  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(24)
    .text("Health Analytics Report", 50, 34);
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#CBD5E1")
    .text(`Generated on ${formatDate(new Date())}`, 50, 70);

  doc.y = 128;
  drawSummaryCard(doc, buildSummaryStats(logs));

  addSectionTitle(doc, "AI Weekly Summary");
  addBodyText(doc, aiSummary.response || "No AI summary available.");

  addSectionTitle(doc, "Detected Patterns");
  addBulletList(doc, patternResult.patterns || ["No patterns available."]);

  if (doc.y > 540) {
    doc.addPage();
  }

  addSectionTitle(doc, "Timeline of Logs");
  addTimeline(doc, logs);

  doc.end();

  return {
    buffer: await pdfBufferPromise,
    filename: `health-report-${Date.now()}.pdf`,
  };
};

module.exports = {
  generatePdfReport,
};
