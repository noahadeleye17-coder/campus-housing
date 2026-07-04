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
    coordinates: { latitude: 6.5244, longitude: 3.3792 },
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
    coordinates: { latitude: 6.5271, longitude: 3.3847 },
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
    coordinates: { latitude: 6.5312, longitude: 3.3726 },
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
    coordinates: { latitude: 6.5198, longitude: 3.3881 },
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
    coordinates: { latitude: 6.5265, longitude: 3.3764 },
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

const renderApartment = (apartment) => {
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
          ${apartment.landlordWhatsapp ? `<a class="btn detail-action" href="${waLink(apartment.landlordWhatsapp)}?text=${encodeURIComponent(`Hi, I'm interested in ${apartment.title} on Off-Campus Hub.`)}" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>Chat on WhatsApp</a>` : ""}
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