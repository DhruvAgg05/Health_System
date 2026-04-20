const { generatePdfReport } = require("../services/pdf.service");

const exportPdf = async (req, res, next) => {
  try {
    const { buffer, filename } = await generatePdfReport({
      userId: req.user.id,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportPdf,
};
