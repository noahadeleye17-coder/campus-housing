require("dotenv").config({ path: "config.env" });

const path = require("path");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const apartmentRoutes = require("./routes/apartmentroutes");
const roommateRoutes = require("./routes/roommateRoutes");
const userRoutes = require("./routes/userroutes");
const adminRoutes = require("./routes/adminRoutes");
const { apiLimiter } = require("./middleware/rateLimit");
const uploadErrorHandler = require("./middleware/uploadErrors");
const Apartment = require("./models/Apartment");
const SiteConfig = require("./models/SiteConfig");

const app = express();
mongoose.set("bufferCommands", false);

// Security headers (clickjacking, MIME-sniffing, etc.)
// CSP is left off for now since the frontend uses inline <script>/<style>
// tags (e.g. window.API_BASE, inline navbar styling) that a default CSP
// would block. Can be tightened later with a proper allowlist.
//
// crossOriginOpenerPolicy is relaxed from Helmet's default ("same-origin")
// to "same-origin-allow-popups". The default silently blocks the
// window.postMessage handshake that Google Identity Services' popup-based
// sign-in relies on to report the result back to the opener window - with
// the default in place, the Google popup (accounts.google.com/gsi/transform)
// completes login but can never tell the main page, so it's left open and
// blank. "same-origin-allow-popups" keeps the same-origin protection while
// permitting that specific popup communication.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

// ALLOWED_ORIGIN can be a single origin or a comma-separated list, e.g.
// "https://offcampushub.ng,https://www.offcampushub.ng,https://offcampushub.onrender.com"
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "http://localhost:5000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header, e.g. curl/Postman/server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use("/api", apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Server-rendered apartment detail page ───────────────────────────────────
// Google's crawler was seeing "Soft 404" on apartment.html?id=... pages:
// the page returns 200 OK, but since the real content (title, price,
// description) is only added by client-side JS after an API call, a slow or
// failed fetch during the crawl left Google looking at an empty error shell.
//
// Fix: inject the real title, meta description, and JSON-LD structured data
// directly into the HTML on the server, straight from the database, before
// any JavaScript runs. The existing apartment.js still runs client-side as
// before for the interactive parts (carousel, map, connect buttons) — this
// route only rewrites the <head> so search engines (and anyone with slow JS)
// always see real content immediately.
//
// Registered before express.static so it takes priority over the raw static
// file for this exact path.

const apartmentTemplatePath = path.join(__dirname, "frontend", "apartment.html");
let apartmentTemplateCache = null;
const getApartmentTemplate = () => {
  if (!apartmentTemplateCache) {
    apartmentTemplateCache = fs.readFileSync(apartmentTemplatePath, "utf8");
  }
  return apartmentTemplateCache;
};

const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

app.get("/apartment.html", async (req, res, next) => {
  const { id } = req.query;

  // No id in the URL — just serve the plain template as-is.
  if (!id) return next();

  try {
    const apartment = await Apartment.findById(id).lean();

    if (!apartment) {
      // Real 404 status, not a 200-with-error-message. This is the correct
      // signal to Google for a missing/deleted listing instead of another
      // soft 404.
      return res.status(404).send(getApartmentTemplate());
    }

    const priceText = apartment.price
      ? `₦${Number(apartment.price).toLocaleString()}`
      : "Price on request";

    const pageTitle = `${apartment.title} — ${apartment.location} | Off-Campus Hub`;
    const pageDescription = `${apartment.title} in ${apartment.location}, near FUTA Akure. ${priceText}. View photos, amenities, and contact the landlord directly on Off-Campus Hub.`;

    const images = apartment.images?.length
      ? apartment.images
      : apartment.image
        ? [apartment.image]
        : [];

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: apartment.title,
      description: `${apartment.title} located in ${apartment.location}, near FUTA Akure.`,
      image: images,
      offers: {
        "@type": "Offer",
        price: apartment.price || undefined,
        priceCurrency: "NGN",
        availability: "https://schema.org/InStock",
        url: `${process.env.SITE_URL || "https://offcampushub.onrender.com"}/apartment.html?id=${apartment._id}`,
      },
      ...(apartment.coordinates?.latitude && apartment.coordinates?.longitude
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: apartment.coordinates.latitude,
              longitude: apartment.coordinates.longitude,
            },
          }
        : {}),
    };

    let html = getApartmentTemplate();

    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${escapeHtml(pageTitle)}</title>`
    );
    html = html.replace(
      /<meta name="description" content=".*?"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(pageDescription)}" />`
    );
    html = html.replace(
      "</head>",
      `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>\n</head>`
    );

    res.send(html);
  } catch (err) {
    console.error("SSR apartment.html failed:", err.message);
    // Fall through to the plain static file rather than erroring the request
    next();
  }
});

app.use(express.static(path.join(__dirname, "frontend")));
// Serve the same frontend folder under /frontend so URLs like /frontend/landlord.html work
app.use("/frontend", express.static(path.join(__dirname, "frontend")));

app.use("/api/auth", authRoutes);
app.use("/api/apartments", apartmentRoutes);
app.use("/api/roommates", roommateRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// Public read of the admin-set announcement banner — no auth required since
// every visitor (logged in or not) should see it when active.
app.get("/api/site-config", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ announcement: "", announcementActive: false });
    }
    const config = await SiteConfig.getOrCreate();
    res.json({
      announcement: config.announcement,
      announcementActive: config.announcementActive,
    });
  } catch (error) {
    res.json({ announcement: "", announcementActive: false });
  }
});

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

// ── PWA entry point ──────────────────────────────────────────────────────────
// manifest.json's start_url. Deliberately a thin router, not a page of its
// own: it reuses the exact client-side session/role check dashboard.html
// already does (via AuthSession), just with one extra branch for "no
// session at all" -> public homepage. No new auth logic on the server.
app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "app.html"));
});

// ── Dynamic sitemap ──────────────────────────────────────────────────────────
// Regenerated on every request from the live database, so every apartment
// listing is automatically included — no manual re-uploading needed.

app.get("/sitemap.xml", async (req, res) => {
  const SITE_URL = process.env.SITE_URL || "https://offcampushub.onrender.com";

  // Public, indexable static pages only. Auth-gated pages (login, register,
  // dashboard, landlord, password reset) are deliberately excluded — they
  // shouldn't show up in search results.
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/about.html", priority: "0.5", changefreq: "monthly" },
    { loc: "/roommate-browse.html", priority: "0.6", changefreq: "daily" },
    { loc: "/terms.html", priority: "0.3", changefreq: "yearly" },
  ];

  let apartmentUrls = [];
  try {
    const apartments = await Apartment.find({}, "_id updatedAt").lean();
    apartmentUrls = apartments.map((apt) => ({
      loc: `/apartment.html?id=${apt._id}`,
      lastmod: apt.updatedAt ? apt.updatedAt.toISOString() : undefined,
      priority: "0.8",
      changefreq: "weekly",
    }));
  } catch (err) {
    console.error("Sitemap: failed to load apartments:", err.message);
    // Fall back to just the static pages rather than failing the whole sitemap
  }

  const allUrls = [...staticPages, ...apartmentUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(xml);
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
      "https://res.cloudinary.com/demo/image/upload/sample.jpg",
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