import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");

// ── Department CRUD ───────────────────────────────────────────

export const createDepartmentSchema = z.object({
  body: z.object({
    branchId: uuidParam,
    parentId: uuidParam.optional(),
    name: z
      .string()
      .min(2, "Department name must be at least 2 characters")
      .trim(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]+$/, "Code must contain only letters, digits, _ or -")
      .optional(),
    description: z.string().trim().optional(),
  }),
});

export const updateDepartmentSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    parentId: uuidParam.nullable().optional(),
    name: z.string().min(2).trim().optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]+$/, "Code must contain only letters, digits, _ or -")
      .optional(),
    description: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const departmentIdParamSchema = z.object({
  params: z.object({ id: uuidParam }),
});

export const departmentsByBranchSchema = z.object({
  params: z.object({ branchId: uuidParam }),
  query: z.object({
    includeInactive: z.enum(["true", "false"]).optional(),
  }),
});
