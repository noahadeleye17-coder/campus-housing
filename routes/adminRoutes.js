const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authmiddleware");
const { writeLimiter } = require("../middleware/rateLimit");
const {
  getStats,
  getAllUsers,
  updateUser,
  deleteUser,
  sendWelcomeBackEmail,
  getSiteConfig,
  updateSiteConfig,
  getRoommateProfiles,
  deleteRoommateProfile,
} = require("../controllers/adminController");

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

// @route   GET /api/admin/site-config
router.get("/site-config", getSiteConfig);

// @route   PUT /api/admin/site-config
router.put("/site-config", writeLimiter, updateSiteConfig);

// @route   GET /api/admin/roommate-profiles
router.get("/roommate-profiles", getRoommateProfiles);

// @route   DELETE /api/admin/roommate-profiles/:id
router.delete("/roommate-profiles/:id", writeLimiter, deleteRoommateProfile);

module.exports = router;