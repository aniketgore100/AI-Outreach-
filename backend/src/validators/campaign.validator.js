const { z } = require("zod");

const { CAMPAIGN_STATUS, CAMPAIGN_REPLY_METHOD, CAMPAIGN_WEEKDAYS } = require("../config/constants");

const objectIdSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const timeSchema = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format");

function isValidTimeZone(timeZone) {
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const campaignDetailsSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required").max(150),
  description: z.string().trim().max(2000).optional().default(""),
});

const initialOutreachSchema = z.object({
  templateId: objectIdSchema,
});

const replyHandlingSchema = z
  .object({
    method: z.enum([CAMPAIGN_REPLY_METHOD.MANUAL, CAMPAIGN_REPLY_METHOD.AI, CAMPAIGN_REPLY_METHOD.TEMPLATE]),
    templateId: objectIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === CAMPAIGN_REPLY_METHOD.TEMPLATE && !data.templateId) {
      ctx.addIssue({ code: "custom", message: "Select a reply template", path: ["templateId"] });
    }
  });

const followUpSchema = z
  .object({
    enabled: z.boolean(),
    templateId: objectIdSchema.optional(),
    delayDays: z.coerce.number().int().min(1).max(365).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;
    if (!data.templateId) {
      ctx.addIssue({ code: "custom", message: "Select a follow-up template", path: ["templateId"] });
    }
    if (!data.delayDays) {
      ctx.addIssue({ code: "custom", message: "Enter a valid delay in days", path: ["delayDays"] });
    }
  });

const leadListAssociationSchema = z.object({
  leadListId: objectIdSchema,
});

const scheduleSchema = z
  .object({
    startTime: timeSchema,
    endTime: timeSchema,
    weekdays: z.array(z.enum(CAMPAIGN_WEEKDAYS)).min(1, "Choose at least one active day"),
    timeZone: z
      .string()
      .trim()
      .min(1, "Time zone is required")
      .max(100)
      .refine(isValidTimeZone, "Invalid time zone"),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be later than start time",
    path: ["endTime"],
  });

const finalizeCampaignSchema = z.object({
  mode: z.enum(["draft", "launch"]),
});

const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z
    .string()
    .trim()
    .max(200, "Search term is too long")
    .regex(/^[^<>]*$/, "Search term contains invalid characters")
    .optional(),
  status: z.enum(Object.values(CAMPAIGN_STATUS)).optional(),
});

module.exports = {
  campaignDetailsSchema,
  initialOutreachSchema,
  replyHandlingSchema,
  followUpSchema,
  leadListAssociationSchema,
  scheduleSchema,
  finalizeCampaignSchema,
  listCampaignsQuerySchema,
};
