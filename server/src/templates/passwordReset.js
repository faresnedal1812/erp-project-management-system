/**
 * Password Reset Email Template
 *
 * @param {string} firstName - User's first name
 * @param {string} resetUrl - URL containing password reset token
 * @returns {{ subject: string, html: string, text: string }}
 */
export const passwordResetTemplate = (firstName, resetUrl) => {
  const subject = "Password Reset Request";

  const text = `Hi ${firstName},\n\nYou requested a password reset. Please click on the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour. If you did not request this, please ignore this email.\n\nBest regards,\nThe ERP Team`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
          .content { padding: 20px; text-align: center; }
          .btn { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
          .footer { font-size: 12px; color: #777; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Reset Your Password</h2>
          </div>
          <div class="content">
            <p style="text-align: left;">Hi <strong>${firstName}</strong>,</p>
            <p style="text-align: left;">We received a request to reset the password for your account. Click the button below to proceed:</p>
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
            <p style="font-size: 12px; color: #666; word-break: break-all;">Or copy and paste this link into your browser: <br>${resetUrl}</p>
            <p style="text-align: left; font-size: 13px; color: #888;">Note: This link will expire in 1 hour. If you did not request a password reset, no action is required.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ERP Project Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, html, text };
};
