const { createHealthLog, getRecentHealthLogs } = require("../services/logs.service");

const createLog = async (req, res, next) => {
  try {
    const result = await createHealthLog({
      userId: req.user.id,
      payload: req.body,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getLogs = async (req, res, next) => {
  try {
    const logs = await getRecentHealthLogs(req.user.id);
    res.status(200).json({
      logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLog,
  getLogs,
};
