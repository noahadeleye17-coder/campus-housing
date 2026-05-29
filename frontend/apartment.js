const API_BASE = window.API_BASE || "http://localhost:5000/api";
const container = document.getElementById("apartmentDetails");
const mapEl = document.getElementById("map");
const params = new URLSearchParams(window.location.search);
const apartmentId = params.get("id");

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

  mapEl.style.display = "block";
  const map = L.map("map").setView([latitude, longitude], 15);

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
    ? `<img src="http://localhost:5000${apartment.image}" alt="${escapeHtml(apartment.title)}">`
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
      showError(data.message || "The apartment details could not be loaded.");
      return;
    }

    renderApartment(data);
  } catch (err) {
    showError("Could not reach the server. Make sure the backend is running.");
    console.error(err);
  }
}

fetchApartment();
