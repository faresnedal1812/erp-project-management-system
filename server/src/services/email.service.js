import { emailQueue } from "../queues/email.queue.js";
import logger from "../config/logger.js";

/**
 * Email service — enqueue layer.
 *
 * All functions simply push a job into BullMQ so the HTTP request
 * returns immediately. The actual SMTP sending is handled by the
 * email worker in the background.
 */

export const sendWelcomeEmail = async (to, firstName) => {
  try {
    await emailQueue.add("email:welcome", { to, firstName });
    logger.debug({ to }, "Welcome email job queued");
  } catch (err) {
    logger.error({ err, to }, "Failed to queue welcome email");
  }
};

export const sendVerificationEmail = async (to, firstName, token) => {
  try {
    await emailQueue.add("email:verify", { to, firstName, token });
    logger.debug({ to }, "Verification email job queued");
  } catch (err) {
    logger.error({ err, to }, "Failed to queue verification email");
  }
};

export const sendPasswordResetEmail = async (to, firstName, token) => {
  try {
    await emailQueue.add("email:password-reset", { to, firstName, token });
    logger.debug({ to }, "Password reset email job queued");
  } catch (err) {
    logger.error({ err, to }, "Failed to queue password reset email");
  }
};

export const sendCompanyInviteEmail = async (
  to,
  inviterName,
  companyName,
  token,
) => {
  try {
    await emailQueue.add("email:company-invite", {
      to,
      inviterName,
      companyName,
      token,
    });
    logger.debug({ to, companyName }, "Company invite email job queued");
  } catch (err) {
    logger.error({ err, to }, "Failed to queue company invite email");
  }
};
