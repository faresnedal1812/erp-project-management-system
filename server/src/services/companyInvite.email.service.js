import transporter from "../config/mail.js";
import env from "../config/env.js";
import logger from "../config/logger.js";
import { companyInviteTemplate } from "../templates/companyInvite.js";

/**
 * Sends a company invitation email to the specified address.
 *
 * @param {string} to          - Invitee email address
 * @param {string} inviterName - Full name of the person who sent the invite
 * @param {string} companyName - Name of the company
 * @param {string} token       - Unique invite token for the accept link
 */
export const sendCompanyInviteEmail = async (
  to,
  inviterName,
  companyName,
  token,
) => {
  try {
    const inviteUrl = `${env.clientUrl}/invites/accept?token=${token}`;
    const { subject, html, text } = companyInviteTemplate(
      inviterName,
      companyName,
      inviteUrl,
    );

    const info = await transporter.sendMail({
      from: env.mailFrom,
      to,
      subject,
      text,
      html,
    });

    logger.info(
      { messageId: info.messageId, to, companyName },
      "Company invite email sent successfully",
    );
  } catch (error) {
    // Non-blocking: log and continue — invite record already exists in DB.
    logger.error(
      { error: error.message, to },
      "Failed to send company invite email",
    );
  }
};
