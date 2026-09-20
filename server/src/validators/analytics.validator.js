import { z } from "zod";

const uuidParam = z.string().trim().pipe(z.uuid("Invalid ID format"));
const granularityEnum = z.enum(["day", "week", "month"]).default("week");
const dateSchema = z.coerce.date();

const dateRangeQuerySchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
    granularity: granularityEnum,
  })
  .refine((data) => data.to >= data.from, {
    message: "'from' date must be before or equal 'to' date",
    path: ["from"],
  })
  .refine(
    (data) => {
      const diffDays =
        (data.to.getTime() - data.from.getTime()) / (1000 * 60 * 60 * 24);
      if (data.granularity === "day" && diffDays > 366) return false; // Max 1 year for daily
      if (data.granularity === "week" && diffDays > 366 * 5) return false; // Max 5 years for weekly
      if (data.granularity === "month" && diffDays > 366 * 10) return false; // Max 10 years for monthly
      return true;
    },
    {
      message:
        "The requested date range is too large for the selected granularity.",
      path: ["to"],
    },
  );

// Schemas

/**
 * GET /analytics/overview
 * GET /analytics/tasks
 * GET /analytics/projects/velocity
 * GET /analytics/employees/productivity
 * GET /analytics/meetings
 */
export const analyticsQuerySchema = z.object({
  query: dateRangeQuerySchema,
});

/**
 * GET /analytics/projects/:projectId/velocity
 */
export const projectVelocityQuerySchema = z.object({
  params: z.object({ projectId: uuidParam }),
  query: dateRangeQuerySchema,
});

/**
 * GET /analytics/employees/:employeeId/productivity
 */
export const employeeProductivityQuerySchema = z.object({
  params: z.object({ employeeId: uuidParam }),
  query: dateRangeQuerySchema,
});
