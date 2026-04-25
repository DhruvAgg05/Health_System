const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { uploadReport } = require("../middleware/reportsUpload.middleware");
const { createReport, getReports } = require("../controllers/reports.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/", uploadReport.single("file"), createReport);
router.get("/", getReports);

module.exports = router;
