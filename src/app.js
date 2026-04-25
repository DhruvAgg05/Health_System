const express = require("express");
const path = require("path");
const cors = require("cors");
const aiRoutes = require("./routes/ai.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const authRoutes = require("./routes/auth.routes");
const exportRoutes = require("./routes/export.routes");
const healthRoutes = require("./routes/healthRoutes");
const logsRoutes = require("./routes/logs.routes");
const reportsRoutes = require("./routes/reports.routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");


const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/logs", logsRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/export", exportRoutes);
app.use("/api/v1/reports", reportsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
