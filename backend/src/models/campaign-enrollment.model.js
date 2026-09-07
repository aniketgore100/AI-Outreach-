const mongoose = require("mongoose");

const { ENROLLMENT_STATUS } = require("../config/constants");

const campaignEnrollmentSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    leadListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadList",
      required: true,
    },
    // Snapshotted at enrollment time so the scheduler never has to re-resolve
    // "which Gmail account sends this campaign's mail" on every cycle.
    gmailConnectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GmailConnection",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ENROLLMENT_STATUS),
      default: ENROLLMENT_STATUS.PENDING,
      index: true,
    },
    // The sole "did this lead reply" signal — deliberately not folded into
    // `status`, so follow-up suppression and duplicate-reply guarding are a
    // single `repliedAt: null` filter independent of sequence progress.
    repliedAt: {
      type: Date,
      default: null,
    },
    nextActionAt: {
      type: Date,
      required: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    initialEmailJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailJob",
      default: null,
    },
    followUpEmailJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailJob",
      default: null,
    },
    replyEmailJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailJob",
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true, collection: "campaign_enrollments" }
);

// Dedupe: a lead can only be enrolled once per campaign.
campaignEnrollmentSchema.index({ campaignId: 1, leadId: 1 }, { unique: true });
// The scheduler's core due-work query.
campaignEnrollmentSchema.index({ campaignId: 1, status: 1, nextActionAt: 1 });
// Stale-claim reconciliation (enrollments stuck in a *_queued status).
campaignEnrollmentSchema.index({ status: 1, updatedAt: 1 });
campaignEnrollmentSchema.index({ userId: 1, campaignId: 1 });

const CampaignEnrollment = mongoose.model("CampaignEnrollment", campaignEnrollmentSchema);

module.exports = { CampaignEnrollment };
