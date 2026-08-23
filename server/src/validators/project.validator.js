import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");
const dateSchema = z.string().datetime().or(z.date()).optional();

export const projectIdParamSchema = z.object({
  params: z.object({
    id: uuidParam,
  }),
});

export const getAllProjectsSchema = z.object({
  query: z.object({
    includeInactive: z.enum(["true", "false"]).optional(),
  }),
});

export const createProjectSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, "Name must be at least 2 characters"),
      description: z.string().trim().optional(),
      teamId: uuidParam.optional(),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
      startDate: dateSchema,
      dueDate: dateSchema,
    })
    .refine(
      (data) => {
        if (data.startDate && data.dueDate) {
          return new Date(data.dueDate) > new Date(data.startDate);
        }
        return true;
      },
      {
        message: "Due date must be after the start date",
        path: ["dueDate"],
      },
    ),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: uuidParam,
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .optional(),
      description: z.string().trim().nullable().optional(),
      teamId: uuidParam.nullable().optional(),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
      isActive: z.boolean().optional(),
      status: z
        .enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"])
        .optional(),
      startDate: dateSchema.nullable().optional(),
      dueDate: dateSchema.nullable().optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.dueDate) {
          return new Date(data.dueDate) > new Date(data.startDate);
        }
        return true;
      },
      {
        message: "Due date must be after the start date",
        path: ["dueDate"],
      },
    ),
});
