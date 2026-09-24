import Redis from "ioredis";
import logger from "./logger.js";
import env from "./env.js";

const baseOptions = {
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
  enableReadyCheck: false,
};

// A connection dedicated to the Worker (requires null for the Blocking commands)
export const workerRedisConnection = new Redis({
  ...baseOptions,
  maxRetriesPerRequest: null,
});

// A dedicated connection for the Queue(contains a maximum number of attempts so that the task addition fails immediately upon a Redis outage)
export const queueRedisConnection = new Redis({
  ...baseOptions,
  maxRetriesPerRequest: 3,
});

workerRedisConnection.on("connect", () =>
  logger.info("Worker Redis connected"),
);

workerRedisConnection.on("error", (err) =>
  logger.error({ err }, "Worker Redis connection error"),
);

queueRedisConnection.on("connect", () => logger.info("Queue Redis connected"));

queueRedisConnection.on("error", (err) =>
  logger.error({ err }, "Queue Redis connection error"),
);
