const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authmiddleware");
const { writeLimiter, aiLimiter } = require("../middleware/rateLimit");
const {
  getStats,
  getAllUsers,
  updateUser,
  deleteUser,
  sendWelcomeBackEmail,
  sendBroadcastEmail,
  getSiteConfig,
  updateSiteConfig,
  getRoommateProfiles,
  deleteRoommateProfile,
} = require("../controllers/adminController");
const { parseListingText } = require("../controllers/aiListingController");

router.use(protect, isAdmin);

// @route   GET /api/admin/stats
router.get("/stats", getStats);

// @route   GET /api/admin/users
router.get("/users", getAllUsers);

// @route   PATCH /api/admin/users/:id
router.patch("/users/:id", writeLimiter, updateUser);

// @route   DELETE /api/admin/users/:id
router.delete("/users/:id", writeLimiter, deleteUser);

// @route   POST /api/admin/users/welcome-back-email
router.post("/users/welcome-back-email", writeLimiter, sendWelcomeBackEmail);

// @route   POST /api/admin/users/broadcast-email
// @desc    Preview / test-send / send a branded letterhead email to a user
//          audience. Body: { mode: "preview"|"test"|"send", audience, subject, message, ctaText?, ctaUrl? }
router.post("/users/broadcast-email", writeLimiter, sendBroadcastEmail);

// @route   GET /api/admin/site-config
router.get("/site-config", getSiteConfig);

// @route   PUT /api/admin/site-config
router.put("/site-config", writeLimiter, updateSiteConfig);

// @route   GET /api/admin/roommate-profiles
router.get("/roommate-profiles", getRoommateProfiles);

// @route   DELETE /api/admin/roommate-profiles/:id
router.delete("/roommate-profiles/:id", writeLimiter, deleteRoommateProfile);

// @route   POST /api/admin/listings/ai-parse
// @desc    Parse a raw WhatsApp message into listing fields via AI, and
//          match the phone number to a landlord account. Read-only — used
//          by the admin's create-listing form to pre-fill itself for
//          review. See controllers/aiListingController.js.
router.post("/listings/ai-parse", aiLimiter, parseListingText);

module.exports = router;