const mongoose = require("mongoose");

const { EMAIL_JOB_STATUS } = require("../config/constants");

const emailJobSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true 
    },
    gmailConnectionId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "GmailConnection", 
      required: true 
    },
    leadListId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "LeadList", 
      required: true, 
      index: true 
    },
    leadId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Lead", 
      required: true 
    },
    to: { 
      type: String, 
      required: true, 
      trim: true, 
      lowercase: true 
    },
    subject: { 
      type: String, 
      required: true
     },
    body: { 
      type: String, 
      required: true 
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true
    },
    // Set only for scheduler-driven campaign sends; null for ad-hoc sends
    // from email.service.js. Fully optional/additive — EmailWorker only
    // reads these when present, so existing ad-hoc jobs are unaffected.
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
      index: true,
    },
    campaignEnrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignEnrollment",
      default: null,
      index: true,
    },
    sequenceStep: {
      type: String,
      default: null,
    },
    // Threading fields — set for follow-up/reply sends so EmailWorker sends
    // them as a reply within the lead's existing Gmail thread instead of a
    // new one. Left null for initial-outreach and ad-hoc jobs.
    gmailThreadId: {
      type: String,
      default: null,
    },
    inReplyTo: {
      type: String,
      default: null,
    },
    references: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(EMAIL_JOB_STATUS),
      default: EMAIL_JOB_STATUS.QUEUED,
      index: true,
    },
    attempts: { 
      type: Number, 
      default: 0 
    },
    sqsMessageId: { 
      type: String 
    },
    lastAttemptAt: { 
      type: Date 
    },
    sentAt: { 
      type: Date 
    },
    lastError: { 
      type: String 
    },
  },
  { timestamps: true, collection: "email_jobs" }
);

emailJobSchema.index({ leadListId: 1, status: 1 });

const EmailJob = mongoose.model("EmailJob", emailJobSchema);

module.exports = { EmailJob };
