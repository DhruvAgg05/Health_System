const { healthCheck } = require("../services/healthService");

const getHealthStatus = (req, res) => {
  const status = healthCheck();
  res.status(200).send(status);
};

module.exports = {
  getHealthStatus,
};
