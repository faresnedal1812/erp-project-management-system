import { z } from "zod";

const uuidParam = z.string().trim().pipe(z.uuid("Invalid ID format"));
const dateSchema = z.coerce.date();
const formatEnum = z.enum(["json", "csv", "excel", "pdf"]).default("json");
const groupByEnum = z.enum(["project", "employee"]).default("project");

// ── Shared date-range + format ──────────────────────────────────

const dateRangeBase = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    format: formatEnum,
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, {
    message: "'from' must be before or equal to 'to'",
    path: ["from"],
  });

// ── Schemas ─────────────────────────────────────────────────────

/** GET /reports/projects/:projectId/progress */
export const projectProgressSchema = z.object({
  params: z.object({ projectId: uuidParam }),
  query: dateRangeBase,
});

/** GET /reports/employees/workload */
export const employeeWorkloadSchema = z.object({
  query: dateRangeBase.safeExtend({
    employeeId: uuidParam.optional(),
  }),
});

/** GET /reports/time-tracking */
export const timeTrackingSchema = z.object({
  query: dateRangeBase.safeExtend({
    projectId: uuidParam.optional(),
    employeeId: uuidParam.optional(),
    groupBy: groupByEnum,
  }),
});

/** GET /reports/clients/:clientId/activity */
export const clientActivitySchema = z.object({
  params: z.object({ clientId: uuidParam }),
  query: dateRangeBase,
});

/** GET /reports/vendors/:vendorId/agreements */
export const vendorAgreementsSchema = z.object({
  params: z.object({ vendorId: uuidParam }),
  query: dateRangeBase,
});
