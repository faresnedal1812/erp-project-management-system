import { z } from "zod";

// ── Param schemas ───────────────────────────────────────────────

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid notification ID"),
  }),
});

// ── Query schemas ───────────────────────────────────────────────

export const notificationQuerySchema = z.object({
  query: z.object({
    type: z
      .enum([
        "TASK_ASSIGNED",
        "TASK_STATUS_CHANGED",
        "COMMENT_ADDED",
        "MILESTONE_COMPLETED",
        "PROJECT_STATUS_CHANGED",
        "MENTION",
      ])
      .optional(),
    isRead: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});
