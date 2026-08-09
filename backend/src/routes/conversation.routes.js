const express = require("express");
const { Router } = require("express");

const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  listConversationsQuerySchema,
  replyToConversationSchema,
  archiveConversationSchema,
} = require("../validators/conversation.validator");
const { list, getOne, reply, markRead, setArchived } = require("../controllers/conversation.controller");

const router = Router();

router.use(express.json({ limit: "300kb" }));
router.use(authenticate);

router.get("/", validate(listConversationsQuerySchema, "query"), list);
router.get("/:id", getOne);
router.post("/:id/reply", validate(replyToConversationSchema), reply);
router.patch("/:id/read", markRead);
router.patch("/:id/archive", validate(archiveConversationSchema), setArchived);

module.exports = { conversationRoutes: router };
