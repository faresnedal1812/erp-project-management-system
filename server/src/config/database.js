import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import logger from "./logger.js";
import env from "./env.js";

/**
 * Prisma Client Singleton.
 *
 * WHY A SINGLETON:
 * Prisma Client manages a connection pool internally. Creating multiple
 * instances would open multiple pools, wasting database connections — a
 * limited resource, especially in production (PostgreSQL defaults to 100
 * max connections).
 *
 * WHY NOT new PrismaClient() EVERYWHERE:
 * - Connection pool exhaustion.
 * - Impossible to share transactions across modules.
 * - Difficult to mock in tests.
 */
const { Pool } = pg;
const pool = new Pool({ connectionString: env.databaseUrl });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
  ],
});

// Forward Prisma logs to Pino for consistent log management.
prisma.$on("query", (e) => {
  logger.debug({ duration: `${e.duration}ms` }, `Prisma Query: ${e.query}`);
});

prisma.$on("error", (e) => {
  logger.error(e, "Prisma Error");
});

prisma.$on("warn", (e) => {
  logger.warn(e, "Prisma Warning");
});

/**
 * Connects to the database.
 * Called once during server startup.
 */
export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected successfully");
  } catch (error) {
    logger.fatal(error, "❌ Database connection failed");
    process.exit(1);
  }
};

/**
 * Disconnects from the database.
 * Called during graceful shutdown.
 */
export const disconnectDatabase = async () => {
  await prisma.$disconnect();
  logger.info("Database disconnected");
};

export default prisma;
