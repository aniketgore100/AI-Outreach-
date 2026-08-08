const mongoose = require("mongoose");

const gmailConnectionSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true 
    },
    email: { 
      type: String, 
      required: true, 
      trim: true, 
      lowercase: true 
    },
    googleAccountId: { 
      type: String, 
      required: true 
    },
    status: { 
      type: String, 
      enum: ["connected", "disconnected"], 
      default: "connected", 
      index: true 
    },
    accessTokenEncrypted: { 
      type: String, 
      required: true, 
      select: false 
    },
    refreshTokenEncrypted: { 
      type: String, 
      required: true, 
      select: false 
    },
    connectedAt: { 
      type: Date, 
      default: Date.now 
    },
    disconnectedAt: { 
      type: Date, 
      default: null 
    },
  },
  { timestamps: true, collection: "gmail_connections" }
);

gmailConnectionSchema.index({ userId: 1, googleAccountId: 1 }, { unique: true });

const GmailConnection = mongoose.model("GmailConnection", gmailConnectionSchema);

module.exports = { GmailConnection };
