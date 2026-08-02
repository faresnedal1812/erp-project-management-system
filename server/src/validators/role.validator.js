import { z } from "zod";

export const createRoleSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Role name must be at least 2 characters")
      .toUpperCase(),
    description: z.string().optional(),
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid role ID"),
  }),
  body: z.object({
    name: z.string().min(2).toUpperCase().optional(),
    description: z.string().optional(),
  }),
});

export const roleIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid role ID"),
  }),
});

export const assignPermissionsSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid role ID"),
  }),
  body: z.object({
    permissionIds: z
      .array(z.string().uuid("Each permission ID must be a valid UUID"))
      .min(1, "At least one permission ID is required"),
  }),
});
