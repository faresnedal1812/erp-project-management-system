import { z } from "zod";

export const createPermissionSchema = z.object({
  body: z.object({
    action: z
      .string()
      .min(2, "Action must be at least 2 characters")
      .toUpperCase(),
    resource: z
      .string()
      .min(2, "Resource must be at least 2 characters")
      .toUpperCase(),
    description: z.string().optional(),
  }),
});

export const permissionIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid permission ID"),
  }),
});
