const express = require("express");
const { Router } = require("express");

const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createLeadListSchema,
  listLeadListsQuerySchema,
  listLeadsQuerySchema,
} = require("../validators/lead-list.validator");
const { create, list, getOne, remove, listLeads, getLead } = require("../controllers/lead-list.controller");

const router = Router();

// Larger body limit than other routers — this carries the fully-parsed
// CSV/XLSX rows as JSON (parsing happens client-side, see frontend).
router.use(express.json({ limit: "15mb" }));
router.use(authenticate);

router.get("/", validate(listLeadListsQuerySchema, "query"), list);
router.post("/", validate(createLeadListSchema), create);
router.get("/:id", getOne);
router.delete("/:id", remove);
router.get("/:id/leads", validate(listLeadsQuerySchema, "query"), listLeads);
router.get("/:id/leads/:leadId", getLead);

module.exports = { leadListRoutes: router };
