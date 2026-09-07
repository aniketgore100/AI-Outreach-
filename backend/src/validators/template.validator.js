const { z } = require("zod");

const { TEMPLATE_STATUS } = require("../config/constants");

const statusEnum = z.enum([TEMPLATE_STATUS.DRAFT, TEMPLATE_STATUS.ACTIVE]);

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  subject: z.string().trim().max(300).optional().default(""),
  bodyHtml: z.string().max(200000).optional().default(""),
  status: statusEnum.optional().default(TEMPLATE_STATUS.DRAFT),
});

const updateTemplateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(150).optional(),
    subject: z.string().trim().max(300).optional(),
    bodyHtml: z.string().max(200000).optional(),
    status: statusEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No changes provided" });

const listTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z
    .string()
    .trim()
    .max(200, "Search term is too long")
    .regex(/^[^<>]*$/, "Search term contains invalid characters")
    .optional(),
  status: statusEnum.optional(),
});

const sendTestEmailSchema = z.object({
  gmailConnectionId: z.string().trim().min(1, "gmailConnectionId is required"),
  recipientEmail: z.string().trim().email("Enter a valid recipient email address"),
});

module.exports = { createTemplateSchema, updateTemplateSchema, listTemplatesQuerySchema, sendTestEmailSchema };
