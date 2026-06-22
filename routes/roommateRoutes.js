const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authmiddleware");
const { writeLimiter } = require("../middleware/rateLimit");
const {
  roommateProfileRules,
  roommateRequestRules,
  roommateRequestStatusRules,
  validate,
} = require("../middleware/validateInput");
const {
  getMyRoommateProfile,
  upsertMyRoommateProfile,
  deleteMyRoommateProfile,
  getRoommateMatches,
  getRoommateProfileById,
  createRoommateRequest,
  getRoommateRequests,
  updateRoommateRequest,
} = require("../controllers/roommateController");

router.use(protect);

router.get("/", getRoommateMatches);
router.get("/me", getMyRoommateProfile);
router.put("/me", writeLimiter, roommateProfileRules, validate, upsertMyRoommateProfile);
router.delete("/me", writeLimiter, deleteMyRoommateProfile);
router.get("/requests", getRoommateRequests);
router.patch("/requests/:requestId", writeLimiter, roommateRequestStatusRules, validate, updateRoommateRequest);
router.get("/:id", getRoommateProfileById);
router.post("/:profileId/requests", writeLimiter, roommateRequestRules, validate, createRoommateRequest);

module.exports = router;
