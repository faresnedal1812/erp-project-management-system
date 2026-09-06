import { z } from "zod";

const uuidParam = z.string().trim().uuid("Invalid ID format");

// ── Query filter schema (shared by both endpoints) ────────────

const activityFilterSchema = z.object({
  action: z.string().trim().optional(),
  employeeId: uuidParam.optional(),
  taskId: uuidParam.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z
    .string()
    .regex(/^[1-9]\d*$/, "Limit must be a positive integer")
    .optional(),
  cursor: uuidParam.optional(),
});

// GET /projects/:id/activity
export const projectActivitySchema = z.object({
  params: z.object({
    id: uuidParam, // project id
  }),
  query: activityFilterSchema,
});

// GET /tasks/:id/activity
export const taskActivitySchema = z.object({
  params: z.object({
    id: uuidParam, // task id
  }),
  query: activityFilterSchema,
});
