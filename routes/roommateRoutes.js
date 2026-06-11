const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authmiddleware");
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
router.put("/me", upsertMyRoommateProfile);
router.delete("/me", deleteMyRoommateProfile);
router.get("/requests", getRoommateRequests);
router.patch("/requests/:requestId", updateRoommateRequest);
router.get("/:id", getRoommateProfileById);
router.post("/:profileId/requests", createRoommateRequest);

module.exports = router;
