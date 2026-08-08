const express = require("express");
const { Router } = require("express");

const { register, login, logout, me, refresh } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authRateLimiter } = require("../middleware/rate-limit.middleware");
const { validate } = require("../middleware/validate.middleware");
const { loginSchema, registerSchema } = require("../validators/auth.validator");

const router = Router();

router.use(express.json({ limit: "10kb" }));
router.use(express.urlencoded({ extended: true, limit: "10kb" }));

router.post("/register", authRateLimiter, validate(registerSchema), register);
router.post("/login", authRateLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", authRateLimiter, refresh);
router.get("/me", authenticate, me);

module.exports = { authRoutes: router };
