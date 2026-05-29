const Apartment = require("../models/Apartment");

const isDatabaseError = (error) => {
  return error.name === "MongooseError" || error.name === "MongoServerSelectionError";
};

const getApartments = async (req, res) => {
  try {
    const apartments = await Apartment.find().populate("landlord", "name email");
    res.json(apartments);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const getApartmentById = async (req, res) => {
  try {
    const apartment = await Apartment.findById(req.params.id).populate("landlord", "name email");
    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }
    res.json(apartment);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const createApartment = async (req, res) => {
  try {
    const {
      title,
      price,
      location,
      distanceFromCampus,
      amenities,
      latitude,
      longitude,
    } = req.body;
    const landlord = req.user.id;
    const amenitiesList = Array.isArray(amenities)
      ? amenities
      : amenities
        ? amenities.split(",").map((item) => item.trim()).filter(Boolean)
        : [];
    const hasCoordinates = latitude !== undefined && longitude !== undefined;

    const apartment = await Apartment.create({
      title,
      price: Number(price),
      location,
      distanceFromCampus: Number(distanceFromCampus),
      amenities: amenitiesList,
      image: req.file ? `/uploads/${req.file.filename}` : undefined,
      coordinates: hasCoordinates
        ? {
            latitude: Number(latitude),
            longitude: Number(longitude),
          }
        : undefined,
      landlord,
    });

    res.status(201).json(apartment);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getApartments, getApartmentById, createApartment };
