import transporter from "../config/mail.js";
import env from "../config/env.js";
import logger from "../config/logger.js";
import { welcomeTemplate } from "../templates/welcome.js";
import { verifyEmailTemplate } from "../templates/verifyEmail.js";
import { passwordResetTemplate } from "../templates/passwordReset.js";

/**
 * Sends a welcome email to a newly registered user.
 *
 * @param {string} to - Recipient email
 * @param {string} firstName - User's first name
 */
export const sendWelcomeEmail = async (to, firstName) => {
  try {
    const { subject, html, text } = welcomeTemplate(firstName);

    const info = await transporter.sendMail({
      from: env.mailFrom,
      to,
      subject,
      text,
      html,
    });

    logger.info(
      { messageId: info.messageId, to },
      "Welcome email sent successfully",
    );
  } catch (error) {
    logger.error({ error: error.message, to }, "Failed to send welcome email");
    // Non-blocking: We log the error but don't rethrow to avoid failing caller business transaction
  }
};

/**
 * Sends an email verification link to a user.
 *
 * @param {string} to - Recipient email
 * @param {string} firstName - User's first name
 * @param {string} token - Verification token
 */
export const sendVerificationEmail = async (to, firstName, token) => {
  try {
    const verificationUrl = `${env.clientUrl}/verify-email?token=${token}`;
    const { subject, html, text } = verifyEmailTemplate(
      firstName,
      verificationUrl,
    );

    const info = await transporter.sendMail({
      from: env.mailFrom,
      to,
      subject,
      text,
      html,
    });

    logger.info(
      { messageId: info.messageId, to },
      "Verification email sent successfully",
    );
  } catch (error) {
    logger.error(
      { error: error.message, to },
      "Failed to send verification email",
    );
  }
};

/**
 * Sends a password reset instructions email to a user.
 *
 * @param {string} to - Recipient email
 * @param {string} firstName - User's first name
 * @param {string} token - Password reset token
 */
export const sendPasswordResetEmail = async (to, firstName, token) => {
  try {
    const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
    const { subject, html, text } = passwordResetTemplate(firstName, resetUrl);

    const info = await transporter.sendMail({
      from: env.mailFrom,
      to,
      subject,
      text,
      html,
    });

    logger.info(
      { messageId: info.messageId, to },
      "Password reset email sent successfully",
    );
  } catch (error) {
    logger.error(
      { error: error.message, to },
      "Failed to send password reset email",
    );
  }
};
