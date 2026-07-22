import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import env from "../config/env.js";

/**
 * Security Middleware Stack.
 *
 * Applies all security-related middleware to the Express app in one call.
 * This keeps app.js clean and groups security concerns together.
 *
 * WHAT EACH MIDDLEWARE DOES:
 *
 * 1. Helmet — Sets secure HTTP headers (X-Content-Type-Options,
 *    X-Frame-Options, Strict-Transport-Security, etc.). Prevents
 *    common attacks like clickjacking, MIME-sniffing, and XSS.
 *
 * 2. CORS — Controls which origins can call the API. Without it,
 *    browsers block cross-origin requests by default. In production,
 *    this should be restricted to your frontend domain only.
 *
 * 3. HPP (HTTP Parameter Pollution) — Prevents attacks where an
 *    attacker sends duplicate query parameters (e.g., ?sort=name&sort=DROP TABLE)
 *    to confuse the server. HPP picks the last value by default.
 *
 * 4. Rate Limiter — Limits the number of requests per IP per time
 *    window. Protects against brute force attacks and DDoS.
 */

/**
 * Applies all security middleware to the Express app.
 * @param {import('express').Application} app
 */
const applySecurity = (app) => {
  // 1. Secure HTTP headers
  app.use(helmet());

  // 2. CORS configuration
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // 3. Prevent HTTP Parameter Pollution
  app.use(hpp());

  // 4. Rate limiting
  const limiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
  });
  app.use("/api", limiter);
};

export default applySecurity;
