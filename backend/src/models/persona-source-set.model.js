const mongoose = require("mongoose");

const { PERSONA_SOURCE_SET_STATUS, PERSONA_TIME_PERIOD_PRESET } = require("../config/constants");

const timePeriodSchema = new mongoose.Schema(
  {
    preset: {
      type: String,
      enum: Object.values(PERSONA_TIME_PERIOD_PRESET),
      required: true,
    },
    from: { type: Date, default: null },
    to: { type: Date, default: null },
  },
  { _id: false }
);

const personaSourceSetSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: Object.values(PERSONA_SOURCE_SET_STATUS),
      default: PERSONA_SOURCE_SET_STATUS.DRAFT,
      index: true,
    },
    timePeriod: {
      type: timePeriodSchema,
      required: true,
    },
    candidateCount: {
      type: Number,
      default: 0,
    },
    selectedCount: {
      type: Number,
      default: 0,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "persona_source_sets" }
);

// One record per import batch — versioned, never overwritten in place, so
// history stays inspectable (PRD 5.5).
personaSourceSetSchema.index({ gmailConnectionId: 1, status: 1, createdAt: -1 });

const PersonaSourceSet = mongoose.model("PersonaSourceSet", personaSourceSetSchema);

module.exports = { PersonaSourceSet };
