/**
 * Verify Email Template
 *
 * @param {string} firstName - User's first name
 * @param {string} verificationUrl - URL containing verification token
 * @returns {{ subject: string, html: string, text: string }}
 */
export const verifyEmailTemplate = (firstName, verificationUrl) => {
  const subject = "Please verify your email address";

  const text = `Hi ${firstName},\n\nPlease verify your email address by clicking on the link below:\n${verificationUrl}\n\nThis link is required to activate all account features.\n\nBest regards,\nThe ERP Team`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px; }
          .header { background: #0284c7; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
          .content { padding: 20px; text-align: center; }
          .btn { display: inline-block; padding: 12px 24px; background: #0284c7; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
          .footer { font-size: 12px; color: #777; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Verify Your Email Address</h2>
          </div>
          <div class="content">
            <p style="text-align: left;">Hi <strong>${firstName}</strong>,</p>
            <p style="text-align: left;">Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
            <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address</a>
            <p style="font-size: 12px; color: #666; word-break: break-all;">Or copy and paste this link into your browser: <br>${verificationUrl}</p>
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
