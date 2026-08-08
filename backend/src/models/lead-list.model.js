const mongoose = require("mongoose");

const columnMappingEntrySchema = new mongoose.Schema(
  {
    sourceColumn: { type: String, required: true },
    // One of STANDARD_LEAD_FIELDS, or "customFields" / "ignored".
    targetField: { type: String, required: true },
  },
  { _id: false }
);

const leadListSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    uploadMetadata: {
      originalFileName: { type: String, required: true },
      fileType: { type: String, enum: ["csv", "xlsx", "xls"], required: true },
      fileSizeBytes: { type: Number },
      totalRows: { type: Number, required: true },
    },
    columnMapping: { type: [columnMappingEntrySchema], default: [] },
    leadCount: { type: Number, default: 0 },
    skippedDuplicateCount: { type: Number, default: 0 },
    skippedMissingEmailCount: { type: Number, default: 0 },
    status: { type: String, enum: ["completed", "failed"], default: "completed" },
  },
  { timestamps: true, collection: "lead_lists" }
);

leadListSchema.index({ userId: 1, createdAt: -1 });

const LeadList = mongoose.model("LeadList", leadListSchema);

module.exports = { LeadList };
