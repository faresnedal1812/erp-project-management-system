import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");

// ── Settings ─────────────────────────────────────────────────

export const upsertSettingsSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    timezone: z.string().trim().optional(),
    language: z.string().trim().min(2).max(10).optional(),
    currency: z.string().trim().min(3).max(10).optional(),
    dateFormat: z.string().trim().optional(),
  }),
});

export const settingsParamSchema = z.object({
  params: z.object({ id: uuidParam }),
});

// ── Invites ──────────────────────────────────────────────────

export const sendInviteSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    email: z.string().email("Must be a valid email address"),
    role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional(),
  }),
});

export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Invite token is required"),
  }),
});

export const cancelInviteSchema = z.object({
  params: z.object({
    id: uuidParam, // companyId
    inviteId: uuidParam,
  }),
});

export const listInvitesSchema = z.object({
  params: z.object({ id: uuidParam }),
});
