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
