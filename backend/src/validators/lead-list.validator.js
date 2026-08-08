const { z } = require("zod");

const { STANDARD_LEAD_FIELDS, LEAD_IMPORT_LIMITS } = require("../config/constants");

const targetFieldEnum = z.enum([...STANDARD_LEAD_FIELDS, "customFields", "ignored"]);

// Shared search-query validation: trims and length-caps the input, then
// rejects '<' / '>' outright as defense-in-depth against XSS if this value
// is ever reflected back into HTML (logs, emails, admin tooling, etc).
// Regex-injection and ReDoS are handled separately at the query-building
// layer via escapeRegex (see repositories/lead-list.repository.js).
const safeSearchQuerySchema = z
  .string()
  .trim()
  .max(200, "Search term is too long")
  .regex(/^[^<>]*$/, "Search term contains invalid characters")
  .optional();

const columnMappingEntrySchema = z.object({
  sourceColumn: z.string().trim().min(1),
  targetField: targetFieldEnum,
});

const leadInputSchema = z.object({
  firstName: z.string().trim().max(200).optional(),
  lastName: z.string().trim().max(200).optional(),
  email: z.string().trim().max(320).optional(),
  companyName: z.string().trim().max(200).optional(),
  jobTitle: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  linkedinUrl: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(50).optional(),
  website: z.string().trim().max(500).optional(),
  customFields: z.record(z.string(), z.string().max(500)).optional(),
});

const createLeadListSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(150),
    uploadMetadata: z.object({
      originalFileName: z.string().trim().min(1),
      fileType: z.enum(["csv", "xlsx", "xls"]),
      fileSizeBytes: z.coerce.number().int().nonnegative().optional(),
      totalRows: z.coerce.number().int().nonnegative(),
    }),
    columnMapping: z.array(columnMappingEntrySchema).default([]),
    leads: z
      .array(leadInputSchema)
      .min(1, "At least one lead row is required")
      .max(
        LEAD_IMPORT_LIMITS.MAX_LEADS_PER_IMPORT,
        `A single import can contain at most ${LEAD_IMPORT_LIMITS.MAX_LEADS_PER_IMPORT} leads`
      ),
  })
  .refine((data) => data.columnMapping.some((entry) => entry.targetField === "email"), {
    message: "Map at least one column to Email before importing",
    path: ["columnMapping"],
  });

const listLeadListsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: safeSearchQuerySchema,
});

const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  search: safeSearchQuerySchema,
  companyName: z.string().trim().max(200).optional(),
  jobTitle: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
});

module.exports = {
  createLeadListSchema,
  listLeadListsQuerySchema,
  listLeadsQuerySchema,
};
