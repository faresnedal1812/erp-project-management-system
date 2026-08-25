import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");
const dateSchema = z.coerce.date().optional();

// Schema for routes that only need the project ID param
export const projectIdParamSchema = z.object({
  params: z.object({
    id: uuidParam,
  }),
});

// Schema for routes that need both project ID and milestone ID
export const milestoneParamSchema = z.object({
  params: z.object({
    id: uuidParam,
    milestoneId: uuidParam,
  }),
});

export const createMilestoneSchema = z.object({
  params: z.object({
    id: uuidParam,
  }),
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    description: z.string().trim().optional(),
    dueDate: dateSchema,
  }),
});

export const updateMilestoneSchema = z.object({
  params: z.object({
    id: uuidParam,
    milestoneId: uuidParam,
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    description: z.string().trim().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    isCompleted: z.boolean().optional(),
  }),
});
