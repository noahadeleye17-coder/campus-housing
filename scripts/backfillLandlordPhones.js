// scripts/backfillLandlordPhones.js
//
// One-off script: fixes the landlord accounts the buggy version of the
// phone-backfill logic in apartmentController.js silently skipped — any
// landlord whose account existed before the `phone` field was added to the
// User schema had no `phone` key in the database at all, and the old query
// `{ phone: "" }` only matches an explicit empty string, not a missing
// field, so those accounts never got backfilled no matter how many
// listings they posted with a WhatsApp number attached.
//
// This derives each landlord's phone from their own most recent listing
// that has a landlordWhatsapp set, and only ever fills an empty/missing
// phone — never overwrites one that's already on file.
//
// Safe to run more than once.
//
// Usage:
//   node scripts/backfillLandlordPhones.js
//
// Requires MONGO_URI to be set (loaded from config.env, same as server.js).

require("dotenv").config({ path: "config.env" });
const mongoose = require("mongoose");
const Apartment = require("../models/Apartment");
const User = require("../models/user");
const { normalizePhone } = require("../utils/phone");

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Add it to config.env before running this script.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const landlords = await User.find({
    role: "landlord",
    $or: [{ phone: "" }, { phone: { $exists: false } }],
  });
  console.log(`Found ${landlords.length} landlord account(s) with no phone on file.`);

  let updated = 0;
  let skipped = 0;

  for (const landlord of landlords) {
    const listing = await Apartment.findOne({
      landlord: landlord._id,
      landlordWhatsapp: { $ne: "" },
    }).sort({ createdAt: -1 });

    if (!listing) {
      skipped++;
      continue;
    }

    const normalized = normalizePhone(listing.landlordWhatsapp);
    if (!normalized) {
      skipped++;
      continue;
    }

    await User.updateOne({ _id: landlord._id }, { phone: normalized });
    console.log(`  ${landlord.email}: phone set to ${normalized}`);
    updated++;
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped} (no listing with a WhatsApp number on file).`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
