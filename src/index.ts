import dotenv from "dotenv";
dotenv.config();

import createApp from "./app";
import db from "./models/db";
import logger from "./utils/logger";

const PORT = Number(process.env.PORT) || 3000;

const startServer = async (): Promise<void> => {
  try {
    // Test database connection
    await db.raw("SELECT 1");
    logger.info("Database connection established successfully");

    // Run any pending migrations automatically
    await db.migrate.latest();
    logger.info("Database migrations completed");

    const app = createApp();

    app.listen(PORT, () => {
      logger.info(`Demo Credit Wallet Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API Base URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
