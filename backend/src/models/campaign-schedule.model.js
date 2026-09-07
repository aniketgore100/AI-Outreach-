const mongoose = require("mongoose");

const { CAMPAIGN_WEEKDAYS } = require("../config/constants");

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const campaignScheduleSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      unique: true,
    },
    // Denormalized alongside campaignId so ownership can be checked with a
    // single filter, matching the tenant-isolation pattern used across the
    // other collections (see EmailJob, Template, LeadList).
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      match: TIME_REGEX,
    },
    endTime: {
      type: String,
      required: true,
      match: TIME_REGEX,
    },
    weekdays: {
      type: [{ type: String, enum: CAMPAIGN_WEEKDAYS }],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "Select at least one active day",
      },
    },
    timeZone: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true, collection: "campaign_schedules" }
);

campaignScheduleSchema.index({ userId: 1, createdAt: -1 });

const CampaignSchedule = mongoose.model("CampaignSchedule", campaignScheduleSchema);

module.exports = { CampaignSchedule };
