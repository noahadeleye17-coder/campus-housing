require("dotenv").config({ path: "config.env" });

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const apartmentRoutes = require("./routes/apartmentroutes");
const roommateRoutes = require("./routes/roommateRoutes");
const { apiLimiter } = require("./middleware/rateLimit");
const uploadErrorHandler = require("./middleware/uploadErrors");

const app = express();
mongoose.set("bufferCommands", false);

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "http://localhost:5000",
  credentials: true,
}));
app.use("/api", apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "frontend")));
// Serve the same frontend folder under /frontend so URLs like /frontend/landlord.html work
app.use("/frontend", express.static(path.join(__dirname, "frontend")));

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
app.get("/api/debug-cloudinary", async (req, res) => {
  const { v2: cloudinary } = require("cloudinary");
  try {
    const result = await cloudinary.uploader.upload(
      "https://via.placeholder.com/150",
      { folder: "campus-housing/debug-test" }
    );
    res.json({ success: true, url: result.secure_url });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Error middleware (after all routes)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }

  uploadErrorHandler(err, req, res, next);
});

// ── MongoDB connection with auto-reconnect ──────────────────────────────────

let isConnecting = false;

const connectDB = async () => {
  if (isConnecting) return;
  isConnecting = true;

  try {
    await mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  maxPoolSize: 3,
  heartbeatFrequencyMS: 30000,
  minPoolSize: 1,
  tls: true,                    // replaces the ssl=true in the URI
  directConnection: false,
});
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("Retrying in 10 seconds...");
    setTimeout(() => {
      isConnecting = false;
      connectDB();
    }, 10000);
    return;
  }

  isConnecting = false;
};

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established");
  isConnecting = false;
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Attempting to reconnect...");
  setTimeout(() => {
    isConnecting = false;
    connectDB();
  }, 5000);
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
  // Force close so the disconnected event fires and triggers reconnect
  mongoose.connection.close();
});

// ── Server startup ──────────────────────────────────────────────────────────

const startServer = async () => {
  const PORT = process.env.PORT || 5000;

  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET is not set; JWT authentication will fail.");
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI is not set; apartment and auth data will be unavailable.");
    return;
  }

  await connectDB();
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Server startup failed:", err.message);
  });
}

module.exports = app;