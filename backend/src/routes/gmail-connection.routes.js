const express = require("express");
const { Router } = require("express");

const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { startGoogleOAuthSchema } = require("../validators/gmail-connection.validator");
const { list, startGoogleOAuth, googleOAuthCallback, disconnect } = require("../controllers/gmail-connection.controller");

const router = Router();

router.use(express.json({ limit: "10kb" }));

router.get("/google/callback", googleOAuthCallback);
router.get("/connections/google/callback", googleOAuthCallback);

router.use(authenticate);

router.get("/", list);
router.post("/google/start", validate(startGoogleOAuthSchema), startGoogleOAuth);
router.post("/:id/disconnect", disconnect);

module.exports = { gmailConnectionRoutes: router };
