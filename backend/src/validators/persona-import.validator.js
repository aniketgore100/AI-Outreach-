const { z } = require("zod");

const { PERSONA_TIME_PERIOD_PRESET } = require("../config/constants");

const objectIdSchema = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const timePeriodSchema = z
  .object({
    preset: z.enum(Object.values(PERSONA_TIME_PERIOD_PRESET)),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.preset !== PERSONA_TIME_PERIOD_PRESET.CUSTOM) return;

    if (!data.from) {
      ctx.addIssue({ code: "custom", message: "Start date is required for a custom range", path: ["from"] });
    }
    if (!data.to) {
      ctx.addIssue({ code: "custom", message: "End date is required for a custom range", path: ["to"] });
    }
    if (data.from && data.to && data.from >= data.to) {
      ctx.addIssue({ code: "custom", message: "End date must be after start date", path: ["to"] });
    }
  });

const startImportSchema = z.object({
  timePeriod: timePeriodSchema,
});

const updateSelectionSchema = z
  .object({
    includeAll: z.boolean().optional(),
    updates: z
      .array(
        z.object({
          id: objectIdSchema,
          included: z.boolean(),
        })
      )
      .max(500)
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.includeAll === undefined && !data.updates) {
      ctx.addIssue({ code: "custom", message: "Provide either includeAll or updates", path: ["updates"] });
    }
  });

const listCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

module.exports = {
  objectIdSchema,
  startImportSchema,
  updateSelectionSchema,
  listCandidatesQuerySchema,
};
