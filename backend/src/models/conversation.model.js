const mongoose = require("mongoose");

const { CONVERSATION_STATUS, MESSAGE_DIRECTION } = require("../config/constants");

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gmailConnectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GmailConnection",
      required: true,
      index: true,
    },
    // The Gmail thread this conversation mirrors — the sole mechanism used
    // to match an inbound reply back to the outreach that started it.
    gmailThreadId: {
      type: String,
      required: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
    leadListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadList",
      default: null,
    },
    // Populated once campaign-driven sending exists; ad-hoc sends leave it null.
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
    },
    // The specific enrollment this thread belongs to — lets reply detection
    // jump straight from an inbound message to its CampaignEnrollment
    // without joining through leadId.
    campaignEnrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignEnrollment",
      default: null,
      index: true,
    },
    participantEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(CONVERSATION_STATUS),
      default: CONVERSATION_STATUS.OPEN,
      index: true,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    lastMessageDirection: {
      type: String,
      enum: Object.values(MESSAGE_DIRECTION),
      default: null,
    },
    lastMessagePreview: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, collection: "conversations" }
);

conversationSchema.index({ gmailConnectionId: 1, gmailThreadId: 1 }, { unique: true });
conversationSchema.index({ userId: 1, status: 1, lastMessageAt: -1 });
conversationSchema.index({ userId: 1, leadId: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = { Conversation };
