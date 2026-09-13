import { z } from "zod";

const uuidParam = z.string().trim().pipe(z.uuid("Invalid ID format"));

const SCOPES = ["COMPANY", "PROJECT", "CLIENT", "VENDOR"];
const CATEGORIES = [
  "CONTRACT",
  "INVOICE",
  "REPORT",
  "AGREEMENT",
  "POLICY",
  "OTHER",
];

// ── Params ────────────────────────────────────────────────────────

export const documentIdParamSchema = z.object({
  params: z.object({ id: uuidParam }),
});

// ── Query ─────────────────────────────────────────────────────────

export const documentQuerySchema = z.object({
  query: z.object({
    scope: z.enum(SCOPES).optional(),
    category: z.enum(CATEGORIES).optional(),
    projectId: uuidParam.optional(),
    clientId: uuidParam.optional(),
    vendorId: uuidParam.optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

// ── Upload (multipart form fields) ────────────────────────────────

export const uploadDocumentSchema = z.object({
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(2, "Document title must be at least 2 characters long")
        .max(200),
      description: z.string().trim().max(2000).optional(),
      scope: z.enum(SCOPES).default("COMPANY"),
      category: z.enum(CATEGORIES).default("OTHER"),
      projectId: uuidParam.optional(),
      clientId: uuidParam.optional(),
      vendorId: uuidParam.optional(),
    })
    .superRefine((d, ctx) => {
      if (d.scope === "PROJECT" && !d.projectId)
        ctx.addIssue({
          code: "custom", // to tell zod that the error is a custom error
          message: "projectId is required when scope is PROJECT",
          path: ["projectId"],
        });
      if (d.scope === "CLIENT" && !d.clientId)
        ctx.addIssue({
          code: "custom",
          message: "clientId is required when scope is CLIENT",
          path: ["clientId"],
        });
      if (d.scope === "VENDOR" && !d.vendorId)
        ctx.addIssue({
          code: "custom",
          message: "vendorId is required when scope is VENDOR",
          path: ["vendorId"],
        });
    }),
});

// ── Update (metadata only) ────────────────────────────────────────

export const updateDocumentSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    title: z
      .string()
      .trim()
      .min(2, "Document title must be at least 2 characters long")
      .max(200)
      .optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    category: z.enum(CATEGORIES).optional(),
  }),
});
