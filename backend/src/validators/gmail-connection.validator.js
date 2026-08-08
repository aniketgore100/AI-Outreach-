const { z } = require("zod");

const startGoogleOAuthSchema = z.object({
  loginHint: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
});

module.exports = { startGoogleOAuthSchema };
