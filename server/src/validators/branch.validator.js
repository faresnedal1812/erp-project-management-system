import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");

// ── Branch CRUD ───────────────────────────────────────────────

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Branch name must be at least 2 characters").trim(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]+$/, "Code must contain only letters, digits, _ or -")
      .optional(),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    country: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().email("Must be a valid email").optional(),
    isHeadquarters: z.boolean().optional(),
  }),
});

export const updateBranchSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]+$/, "Code must contain only letters, digits, _ or -")
      .optional(),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    country: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().email("Must be a valid email").optional(),
    isHeadquarters: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const branchIdParamSchema = z.object({
  params: z.object({ id: uuidParam }),
});

export const branchListQuerySchema = z.object({
  params: z.object({
    includeInactive: z.enum(["true", "false"]).optional(),
  }),
});
