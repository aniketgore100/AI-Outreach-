const mongoose = require("mongoose");

const { CAMPAIGN_STATUS, CAMPAIGN_REPLY_METHOD } = require("../config/constants");

const replyHandlingSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: Object.values(CAMPAIGN_REPLY_METHOD),
      default: CAMPAIGN_REPLY_METHOD.MANUAL,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      default: null,
    },
  },
  { _id: false }
);

const followUpSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      default: null,
    },
    delayDays: {
      type: Number,
      default: null,
      min: 1,
      max: 365,
    },
  },
  { _id: false }
);

const sequenceSchema = new mongoose.Schema(
  {
    initialTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      default: null,
    },
    replyHandling: {
      type: replyHandlingSchema,
      default: () => ({}),
    },
    followUp: {
      type: followUpSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: Object.values(CAMPAIGN_STATUS),
      default: CAMPAIGN_STATUS.DRAFT,
      index: true,
    },
    leadListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadList",
      default: null,
    },
    sequence: {
      type: sequenceSchema,
      default: () => ({}),
    },
  },
  { timestamps: true, collection: "campaigns" }
);

campaignSchema.index({ userId: 1, createdAt: -1 });
campaignSchema.index({ userId: 1, status: 1, createdAt: -1 });
campaignSchema.index({ userId: 1, leadListId: 1 });

const Campaign = mongoose.model("Campaign", campaignSchema);

module.exports = { Campaign };
