import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");

// ── Param schemas ─────────────────────────────────────────────────

// Routes that only need task id (GET list, POST create)
export const taskIdParamSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
  }),
});

// Routes that need both task id and comment id (PUT update, DELETE)
export const commentParamSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
    commentId: uuidParam,
  }),
});

// ── Body schemas ──────────────────────────────────────────────────

export const createCommentSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
  }),
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, "Comment cannot be empty")
      .max(5000, "Comment cannot exceed 5000 characters"),
  }),
});

export const updateCommentSchema = commentParamSchema.extend({
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, "Comment cannot be empty")
      .max(5000, "Comment cannot exceed 5000 characters"),
  }),
});
