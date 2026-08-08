const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { 
      type: String, 
      required: true, 
      unique: true 
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true 
    },
    expiresAt: { 
      type: Date, 
      required: true 
    },
    revokedAt: { 
      type: Date, 
      default: null 
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "refresh_tokens" }
);

refreshTokenSchema.index(
  { expiresAt: 1 }, 
  { expireAfterSeconds: 0 }
);

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = { RefreshToken };
