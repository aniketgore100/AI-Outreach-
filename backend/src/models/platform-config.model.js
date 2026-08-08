const mongoose = require("mongoose");

const platformConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String },
  },
  { timestamps: true, collection: "platform_config" }
);

const PlatformConfig = mongoose.model("PlatformConfig", platformConfigSchema);

module.exports = { PlatformConfig };
