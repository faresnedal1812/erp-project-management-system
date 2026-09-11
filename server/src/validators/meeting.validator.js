import { z } from "zod";

const uuidParam = z.string().trim().pipe(z.uuid("Invalid ID format"));
const dateSchema = z.iso.datetime({ offset: true }).pipe(z.coerce.date());
const urlSchema = z.union([
  z.literal(""),
  z.string().trim().pipe(z.url("Invalid URL")),
]);

const meetingCoreSchema = {
  title: z
    .string()
    .trim()
    .min(2, "Meeting title must be at least 2 characters long")
    .max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  type: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]).optional(),
  startTime: dateSchema,
  endTime: dateSchema,
  location: z.string().trim().max(255).nullable().optional(),
  meetingUrl: urlSchema.nullable().optional(),
};

// // ── Params ────────────────────────────────────────────────────────

export const meetingIdParamSchema = z.object({
  params: z.object({ id: uuidParam }),
});

export const attendeeParamSchema = z.object({
  params: z.object({
    id: uuidParam, // meeting id
    attendeeId: uuidParam,
  }),
});

// // ── Queries ───────────────────────────────────────────────────────

export const meetingQuerySchema = z.object({
  query: z.object({
    type: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]).optional(),
    status: z
      .enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
      .optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const calendarQuerySchema = z.object({
  query: z
    .object({
      from: dateSchema,
      to: dateSchema,
    })
    .refine((data) => new Date(data.to) > new Date(data.from), {
      message: "'to' must be after 'from'",
      path: ["to"],
    }),
});

// // ── Create ────────────────────────────────────────────────────────

export const createMeetingSchema = z.object({
  body: z
    .object(meetingCoreSchema)
    .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
      message: "endTime must be after startTime",
      path: ["endTime"],
    }),
});

// // ── Update ────────────────────────────────────────────────────────

export const updateMeetingSchema = meetingIdParamSchema.extend({
  body: z
    .object(meetingCoreSchema)
    .partial()
    .extend({
      status: z
        .enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
        .optional(),
    })
    .refine(
      (data) => {
        if (data.startTime && data.endTime) {
          return new Date(data.endTime) > new Date(data.startTime);
        }
        return true;
      },
      {
        message: "endTime must be after startTime",
        path: ["endTime"],
      },
    ),
});

// // ── Attendee ──────────────────────────────────────────────────────

export const addAttendeeSchema = meetingIdParamSchema.extend({
  body: z
    .object({
      type: z.enum(["EMPLOYEE", "CLIENT", "VENDOR"]),
      employeeId: uuidParam.optional(),
      clientId: uuidParam.optional(),
      vendorId: uuidParam.optional(),
    })
    .refine(
      (data) => {
        if (data.type === "EMPLOYEE")
          return !!data.employeeId && !data.clientId && !data.vendorId;
        if (data.type === "CLIENT")
          return !data.employeeId && !!data.clientId && !data.vendorId;
        if (data.type === "VENDOR")
          return !data.employeeId && !data.clientId && !!data.vendorId;
        return false;
      },
      {
        message:
          "Exactly one of employeeId / clientId / vendorId must be provided and must match the declared type",
      },
    ),
});
