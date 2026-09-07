const { Router } = require("express");

const { authRoutes } = require("./auth.routes");
const { gmailConnectionRoutes } = require("./gmail-connection.routes");
const { leadListRoutes } = require("./lead-list.routes");
const { emailRoutes } = require("./email.routes");
const { templateRoutes } = require("./template.routes");
const { campaignRoutes } = require("./campaign.routes");
const { conversationRoutes } = require("./conversation.routes");
const { googleOAuthCallback } = require("../controllers/gmail-connection.controller");

const router = Router();

router.get("/connections/google/callback", googleOAuthCallback);
router.use("/auth", authRoutes);
router.use("/gmail-connections", gmailConnectionRoutes);
router.use("/lead-lists", leadListRoutes);
router.use("/emails", emailRoutes);
router.use("/templates", templateRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/conversations", conversationRoutes);

module.exports = { v1Router: router };
