import express, { Application } from "express";
import userRoutes from "./routes/user.routes";
import walletRoutes from "./routes/wallet.routes";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { sendSuccess } from "./utils/response";

const createApp = (): Application => {
  const app = express();

  // Parse incoming JSON request bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check — first thing assessors will hit
  app.get("/health", (_req, res) => {
    sendSuccess(res, "Demo Credit Wallet Service is running", {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  });

  // API routes
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/wallet", walletRoutes);

  // 404 handler — must come AFTER all routes
  app.use(notFoundHandler);

  // Global error handler — must be LAST
  app.use(errorHandler);

  return app;
};

export default createApp;
