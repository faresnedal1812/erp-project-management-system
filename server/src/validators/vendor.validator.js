import { z } from "zod";

// ── Shared helpers ────────────────────────────────────────────────
const uuidParam = z.string().trim().pipe(z.uuid("Invalid ID format"));

const emailSchema = z.union([
  z.literal(""),
  z.string().trim().pipe(z.email("Invalid email address")),
]);

const urlSchema = z.union([
  z.literal(""),
  z.string().trim().pipe(z.url("Invalid URL")),
]);

const vendorCoreFields = {
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  type: z
    .enum(["CONTRACTOR", "SUPPLIER", "SERVICE_PROVIDER", "CONSULTANT", "OTHER"])
    .optional(),
  contactName: z.string().trim().max(100).optional(),
  email: emailSchema.optional(),
  phone: z.string().trim().max(20).optional(),
  website: urlSchema.optional(),
  address: z.string().trim().max(255).optional(),
  taxId: z.string().trim().max(50).optional(),
  paymentTerms: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
};

// ── Params & Query ────────────────────────────────────────────────
export const vendorIdParamSchema = z.object({
  params: z.object({
    id: uuidParam,
  }),
});

export const vendorQuerySchema = z.object({
  query: z.object({
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
    type: vendorCoreFields.type,
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

// ── Create & Update ───────────────────────────────────────────────
export const createVendorSchema = z.object({
  body: z.object(vendorCoreFields),
});

export const updateVendorSchema = vendorIdParamSchema.extend({
  body: z
    .object(vendorCoreFields)
    .partial()
    .extend({ status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional() }),
});

// export const updateVendorSchema = z.object({
//   params: z.object({
//     id: uuidParam,
//   }),
//   body: z.object({
//     ...vendorCoreFields,
//     name: vendorCoreFields.name.optional(),
//     status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
//   }),
// });
