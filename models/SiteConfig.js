const mongoose = require("mongoose");

// Singleton document — there is only ever one SiteConfig row, always looked
// up (and created on first write) with the fixed key below. This is simpler
// than a dedicated "announcements" collection since the dashboard only ever
// needs to show one banner at a time.
const SINGLETON_KEY = "site-config";

const siteConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: SINGLETON_KEY,
      unique: true,
    },
    announcement: {
      type: String,
      default: "",
      trim: true,
    },
    announcementActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

siteConfigSchema.statics.SINGLETON_KEY = SINGLETON_KEY;

siteConfigSchema.statics.getOrCreate = async function () {
  let config = await this.findOne({ key: SINGLETON_KEY });
  if (!config) {
    config = await this.create({ key: SINGLETON_KEY });
  }
  return config;
};

module.exports = mongoose.model("SiteConfig", siteConfigSchema);
