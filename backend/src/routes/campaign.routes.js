const express = require("express");
const { Router } = require("express");

const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  campaignDetailsSchema,
  initialOutreachSchema,
  replyHandlingSchema,
  followUpSchema,
  leadListAssociationSchema,
  scheduleSchema,
  finalizeCampaignSchema,
  listCampaignsQuerySchema,
} = require("../validators/campaign.validator");
const {
  create,
  list,
  getOne,
  updateDetails,
  updateInitialOutreach,
  updateReplyHandling,
  updateFollowUp,
  updateLeadList,
  upsertSchedule,
  finalize,
  activate,
  pause,
  resume,
  getProgress,
} = require("../controllers/campaign.controller");

const router = Router();

router.use(express.json({ limit: "50kb" }));
router.use(authenticate);

router.get("/", validate(listCampaignsQuerySchema, "query"), list);
router.post("/", validate(campaignDetailsSchema), create);
router.get("/:id", getOne);
router.patch("/:id/details", validate(campaignDetailsSchema), updateDetails);
router.patch("/:id/sequence/initial-outreach", validate(initialOutreachSchema), updateInitialOutreach);
router.patch("/:id/sequence/reply-handling", validate(replyHandlingSchema), updateReplyHandling);
router.patch("/:id/sequence/follow-up", validate(followUpSchema), updateFollowUp);
router.patch("/:id/lead-list", validate(leadListAssociationSchema), updateLeadList);
router.put("/:id/schedule", validate(scheduleSchema), upsertSchedule);
router.post("/:id/finalize", validate(finalizeCampaignSchema), finalize);
router.post("/:id/activate", activate);
router.post("/:id/pause", pause);
router.post("/:id/resume", resume);
router.get("/:id/progress", getProgress);

module.exports = { campaignRoutes: router };
