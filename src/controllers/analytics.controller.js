const { detectPatterns } = require("../services/analytics.service");

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

module.exports = {
  getPatterns,
};
