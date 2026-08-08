const { z } = require("zod");

const sendCampaignSchema = z.object({
  leadListId: z.string().trim().min(1, "leadListId is required"),
  gmailConnectionId: z.string().trim().min(1, "gmailConnectionId is required"),
  subject: z.string().trim().min(1, "Subject is required").max(300),
  body: z.string().trim().min(1, "Body is required").max(50000),
});

module.exports = { sendCampaignSchema };
