import pino from "pino";
import env from "./env.js";

/**
 * Application logger using Pino.
 *
 * WHY PINO OVER WINSTON:
 * - Pino is significantly faster (5x+) because it uses worker threads for
 *   serialization and avoids synchronous I/O on the main thread.
 * - JSON structured logging by default — ideal for log aggregation tools
 *   (e.g., ELK, Datadog, CloudWatch).
 * - In development, pino-pretty makes logs human-readable.
 *
 * WHEN NOT TO USE PINO:
 * - If you need Winston's transport ecosystem (e.g., log to files, Slack,
 *   databases) without writing custom code. However, pino-transport solves
 *   this for most cases.
 */
const logger = pino({
  level: env.isDevelopment ? "debug" : "info",
  ...(env.isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  }),
});

export default logger;
