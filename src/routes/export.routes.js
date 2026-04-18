const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { exportPdf } = require("../controllers/export.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/pdf", exportPdf);

module.exports = router;
