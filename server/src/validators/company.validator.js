import { z } from "zod";

// Re-usable UUID param
const uuidParam = z.string().uuid("Invalid ID format");

// ── Company CRUD ─────────────────────────────────────────────

export const createCompanySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Company name must be at least 2 characters")
      .trim(),
    industry: z.string().trim().optional(),
    website: z.string().url("Website must be a valid URL").optional(),
    email: z.string().email("Must be a valid email").optional(),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    logo: z.string().url("Logo must be a valid URL").optional(),
  }),
});

export const updateCompanySchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    industry: z.string().trim().optional(),
    website: z.string().url("Website must be a valid URL").optional(),
    email: z.string().email("Must be a valid email").optional(),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    logo: z.string().url("Logo must be a valid URL").optional(),
    isActive: z.boolean().optional(),
  }),
});

export const companyIdParamSchema = z.object({
  params: z.object({ id: uuidParam }),
});

// ── Member management ────────────────────────────────────────

export const addMemberSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    userId: uuidParam,
    role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional(),
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({
    id: uuidParam,
    userId: uuidParam,
  }),
  body: z.object({
    role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  }),
});

export const removeMemberSchema = z.object({
  params: z.object({
    id: uuidParam,
    userId: uuidParam,
  }),
});
