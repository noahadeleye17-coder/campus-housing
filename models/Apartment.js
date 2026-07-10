const mongoose = require("mongoose");

const apartmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  distanceFromCampus: Number,
  amenities: [String],

  // Property type / category (e.g. "Self Contain", "1 Bedroom") used to
  // power the "All Types" filter on the search bar. Left as a plain string
  // enum (rather than a ref) since these are a small fixed set of options.
  propertyType: {
    type: String,
    enum: [
      "",
      "Self Contain",
      "Single Room",
      "1 Bedroom",
      "2 Bedroom",
      "3 Bedroom",
      "Shared Apartment",
      "Duplex",
      "Studio",
      "Bungalow",
      "Hostel",
    ],
    default: "",
  },

  // Kept for backward compatibility with existing frontend code (app.js
  // home page cards read apartment.image). Automatically set to the first
  // entry in `images` whenever a listing is created/updated.
  image: String,

  // Multiple images per listing
  images: [String],

  // One optional video per listing
  video: String,

  coordinates: {
    latitude: Number,
    longitude: Number,
  },

  // Landlord's WhatsApp number for this listing (Nigerian format, e.g.
  // 080XXXXXXXX or +234XXXXXXXXXX). This is how students actually reach
  // the landlord — the email on the User account is a fallback only.
  landlordWhatsapp: {
    type: String,
    trim: true,
    default: "",
  },

  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

// Speeds up the "All Types" + price range filters on the search bar
// (avoids a full collection scan on every homepage search/filter).
apartmentSchema.index({ propertyType: 1, price: 1 });

// Text index for the search box (apartment title / location). Lets queries
// use $text: { $search: "..." } instead of a $regex scan — faster and
// ranks results by relevance instead of just matching substrings.
apartmentSchema.index({ title: "text", location: "text" });

module.exports = mongoose.model("Apartment", apartmentSchema);