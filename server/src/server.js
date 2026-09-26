import { createServer } from "http";
import app from "./app.js";
import env from "./config/env.js";
import logger from "./config/logger.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { initSocket } from "./config/socket.js";

let httpServer;
let io;

/**
 * Starts the application server.
 *
 * It first attempts to connect to the database. If successful,
 * it starts the HTTP server.
 */
const startServer = async () => {
  await connectDatabase();

  httpServer = createServer(app);
  io = initSocket(httpServer);

  httpServer.listen(env.port, () => {
    logger.info(`🚀 Server running in ${env.nodeEnv} mode on port ${env.port}`);
    logger.info(
      `📚 Swagger docs available at http://localhost:${env.port}/api-docs`,
    );
  });
};

startServer();

// ============================================
// Graceful Shutdown & Error Handling
// ============================================

/**
 * Handles unhandled promise rejections (e.g., forgotten catch blocks).
 */
process.on("unhandledRejection", (err) => {
  logger.fatal(err, "UNHANDLED REJECTION! 💥 Shutting down...");
  if (httpServer) {
    httpServer.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

/**
 * Handles uncaught exceptions (synchronous bugs).
 */
process.on("uncaughtException", (err) => {
  logger.fatal(err, "UNCAUGHT EXCEPTION! 💥 Shutting down...");
  process.exit(1);
});

/**
 * Graceful shutdown for SIGTERM (e.g., Docker stop, Heroku restart)
 * and SIGINT (Ctrl+C).
 *
 * Ensures all existing requests finish processing before the server
 * closes, and safely disconnects from the database.
 */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  const forceShutdownTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);
  forceShutdownTimer.unref();

  // Close Socket.IO first to stop accepting new connections
  if (io) {
    await new Promise((resolve) => io.close(resolve));
    logger.info("Socket.IO server closed.");
  }

  if (httpServer) {
    httpServer.close(async () => {
      logger.info("HTTP server closed.");
      await disconnectDatabase();
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
