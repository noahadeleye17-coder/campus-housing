const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["student", "landlord", "admin"],
      default: "student",
    },

    // Normalized to "+234XXXXXXXXXX" (see utils/phone.js) so a landlord's
    // WhatsApp number always matches the same account regardless of how it
    // was typed. Populated automatically the first time a listing is
    // created/updated with their WhatsApp number attached — not collected
    // at signup. Used by the AI Inbox to auto-select the right landlord
    // from an incoming WhatsApp message.
    phone: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    // Set by an admin to suspend an account without deleting it. Blocked at
    // both login (authController) and on every subsequent request that
    // carries an existing token (authmiddleware.protect), so a disabled
    // user is locked out immediately even if their JWT hasn't expired yet.
    disabled: {
      type: Boolean,
      default: false,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    notificationsEnabled: {
      type: Boolean,
      default: true,
    },

    profileImage: {
      type: String,
      default: "",
    },

    profileImagePublicId: {
      type: String,
      default: "",
    },

    savedApartments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Apartment",
      },
    ],

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpire: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);