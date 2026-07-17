const API_BASE = window.API_BASE || "/api";
const container = document.getElementById("apartmentDetails");
const mapEl = document.getElementById("map");
const params = new URLSearchParams(window.location.search);
const apartmentId = params.get("id");

const demoApartments = [
  {
    _id: "demo-1",
    title: "Modern Studio Near Main Campus",
    price: 450000,
    location: "University Road, 8 minutes from campus gate",
    distanceFromCampus: 1.2,
    amenities: ["Wi-Fi", "Water", "Security", "Kitchenette"],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
    ],
    coordinates: { latitude: 7.2964, longitude: 5.1416 },
    landlord: { name: "Demo Landlord", email: "landlord@example.com" },
  },
  {
    _id: "demo-2",
    title: "Shared 2-Bed Apartment",
    price: 320000,
    location: "Student Village Extension",
    distanceFromCampus: 2.4,
    amenities: ["Furnished", "Prepaid meter", "Water", "Wardrobe"],
    images: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80",
    ],
    coordinates: { latitude: 7.3227, longitude: 5.1448 },
    landlord: { name: "Demo Agent", email: "agent@example.com" },
  },
  {
    _id: "demo-3",
    title: "Self-Contain Room",
    price: 280000,
    location: "South Gate Area",
    distanceFromCampus: 0.8,
    amenities: ["Private bathroom", "Tiles", "Water", "Secure compound"],
    images: [
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    ],
    coordinates: null,
    landlord: { name: "Demo Property Owner", email: "owner@example.com" },
  },
  {
    _id: "demo-4",
    title: "Quiet Mini Flat With Study Space",
    price: 520000,
    location: "North Gate Area",
    distanceFromCampus: 3.1,
    amenities: ["Study desk", "Kitchen", "Parking", "Security"],
    images: [
     "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
     "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&q=80",
     "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    ],
    coordinates: { latitude: 7.3319, longitude: 5.1310 },
    landlord: { name: "Demo Housing Manager", email: "manager@example.com" },
  },
  {
    _id: "demo-5",
    title: "Budget Friendly Single Room",
    price: 180000,
    location: "Apatapiti Student Area",
    distanceFromCampus: 1.9,
    amenities: ["Shared bathroom", "Water", "Prepaid meter", "Gated compound"],
    images: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80",
    ],
    coordinates: { latitude: 7.2919, longitude: 5.1219 },
    landlord: { name: "Demo Caretaker", email: "caretaker@example.com" },
  },
  {
    _id: "demo-6",
    title: "Premium 1-Bed Apartment",
    price: 750000,
    location: "Campus View Apartments",
    distanceFromCampus: 0.6,
    amenities: ["Air conditioning", "Private kitchen", "Backup power", "CCTV"],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80",
    ],
    coordinates: { latitude: 7.3040, longitude: 5.1286 },
    landlord: { name: "Demo Property Group", email: "propertygroup@example.com" },
  },
];

// FUTA's main campus, used as the map's fixed reference point.
// Keep this in sync with FUTA_COORDINATES in utils/geocode.js on the backend.
const FUTA_COORDINATES = { latitude: 7.304, longitude: 5.134 };

const getDemoApartment = () => demoApartments.find((a) => a._id === apartmentId);

const formatCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "Price unavailable";
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0,
  }).format(amount);
};

const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;",
  }[char]));
};

const formatTravelTime = (distanceKm) => {
  const km = Number(distanceKm);
  if (!km || Number.isNaN(km)) {
    const estimatedMinutes = Math.floor(Math.random() * (15 - 10 + 1)) + 10; // 10-15 min
    return {
      short: `${estimatedMinutes} min walk`,
      detail: `~${estimatedMinutes} min walk (estimated)`,
    };
  }

  const walkMinutes = Math.max(3, Math.round(km * 12));
  const rideMinutes = Math.max(3, Math.round(km * 5));

  return {
    short: km <= 1.5 ? `${walkMinutes} min walk` : `${rideMinutes} min ride`,
    detail: `${walkMinutes} min walk / ${rideMinutes} min by light transport`,
  };
};

const waLink = (number) => {
  const digits = String(number || "").replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `234${digits.slice(1)}` : digits.replace(/^234?/, "234");
  return `https://wa.me/${intl}`;
};

// Builds the pre-filled WhatsApp message for a specific apartment so the
// landlord immediately knows which listing the student means. Uses
// location + propertyType as a short stand-in "description" since the
// Apartment model has no dedicated description field, and links to this
// exact listing (not the homepage).
const buildWhatsappMessage = (apartment) => {
  const summaryParts = [apartment.propertyType, apartment.location].filter(Boolean);
  const summary = summaryParts.join(" — ");
  const listingUrl = `${window.location.origin}/apartment.html?id=${apartment._id}`;

  return [
    `Hi, I'm interested in this apartment on Off-Campus Hub:`,
    `${apartment.title}${summary ? ` (${summary})` : ""}`,
    listingUrl,
  ].join("\n");
};

const waBadge = `<span class="wa-badge" aria-hidden="true"><svg viewBox="0 0 448 512" fill="#fff"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg></span>`;

const showError = (message) => {
  container.innerHTML = `
    <div class="detail-empty">
      <h2>Apartment unavailable</h2>
      <p>${escapeHtml(message)}</p>
      <a class="btn detail-action" href="index.html">Browse apartments</a>
    </div>
  `;
  mapEl.style.display = "none";
};

// ── Carousel ─────────────────────────────────────────────────────────────────
// `media` is an array of { type: "image" | "video", src: string }

const buildCarousel = (media, title) => {
  if (!media || media.length === 0) {
    return `<div class="detail-placeholder" aria-label="Apartment image placeholder"></div>`;
  }

  if (media.length === 1) {
    const item = media[0];
    if (item.type === "video") {
      return `<video src="${escapeHtml(item.src)}" controls playsinline style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;"></video>`;
    }
    return `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(title)}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;">`;
  }

  const slides = media.map((item, i) => {
    const inner = item.type === "video"
      ? `<video src="${escapeHtml(item.src)}" controls playsinline></video>`
      : `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(title)} — photo ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}">`;
    return `<div class="carousel-slide">${inner}</div>`;
  }).join("");

  const dots = media.map((_, i) => `
    <button class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>
  `).join("");

  return `
    <div class="carousel" id="imgCarousel">
      <div class="carousel-track" id="carouselTrack">${slides}</div>
      <button class="carousel-btn prev" id="carouselPrev" aria-label="Previous">&#8249;</button>
      <button class="carousel-btn next" id="carouselNext" aria-label="Next">&#8250;</button>
      <div class="carousel-dots" id="carouselDots">${dots}</div>
      <span class="carousel-count" id="carouselCount">1 / ${media.length}</span>
    </div>
  `;
};

const initCarousel = (total) => {
  if (total <= 1) return;

  const track = document.getElementById("carouselTrack");
  const prevBtn = document.getElementById("carouselPrev");
  const nextBtn = document.getElementById("carouselNext");
  const dotsEl = document.getElementById("carouselDots");
  const countEl = document.getElementById("carouselCount");
  const dots = dotsEl ? dotsEl.querySelectorAll(".carousel-dot") : [];

  let current = 0;

  const pauseVideos = () => {
    track.querySelectorAll("video").forEach((video) => video.pause());
  };

  const goTo = (index) => {
    pauseVideos();
    current = Math.max(0, Math.min(index, total - 1));
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
    if (countEl) countEl.textContent = `${current + 1} / ${total}`;
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === total - 1;
  };

  if (prevBtn) prevBtn.addEventListener("click", () => goTo(current - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => goTo(current + 1));
  dots.forEach((dot) => {
    dot.addEventListener("click", () => goTo(Number(dot.dataset.index)));
  });

  // Swipe support for mobile
  let touchStartX = 0;
  const carousel = document.getElementById("imgCarousel");
  if (carousel) {
    carousel.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener("touchend", (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
    }, { passive: true });
  }

  goTo(0);
};

// ── Render ────────────────────────────────────────────────────────────────────

const renderMap = (apartment) => {
  if (!window.L) {
    mapEl.style.display = "none";
    return;
  }

  const latitude = Number(apartment.coordinates?.latitude);
  const longitude = Number(apartment.coordinates?.longitude);
  const hasApartmentCoords = !Number.isNaN(latitude) && !Number.isNaN(longitude);

  mapEl.classList.remove("skeleton", "map-loading");
  mapEl.style.display = "block";

  // Always centre on FUTA — it's shown as a fixed reference point even
  // when the listing itself has no coordinates yet.
  const map = L.map("map", { scrollWheelZoom: false }).setView(
    [FUTA_COORDINATES.latitude, FUTA_COORDINATES.longitude],
    hasApartmentCoords ? 13 : 15
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);

  L.circleMarker([FUTA_COORDINATES.latitude, FUTA_COORDINATES.longitude], {
    radius: 9,
    color: "#0f766e",
    fillColor: "#14b8a6",
    fillOpacity: 1,
    weight: 2,
  }).addTo(map).bindPopup("FUTA (reference point)");

  if (!hasApartmentCoords) return;

  L.marker([latitude, longitude]).addTo(map).bindPopup(escapeHtml(apartment.title || "Apartment location"));

  L.polyline(
    [
      [FUTA_COORDINATES.latitude, FUTA_COORDINATES.longitude],
      [latitude, longitude],
    ],
    { color: "#2563eb", weight: 3, dashArray: "6, 8" }
  ).addTo(map);

  map.fitBounds(
    [
      [FUTA_COORDINATES.latitude, FUTA_COORDINATES.longitude],
      [latitude, longitude],
    ],
    { padding: [40, 40] }
  );
};

const setSeoMeta = (apartment) => {
  const priceText = apartment.price
    ? `₦${Number(apartment.price).toLocaleString()}`
    : "Price on request";

  document.title = `${apartment.title} — ${apartment.location} | Off-Campus Hub`;

  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute(
    "content",
    `${apartment.title} in ${apartment.location}, near FUTA Akure. ${priceText}. View photos, amenities, and contact the landlord directly on Off-Campus Hub.`
  );

  // Structured data (JSON-LD) so Google can show price, location, and image
  // directly in search results instead of just a plain link.
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
      url: window.location.href,
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

  let ldScript = document.getElementById("apartment-structured-data");
  if (!ldScript) {
    ldScript = document.createElement("script");
    ldScript.type = "application/ld+json";
    ldScript.id = "apartment-structured-data";
    document.head.appendChild(ldScript);
  }
  ldScript.textContent = JSON.stringify(structuredData);
};

const trackRecentlyViewed = (apartment) => {
  if (!apartment?._id || String(apartment._id).startsWith("demo-")) return;

  try {
    const list = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
    const filtered = Array.isArray(list) ? list.filter((item) => item.id !== apartment._id) : [];

    filtered.unshift({
      id: apartment._id,
      title: apartment.title,
      location: apartment.location,
      price: apartment.price,
      image: apartment.images?.[0] || apartment.image || "",
      viewedAt: new Date().toISOString(),
    });

    localStorage.setItem("recentlyViewed", JSON.stringify(filtered.slice(0, 12)));
  } catch {
    /* Non-critical — just skip tracking if localStorage is unavailable/full. */
  }
};

const renderApartment = (apartment) => {
  setSeoMeta(apartment);
  trackRecentlyViewed(apartment);

  const amenities = apartment.amenities?.length ? apartment.amenities : ["Amenities not listed"];
  const landlord = apartment.landlord;

  // Support both images[] array and single image string
  const images = apartment.images?.length
    ? apartment.images
    : apartment.image
      ? [apartment.image]
      : [];

  // Combine images and video into one media list: images first, video last
  const media = [
    ...images.map((src) => ({ type: "image", src })),
    ...(apartment.video ? [{ type: "video", src: apartment.video }] : []),
  ];

  const imageMarkup = buildCarousel(media, apartment.title);
  const travelTime = formatTravelTime(apartment.distanceFromCampus);

  container.innerHTML = `
    <div class="detail-hero-image">
      ${imageMarkup}
    </div>

    <div class="detail-content">
      <div class="detail-heading">
        <div>
          <h2>${escapeHtml(apartment.title)}</h2>
          <p class="location">${escapeHtml(apartment.location)}</p>
          <div class="detail-trust" aria-label="Apartment trust signals">
            <span>Verified listing</span>
            <span>Photos checked</span>
            <span>Landlord confirmed</span>
          </div>
        </div>
        <span class="detail-status">Available</span>
      </div>

      <div class="detail-grid">
        <div>
          <span>Price</span>
          <strong>${formatCurrency(apartment.price)}</strong>
        </div>
        <div>
          <span>Campus travel time</span>
          <strong>${escapeHtml(travelTime.detail)}</strong>
        </div>
        <div>
          <span>Amenities</span>
          <strong>${amenities.length}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>Available</strong>
        </div>
      </div>

      <section class="detail-section">
        <h3>Amenities</h3>
        <div class="amenity-list">
          ${amenities.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>

      <section class="detail-section landlord-panel">
        <div>
          <h3>Landlord</h3>
          <p>${landlord ? escapeHtml(landlord.name) : "Contact details will appear here when listed."}</p>
          ${landlord?.email ? `<p class="muted">${escapeHtml(landlord.email)}</p>` : ""}
        </div>
        <div class="landlord-panel-actions">
          ${apartment.landlordWhatsapp ? `<a class="btn detail-action" href="${waLink(apartment.landlordWhatsapp)}?text=${encodeURIComponent(buildWhatsappMessage(apartment))}" target="_blank" rel="noopener">${waBadge}Chat on WhatsApp</a>` : ""}
          ${landlord?.email ? `<a class="btn detail-action outline" href="mailto:${escapeHtml(landlord.email)}">Email landlord</a>` : ""}
        </div>
      </section>
    </div>
  `;

  // Init carousel after DOM is updated
  initCarousel(media.length);
  renderMap(apartment);
};

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchApartment() {
  if (!apartmentId) { showError("No apartment was selected."); return; }

  try {
    const res = await fetch(`${API_BASE}/apartments/${apartmentId}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const demo = getDemoApartment();
      if (demo) { renderApartment(demo); return; }
      showError(data.message || "The apartment details could not be loaded.");
      return;
    }

    renderApartment(data);
  } catch (err) {
    const demo = getDemoApartment();
    if (demo) { renderApartment(demo); return; }
    showError("Could not reach the server. Make sure the backend is running.");
    console.error(err);
  }
}

fetchApartment();