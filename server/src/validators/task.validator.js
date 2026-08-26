import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");

// ── Param schemas ────────────────────────────────────────────────

export const projectIdParamSchema = z.object({
  params: z.object({
    id: uuidParam, // project id
  }),
});

export const taskIdParamSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
  }),
});

// ── Body schemas ─────────────────────────────────────────────────

const TaskStatusEnum = z.enum([
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
]);

const TaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const createTaskSchema = z.object({
  params: z.object({
    id: uuidParam, // project id
  }),
  body: z
    .object({
      title: z.string().trim().min(2, "Title must be at least 2 characters"),
      description: z.string().trim().optional(),
      milestoneId: uuidParam.optional(),
      priority: TaskPriorityEnum.optional(),
      status: TaskStatusEnum.optional(),
      dueDate: z.coerce.date().optional(),
      estimatedHours: z
        .number({ invalid_type_error: "Task estimated hours must be a number" })
        .nonnegative("Estimated hours must be non-negative")
        .optional(),
    })
    .strict(),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
  }),
  body: z
    .object({
      title: z.string().trim().min(2).optional(),
      description: z.string().trim().nullable().optional(),
      milestoneId: uuidParam.nullable().optional(),
      priority: TaskPriorityEnum.optional(),
      status: TaskStatusEnum.optional(),
      dueDate: z.coerce.date().nullable().optional(),
      estimatedHours: z
        .number({ invalid_type_error: "Task estimated hours must be a number" })
        .nonnegative("Estimated hours must be non-negative")
        .nullable()
        .optional(),
    })
    .strict(),
});

export const getTasksQuerySchema = z.object({
  params: z.object({
    id: uuidParam, // project id
  }),
  query: z.object({
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    milestoneId: uuidParam.optional(),
    assignedToMe: z.enum(["true", "false"]).optional(),
  }),
});
