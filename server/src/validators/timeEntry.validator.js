import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");

// ── Param schemas ─────────────────────────────────────────────────

// Routes that only need task id (GET list, POST start)
export const taskIdParamSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
  }),
});

// Routes that need both task id and entry id (PUT stop, PUT update, DELETE)
export const entryParamSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
    entryId: uuidParam,
  }),
});

// ── Body schemas ──────────────────────────────────────────────────

// POST /tasks/:id/time-entries/start
export const startTimerSchema = taskIdParamSchema.extend({
  body: z
    .object({
      description: z.string().trim().max(500).optional(),
    })
    .strict(),
});

// PUT /tasks/:id/time-entries/:entryId (manual edit)
export const updateTimeEntrySchema = entryParamSchema.extend({
  body: z
    .object({
      description: z.string().trim().max(500).nullable().optional(),
      startedAt: z.coerce.date().optional(),
      endedAt: z.coerce.date().nullable().optional(),
    })
    .strict(),
});
