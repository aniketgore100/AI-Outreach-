const express = require("express");
const { Router } = require("express");

const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { sendCampaignSchema } = require("../validators/email.validator");
const { sendCampaign } = require("../controllers/email.controller");

const router = Router();

router.use(express.json({ limit: "60kb" }));
router.use(authenticate);

router.post("/send", validate(sendCampaignSchema), sendCampaign);

module.exports = { emailRoutes: router };
