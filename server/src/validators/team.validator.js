import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");

// ── Team CRUD ─────────────────────────────────────────────────

export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Team name must be at least 2 characters").trim(),
    description: z.string().trim().optional(),
  }),
});

export const updateTeamSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    description: z.string().trim().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const teamIdParamSchema = z.object({
  params: z.object({ id: uuidParam }),
});

// ── Team Members ──────────────────────────────────────────────

export const addMemberSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    employeeId: uuidParam,
    role: z.enum(["LEAD", "MEMBER"]).optional(),
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({ id: uuidParam, employeeId: uuidParam }),
  body: z.object({
    role: z.enum(["LEAD", "MEMBER"]),
  }),
});

export const removeMemberSchema = z.object({
  params: z.object({ id: uuidParam, employeeId: uuidParam }),
});
