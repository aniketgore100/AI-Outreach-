const { Router } = require("express");

const { authRoutes } = require("./auth.routes");
const { gmailConnectionRoutes } = require("./gmail-connection.routes");
const { leadListRoutes } = require("./lead-list.routes");
const { googleOAuthCallback } = require("../controllers/gmail-connection.controller");

const router = Router();

router.get("/connections/google/callback", googleOAuthCallback);
router.use("/auth", authRoutes);
router.use("/gmail-connections", gmailConnectionRoutes);
router.use("/lead-lists", leadListRoutes);

module.exports = { v1Router: router };
