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
    image: "",
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
    image: "",
    coordinates: { latitude: 6.5271, longitude: 3.3847 },
    landlord: { name: "Demo Agent", email: "agent@example.com" },
  },
  {
    _id: "demo-3",
    title: "Self Contained Room",
    price: 280000,
    location: "Campus Back Gate Area",
    distanceFromCampus: 0.8,
    amenities: ["Private bathroom", "Tiles", "Water", "Secure compound"],
    image: "",
    coordinates: null,
    landlord: { name: "Demo Property Owner", email: "owner@example.com" },
  },
  {
    _id: "demo-4",
    title: "Quiet Mini Flat With Study Space",
    price: 520000,
    location: "Green Estate, short bus ride to campus",
    distanceFromCampus: 3.1,
    amenities: ["Study desk", "Kitchen", "Parking", "Security"],
    image: "",
    coordinates: { latitude: 6.5312, longitude: 3.3726 },
    landlord: { name: "Demo Housing Manager", email: "manager@example.com" },
  },
  {
    _id: "demo-5",
    title: "Budget Friendly Single Room",
    price: 180000,
    location: "Oke-Afa Student Area",
    distanceFromCampus: 1.9,
    amenities: ["Shared bathroom", "Water", "Prepaid meter", "Gated compound"],
    image: "",
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
    image: "",
    coordinates: { latitude: 6.5265, longitude: 3.3764 },
    landlord: { name: "Demo Property Group", email: "propertygroup@example.com" },
  },
];

const getDemoApartment = () => demoApartments.find((apartment) => apartment._id === apartmentId);

const formatCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "Price unavailable";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
};

const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
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

const renderMap = (apartment) => {
  const latitude = Number(apartment.coordinates?.latitude);
  const longitude = Number(apartment.coordinates?.longitude);

  if (!window.L || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    mapEl.style.display = "none";
    return;
  }

  mapEl.classList.remove("skeleton", "map-loading");
  mapEl.style.display = "block";
  const map = L.map("map", {
    scrollWheelZoom: false,
  }).setView([latitude, longitude], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);

  L.marker([latitude, longitude])
    .addTo(map)
    .bindPopup(escapeHtml(apartment.title || "Apartment location"));
};

const renderApartment = (apartment) => {
  const amenities = apartment.amenities?.length
    ? apartment.amenities
    : ["Amenities not listed"];
  const landlord = apartment.landlord;
  const imageMarkup = apartment.image
    ? `<img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.title)}">`
    : `<div class="detail-placeholder" aria-label="Apartment image placeholder"></div>`;

  container.innerHTML = `
    <div class="detail-hero-image">
      ${imageMarkup}
    </div>

    <div class="detail-content">
      <div class="detail-heading">
        <div>
          <h2>${escapeHtml(apartment.title)}</h2>
          <p class="location">${escapeHtml(apartment.location)}</p>
        </div>
        <span class="detail-status">Available</span>
      </div>

      <div class="detail-grid">
        <div>
          <span>Price</span>
          <strong>${formatCurrency(apartment.price)}</strong>
        </div>
        <div>
          <span>Distance</span>
          <strong>${escapeHtml(apartment.distanceFromCampus ?? "N/A")} km</strong>
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
        ${landlord?.email ? `<a class="btn detail-action" href="mailto:${escapeHtml(landlord.email)}">Contact landlord</a>` : ""}
      </section>
    </div>
  `;

  renderMap(apartment);
};

async function fetchApartment() {
  if (!apartmentId) {
    showError("No apartment was selected.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/apartments/${apartmentId}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const demoApartment = getDemoApartment();
      if (demoApartment) {
        renderApartment(demoApartment);
        return;
      }

      showError(data.message || "The apartment details could not be loaded.");
      return;
    }

    renderApartment(data);
  } catch (err) {
    const demoApartment = getDemoApartment();
    if (demoApartment) {
      renderApartment(demoApartment);
      return;
    }

    showError("Could not reach the server. Make sure the backend is running.");
    console.error(err);
  }
}

fetchApartment();
