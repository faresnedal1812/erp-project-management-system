import nodemailer from "nodemailer";
import env from "./env.js";
import logger from "./logger.js";

/**
 * Mail Transporter Configuration — Nodemailer.
 *
 * WHY THIS CONFIGURATION:
 * Standardizes outbound email connections. In development environments where
 * SMTP credentials are empty, fallback configuration allows application startup
 * while logging mail attempts without crashing.
 */

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465, // true for 465, false for other ports
  auth:
    env.smtpUser && env.smtpPass
      ? {
          user: env.smtpUser,
          pass: env.smtpPass,
        }
      : undefined,
});

// Verify connection configuration on startup if credentials are provided
if (env.smtpUser && env.smtpPass) {
  transporter.verify((error) => {
    if (error) {
      logger.warn(
        { error: error.message },
        "SMTP connection verification failed",
      );
    } else {
      logger.info("SMTP transporter is ready to send messages");
    }
  });
}

export default transporter;
