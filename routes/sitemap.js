// routes/sitemap.js
//
// Dynamically generates sitemap.xml on every request by combining static
// pages with all current apartment listings pulled fresh from MongoDB.
// This means new listings are picked up automatically — no manual
// regeneration needed when landlords add apartments.

const express = require("express");
const router = express.Router();
const Apartment = require("../models/Apartment");

const SITE_URL = process.env.SITE_URL || "https://offcampushub.onrender.com";

// Static pages worth indexing. Auth-only or transactional pages
// (login, register, dashboard, password reset) are intentionally excluded
// since they offer nothing for search and shouldn't be crawled/indexed.
const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about.html", changefreq: "monthly", priority: "0.6" },
  { path: "/roommate.html", changefreq: "weekly", priority: "0.7" },
  { path: "/roommate-browse.html", changefreq: "daily", priority: "0.7" },
  { path: "/landlord.html", changefreq: "monthly", priority: "0.6" },
  { path: "/terms.html", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/sitemap.xml", async (req, res) => {
  try {
    // Only pull fields we actually need for the sitemap — keeps this
    // fast even as the listings collection grows.
    const apartments = await Apartment.find({}, "_id updatedAt").lean();

    const staticUrls = STATIC_PAGES.map(
      (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    );

    const apartmentUrls = apartments.map((apt) => {
      const lastmod = apt.updatedAt
        ? new Date(apt.updatedAt).toISOString().split("T")[0]
        : undefined;

      return `  <url>
    <loc>${SITE_URL}/apartment.html?id=${escapeXml(apt._id)}</loc>${
        lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
      }
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...apartmentUrls].join("\n")}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("Sitemap generation failed:", err.message);
    res.status(500).send("Sitemap generation failed");
  }
});

module.exports = router;