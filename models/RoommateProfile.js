const mongoose = require("mongoose");

const roommateProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    campus: {
      type: String,
      trim: true,
      default: "",
    },
    preferredLocation: {
      type: String,
      trim: true,
      default: "",
    },
    budgetMin: {
      type: Number,
      min: 0,
      default: 0,
    },
    budgetMax: {
      type: Number,
      min: 0,
      default: 0,
    },
    moveInDate: Date,
    gender: {
      type: String,
      enum: ["male", "female", ""],
      default: "",
    },
    educationLevel: {
      type: String,
      enum: ["100", "200", "300", "400", "500", ""],
      default: "",
    },
    sleepSchedule: {
      type: String,
      enum: ["early", "flexible", "late", ""],
      default: "",
    },
    cleanliness: {
      type: String,
      enum: ["relaxed", "moderate", "very_clean", ""],
      default: "",
    },
    noisePreference: {
      type: String,
      enum: ["quiet", "moderate", "lively", ""],
      default: "",
    },
    guestPreference: {
      type: String,
      enum: ["rarely", "sometimes", "often", ""],
      default: "",
    },
    studyPreference: {
      type: String,
      enum: ["home", "library", "mixed", ""],
      default: "",
    },
    interests: {
      type: [String],
      default: [],
    },
    visible: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

roommateProfileSchema.index({ campus: 1, visible: 1 });
roommateProfileSchema.index({ budgetMin: 1, budgetMax: 1 });

module.exports = mongoose.model("RoommateProfile", roommateProfileSchema);