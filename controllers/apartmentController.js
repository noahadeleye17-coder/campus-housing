const mongoose = require("mongoose");
const Apartment = require("../models/Apartment");
const demoApartments = require("../data/demoApartments");

const isDatabaseError = (error) => {
  return error.name === "MongooseError" || error.name === "MongoServerSelectionError";
};

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const isValidApartmentId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseAmenities = (amenities) => {
  if (Array.isArray(amenities)) {
    return amenities.map((item) => String(item).trim()).filter(Boolean);
  }

  if (!amenities) {
    return [];
  }

  return String(amenities).split(",").map((item) => item.trim()).filter(Boolean);
};

const buildApartmentData = (req) => {
  const {
    title,
    price,
    location,
    distanceFromCampus,
    amenities,
    latitude,
    longitude,
  } = req.body;
  const data = {};
  const hasCoordinates = latitude !== undefined && latitude !== "" && longitude !== undefined && longitude !== "";

  if (title !== undefined) data.title = title;
  if (price !== undefined) data.price = Number(price);
  if (location !== undefined) data.location = location;
  if (distanceFromCampus !== undefined) data.distanceFromCampus = Number(distanceFromCampus);
  if (amenities !== undefined) data.amenities = parseAmenities(amenities);
  if (req.file) {
    data.image = `/uploads/${req.file.filename}`;
  }

  if (hasCoordinates) {
    data.coordinates = {
      latitude: Number(latitude),
      longitude: Number(longitude),
    };
  }

  return data;
};

const getOwnedListingFilter = (req, id) => {
  const filter = { _id: id };
  if (req.user.role !== "admin") {
    filter.landlord = req.user.id;
  }
  return filter;
};

const getApartments = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.json(demoApartments);
    }

    const apartments = await Apartment.find().sort({ createdAt: -1 }).populate("landlord", "name email");
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
    if (!isValidApartmentId(req.params.id) && !req.params.id.startsWith("demo-")) {
      return res.status(400).json({ message: "Invalid apartment ID" });
    }

    if (!isDatabaseConnected()) {
      const apartment = demoApartments.find((item) => item._id === req.params.id);
      if (!apartment) {
        return res.status(404).json({ message: "Apartment not found" });
      }

      return res.json(apartment);
    }

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
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Demo apartments are read-only.",
      });
    }

    const apartment = await Apartment.create({
      ...buildApartmentData(req),
      landlord: req.user.id,
    });

    res.status(201).json(apartment);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(400).json({ message: error.message });
  }
};

const getMyApartments = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected. Demo apartments are read-only." });
    }

    const filter = req.user.role === "admin" ? {} : { landlord: req.user.id };
    const apartments = await Apartment.find(filter).sort({ createdAt: -1 }).populate("landlord", "name email");
    res.json(apartments);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const updateApartment = async (req, res) => {
  try {
    if (!isValidApartmentId(req.params.id)) {
      return res.status(400).json({ message: "Invalid apartment ID" });
    }

    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected. Demo apartments are read-only." });
    }

    const apartment = await Apartment.findOneAndUpdate(
      getOwnedListingFilter(req, req.params.id),
      buildApartmentData(req),
      { new: true, runValidators: true }
    ).populate("landlord", "name email");

    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    res.json(apartment);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(400).json({ message: error.message });
  }
};

const deleteApartment = async (req, res) => {
  try {
    if (!isValidApartmentId(req.params.id)) {
      return res.status(400).json({ message: "Invalid apartment ID" });
    }

    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected. Demo apartments are read-only." });
    }

    const apartment = await Apartment.findOneAndDelete(getOwnedListingFilter(req, req.params.id));
    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    res.json({ message: "Apartment deleted" });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getApartments,
  getApartmentById,
  createApartment,
  getMyApartments,
  updateApartment,
  deleteApartment,
};
