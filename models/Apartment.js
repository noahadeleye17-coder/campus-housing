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
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

module.exports = mongoose.model("Apartment", apartmentSchema);