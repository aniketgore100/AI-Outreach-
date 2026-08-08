const mongoose = require("mongoose");

const { TEMPLATE_STATUS } = require("../config/constants");

const templateSchema = new mongoose.Schema(
  {
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true, 
        index: true 
    },
    name: { 
        type: String, 
        required: true, 
        trim: true, 
        maxlength: 150 
    },
    subject: { 
        type: String, 
        trim: true, 
        default: "" 
    },
    bodyHtml: { 
        type: String, 
        default: "" 
    },
    status: {
      type: String,
      enum: Object.values(TEMPLATE_STATUS),
      default: TEMPLATE_STATUS.DRAFT,
      index: true,
    },
  },
  { timestamps: true, collection: "templates" }
);

templateSchema.index({ userId: 1, updatedAt: -1 });

const Template = mongoose.model("Template", templateSchema);

module.exports = { Template };
