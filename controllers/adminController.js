const mongoose = require("mongoose");
const User = require("../models/user");
const Apartment = require("../models/Apartment");
const RoommateProfile = require("../models/RoommateProfile");
const RoommateRequest = require("../models/RoommateRequest");
const SiteConfig = require("../models/SiteConfig");
const { deleteFromCloudinary } = require("../upload/ResizeImage");
const { cloudinaryPublicIdFromUrl } = require("./apartmentController");

const isDatabaseError = (error) => {
  return error.name === "MongooseError" || error.name === "MongoServerSelectionError";
};

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  disabled: !!user.disabled,
  authProvider: user.authProvider || "local",
  createdAt: user.createdAt,
});

// @route   GET /api/admin/stats
// @desc    Platform-wide counts for the admin overview tab
// @access  Private (admin only)
exports.getStats = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalStudents,
      totalLandlords,
      totalListings,
      newUsersThisWeek,
      newListingsThisWeek,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "landlord" }),
      Apartment.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Apartment.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    res.json({
      totalUsers,
      totalStudents,
      totalLandlords,
      totalListings,
      newUsersThisWeek,
      newListingsThisWeek,
    });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @route   GET /api/admin/users
// @desc    List every user on the platform (optional ?search= on name/email)
// @access  Private (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const searchTerm = (req.query.search || "").trim();
    const filter = searchTerm
      ? {
          $or: [
            { name: { $regex: searchTerm, $options: "i" } },
            { email: { $regex: searchTerm, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users.map(publicUser));
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PATCH /api/admin/users/:id
// @desc    Change a user's role and/or disabled status
// @access  Private (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const { role, disabled } = req.body;

    // Guard against an admin locking themselves out — both role changes
    // away from admin and self-disable are blocked on your own account.
    if (id === String(req.user.id)) {
      if (role !== undefined && role !== "admin") {
        return res.status(400).json({ message: "You can't remove your own admin role" });
      }
      if (disabled === true) {
        return res.status(400).json({ message: "You can't disable your own account" });
      }
    }

    const update = {};
    if (role !== undefined) {
      if (!["student", "landlord", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      update.role = role;
    }
    if (disabled !== undefined) {
      update.disabled = !!disabled;
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(publicUser(user));
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(400).json({ message: error.message || "Could not update user" });
  }
};

// @route   DELETE /api/admin/users/:id
// @desc    Permanently delete any user and everything tied to them
//          (listings + their media, roommate profile/requests, avatar).
// @access  Private (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    if (id === String(req.user.id)) {
      return res.status(400).json({ message: "You can't delete your own account from here" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Clean up every listing this user owns (if they're a landlord), same
    // Cloudinary cleanup pattern as a landlord deleting their own listing.
    const apartments = await Apartment.find({ landlord: user._id });
    const mediaCleanupTasks = [];
    apartments.forEach((apartment) => {
      const imageUrls = apartment.images || (apartment.image ? [apartment.image] : []);
      imageUrls.forEach((url) => {
        const publicId = cloudinaryPublicIdFromUrl(url);
        if (publicId) mediaCleanupTasks.push(deleteFromCloudinary(publicId, "image"));
      });
      if (apartment.video) {
        const publicId = cloudinaryPublicIdFromUrl(apartment.video);
        if (publicId) mediaCleanupTasks.push(deleteFromCloudinary(publicId, "video"));
      }
    });

    if (user.profileImagePublicId) {
      mediaCleanupTasks.push(deleteFromCloudinary(user.profileImagePublicId, "image"));
    }

    await Promise.all([
      Apartment.deleteMany({ landlord: user._id }),
      RoommateProfile.deleteOne({ user: user._id }),
      RoommateRequest.deleteMany({ $or: [{ fromUser: user._id }, { toUser: user._id }] }),
      User.deleteOne({ _id: user._id }),
    ]);

    // Best-effort — the account and its DB records are already gone either way.
    Promise.all(mediaCleanupTasks).catch((err) =>
      console.warn("Cloudinary cleanup after admin user delete failed:", err.message)
    );

    res.json({ message: "User and all associated data deleted" });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Could not delete user" });
  }
};

// @route   GET /api/admin/site-config
// @desc    Read the current announcement banner (admin view — same data as
//          the public endpoint, kept separate so the admin UI never has to
//          special-case auth for this one read).
// @access  Private (admin only)
exports.getSiteConfig = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    const config = await SiteConfig.getOrCreate();
    res.json({
      announcement: config.announcement,
      announcementActive: config.announcementActive,
    });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PUT /api/admin/site-config
// @desc    Update the site-wide announcement banner
// @access  Private (admin only)
exports.updateSiteConfig = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const { announcement, announcementActive } = req.body;
    const update = {};
    if (announcement !== undefined) update.announcement = String(announcement).slice(0, 280);
    if (announcementActive !== undefined) update.announcementActive = !!announcementActive;

    const config = await SiteConfig.findOneAndUpdate(
      { key: SiteConfig.SINGLETON_KEY },
      update,
      { new: true, upsert: true }
    );

    res.json({
      announcement: config.announcement,
      announcementActive: config.announcementActive,
    });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(400).json({ message: error.message || "Could not update site config" });
  }
};

// @route   GET /api/admin/roommate-profiles
// @desc    List every roommate profile on the platform (optional ?search=
//          against the linked user's name/email or the profile's campus)
// @access  Private (admin only)
exports.getRoommateProfiles = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const searchTerm = (req.query.search || "").trim().toLowerCase();

    const profiles = await RoommateProfile.find({})
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    const filtered = searchTerm
      ? profiles.filter((p) => {
          const haystack = `${p.user?.name || ""} ${p.user?.email || ""} ${p.campus || ""}`.toLowerCase();
          return haystack.includes(searchTerm);
        })
      : profiles;

    res.json(filtered);
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @route   DELETE /api/admin/roommate-profiles/:id
// @desc    Permanently delete a single roommate profile (e.g. test data)
//          without touching the underlying user account. Also clears any
//          roommate requests tied to that user so nothing is left orphaned.
// @access  Private (admin only)
exports.deleteRoommateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid roommate profile ID" });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const profile = await RoommateProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ message: "Roommate profile not found" });
    }

    await Promise.all([
      RoommateRequest.deleteMany({ $or: [{ fromUser: profile.user }, { toUser: profile.user }] }),
      RoommateProfile.deleteOne({ _id: profile._id }),
    ]);

    res.json({ message: "Roommate profile deleted" });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Could not delete roommate profile" });
  }
};