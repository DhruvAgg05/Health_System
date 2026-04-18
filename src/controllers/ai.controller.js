const { answerUserQuestion, generateWeeklySummary } = require("../services/ai.service");

const queryAi = async (req, res, next) => {
  try {
    const { question } = req.body;
    const result = await answerUserQuestion({
      userId: req.user.id,
      question,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getWeeklySummary = async (req, res, next) => {
  try {
    const result = await generateWeeklySummary({
      userId: req.user.id,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  queryAi,
  getWeeklySummary,
};
