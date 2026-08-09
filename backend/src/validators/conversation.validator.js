const { z } = require("zod");

const { CONVERSATION_STATUS } = require("../config/constants");

const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(Object.values(CONVERSATION_STATUS)).optional(),
  search: z
    .string()
    .trim()
    .max(200, "Search term is too long")
    .regex(/^[^<>]*$/, "Search term contains invalid characters")
    .optional(),
});

const replyToConversationSchema = z
  .object({
    bodyHtml: z.string().max(200000).optional().default(""),
    bodyText: z.string().max(200000).optional(),
  })
  .refine((data) => (data.bodyHtml && data.bodyHtml.replace(/<[^>]+>/g, "").trim().length > 0) || (data.bodyText ?? "").trim().length > 0, {
    message: "Reply body cannot be empty",
    path: ["bodyHtml"],
  });

const archiveConversationSchema = z.object({
  archived: z.boolean(),
});

module.exports = { listConversationsQuerySchema, replyToConversationSchema, archiveConversationSchema };
