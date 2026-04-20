const PDFDocument = require("pdfkit");
const { getHealthLogsByDays } = require("./logs.service");
const { detectPatterns } = require("./analytics.service");
const { generateWeeklySummary } = require("./ai.service");

const REPORT_DAYS = 30;

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const collectPdfBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

const addSectionTitle = (doc, title) => {
  if (doc.y > 700) {
    doc.addPage();
  }

  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#111827").text(title);
  doc.moveDown(0.25);
  doc.strokeColor("#D1D5DB").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.6);
};

const addBodyText = (doc, text, options = {}) => {
  doc
    .font("Helvetica")
    .fontSize(options.fontSize || 10.5)
    .fillColor("#374151")
    .text(text, {
      width: 495,
      lineGap: 3,
      ...options,
    });
};

const addLogsSection = (doc, logs) => {
  if (logs.length === 0) {
    addBodyText(doc, "No logs found in the last 30 days.");
    return;
  }

  logs.forEach((log, index) => {
    if (doc.y > 710) {
      doc.addPage();
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#111827")
      .text(`${formatDate(log.log_date)} | Mood ${log.mood}/5 | Sleep ${log.sleep_hours}h`);

    if (index < logs.length - 1) {
      doc.moveDown(0.2);
      doc.strokeColor("#E5E7EB").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
    }
  });
};

const addPatternSection = (doc, patterns) => {
  if (!patterns.length) {
    addBodyText(doc, "No strong patterns were detected.");
    return;
  }

  patterns.forEach((pattern) => {
    addBodyText(doc, `- ${pattern}`);
    doc.moveDown(0.25);
  });
};

const generatePdfReport = async ({ userId }) => {
  const [logs, patternResult, aiSummary] = await Promise.all([
    getHealthLogsByDays(userId, REPORT_DAYS),
    detectPatterns({ userId, days: REPORT_DAYS }),
    generateWeeklySummary({ userId }),
  ]);

  const doc = new PDFDocument({
    margin: 50,
    size: "A4",
    info: {
      Title: "Health Report",
      Author: "AI Health Analytics Platform",
    },
  });

  const pdfBufferPromise = collectPdfBuffer(doc);

  doc.font("Helvetica-Bold").fontSize(24).fillColor("#111827").text("Health Report");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10.5).fillColor("#6B7280").text(`Generated on ${formatDate(new Date())}`);

  addSectionTitle(doc, "Section 1: Logs");
  addLogsSection(doc, logs);

  addSectionTitle(doc, "Section 2: Patterns");
  addPatternSection(doc, patternResult.patterns || []);

  addSectionTitle(doc, "Section 3: AI Summary");
  addBodyText(doc, aiSummary.response || "No AI summary available.");

  doc.end();

  return {
    buffer: await pdfBufferPromise,
    filename: "health-report.pdf",
  };
};

module.exports = {
  generatePdfReport,
};
