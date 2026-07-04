// FUTA's main campus (Akure, Ondo State, Nigeria) as a fixed reference point.
// Derived from published campus latitude/longitude ranges (~7°17'-7°19'N,
// 5°07'-5°09'E); this is the approximate centre of campus. Used both as the
// origin for distance calculations and as the map's default centre.
// NOTE: keep this in sync with the FUTA_COORDINATES constant in
// frontend/apartment.js.
const FUTA_COORDINATES = { latitude: 7.304, longitude: 5.134 };

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Nominatim's usage policy asks for no more than ~1 request/second.
const MIN_REQUEST_GAP_MS = 1100;
let lastRequestAt = 0;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const throttle = async () => {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_GAP_MS) {
    await wait(MIN_REQUEST_GAP_MS - elapsed);
  }
  lastRequestAt = Date.now();
};

/**
 * Geocode a free-text address into { latitude, longitude } using
 * OpenStreetMap's Nominatim service (free, no API key required).
 *
 * Never throws — returns null if the address can't be resolved or the
 * service is unreachable, so a geocoding failure never blocks a landlord
 * from creating or updating a listing.
 */
const geocodeAddress = async (address) => {
  const query = String(address || "").trim();
  if (!query) return null;

  try {
    await throttle();

    // Landlord-entered addresses are usually landmark-style ("beside ABC
    // Pharmacy, South Gate") without a city name, so steer Nominatim toward
    // the right area unless the address already mentions Akure.
    const fullQuery = /akure/i.test(query) ? query : `${query}, Akure, Ondo State, Nigeria`;

    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(fullQuery)}`;
    const response = await fetch(url, {
      headers: {
        // Nominatim's usage policy requires a descriptive User-Agent that
        // identifies the application.
        "User-Agent": "campus-housing-app (contact: support@campus-housing.local)",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) return null;

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return { latitude, longitude };
  } catch (error) {
    console.warn("Geocoding failed:", error.message);
    return null;
  }
};

/**
 * Great-circle distance between two lat/lng points, in kilometres.
 */
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Distance in km from FUTA's fixed reference point to the given coordinates.
 */
const distanceFromFuta = (latitude, longitude) =>
  haversineDistanceKm(FUTA_COORDINATES.latitude, FUTA_COORDINATES.longitude, latitude, longitude);

module.exports = { geocodeAddress, haversineDistanceKm, distanceFromFuta, FUTA_COORDINATES };