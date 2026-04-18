const dotenv = require("dotenv");
const app = require("./app");
const { testConnection } = require("./config/db");
const { ensureUsersTable } = require("./services/auth.service");
const { ensureHealthLogTables } = require("./services/logs.service");

dotenv.config();

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await testConnection();
    await ensureUsersTable();
    await ensureHealthLogTables();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
