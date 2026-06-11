// routes/apartmentRoutes.js
const express = require("express");
const router = express.Router();
const { protect, isLandlord } = require("../middleware/authmiddleware");
const upload = require("../middleware/uploadmiddleware");
const {
  getApartments,
  getApartmentById,
  createApartment,
  getMyApartments,
  updateApartment,
  deleteApartment,
} = require("../controllers/apartmentController");

// @route   GET /api/apartments
// @desc    Get all apartments
// @access  Public
router.get("/", getApartments);

// @route   GET /api/apartments/mine
// @desc    Get apartments owned by the authenticated landlord
// @access  Private (landlord only)
router.get("/mine", protect, isLandlord, getMyApartments);

// @route   GET /api/apartments/:id
// @desc    Get a single apartment by ID
// @access  Public
router.get("/:id", getApartmentById);

// @route   POST /api/apartments
// @desc    Create a new apartment
// @access  Private (landlord only)
router.post("/", protect, isLandlord, upload.single("image"), createApartment);

// @route   PATCH /api/apartments/:id
// @desc    Update an apartment listing
// @access  Private (landlord only)
router.patch("/:id", protect, isLandlord, upload.single("image"), updateApartment);

// @route   DELETE /api/apartments/:id
// @desc    Delete an apartment listing
// @access  Private (landlord only)
router.delete("/:id", protect, isLandlord, deleteApartment);

module.exports = router;
