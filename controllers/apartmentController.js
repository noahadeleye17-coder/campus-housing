const mongoose = require("mongoose");
const Apartment = require("../models/Apartment");
const demoApartments = require("../data/demoApartments");
const { cleanupProcessedMedia, deleteFromCloudinary } = require("../upload/ResizeImage");

/**
 * Extract the Cloudinary public_id from a secure_url.
 * e.g. "https://res.cloudinary.com/demo/image/upload/v123/campus-housing/apartments/abc.jpg"
 *   → "campus-housing/apartments/abc"
 * Returns null for non-Cloudinary URLs (e.g. legacy /uploads/ paths or Unsplash demo images).
 */
const cloudinaryPublicIdFromUrl = (url) => {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    // Drop the version segment (v1234567890/) if present, then strip the extension
    const withoutVersion = parts[1].replace(/^v\d+\//, "");
    return withoutVersion.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
};

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
    landlordWhatsapp,
  } = req.body;
  const data = {};
  const hasCoordinates = latitude !== undefined && latitude !== "" && longitude !== undefined && longitude !== "";

  if (title !== undefined) data.title = title;
  if (price !== undefined) data.price = Number(price);
  if (location !== undefined) data.location = location;
  if (distanceFromCampus !== undefined) data.distanceFromCampus = Number(distanceFromCampus);
  if (amenities !== undefined) data.amenities = parseAmenities(amenities);
  if (landlordWhatsapp !== undefined) data.landlordWhatsapp = landlordWhatsapp;

  // New images were uploaded in this request — values are full Cloudinary URLs
  if (req.processedImages && req.processedImages.length > 0) {
    data.images = req.processedImages;
    data.image = req.processedImages[0]; // keep legacy single-image field in sync
  }

  // New video was uploaded in this request — value is a full Cloudinary URL
  if (req.processedVideo) {
    data.video = req.processedVideo;
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
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 9, 1), 50);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const searchTerm = (req.query.search || "").trim();

    if (!isDatabaseConnected()) {
      // Filter demo apartments by search term if provided
      const filtered = searchTerm
        ? demoApartments.filter(a =>
            a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.location?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : demoApartments;
      const slice = filtered.slice(skip, skip + limit);
      return res.json({
        apartments: slice,
        total: filtered.length,
        page,
        pages: Math.ceil(filtered.length / limit) || 1,
      });
    }

    // Build filter — when searching, match title or location (case-insensitive).
    // When no search term, return all listings.
    const filter = searchTerm
      ? {
          $or: [
            { title: { $regex: searchTerm, $options: "i" } },
            { location: { $regex: searchTerm, $options: "i" } },
          ],
        }
      : {};

    const [realApartments, totalReal] = await Promise.all([
      Apartment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("landlord", "name email"),
      Apartment.countDocuments(filter),
    ]);

    // Only pad with demo listings on page 1 when there is no active search
    // and real listings are still few. When searching, we only show real results.
    let apartments = realApartments;
    if (!searchTerm && page === 1 && realApartments.length < limit) {
      const slotsLeft = limit - realApartments.length;
      apartments = [...realApartments, ...demoApartments.slice(0, slotsLeft)];
    }

    const total = searchTerm ? totalReal : Math.max(totalReal, demoApartments.length);
    const pages = Math.ceil(total / limit) || 1;

    res.json({ apartments, total, page, pages });
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

    // Demo listings are always looked up directly from the static demo
    // array, regardless of whether the database is connected — they never
    // exist as real Mongo documents.
    if (req.params.id.startsWith("demo-")) {
      const apartment = demoApartments.find((item) => item._id === req.params.id);
      if (!apartment) {
        return res.status(404).json({ message: "Apartment not found" });
      }
      return res.json(apartment);
    }

    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
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
    cleanupProcessedMedia(req);
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
    cleanupProcessedMedia(req);
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

    // Best-effort: delete associated media from Cloudinary.
    // We don't block the response on this — if Cloudinary cleanup fails,
    // the listing is still gone from the DB and the landlord gets success.
    const imageUrls = apartment.images || (apartment.image ? [apartment.image] : []);
    const cleanupTasks = imageUrls.map((url) => {
      const publicId = cloudinaryPublicIdFromUrl(url);
      return publicId ? deleteFromCloudinary(publicId, "image") : Promise.resolve();
    });
    if (apartment.video) {
      const publicId = cloudinaryPublicIdFromUrl(apartment.video);
      if (publicId) cleanupTasks.push(deleteFromCloudinary(publicId, "video"));
    }
    Promise.all(cleanupTasks).catch((err) =>
      console.warn("Cloudinary cleanup after delete failed:", err.message)
    );

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