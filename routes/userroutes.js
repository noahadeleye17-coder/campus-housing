const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authmiddleware");
const { writeLimiter, uploadLimiter } = require("../middleware/rateLimit");
const { updateProfileRules, validate } = require("../middleware/validateInput");
const upload = require("../upload/upload");
const {
  getMe,
  updateMe,
  saveApartment,
  unsaveApartment,
  migrateSavedApartments,
} = require("../controllers/userController");

const profileImageUpload = upload.single("profileImage");

router.use(protect);

router.get("/me", getMe);
router.put("/me", writeLimiter, uploadLimiter, profileImageUpload, updateProfileRules, validate, updateMe);
router.post("/me/saved/migrate", writeLimiter, migrateSavedApartments);
router.post("/me/saved/:apartmentId", writeLimiter, saveApartment);
router.delete("/me/saved/:apartmentId", writeLimiter, unsaveApartment);

module.exports = router;