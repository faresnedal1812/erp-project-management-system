import { z } from "zod";

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID"),
  }),
  body: z
    .object({
      firstName: z
        .string()
        .min(2, "First name must be at least 2 characters")
        .optional(),
      lastName: z
        .string()
        .min(2, "Last name must be at least 2 characters")
        .optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field to update must be provided",
    }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID"),
  }),
});

export const assignRolesSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID"),
  }),
  body: z.object({
    roleIds: z
      .array(z.string().uuid("Each role ID must be a valid UUID"))
      .min(1, "At least one role ID is required"),
  }),
});
