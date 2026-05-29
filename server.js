require("dotenv").config({ path: "config.env" });

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const apartmentRoutes = require("./routes/apartmentroutes");

const app = express();
mongoose.set("bufferCommands", false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/apartments", apartmentRoutes);

app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/api/health", (req, res) => {
  res.json({
    server: "running",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

const startServer = async () => {
  const PORT = process.env.PORT || 5000;

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
