const express = require("express");
const { Router } = require("express");

const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
  sendTestEmailSchema,
} = require("../validators/template.validator");
const { create, list, getOne, update, remove, duplicate, sendTest } = require("../controllers/template.controller");

const router = Router();


router.use(express.json({ limit: "300kb" }));
router.use(authenticate);

router.get("/", validate(listTemplatesQuerySchema, "query"), list);
router.post("/", validate(createTemplateSchema), create);
router.get("/:id", getOne);
router.patch("/:id", validate(updateTemplateSchema), update);
router.delete("/:id", remove);
router.post("/:id/duplicate", duplicate);
router.post("/:id/send-test", validate(sendTestEmailSchema), sendTest);

module.exports = { templateRoutes: router };
