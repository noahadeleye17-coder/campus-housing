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
  image: String,
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
