const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { Resend } = require("resend");
const User = require("../models/user");

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const isDatabaseError = (error) => {
  return error.name === "MongooseError" || error.name === "MongoServerSelectionError";
};

const createToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage || "",
});

const sendResetEmail = async (toEmail, resetUrl) => {
  if (!resend) {
    throw new Error("Email service is not configured");
  }

  await resend.emails.send({
    from: "Off-Campus Hub <onboarding@resend.dev>",
    to: toEmail,
    subject: "Reset your Off-Campus Hub password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#17327f;">Reset your password</h2>
        <p>We received a request to reset your Off-Campus Hub password. This link is valid for 30 minutes.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:linear-gradient(135deg,#2357d8,#0f9f8f);color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;">
            Reset password
          </a>
        </p>
        <p>If you didn't request this, you can safely ignore this email — your password will not change.</p>
        <p style="color:#7a8496;font-size:0.85rem;">If the button doesn't work, copy and paste this link: <br>${resetUrl}</p>
      </div>
    `,
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      message: "Registration successful",
      token: createToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      message: "Login successful",
      token: createToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Login failed" });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Missing Google ID token" });
    }
    if (!googleClient) {
      return res.status(500).json({ message: "Google client is not configured" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({ message: "Google authentication failed" });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      const password = crypto.randomBytes(24).toString("hex");
      const hashedPassword = await bcrypt.hash(password, 12);
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        password: hashedPassword,
        role: "student",
      });
    }

    res.json({
      message: "Login successful",
      token: createToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    console.error("Google login error:", error);
    res.status(500).json({ message: "Google login failed" });
  }
};

// ── Forgot password ──────────────────────────────────────────────────────────
// Always responds with a generic success message, whether or not the email
// exists, so the endpoint can't be used to check which emails are registered.
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
      await user.save();

      const frontendBase = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
      const resetUrl = `${frontendBase}/reset-password.html?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

      try {
        await sendResetEmail(user.email, resetUrl);
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
        user.resetPasswordToken = null;
        user.resetPasswordExpire = null;
        await user.save();
        return res.status(500).json({ message: "Could not send reset email. Try again later." });
      }
    }

    res.json({
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Could not process password reset request" });
  }
};

// ── Reset password ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      return res.status(400).json({ message: "Email, token, and new password are required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "This reset link is invalid or has expired" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({
      message: "Password reset successful. You can now log in with your new password.",
      token: createToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    if (isDatabaseError(error)) {
      return res.status(503).json({ message: "Database is not connected" });
    }
    res.status(500).json({ message: "Could not reset password" });
  }
};