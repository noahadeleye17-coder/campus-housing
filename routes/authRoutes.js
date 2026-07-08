const express = require("express");
const router = express.Router();

const {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { registerRules, loginRules, googleAuthRules, validate } = require("../middleware/validateAuth");
const { authLimiter, passwordResetLimiter } = require("../middleware/rateLimit");
const { forgotPasswordRules, resetPasswordRules } = require("../middleware/validateInput");

router.post("/register", authLimiter, registerRules, validate, register);
router.post("/login", authLimiter, loginRules, validate, login);
router.post("/google", authLimiter, googleAuthRules, validate, googleLogin);
router.post("/forgot-password", passwordResetLimiter, forgotPasswordRules, validate, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPasswordRules, validate, resetPassword);

module.exports = router;