const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { getPatterns } = require("../controllers/analytics.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/patterns", getPatterns);

module.exports = router;
