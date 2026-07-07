const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Apartment = require("../models/Apartment");
const RoommateProfile = require("../models/RoommateProfile");
const RoommateRequest = require("../models/RoommateRequest");
const { processProfileImage, deleteFromCloudinary } = require("../upload/ResizeImage");

const isDatabaseError = (error) => {
  return error.name === "MongooseError" || error.name === "MongoServerSelectionError";
};

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const publicProfile = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage || "",
  savedApartments: (user.savedApartments || []).filter(Boolean),
  authProvider: user.authProvider || "local",
  notificationsEnabled: user.notificationsEnabled !== false,
});

// @route   GET /api/users/me
// @desc    Get the logged-in user's profile, with saved apartments populated
// @access  Private
exports.getMe = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const user = await User.findById(req.user.id).populate({
      path: "savedApartments",
      options: { sort: { createdAt: -1 } },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(publicProfile(user));
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PUT /api/users/me
// @desc    Update the logged-in user's name and/or profile picture
// @access  Private
exports.updateMe = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (typeof req.body.name === "string" && req.body.name.trim()) {
      user.name = req.body.name.trim();
    }

    // A new profile picture was uploaded in this request.
    if (req.file) {
      const previousPublicId = user.profileImagePublicId;
      const { url, publicId } = await processProfileImage(req.file);
      user.profileImage = url;
      user.profileImagePublicId = publicId;

      // Clean up the old avatar from Cloudinary now that the new one is saved.
      if (previousPublicId) {
        await deleteFromCloudinary(previousPublicId, "image");
      }
    }

    await user.save();
    res.json(publicProfile(user));
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(400).json({ message: error.message || "Could not update profile" });
  }
};

// @route   POST /api/users/me/saved/:apartmentId
// @desc    Save an apartment to the logged-in user's account
// @access  Private
exports.saveApartment = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    if (!isValidObjectId(apartmentId)) {
      return res.status(400).json({ message: "Invalid apartment ID" });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" });
    }

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { savedApartments: apartmentId },
    });

    res.json({ message: "Apartment saved" });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @route   DELETE /api/users/me/saved/:apartmentId
// @desc    Remove an apartment from the logged-in user's saved list
// @access  Private
exports.unsaveApartment = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    if (!isValidObjectId(apartmentId)) {
      return res.status(400).json({ message: "Invalid apartment ID" });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { savedApartments: apartmentId },
    });

    res.json({ message: "Apartment removed from saved list" });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @route   POST /api/users/me/saved/migrate
// @desc    One-time migration: bulk-add apartment IDs previously saved only
//          in the browser's localStorage onto the user's account.
// @access  Private
exports.migrateSavedApartments = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const validIds = ids.filter(isValidObjectId).slice(0, 200);

    if (!validIds.length) {
      const user = await User.findById(req.user.id).populate("savedApartments");
      return res.json(publicProfile(user));
    }

    // Only migrate IDs that correspond to apartments that still exist.
    const existing = await Apartment.find({ _id: { $in: validIds } }, "_id");
    const existingIds = existing.map((a) => a._id);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { savedApartments: { $each: existingIds } } },
      { new: true }
    ).populate("savedApartments");

    res.json(publicProfile(user));
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PATCH /api/users/me/notifications
// @desc    Turn push notifications on/off for the logged-in user
// @access  Private
exports.updateNotifications = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const enabled = req.body.enabled !== false;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { notificationsEnabled: enabled },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ notificationsEnabled: user.notificationsEnabled });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PUT /api/users/me/password
// @desc    Change the logged-in user's password. Google-authenticated
//          accounts don't need to supply a current password since they
//          never set one themselves.
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.authProvider !== "google") {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      const matches = await bcrypt.compare(currentPassword, user.password);
      if (!matches) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: "Password updated." });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(400).json({ message: error.message || "Could not update password" });
  }
};

// @route   DELETE /api/users/me
// @desc    Permanently delete the logged-in user's account and the data
//          tied to it (avatar, roommate profile, roommate requests).
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: "Database is not connected" });
    }

    const { password } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.authProvider !== "google") {
      if (!password) {
        return res.status(400).json({ message: "Password is required to delete your account" });
      }
      const matches = await bcrypt.compare(password, user.password);
      if (!matches) {
        return res.status(401).json({ message: "Password is incorrect" });
      }
    }

    if (user.profileImagePublicId) {
      await deleteFromCloudinary(user.profileImagePublicId, "image");
    }

    await Promise.all([
      RoommateProfile.deleteOne({ user: user._id }),
      RoommateRequest.deleteMany({ $or: [{ fromUser: user._id }, { toUser: user._id }] }),
    ]);

    await User.deleteOne({ _id: user._id });

    res.json({ message: "Account deleted." });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Could not delete account" });
  }
};