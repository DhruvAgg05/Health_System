const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { getPatterns, getPredictions } = require("../controllers/analytics.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/patterns", getPatterns);
router.get("/predictions", getPredictions);

module.exports = router;
