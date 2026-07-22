import dotenv from "dotenv";

/**
 * Load environment variables from .env file.
 * This must be called before accessing any env vars.
 */
dotenv.config();

/**
 * Validates that all required environment variables are present.
 *
 * WHY FAIL FAST:
 * If a critical variable (e.g., DATABASE_URL) is missing, the app would
 * start but crash later with a confusing Prisma or driver error. By
 * validating at startup, we surface the real problem immediately with
 * a clear, actionable error message.
 *
 * NOTE: JWT secrets are intentionally excluded here because authentication
 * is Phase 2. Add them to this array when Phase 2 begins.
 */
const requiredVars = ["DATABASE_URL"];

const missing = requiredVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `❌ Missing required environment variables: ${missing.join(", ")}.\n` +
      `   Please check your .env file against .env.example.`,
  );
}

/**
 * Centralized environment configuration.
 *
 * WHY: Application logic should never read process.env directly.
 * This provides a single source of truth, makes it easy to validate
 * required vars, and simplifies future changes (e.g., switching to
 * a vault or config service).
 */
const env = {
  // Application
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,

  // Convenience booleans
  get isDevelopment() {
    return this.nodeEnv === "development";
  },
  get isProduction() {
    return this.nodeEnv === "production";
  },
  get isTesting() {
    return this.nodeEnv === "testing";
  },

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  rateLimitMaxRequests:
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
};

export default env;
