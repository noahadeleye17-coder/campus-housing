require("dotenv").config({ path: "config.env" });

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const apartmentRoutes = require("./routes/apartmentroutes");
const roommateRoutes = require("./routes/roommateRoutes");

const app = express();
mongoose.set("bufferCommands", false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "frontend")));

app.use("/api/auth", authRoutes);
app.use("/api/apartments", apartmentRoutes);
app.use("/api/roommates", roommateRoutes);

app.get("/api/config", (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "register.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    server: "running",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ✅ FIX 2: Error middleware moved AFTER all routes
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }
  next(err);
});

const startServer = async () => {
  const PORT = process.env.PORT || 5000;

  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET is not set; JWT authentication will fail. Set it in config.env or the environment.");
  }

  // ✅ FIX 3: Removed "localhost" binding so it works on deployment platforms
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI is not set; apartment and auth data will be unavailable.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("Server is still running. Check MONGO_URI, network access, and MongoDB Atlas IP allowlist.");
  }
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Server startup failed:", err.message);
  });
}

module.exports = app;
