const jwt = require("jsonwebtoken");
const User = require("../models/user");

/**
 * Protect routes (user must be logged in)
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token
  if (!token) {
    return res.status(401).json({
      message: "Not authorized, no token",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (without password)
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Not authorized, token failed",
    });
  }
};

/**
 * Allow only landlords or admins
 */
exports.isLandlord = (req, res, next) => {
  if (req.user.role !== "landlord" && req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Landlords only",
    });
  }
  next();
};

/**
 * Allow only admins
 */
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admins only",
    });
  }
  next();
};
