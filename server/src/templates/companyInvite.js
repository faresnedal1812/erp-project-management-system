/**
 * Company Invite Email Template
 *
 * Sent when an ADMIN/OWNER invites a user to join their company.
 *
 * @param {string} inviterName - Full name of the person who sent the invite
 * @param {string} companyName - Name of the company being joined
 * @param {string} inviteUrl   - Full URL with token for accepting the invite
 * @returns {{ subject: string, html: string, text: string }}
 */
export const companyInviteTemplate = (inviterName, companyName, inviteUrl) => ({
  subject: `You've been invited to join ${companyName}`,

  text: `
Hi there,

${inviterName} has invited you to join ${companyName} on our ERP platform.

Click the link below to accept your invitation (valid for 7 days):
${inviteUrl}

If you did not expect this invitation, you can safely ignore this email.

— The ERP Team
  `.trim(),

  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Company Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:-0.5px;">You're Invited!</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi there,</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">
                <strong>${inviterName}</strong> has invited you to join
                <strong>${companyName}</strong> on our ERP platform.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${inviteUrl}"
                       style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;
                              padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color:#4f46e5;font-size:13px;word-break:break-all;margin:0 0 24px;">
                <a href="${inviteUrl}" style="color:#4f46e5;">${inviteUrl}</a>
              </p>
              <p style="color:#9ca3af;font-size:13px;margin:0;">
                This invitation expires in <strong>7 days</strong>.
                If you did not expect this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} ERP System. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim(),
});
