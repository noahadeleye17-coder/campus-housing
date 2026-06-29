const mongoose = require("mongoose");
const RoommateProfile = require("../models/RoommateProfile");
const RoommateRequest = require("../models/RoommateRequest");

const isDatabaseError = (error) => {
  return error.name === "MongooseError" || error.name === "MongoServerSelectionError";
};

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
  }
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);
};

const parseNumber = (value) => {
  if (value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
};

const parseDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const buildProfileData = (body) => {
  const fields = [
    "bio",
    "campus",
    "preferredLocation",
    "whatsappNumber",
    "sleepSchedule",
    "cleanliness",
    "noisePreference",
    "guestPreference",
    "studyPreference",
    "visible",
    "gender",
    "educationLevel",
  ];
  const data = {};

  fields.forEach((field) => {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  });

  const budgetMin = parseNumber(body.budgetMin);
  const budgetMax = parseNumber(body.budgetMax);
  const moveInDate = parseDate(body.moveInDate);

  if (budgetMin !== undefined) data.budgetMin = budgetMin;
  if (budgetMax !== undefined) data.budgetMax = budgetMax;
  if (moveInDate !== undefined) data.moveInDate = moveInDate;
  if (body.interests !== undefined) data.interests = normalizeStringArray(body.interests);

  return data;
};

const rangesOverlap = (leftMin, leftMax, rightMin, rightMax) => {
  if (!leftMin || !leftMax || !rightMin || !rightMax) return false;
  return Math.max(leftMin, rightMin) <= Math.min(leftMax, rightMax);
};

const sharedInterests = (left = [], right = []) => {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return left.filter((item) => rightSet.has(item.toLowerCase()));
};

const addReason = (reasons, reason) => {
  if (reasons.length < 5) reasons.push(reason);
};

const scoreProfile = (viewerProfile, candidateProfile) => {
  let score = 0;
  const reasons = [];

  if (viewerProfile.campus && candidateProfile.campus && viewerProfile.campus === candidateProfile.campus) {
    score += 20;
    addReason(reasons, "Same campus");
  }

  if (rangesOverlap(
    viewerProfile.budgetMin,
    viewerProfile.budgetMax,
    candidateProfile.budgetMin,
    candidateProfile.budgetMax
  )) {
    score += 15;
    addReason(reasons, "Budget ranges overlap");
  }

  // Gender match adds to compatibility score
  if (viewerProfile.gender && candidateProfile.gender && viewerProfile.gender === candidateProfile.gender) {
    score += 10;
    addReason(reasons, "Same gender");
  }

  // Same education level adds to compatibility score
  if (viewerProfile.educationLevel && candidateProfile.educationLevel && viewerProfile.educationLevel === candidateProfile.educationLevel) {
    score += 10;
    addReason(reasons, "Same level");
  }

  [
    ["sleepSchedule", "Similar sleep schedule", 12],
    ["cleanliness", "Similar cleanliness preference", 12],
    ["noisePreference", "Similar noise preference", 8],
    ["guestPreference", "Similar guest preference", 8],
    ["studyPreference", "Similar study style", 8],
  ].forEach(([field, reason, points]) => {
    if (viewerProfile[field] && candidateProfile[field] && viewerProfile[field] === candidateProfile[field]) {
      score += points;
      addReason(reasons, reason);
    }
  });

  const commonInterests = sharedInterests(viewerProfile.interests, candidateProfile.interests);
  if (commonInterests.length > 0) {
    score += Math.min(commonInterests.length * 5, 15);
    addReason(reasons, `Shared interests: ${commonInterests.slice(0, 3).join(", ")}`);
  }

  return {
    score: Math.min(score, 100),
    reasons,
  };
};

const getMyRoommateProfile = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    const profile = await RoommateProfile.findOne({ user: req.user.id }).populate("user", "name email role");
    if (!profile) {
      return res.status(404).json({ message: "Roommate profile not found" });
    }
    res.json(profile);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const upsertMyRoommateProfile = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    if (req.user.role !== "student" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only students can create roommate profiles" });
    }
    const profile = await RoommateProfile.findOneAndUpdate(
      { user: req.user.id },
      { ...buildProfileData(req.body), user: req.user.id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("user", "name email role");
    res.json(profile);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(400).json({ message: error.message });
  }
};

const deleteMyRoommateProfile = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    const profile = await RoommateProfile.findOneAndDelete({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: "Roommate profile not found" });
    }
    res.json({ message: "Roommate profile deleted" });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const getRoommateMatches = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    const viewerProfile = await RoommateProfile.findOne({ user: req.user.id });
    if (!viewerProfile) {
      return res.status(404).json({ message: "Create a roommate profile before browsing matches" });
    }
    const filter = { user: { $ne: req.user.id }, visible: true };
    if (req.query.campus) filter.campus = req.query.campus;
    if (req.query.gender) filter.gender = req.query.gender;
    if (req.query.educationLevel) filter.educationLevel = req.query.educationLevel;

    const candidates = await RoommateProfile.find(filter)
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate("user", "name email role");

    const matches = candidates
      .map((profile) => {
        const compatibility = scoreProfile(viewerProfile, profile);
        return { profile, compatibility };
      })
      .sort((left, right) => right.compatibility.score - left.compatibility.score);

    res.json(matches);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const getRoommateProfileById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid roommate profile ID" });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    const profile = await RoommateProfile.findOne({ _id: req.params.id, visible: true }).populate("user", "name email role");
    if (!profile) {
      return res.status(404).json({ message: "Roommate profile not found" });
    }
    res.json(profile);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const createRoommateRequest = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.profileId)) {
      return res.status(400).json({ message: "Invalid roommate profile ID" });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    const profile = await RoommateProfile.findOne({ _id: req.params.profileId, visible: true });
    if (!profile) {
      return res.status(404).json({ message: "Roommate profile not found" });
    }
    if (profile.user.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot request yourself as a roommate" });
    }
    const myProfile = await RoommateProfile.findOne({ user: req.user.id });
    if (myProfile && myProfile.visible === false) {
      return res.status(400).json({
        message: "You're currently matched. Turn your profile back to visible before sending new requests.",
      });
    }
    const request = await RoommateRequest.findOneAndUpdate(
      { fromUser: req.user.id, toUser: profile.user },
      {
        fromUser: req.user.id,
        toUser: profile.user,
        message: req.body.message || "",
        status: "pending",
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    )
      .populate("fromUser", "name email role")
      .populate("toUser", "name email role");

    res.status(201).json(request);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(400).json({ message: error.message });
  }
};

const getRoommateRequests = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    const requests = await RoommateRequest.find({
      $or: [{ fromUser: req.user.id }, { toUser: req.user.id }],
    })
      .sort({ updatedAt: -1 })
      .populate("fromUser", "name email role")
      .populate("toUser", "name email role");

    const acceptedUserIds = requests
      .filter((r) => r.status === "accepted")
      .map((r) => (r.fromUser._id.toString() === req.user.id ? r.toUser._id : r.fromUser._id));

    const contactProfiles = acceptedUserIds.length
      ? await RoommateProfile.find({ user: { $in: acceptedUserIds } }, "user whatsappNumber")
      : [];
    const contactMap = new Map(contactProfiles.map((p) => [p.user.toString(), p.whatsappNumber]));

    const withContact = requests.map((r) => {
      if (r.status !== "accepted") return r.toObject();
      const counterpartId = (r.fromUser._id.toString() === req.user.id ? r.toUser._id : r.fromUser._id).toString();
      return { ...r.toObject(), matchedWhatsapp: contactMap.get(counterpartId) || null };
    });

    res.json(withContact);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const updateRoommateRequest = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.requestId)) {
      return res.status(400).json({ message: "Invalid roommate request ID" });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ message: "Status must be accepted or declined" });
    }
    const request = await RoommateRequest.findOneAndUpdate(
      { _id: req.params.requestId, toUser: req.user.id },
      { status },
      { new: true, runValidators: true }
    )
      .populate("fromUser", "name email role")
      .populate("toUser", "name email role");

    if (!request) {
      return res.status(404).json({ message: "Roommate request not found" });
    }

    let matchedWhatsapp = null;

    if (status === "accepted") {
      // Take both matched students off the browse list automatically.
      // They can flip "visible" back on later from their own profile if the match falls through.
      await RoommateProfile.updateMany(
        { user: { $in: [request.fromUser._id, request.toUser._id] } },
        { visible: false }
      );

      const counterpartProfile = await RoommateProfile.findOne({ user: request.fromUser._id });
      matchedWhatsapp = counterpartProfile?.whatsappNumber || null;
    }

    res.json({ ...request.toObject(), matchedWhatsapp });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getMyRoommateProfile,
  upsertMyRoommateProfile,
  deleteMyRoommateProfile,
  getRoommateMatches,
  getRoommateProfileById,
  createRoommateRequest,
  getRoommateRequests,
  updateRoommateRequest,
  scoreProfile,
};