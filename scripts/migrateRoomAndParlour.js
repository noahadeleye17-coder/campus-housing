// scripts/migrateRoomAndParlour.js
//
// One-off script: renames the "1 Bedroom" propertyType value to
// "Room and Parlour" on all existing listings, so they keep showing up
// under the "All Types" filter after the enum value was renamed in
// models/Apartment.js.
//
// Safe to run more than once (matches only propertyType: "1 Bedroom").
//
// Usage:
//   node scripts/migrateRoomAndParlour.js
//
// Requires MONGO_URI to be set (loaded from config.env, same as server.js).

require("dotenv").config({ path: "config.env" });
const mongoose = require("mongoose");
const Apartment = require("../models/Apartment");

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Add it to config.env before running this script.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const result = await Apartment.updateMany(
    { propertyType: "1 Bedroom" },
    { $set: { propertyType: "Room and Parlour" } }
  );

  console.log(
    `Done. Matched ${result.matchedCount ?? result.n}, updated ${result.modifiedCount ?? result.nModified} listing(s).`
  );

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
