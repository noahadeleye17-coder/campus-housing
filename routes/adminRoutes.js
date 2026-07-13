const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authmiddleware");
const { writeLimiter } = require("../middleware/rateLimit");
const {
  getStats,
  getAllUsers,
  updateUser,
  deleteUser,
  getSiteConfig,
  updateSiteConfig,
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

// @route   GET /api/admin/site-config
router.get("/site-config", getSiteConfig);

// @route   PUT /api/admin/site-config
router.put("/site-config", writeLimiter, updateSiteConfig);

module.exports = router;
