const express = require("express");
const { Router } = require("express");

const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { startImportSchema, updateSelectionSchema, listCandidatesQuerySchema } = require("../validators/persona-import.validator");
const { startImport, listSets, listCandidates, updateSelection, confirmImport } = require("../controllers/persona-import.controller");

const router = Router();

router.use(express.json({ limit: "50kb" }));
router.use(authenticate);

// Mounted at /gmail-connections — every import is scoped to one connected
// account (PRD 5.1), never to the platform userId alone.
router.post("/:gmailConnectionId/persona-import", validate(startImportSchema), startImport);
router.get("/:gmailConnectionId/persona-import", listSets);
router.get("/persona-import/:setId/candidates", validate(listCandidatesQuerySchema, "query"), listCandidates);
router.patch("/persona-import/:setId/candidates", validate(updateSelectionSchema), updateSelection);
router.post("/persona-import/:setId/confirm", confirmImport);

module.exports = { personaImportRoutes: router };
