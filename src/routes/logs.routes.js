const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { createLog, getLogs } = require("../controllers/logs.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createLog);
router.get("/", getLogs);

module.exports = router;
