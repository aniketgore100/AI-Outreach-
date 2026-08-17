const mongoose = require("mongoose");

const { PERSONA_FILTER_REASON } = require("../config/constants");

const personaSourceEmailSchema = new mongoose.Schema(
  {
    personaSourceSetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PersonaSourceSet",
      required: true,
      index: true,
    },
    // Denormalized so "this account's confirmed source emails" can be
    // queried without joining through PersonaSourceSet, same pattern as
    // Message.userId.
    gmailConnectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GmailConnection",
      required: true,
      index: true,
    },
    gmailMessageId: {
      type: String,
      required: true,
    },
    subject: {
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
    recipientDomain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    duplicateCount: {
      type: Number,
      default: 1,
    },
    sentAt: {
      type: Date,
      required: true,
    },
    filterReason: {
      type: String,
      enum: [...Object.values(PERSONA_FILTER_REASON), null],
      default: null,
    },
    included: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, collection: "persona_source_emails" }
);

// Scoped to the batch (not globally unique per connection) — the same Gmail
// message legitimately reappears across separate import attempts (an
// abandoned draft re-run, or a future re-import), each of which is its own
// independent, versioned PersonaSourceSet.
personaSourceEmailSchema.index({ personaSourceSetId: 1, gmailMessageId: 1 }, { unique: true });
personaSourceEmailSchema.index({ personaSourceSetId: 1, included: 1 });
personaSourceEmailSchema.index({ personaSourceSetId: 1, sentAt: -1 });

const PersonaSourceEmail = mongoose.model("PersonaSourceEmail", personaSourceEmailSchema);

module.exports = { PersonaSourceEmail };
