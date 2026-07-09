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
  propertyType: document.getElementById("propertyType"),
  landlordWhatsapp: document.getElementById("landlordWhatsapp"),
  amenities: document.getElementById("amenities"),
  images: document.getElementById("images"),
  video: document.getElementById("video"),
};

const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formHeading = document.getElementById("formHeading");
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
  if (!km || Number.isNaN(km)) {
    const estimatedMinutes = Math.floor(Math.random() * (15 - 10 + 1)) + 10; // 10-15 min
    return `${estimatedMinutes} min walk`;
  }

  const walkMinutes = Math.max(3, Math.round(km * 12));
  const rideMinutes = Math.max(3, Math.round(km * 5));
  return km <= 1.5 ? `${walkMinutes} min walk` : `${rideMinutes} min by light transport`;
};

// ── Toasts (replaces alert()) ────────────────────────────────────────────────
let toastContainer = null;

const showToast = (message, type = "info") => {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 200);
  }, 3200);
};

// ── Confirm modal (replaces window.confirm()) ────────────────────────────────
const showConfirm = (message) => {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <p>${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button type="button" class="modal-btn modal-btn-cancel" id="modalCancelBtn">Cancel</button>
          <button type="button" class="modal-btn modal-btn-confirm" id="modalConfirmBtn">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cleanup = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector("#modalCancelBtn").addEventListener("click", () => cleanup(false));
    overlay.querySelector("#modalConfirmBtn").addEventListener("click", () => cleanup(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
};

if (session.expired) {
  window.AuthSession?.redirectToLogin();
} else if (!token) {
  window.location.href = "login.html";
}

const handleExpiredSession = () => {
  window.AuthSession?.redirectToLogin();
};

// ── Top bar: identity + logout ───────────────────────────────────────────────
const topAvatar = document.getElementById("topAvatar");
const topName = document.getElementById("topName");
const topRole = document.getElementById("topRole");
const logoutBtn = document.getElementById("logoutBtn");

if (token) {
  const user = session.user || {};
  const name = user.name || user.email || "Landlord";
  if (topName) topName.textContent = name;
  if (topRole) topRole.textContent = user.role || "Landlord";
  if (topAvatar) topAvatar.textContent = name.charAt(0).toUpperCase();
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.AuthSession?.clear();
    window.location.href = "login.html";
  });
}

// ── Photo / video previews before upload ─────────────────────────────────────
const imagePreviewsEl = document.getElementById("imagePreviews");
const imageCountWarningEl = document.getElementById("imageCountWarning");
const videoPreviewEl = document.getElementById("videoPreview");

let selectedImageFiles = [];
let selectedVideoFile = null;

// When editing a listing, these hold the photos/video that are already on
// it — separate from `selectedImageFiles`/`selectedVideoFile` above, which
// are only ever new uploads. Keeping them apart is what lets the edit form
// show current photos and let the landlord remove individual ones or add
// more, without silently wiping everything that wasn't re-selected.
let existingImageUrls = [];
let existingVideoUrl = null;
let videoRemoved = false;

const syncImagesInput = () => {
  // Keeps the real <input type="file"> in sync with our own array so a
  // photo removed via the ✕ button is actually excluded from the upload,
  // not just hidden visually.
  const dataTransfer = new DataTransfer();
  selectedImageFiles.forEach((file) => dataTransfer.items.add(file));
  fields.images.files = dataTransfer.files;
};

const renderImagePreviews = () => {
  imagePreviewsEl.innerHTML = "";

  // Existing photos already on the listing (edit mode only). Removing one
  // here just takes it out of `existingImageUrls` — nothing is uploaded or
  // deleted until the form is actually submitted.
  existingImageUrls.forEach((url, index) => {
    const item = document.createElement("div");
    item.className = "image-preview-item existing";

    const img = document.createElement("img");
    img.src = url;
    img.alt = `Current photo ${index + 1}`;
    item.appendChild(img);

    const badge = document.createElement("span");
    badge.className = "preview-badge";
    badge.textContent = "Current";
    item.appendChild(badge);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-preview";
    removeBtn.setAttribute("aria-label", `Remove current photo ${index + 1}`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      existingImageUrls.splice(index, 1);
      renderImagePreviews();
    });
    item.appendChild(removeBtn);

    imagePreviewsEl.appendChild(item);
  });

  // Newly selected files, not yet uploaded.
  selectedImageFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "image-preview-item";

    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.alt = `Selected photo ${index + 1}`;
    img.onload = () => URL.revokeObjectURL(objectUrl);
    item.appendChild(img);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-preview";
    removeBtn.setAttribute("aria-label", `Remove photo ${index + 1}`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      selectedImageFiles.splice(index, 1);
      syncImagesInput();
      renderImagePreviews();
    });
    item.appendChild(removeBtn);

    imagePreviewsEl.appendChild(item);
  });
};

const renderVideoPreview = () => {
  videoPreviewEl.innerHTML = "";

  if (selectedVideoFile) {
    const item = document.createElement("div");
    item.className = "video-preview-item";

    const sizeMB = (selectedVideoFile.size / (1024 * 1024)).toFixed(1);
    const label = document.createElement("span");
    label.textContent = `🎬 ${selectedVideoFile.name} (${sizeMB} MB)`;
    item.appendChild(label);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-preview-inline";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      selectedVideoFile = null;
      fields.video.value = "";
      renderVideoPreview();
    });
    item.appendChild(removeBtn);

    videoPreviewEl.appendChild(item);
    return;
  }

  if (existingVideoUrl && !videoRemoved) {
    const item = document.createElement("div");
    item.className = "video-preview-item";

    const label = document.createElement("span");
    label.textContent = "🎬 Current video";
    item.appendChild(label);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-preview-inline";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      videoRemoved = true;
      renderVideoPreview();
    });
    item.appendChild(removeBtn);

    videoPreviewEl.appendChild(item);
  }
};

const clearPreviews = () => {
  selectedImageFiles = [];
  selectedVideoFile = null;
  existingImageUrls = [];
  existingVideoUrl = null;
  videoRemoved = false;
  imageCountWarningEl.style.display = "none";
  renderImagePreviews();
  renderVideoPreview();
};

fields.images.addEventListener("change", () => {
  const chosen = Array.from(fields.images.files);
  const roomLeft = Math.max(6 - existingImageUrls.length, 0);

  if (chosen.length > roomLeft) {
    selectedImageFiles = chosen.slice(0, roomLeft);
    syncImagesInput(); // trim the real input too, so the count sent to the backend actually matches
    imageCountWarningEl.textContent = existingImageUrls.length
      ? `You have ${existingImageUrls.length} current photo${existingImageUrls.length === 1 ? "" : "s"} kept — only ${roomLeft} more could be added to stay within the 6-photo limit.`
      : `You selected ${chosen.length} photos — only the first 6 were kept. The server rejects more than 6.`;
    imageCountWarningEl.style.display = "block";
  } else {
    selectedImageFiles = chosen;
    imageCountWarningEl.style.display = "none";
  }

  renderImagePreviews();
});

fields.video.addEventListener("change", () => {
  selectedVideoFile = fields.video.files[0] || null;
  renderVideoPreview();
});

const setFormMode = (id = null, apartment = null) => {
  editingId = id;

  if (id && apartment) {
    formHeading.textContent = "Edit apartment listing";
    submitBtn.textContent = "Save changes";
    cancelEditBtn.style.display = "inline-flex";
    fields.title.value = apartment.title || "";
    fields.price.value = apartment.price || "";
    fields.location.value = apartment.location || "";
    fields.propertyType.value = apartment.propertyType || "";
    fields.amenities.value = Array.isArray(apartment.amenities)
      ? apartment.amenities.join(", ")
      : apartment.amenities || "";
    fields.landlordWhatsapp.value = apartment.landlordWhatsapp || "";
    fields.images.value = "";
    fields.video.value = "";
    selectedImageFiles = [];
    selectedVideoFile = null;
    existingImageUrls = apartment.images?.length
      ? [...apartment.images]
      : apartment.image
        ? [apartment.image]
        : [];
    existingVideoUrl = apartment.video || null;
    videoRemoved = false;
    imageCountWarningEl.style.display = "none";
    renderImagePreviews();
    renderVideoPreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  formHeading.textContent = "Add apartment listing";
  submitBtn.textContent = "Add apartment";
  cancelEditBtn.style.display = "none";
  form.reset();
  clearPreviews();
  editingId = null;
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (submitBtn.disabled) return; // guard against double-submit on slow connections

  const isEditing = Boolean(editingId);
  const originalLabel = isEditing ? "Save changes" : "Add apartment";
  submitBtn.disabled = true;
  submitBtn.textContent = isEditing ? "Saving changes…" : "Adding apartment…";

  const formData = new FormData();
  formData.append("title", fields.title.value);
  formData.append("price", fields.price.value);
  formData.append("location", fields.location.value);
  formData.append("propertyType", fields.propertyType.value);
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

  if (isEditing) {
    // Tells the backend exactly which of the original photos to keep —
    // anything not in this list was removed via the × button and should
    // be dropped (and cleaned up from Cloudinary), not silently replaced.
    formData.append("existingImages", JSON.stringify(existingImageUrls));
    if (videoRemoved && !selectedVideoFile) {
      formData.append("removeVideo", "true");
    }
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
      showToast(data.message || (isEditing ? "Failed to update apartment" : "Failed to add apartment"), "error");
      return;
    }

    showToast(isEditing ? "Apartment updated!" : "Apartment added!", "success");
    setFormMode();
    loadApartments();
  } catch (err) {
    showToast("Network error. Make sure the server is running.", "error");
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    // setFormMode() already reset the label on success; this only matters
    // on the error paths where setFormMode() was never called.
    if (submitBtn.textContent.endsWith("…")) submitBtn.textContent = originalLabel;
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
              ${a.propertyType ? `<span>${escapeHtml(a.propertyType)}</span>` : ""}
              <span>${escapeHtml(travelTime)}</span>
              <span>WhatsApp: ${escapeHtml(a.landlordWhatsapp || "not set")}</span>
            </div>
          </div>
          ${amenitiesMarkup}
          <p class="apartment-price">₦${Number.isNaN(price) ? "N/A" : price.toLocaleString()}</p>
          <div class="listing-actions">
            <button class="btn outline listing-btn edit-listing" type="button" data-id="${escapeHtml(a._id)}">Edit</button>
            <button class="btn outline danger listing-btn delete-listing" type="button" data-id="${escapeHtml(a._id)}">Delete</button>
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
    const confirmed = await showConfirm("Delete this listing? This can't be undone.");
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
        showToast(data.message || "Failed to delete apartment", "error");
        return;
      }

      showToast("Listing deleted.", "success");
      if (editingId === apartmentId) setFormMode();
      loadApartments();
    } catch (err) {
      showToast("Network error. Could not delete the listing.", "error");
      console.error(err);
    }
    return;
  }

  if (button.classList.contains("edit-listing")) {
    const apartment = myApartments.find((item) => String(item._id) === String(apartmentId));
    if (!apartment) {
      showToast("Could not load listing details for editing.", "error");
      return;
    }
    setFormMode(apartmentId, apartment);
  }
});

loadApartments();