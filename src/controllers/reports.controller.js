const { createMedicalReport, getMedicalReports } = require("../services/reports.service");

const createReport = async (req, res, next) => {
  try {
    const report = await createMedicalReport({
      userId: req.user.id,
      body: req.body,
      file: req.file,
    });

    res.status(201).json({
      message: "Medical report uploaded successfully.",
      report,
    });
  } catch (error) {
    next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const reports = await getMedicalReports(req.user.id);

    res.status(200).json({
      reports,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getReports,
};
