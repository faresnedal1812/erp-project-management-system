import Redis from "ioredis";
import logger from "./logger.js";
import env from "./env.js";

/**
 * Shared ioredis connection used by BullMQ queues and workers.
 *
 * BullMQ requires a dedicated ioredis connection — it MUST have
 * maxRetriesPerRequest: null so that BullMQ can handle retries itself.
 *
 * WHY ioredis over the built-in Redis client:
 * BullMQ officially recommends ioredis for its robust reconnect
 * handling and pipeline support.
 */
const createRedisConnection = () =>
  new Redis({
    host: env.redisHost,
    port: env.redisPort,
    password: env.redisPassword,
    maxRetriesPerRequest: null, // Required by BullMQ => Because the Worker relies on a Redis connection all the time.
    enableReadyCheck: false,
  });

// Shared connection for Queues
export const redisConnection = createRedisConnection();

redisConnection.on("connect", () => logger.info("Redis connected"));

redisConnection.on("error", (err) =>
  logger.error({ err }, "Redis connection error"),
);
