const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    leadListId: { type: mongoose.Schema.Types.ObjectId, ref: "LeadList", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    companyName: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    location: { type: String, trim: true },
    linkedinUrl: { type: String, trim: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    // Flexible key/value bag — lets future outreach-personalization fields
    // be added without a schema migration.
    customFields: { type: Map, of: String, default: {} },
  },
  { timestamps: true, collection: "leads" }
);

// Prevent exact duplicate emails within the same list, while allowing rows
// with no email (can't dedupe those) and the same email across different lists.
leadSchema.index(
  { leadListId: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string", $ne: "" } } }
);

leadSchema.index({ leadListId: 1, firstName: 1, lastName: 1, companyName: 1 });

const Lead = mongoose.model("Lead", leadSchema);

module.exports = { Lead };
