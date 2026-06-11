const mongoose = require("mongoose");

const roommateRequestSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true }
);

roommateRequestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });
roommateRequestSchema.index({ toUser: 1, status: 1 });

module.exports = mongoose.model("RoommateRequest", roommateRequestSchema);
