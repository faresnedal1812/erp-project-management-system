import { Worker } from "bullmq";
import { workerRedisConnection } from "../config/redis.js";
import transporter from "../config/mail.js";
import env from "../config/env.js";
import logger from "../config/logger.js";
import { welcomeTemplate } from "../templates/welcome.js";
import { verifyEmailTemplate } from "../templates/verifyEmail.js";
import { passwordResetTemplate } from "../templates/passwordReset.js";
import { companyInviteTemplate } from "../templates/companyInvite.js";

/**
 * BullMQ Worker: email
 *
 * Processes jobs from the "email" queue in the background.
 * Each job has a name (the email type) and a data payload.
 * Runs in a separate context from the HTTP request cycle.
 */
const emailWorker = new Worker(
  "email",
  async (job) => {
    const { name, data } = job;

    let mailOptions;

    switch (name) {
      case "email:welcome": {
        const { subject, html, text } = welcomeTemplate(data.firstName);
        mailOptions = { to: data.to, subject, html, text };
        break;
      }

      case "email:verify": {
        const verificationUrl = `${env.clientUrl}/api/v1/auth/verify-email?token=${data.token}`;
        const { subject, html, text } = verifyEmailTemplate(
          data.firstName,
          verificationUrl,
        );
        mailOptions = { to: data.to, subject, html, text };
        break;
      }

      case "email:password-reset": {
        const resetUrl = `${env.clientUrl}/api/v1/auth/reset-password?token=${data.token}`;
        const { subject, html, text } = passwordResetTemplate(
          data.firstName,
          resetUrl,
        );
        mailOptions = { to: data.to, subject, html, text };
        break;
      }

      case "email:company-invite": {
        const inviteUrl = `${env.clientUrl}/api/v1/companies/invites/accept?token=${data.token}`;
        const { subject, html, text } = companyInviteTemplate(
          data.inviterName,
          data.companyName,
          inviteUrl,
        );
        mailOptions = { to: data.to, subject, html, text };
        break;
      }

      default:
        logger.warn({ jobName: name }, "Unknown email job type — skipping");
        return;
    }

    const info = await transporter.sendMail({
      from: env.mailFrom,
      ...mailOptions,
    });

    logger.info(
      { jobId: job.id, jobName: name, messageId: info.messageId, to: data.to },
      "Email sent by worker",
    );
  },
  {
    connection: workerRedisConnection,
    concurrency: 5, // process up to 5 emails in parallel
  },
);

emailWorker.on("completed", (job) =>
  logger.debug({ jobId: job.id, jobName: job.name }, "Email job completed"),
);

// Job Error Listener
emailWorker.on("failed", (job, err) =>
  logger.error(
    { jobId: job?.id, jobName: job?.name, err: err.message },
    "Email job failed",
  ),
);

// Worker Error Listener
emailWorker.on("error", (err) => {
  logger.error({ error: err }, "Email worker error");
});

export default emailWorker;
