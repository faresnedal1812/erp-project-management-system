import { Queue } from "bullmq";
import { queueRedisConnection } from "../config/redis.js";

/**
 * BullMQ Queue: email
 *
 * All outbound emails are pushed here as jobs so that the HTTP
 * request cycle is never blocked by SMTP I/O.
 *
 * Job name convention: "email:<type>"
 *   - "email:welcome"        → sendWelcomeEmail
 *   - "email:verify"         → sendVerificationEmail
 *   - "email:password-reset" → sendPasswordResetEmail
 *   - "email:company-invite" → sendCompanyInviteEmail
 */

export const emailQueue = new Queue("email", {
  connection: queueRedisConnection,
  defaultJobOptions: {
    attempts: 3, // retry up to 3 times on failure
    backoff: {
      type: "exponential",
      delay: 5000, // 5s, 25s, 125s
    },
    removeOnComplete: { count: 100 }, // keep last 100 completed jobs
    removeOnFail: { count: 500 }, // keep last 500 failed jobs for inspection
  },
});

// email.service.js => create and add job
// email.queue.js => create and setup queue
// redis => save jobs and thier status, and enable BullMQ to processing it
// email.worker.js => take jobs from redis and excute them
// SMTP server => send emails
