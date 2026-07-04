// scripts/backfillGeocode.js
//
// One-off script: re-geocodes every existing apartment's `location` and
// updates its `coordinates` + `distanceFromCampus` using the current
// (fixed) geocoding logic in utils/geocode.js — including the 60km
// max-plausible-distance guard, so any old bad matches (e.g. the Lagos
// mis-geocode) get corrected or cleared.
//
// Safe to run more than once — it just re-derives coordinates from each
// listing's current `location` text every time.
//
// Usage:
//   node scripts/backfillGeocode.js
//
// Requires MONGO_URI to be set (loaded from config.env, same as server.js).

require("dotenv").config({ path: "config.env" });
const mongoose = require("mongoose");
const Apartment = require("../models/Apartment");
const { geocodeAddress, distanceFromFuta } = require("../utils/geocode");

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Add it to config.env before running this script.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const apartments = await Apartment.find({});
  console.log(`Found ${apartments.length} apartment(s) to check.`);

  let updated = 0;
  let cleared = 0;
  let unchanged = 0;
  let failed = 0;

  for (const apartment of apartments) {
    try {
      const coordinates = await geocodeAddress(apartment.location);

      if (coordinates) {
        const distanceFromCampus = Number(
          distanceFromFuta(coordinates.latitude, coordinates.longitude).toFixed(2)
        );

        const coordsChanged =
          apartment.coordinates?.latitude !== coordinates.latitude ||
          apartment.coordinates?.longitude !== coordinates.longitude;

        apartment.coordinates = coordinates;
        apartment.distanceFromCampus = distanceFromCampus;
        await apartment.save();

        if (coordsChanged) {
          updated += 1;
          console.log(
            `Updated "${apartment.title}" (${apartment._id}) → ${coordinates.latitude}, ${coordinates.longitude} (${distanceFromCampus}km)`
          );
        } else {
          unchanged += 1;
          console.log(`Unchanged "${apartment.title}" (${apartment._id}) — coordinates already correct`);
        }
      } else if (apartment.coordinates) {
        // Previously had (likely bad) coordinates, but geocoding no longer
        // resolves anything plausible for this address — clear them rather
        // than leave a wrong pin in place.
        apartment.coordinates = undefined;
        apartment.distanceFromCampus = undefined;
        await apartment.save();
        cleared += 1;
        console.log(`Cleared bad coordinates for "${apartment.title}" (${apartment._id}) — address didn't resolve within range`);
      } else {
        unchanged += 1;
        console.log(`Skipped "${apartment.title}" (${apartment._id}) — address still doesn't resolve, no coordinates to clear`);
      }
    } catch (error) {
      failed += 1;
      console.error(`Failed on "${apartment.title}" (${apartment._id}):`, error.message);
    }
  }

  console.log("\n── Backfill complete ──");
  console.log(`Updated:   ${updated}`);
  console.log(`Cleared:   ${cleared}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Failed:    ${failed}`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error("Backfill script failed:", error.message);
  process.exit(1);
});