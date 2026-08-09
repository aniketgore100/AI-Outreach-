const mongoose = require("mongoose");

const { MESSAGE_DIRECTION } = require("../config/constants");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    // Denormalized for tenant-scoped queries without a join, same pattern
    // used across the other collections.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: Object.values(MESSAGE_DIRECTION),
      required: true,
    },
    gmailMessageId: {
      type: String,
      required: true,
    },
    // RFC822 Message-ID header (e.g. "<abc@mail.gmail.com>") — set on inbound
    // messages so a reply can correctly set In-Reply-To/References. Outbound
    // messages we send ourselves don't need it for anything today.
    rfc822MessageId: {
      type: String,
      default: null,
    },
    fromEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    toEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    subject: {
      type: String,
      default: "",
    },
    bodyHtml: {
      type: String,
      default: "",
    },
    bodyText: {
      type: String,
      default: "",
    },
    snippet: {
      type: String,
      default: "",
    },
    sentAt: {
      type: Date,
      required: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "messages" }
);

// Guards against double-processing the same Gmail message (e.g. an outbound
// send re-appearing in a later history.list page) rather than duplicating it.
messageSchema.index({ conversationId: 1, gmailMessageId: 1 }, { unique: true });
messageSchema.index({ conversationId: 1, sentAt: 1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = { Message };
