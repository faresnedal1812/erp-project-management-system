/**
 * Welcome Email Template
 *
 * @param {string} firstName - User's first name
 * @returns {{ subject: string, html: string, text: string }}
 */
export const welcomeTemplate = (firstName) => {
  const subject = "Welcome to ERP & Project Management System";

  const text = `Hi ${firstName},\n\nWelcome to our ERP & Project Management System! We are excited to have you on board.\n\nBest regards,\nThe ERP Team`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
          .content { padding: 20px; }
          .footer { font-size: 12px; color: #777; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Welcome to ERP System</h2>
          </div>
          <div class="content">
            <p>Hi <strong>${firstName}</strong>,</p>
            <p>Welcome to our ERP & Project Management System! Your account has been registered successfully.</p>
            <p>We are glad to have you on board. If you have any questions or need support, please reach out to our administration team.</p>
            <p>Best regards,<br>The ERP Engineering Team</p>
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
