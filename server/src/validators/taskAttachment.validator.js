import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");

// Routes that only need task id (GET list, POST upload)
export const taskIdParamSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
  }),
});

// Routes that need both task id and attachment id (DELETE)
export const attachmentParamSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
    attachmentId: uuidParam,
  }),
});
