const { detectPatterns, calculatePredictions } = require("../services/analytics.service");

const getPatterns = async (req, res, next) => {
  try {
    const days = req.query.days;
    const result = await detectPatterns({
      userId: req.user.id,
      days,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getPredictions = async (req, res, next) => {
  try {
    const days = req.query.days;
    const result = await calculatePredictions({
      userId: req.user.id,
      days,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatterns,
  getPredictions,
};
