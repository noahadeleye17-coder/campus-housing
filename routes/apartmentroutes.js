// routes/apartmentRoutes.js
const express = require("express");
const router = express.Router();
const { protect, isLandlord } = require("../middleware/authmiddleware");
const upload = require("../middleware/uploadmiddleware");
const {
  getApartments,
  getApartmentById,
  createApartment,
} = require("../controllers/apartmentController");

// @route   GET /api/apartments
// @desc    Get all apartments
// @access  Public
router.get("/", getApartments);

// @route   GET /api/apartments/:id
// @desc    Get a single apartment by ID
// @access  Public
router.get("/:id", getApartmentById);

// @route   POST /api/apartments
// @desc    Create a new apartment
// @access  Private (landlord only)
router.post("/", protect, isLandlord, upload.single("image"), createApartment);

module.exports = router;
