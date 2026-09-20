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
  });

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
