import { z } from "zod";

const uuidParam = z.string().trim().pipe(z.uuid("Invalid ID format"));
const dataSchema = z.coerce.date();

// ── Params ────────────────────────────────────────────────────────

export const auditLogIdParamSchema = z.object({
  params: z.object({ id: uuidParam }),
});

// // ── Query ─────────────────────────────────────────────────────────

export const auditLogQuerySchema = z.object({
  query: z.object({
    entityType: z
      .enum([
        "Employee",
        "Role",
        "Department",
        "Company",
        "Project",
        "CompanyMember",
      ])
      .optional(),
    entityId: uuidParam.optional(),
    actorId: uuidParam.optional(),
    action: z.string().trim().optional(),
    from: dataSchema.optional(),
    to: dataSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});
