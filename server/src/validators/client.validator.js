import { z } from "zod";

// ── Shared schemas ───────────────────────────────────────────────

const clientCoreSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  contactName: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
  website: z.string().trim().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().trim().max(255).optional(),
  industry: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

// ── Params & Queries ─────────────────────────────────────────────

export const clientIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().uuid("Invalid client ID"),
  }),
});

export const clientQuerySchema = z.object({
  query: z.object({
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

// ── Combined HTTP schemas ────────────────────────────────────────

export const createClientSchema = z.object({
  body: clientCoreSchema,
});

export const updateClientSchema = z.object({
  params: z.object({
    id: z.string().trim().uuid("Invalid client ID"),
  }),
  body: clientCoreSchema
    .partial() // Make all client core schema fields to be optional for partial updates
    .extend({ status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional() }),
});
