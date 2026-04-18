const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { queryAi, getWeeklySummary } = require("../controllers/ai.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/query", queryAi);
router.get("/weekly-summary", getWeeklySummary);

module.exports = router;
