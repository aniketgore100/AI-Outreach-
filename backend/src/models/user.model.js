const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true
    },
    password: { 
      type: String, 
      required: true, 
      select: false 
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
  },
  
  { timestamps: true, collection: "users" }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
