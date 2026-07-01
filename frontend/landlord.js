const session = window.AuthSession?.getSession() || {};
const token = session.token || null;
const form = document.getElementById("addApartmentForm");
const container = document.getElementById("myApartments");
const countEl = document.getElementById("listingCount");
const latestEl = document.getElementById("latestListing");
const API_BASE = window.API_BASE || "/api";

const fields = {
  title: document.getElementById("title"),
  price: document.getElementById("price"),
  location: document.getElementById("location"),
  landlordWhatsapp: document.getElementById("landlordWhatsapp"),
  amenities: document.getElementById("amenities"),
  images: document.getElementById("images"),
  video: document.getElementById("video"),
};

const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formHeading = document.querySelector(".form-card h2");
let editingId = null;
let myApartments = [];

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

const normalizeAmenities = (amenities) => {
  if (Array.isArray(amenities)) return amenities;
  if (!amenities) return [];
  return String(amenities).split(",");
};

const formatTravelTime = (distanceKm) => {
  const km = Number(distanceKm);
  if (!km || Number.isNaN(km)) return "Travel time pending";

  const walkMinutes = Math.max(3, Math.round(km * 12));
  const rideMinutes = Math.max(3, Math.round(km * 5));
  return km <= 1.5 ? `${walkMinutes} min walk` : `${rideMinutes} min by light transport`;
};

if (session.expired) {
  window.AuthSession?.redirectToLogin();
} else if (!token) {
  alert("Please login as a landlord first.");
  window.location.href = "login.html";
}

const handleExpiredSession = () => {
  window.AuthSession?.redirectToLogin();
};

const setFormMode = (id = null, apartment = null) => {
  editingId = id;

  if (id && apartment) {
    formHeading.textContent = "Edit apartment listing";
    submitBtn.textContent = "Save changes";
    cancelEditBtn.style.display = "inline-flex";
    fields.title.value = apartment.title || "";
    fields.price.value = apartment.price || "";
    fields.location.value = apartment.location || "";
    fields.amenities.value = Array.isArray(apartment.amenities)
      ? apartment.amenities.join(", ")
      : apartment.amenities || "";
    fields.landlordWhatsapp.value = apartment.landlordWhatsapp || "";
    fields.images.value = "";
    fields.video.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  formHeading.textContent = "Add apartment listing";
  submitBtn.textContent = "Add apartment";
  cancelEditBtn.style.display = "none";
  form.reset();
  editingId = null;
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("title", fields.title.value);
  formData.append("price", fields.price.value);
  formData.append("location", fields.location.value);
  formData.append("landlordWhatsapp", fields.landlordWhatsapp.value);
  formData.append("amenities", fields.amenities.value);

  // Multiple images — note the field name "images" (plural) matches the
  // backend's upload.fields([{ name: "images" }, { name: "video" }])
  Array.from(fields.images.files).forEach((file) => {
    formData.append("images", file);
  });

  if (fields.video.files[0]) {
    formData.append("video", fields.video.files[0]);
  }

  const method = editingId ? "PATCH" : "POST";
  const url = editingId
    ? `${API_BASE}/apartments/${encodeURIComponent(editingId)}`
    : `${API_BASE}/apartments`;

  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (res.status === 401) {
      handleExpiredSession();
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.message || (editingId ? "Failed to update apartment" : "Failed to add apartment"));
      return;
    }

    alert(editingId ? "Apartment updated!" : "Apartment added!");
    setFormMode();
    loadApartments();
  } catch (err) {
    alert("Network error. Make sure the server is running.");
    console.error(err);
  }
});

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => setFormMode());
}

async function loadApartments() {
  try {
    const res = await fetch(`${API_BASE}/apartments/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      handleExpiredSession();
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      container.innerHTML = `
        <div class="empty-state">${escapeHtml(data.message || "Could not load your apartments.")}</div>
      `;
      return;
    }

    myApartments = data;
    countEl.textContent = data.length;
    latestEl.textContent = data.length ? data[0].title : "None yet";

    if (!data.length) {
      container.innerHTML = `
        <div class="empty-state">No apartments yet. Add your first listing with the form on the left.</div>
      `;
      return;
    }

    const html = data.map((a) => {
      const images = Array.isArray(a.images) && a.images.length
        ? a.images
        : a.image
          ? [a.image]
          : [];

      let mediaMarkup;
      if (images.length || a.video) {
        const imageThumbs = images
          .map((src) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(a.title)}" />`)
          .join("");
        const videoThumb = a.video
          ? `<div class="video-thumb">▶ Video<br>attached</div>`
          : "";
        mediaMarkup = `<div class="media-strip">${imageThumbs}${videoThumb}</div>`;
      } else {
        mediaMarkup = `<div class="card-placeholder" aria-label="Apartment image placeholder"></div>`;
      }

      const amenities = normalizeAmenities(a.amenities);
      const amenitiesMarkup = amenities.length
        ? `<ul class="amenities-list">${amenities
            .filter((item) => String(item).trim())
            .map((item) => `<li>${escapeHtml(String(item).trim())}</li>`)
            .join("")}</ul>`
        : "";

      const travelTime = formatTravelTime(a.distanceFromCampus || a.distance);
      const price = Number(a.price);

      return `
        <article class="apartment-card">
          ${mediaMarkup}
          <div>
            <h3>${escapeHtml(a.title)}</h3>
            <div class="apartment-meta">
              <span>${escapeHtml(a.location)}</span>
              <span>${escapeHtml(travelTime)}</span>
              <span>WhatsApp: ${escapeHtml(a.landlordWhatsapp || "not set")}</span>
            </div>
          </div>
          ${amenitiesMarkup}
          <p class="apartment-price">₦${Number.isNaN(price) ? "N/A" : price.toLocaleString()}</p>
          <div class="listing-actions">
            <button class="listing-btn edit-listing" type="button" data-id="${escapeHtml(a._id)}">Edit</button>
            <button class="listing-btn delete-listing" type="button" data-id="${escapeHtml(a._id)}">Delete</button>
          </div>
        </article>
      `;
    }).join("");

    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">Network error. Make sure the server is running.</div>
    `;
    console.error(err);
  }
}

container.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;

  const apartmentId = button.dataset.id;

  if (button.classList.contains("delete-listing")) {
    const confirmed = window.confirm("Delete this listing?");
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/apartments/${encodeURIComponent(apartmentId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        handleExpiredSession();
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || "Failed to delete apartment");
        return;
      }

      if (editingId === apartmentId) setFormMode();
      loadApartments();
    } catch (err) {
      alert("Network error. Could not delete the listing.");
      console.error(err);
    }
    return;
  }

  if (button.classList.contains("edit-listing")) {
    const apartment = myApartments.find((item) => String(item._id) === String(apartmentId));
    if (!apartment) {
      alert("Could not load listing details for editing.");
      return;
    }
    setFormMode(apartmentId, apartment);
  }
});

loadApartments();