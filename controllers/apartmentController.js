const mongoose = require("mongoose");
const Apartment = require("../models/Apartment");
const User = require("../models/user");
const demoApartments = require("../data/demoApartments");
const { cleanupProcessedMedia, deleteFromCloudinary } = require("../upload/ResizeImage");
const { geocodeAddress, distanceFromFuta } = require("../utils/geocode");
const { normalizePhone } = require("../utils/phone");

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

/**
 * Resolve which user a listing should be attributed to as `landlord`.
 *
 * Regular landlords always get their own account — `landlordId` in the
 * request body is ignored for them, so one landlord can never attribute a
 * listing to another account. Admins may post a listing on behalf of a real
 * landlord by passing `landlordId`; that ID is validated against a real,
 * non-disabled user with the "landlord" role before it's trusted, so a typo
 * or stale ID can't silently attach a listing to the wrong (or a
 * nonexistent) account. If an admin omits `landlordId`, the listing falls
 * back to their own account, same as before this feature existed.
 */
const resolveLandlordId = async (req) => {
  const { landlordId } = req.body;

  if (req.user.role !== "admin" || !landlordId) {
    return req.user.id;
  }

  if (!mongoose.Types.ObjectId.isValid(landlordId)) {
    throw new Error("Invalid landlord selected");
  }

  const landlord = await User.findById(landlordId).select("role disabled");
  if (!landlord || landlord.role !== "landlord" || landlord.disabled) {
    throw new Error("Selected landlord account not found or is not an active landlord");
  }

  return landlordId;
};

// Zone filter — keyword-matches the free-text `location` field against
// FUTA gate names. "Others" is anything that doesn't mention a gate.
const ZONE_KEYWORDS = {
  "North Gate": "north",
  "West Gate": "west",
  "South Gate": "south",
};

const matchesZone = (locationText, zone) => {
  const text = (locationText || "").toLowerCase();
  if (zone === "Others") {
    return !Object.values(ZONE_KEYWORDS).some((keyword) => text.includes(keyword));
  }
  const keyword = ZONE_KEYWORDS[zone];
  return keyword ? text.includes(keyword) : true;
};

// Builds a Mongo filter fragment for a zone. For "Others", excludes any
// location that mentions a known gate keyword.
const buildZoneFilter = (zone) => {
  if (!zone) return null;
  if (zone === "Others") {
    return {
      location: {
        $not: { $regex: Object.values(ZONE_KEYWORDS).join("|"), $options: "i" },
      },
    };
  }
  const keyword = ZONE_KEYWORDS[zone];
  if (!keyword) return null;
  return { location: { $regex: keyword, $options: "i" } };
};

const parseAmenities = (amenities) => {
  if (Array.isArray(amenities)) {
    return amenities.map((item) => String(item).trim()).filter(Boolean);
  }

  if (!amenities) {
    return [];
  }

  return String(amenities).split(",").map((item) => item.trim()).filter(Boolean);
};

const buildApartmentData = async (req, existingApartment = null) => {
  const {
    title,
    price,
    location,
    distanceFromCampus,
    amenities,
    latitude,
    longitude,
    landlordWhatsapp,
    propertyType,
    existingImages,
    removeVideo,
    landlordId,
  } = req.body;
  const data = {};
  const hasExplicitCoordinates =
    latitude !== undefined && latitude !== "" && longitude !== undefined && longitude !== "";

  if (title !== undefined) data.title = title;
  if (price !== undefined) data.price = Number(price);
  if (location !== undefined) data.location = location;
  if (amenities !== undefined) data.amenities = parseAmenities(amenities);
  if (landlordWhatsapp !== undefined) data.landlordWhatsapp = landlordWhatsapp;
  if (propertyType !== undefined) data.propertyType = propertyType;

  // Editing an existing listing: only an admin may reassign which landlord
  // it's attributed to, and only when they explicitly picked one — an admin
  // editing a listing without touching the landlord field should never
  // silently reassign it to themselves.
  if (existingApartment && landlordId && req.user.role === "admin") {
    data.landlord = await resolveLandlordId(req);
  }

  const newImages = req.processedImages || [];

  if (existingApartment) {
    // ── Update flow: merge photos the landlord chose to keep with any new
    // uploads, instead of wholesale-replacing the images array. This is
    // what lets someone remove one photo or add one more without having
    // to re-upload every existing photo every time.
    //
    // `existingImages` is a JSON array of URLs sent by the edit form,
    // representing exactly what should remain from the original set (it's
    // omitted entirely if the landlord never touched the photo section —
    // in that case we leave the original images untouched unless new ones
    // were uploaded, preserving the old wholesale-replace behavior for any
    // other caller that doesn't send this field).
    const originalImages =
      existingApartment.images ||
      (existingApartment.image ? [existingApartment.image] : []);

    let keptImages = originalImages;
    if (existingImages !== undefined) {
      try {
        const parsed = JSON.parse(existingImages);
        if (Array.isArray(parsed)) {
          // Only trust URLs that were actually part of the original set —
          // ignore anything the client didn't legitimately have.
          keptImages = parsed.filter((url) => originalImages.includes(url));
        }
      } catch {
        // Malformed — fall back to keeping everything rather than losing photos.
        keptImages = originalImages;
      }
    }

    if (existingImages !== undefined || newImages.length > 0) {
      const mergedImages = [...keptImages, ...newImages].slice(0, 6);
      data.images = mergedImages;
      data.image = mergedImages[0] || "";
    }

    // Video: an explicit "remove" wins, then a fresh upload, otherwise the
    // existing video (if any) is left alone.
    if (removeVideo === "true" || removeVideo === true) {
      data.video = "";
    } else if (req.processedVideo) {
      data.video = req.processedVideo;
    }
  } else {
    // ── Create flow: unchanged, nothing to merge with yet.
    if (newImages.length > 0) {
      data.images = newImages;
      data.image = newImages[0];
    }
    if (req.processedVideo) {
      data.video = req.processedVideo;
    }
  }

  // Resolve coordinates: an explicit latitude/longitude in the request
  // (e.g. a future admin override) always wins. Otherwise, if an address
  // was submitted, geocode it automatically — this is what makes real
  // landlord-created listings (which only ever send plain-text `location`)
  // end up with map coordinates.
  let coordinates = null;
  if (hasExplicitCoordinates) {
    coordinates = { latitude: Number(latitude), longitude: Number(longitude) };
  } else if (location !== undefined && location !== "") {
    coordinates = await geocodeAddress(location); // null if geocoding fails — non-fatal
  }

  if (coordinates) {
    data.coordinates = coordinates;
    data.distanceFromCampus = Number(
      distanceFromFuta(coordinates.latitude, coordinates.longitude).toFixed(2)
    );
  } else if (distanceFromCampus !== undefined) {
    // No coordinates could be resolved — fall back to a manually supplied
    // distance, if the request included one.
    data.distanceFromCampus = Number(distanceFromCampus);
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
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const searchTerm = (req.query.search || "").trim();
    const propertyType = (req.query.type || "").trim();
    const zone = (req.query.zone || "").trim();

    if (!isDatabaseConnected()) {
      // Filter demo apartments by search term and/or property type if provided
      const filtered = demoApartments.filter((a) => {
        const matchesSearch = !searchTerm ||
          a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.location?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = !propertyType || a.propertyType === propertyType;
        const matchesZoneFilter = !zone || matchesZone(a.location, zone);
        return matchesSearch && matchesType && matchesZoneFilter;
      });
      const slice = filtered.slice(skip, skip + limit);
      return res.json({
        apartments: slice,
        total: filtered.length,
        page,
        pages: Math.ceil(filtered.length / limit) || 1,
      });
    }

    // Build filter — when searching, match title or location (case-insensitive).
    // When a property type is selected, narrow further to that exact type.
    // When a zone is selected, narrow further by keyword-matching location.
    // When none are set, return all listings.
    const filter = searchTerm
      ? {
          $or: [
            { title: { $regex: searchTerm, $options: "i" } },
            { location: { $regex: searchTerm, $options: "i" } },
          ],
        }
      : {};
    if (propertyType) filter.propertyType = propertyType;
    const zoneFilter = buildZoneFilter(zone);
    if (zoneFilter) Object.assign(filter, zoneFilter);

    const [realApartments, totalReal] = await Promise.all([
      Apartment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("landlord", "name email"),
      Apartment.countDocuments(filter),
    ]);

    // Only pad with demo listings on page 1 when there is no active search,
    // type, or zone filter, and real listings are still few. When filtering,
    // we only show real results that actually match.
    let apartments = realApartments;
    if (!searchTerm && !propertyType && !zone && page === 1 && realApartments.length < limit) {
      const slotsLeft = limit - realApartments.length;
      apartments = [...realApartments, ...demoApartments.slice(0, slotsLeft)];
    }

    const total = (searchTerm || propertyType || zone) ? totalReal : Math.max(totalReal, demoApartments.length);
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
      ...(await buildApartmentData(req)),
      landlord: await resolveLandlordId(req),
    });

    // Best-effort: the first time a landlord's own listing carries a
    // WhatsApp number, save it (normalized) onto their account if they
    // don't already have one on file. This is what lets the AI Inbox match
    // a future incoming WhatsApp message back to this landlord — it's
    // never collected at signup. Not awaited; a failure here shouldn't
    // block listing creation.
    if (apartment.landlordWhatsapp) {
      const normalized = normalizePhone(apartment.landlordWhatsapp);
      if (normalized) {
        // Matches accounts with no phone on file at all — not just an
        // explicit empty string. Landlord accounts created before this
        // field existed on the schema have no `phone` key in the database
        // whatsoever, so `{ phone: "" }` alone silently matches zero of
        // them and the backfill never runs.
        User.updateOne(
          { _id: apartment.landlord, $or: [{ phone: "" }, { phone: { $exists: false } }] },
          { phone: normalized }
        ).catch((err) => console.warn("Could not backfill landlord phone:", err.message));
      }
    }

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

    const existingApartment = await Apartment.findOne(getOwnedListingFilter(req, req.params.id));
    if (!existingApartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    const data = await buildApartmentData(req, existingApartment);

    const apartment = await Apartment.findOneAndUpdate(
      { _id: existingApartment._id },
      data,
      { new: true, runValidators: true }
    ).populate("landlord", "name email");

    // Best-effort: delete from Cloudinary any photos/video that were on the
    // listing before this update but didn't make it into the new version
    // (removed by the landlord, or replaced by a fresh video upload). Not
    // awaited — a failure here shouldn't block the response, the listing
    // itself is already saved correctly either way.
    const originalImages =
      existingApartment.images || (existingApartment.image ? [existingApartment.image] : []);
    const keptImages = data.images || originalImages;
    const removedImages = originalImages.filter((url) => !keptImages.includes(url));

    const cleanupTasks = removedImages.map((url) => {
      const publicId = cloudinaryPublicIdFromUrl(url);
      return publicId ? deleteFromCloudinary(publicId, "image") : Promise.resolve();
    });

    if (
      existingApartment.video &&
      data.video !== undefined &&
      data.video !== existingApartment.video
    ) {
      const publicId = cloudinaryPublicIdFromUrl(existingApartment.video);
      if (publicId) cleanupTasks.push(deleteFromCloudinary(publicId, "video"));
    }

    if (cleanupTasks.length) {
      Promise.all(cleanupTasks).catch((err) =>
        console.warn("Cloudinary cleanup after update failed:", err.message)
      );
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
  buildApartmentData,
  cloudinaryPublicIdFromUrl,
};