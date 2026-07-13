const session = window.AuthSession?.getSession() || {};
const token = session.token || null;
const API_BASE = window.API_BASE || "/api";

const PROPERTY_TYPES = [
  "Self Contain",
  "Single Room",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "Shared Apartment",
  "Duplex",
  "Studio",
  "Bungalow",
  "Hostel",
];

const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" };
    return entities[char];
  });
};

// ── Auth guard ────────────────────────────────────────────────────────────
if (session.expired) {
  window.AuthSession?.redirectToLogin();
} else if (!token) {
  window.location.href = "login.html";
} else if ((session.user?.role || "").toLowerCase() !== "admin") {
  // Logged in, but not an admin — send them back to the site rather than
  // showing a locked-down page.
  window.location.href = "index.html";
}

const handleExpiredSession = () => {
  window.AuthSession?.redirectToLogin();
};

// Every fetch here is behind requireAdmin server-side too, so a non-admin
// token (or an admin who got disabled mid-session) still gets a clean
// 401/403 response rather than a silent failure.
const authedFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    handleExpiredSession();
    throw new Error("Session expired");
  }
  return res;
};

// ── Top bar: identity + logout ───────────────────────────────────────────
const topAvatar = document.getElementById("topAvatar");
const topName = document.getElementById("topName");
const topRole = document.getElementById("topRole");
const logoutBtn = document.getElementById("logoutBtn");

if (token) {
  const user = session.user || {};
  const name = user.name || user.email || "Admin";
  if (topName) topName.textContent = name;
  if (topRole) topRole.textContent = "Admin";
  if (topAvatar) topAvatar.textContent = name.charAt(0).toUpperCase();
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.AuthSession?.clear();
    window.location.href = "login.html";
  });
}

// ── Tabs ──────────────────────────────────────────────────────────────────
const tabButtons = document.querySelectorAll(".admin-tab-btn");
const panels = document.querySelectorAll(".admin-panel");
let loadedTabs = new Set();

const loadTab = (tabName) => {
  if (loadedTabs.has(tabName)) return;
  loadedTabs.add(tabName);
  if (tabName === "overview") loadStats();
  if (tabName === "listings") loadListings();
  if (tabName === "users") loadUsers();
  if (tabName === "content") loadSiteConfig();
};

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
    loadTab(btn.dataset.tab);
  });
});

// Load the first tab immediately.
loadTab("overview");

// ── Overview: stats ───────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await authedFetch("/admin/stats");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.showToast?.(data.message || "Could not load stats", "error");
      return;
    }
    document.getElementById("statTotalUsers").textContent = data.totalUsers ?? 0;
    document.getElementById("statStudents").textContent = data.totalStudents ?? 0;
    document.getElementById("statLandlords").textContent = data.totalLandlords ?? 0;
    document.getElementById("statListings").textContent = data.totalListings ?? 0;
  } catch (err) {
    console.error(err);
  }
}

// ── Listings tab ──────────────────────────────────────────────────────────
const adminApartmentsEl = document.getElementById("adminApartments");
const listingSearchInput = document.getElementById("listingSearchInput");
let allListings = [];
let editingListingId = null;

async function loadListings() {
  adminApartmentsEl.innerHTML = "Loading listings…";
  try {
    // Backend already returns every listing (not just "own") when the
    // requester is an admin — see getMyApartments/getOwnedListingFilter.
    const res = await authedFetch("/apartments/mine");
    const data = await res.json().catch(() => ([]));
    if (!res.ok) {
      adminApartmentsEl.innerHTML = `<div class="empty-state">${escapeHtml(data.message || "Could not load listings.")}</div>`;
      return;
    }
    allListings = data;
    renderListings(allListings);
  } catch (err) {
    console.error(err);
  }
}

function renderListings(listings) {
  if (!listings.length) {
    adminApartmentsEl.innerHTML = `<div class="empty-state">No listings match.</div>`;
    return;
  }

  adminApartmentsEl.innerHTML = listings
    .map((a) => {
      const landlordName = a.landlord?.name || "Unknown landlord";
      const landlordEmail = a.landlord?.email || "";
      const amenities = Array.isArray(a.amenities) ? a.amenities.join(", ") : "";
      const isEditing = editingListingId === a._id;

      const quickEdit = isEditing
        ? `
        <form class="quick-edit-form" data-id="${a._id}">
          <label>Title
            <input type="text" name="title" value="${escapeHtml(a.title || "")}" required />
          </label>
          <label>Price (₦/year)
            <input type="number" name="price" value="${a.price || 0}" required />
          </label>
          <label>Location
            <input type="text" name="location" value="${escapeHtml(a.location || "")}" required />
          </label>
          <label>Property type
            <select name="propertyType">
              ${PROPERTY_TYPES.map((t) => `<option value="${t}" ${a.propertyType === t ? "selected" : ""}>${t}</option>`).join("")}
            </select>
          </label>
          <label style="grid-column: 1 / -1;">Amenities
            <input type="text" name="amenities" value="${escapeHtml(amenities)}" placeholder="WiFi, parking, laundry" />
          </label>
          <div class="quick-edit-actions">
            <button type="button" class="btn outline cancel-edit-btn">Cancel</button>
            <button type="submit" class="btn">Save changes</button>
          </div>
        </form>`
        : "";

      return `
        <article class="apartment-card">
          <h3>${escapeHtml(a.title || "Untitled listing")}</h3>
          <p class="landlord-tag">Landlord: <strong>${escapeHtml(landlordName)}</strong>${landlordEmail ? ` · ${escapeHtml(landlordEmail)}` : ""}</p>
          <div class="apartment-meta">
            <span>${escapeHtml(a.location || "No location")}</span>
            <span>${escapeHtml(a.propertyType || "Type not set")}</span>
          </div>
          <p class="apartment-price">₦${Number(a.price || 0).toLocaleString()}/year</p>
          ${quickEdit}
          <div class="listing-actions">
            <a class="btn outline listing-btn" href="apartment.html?id=${a._id}" target="_blank" rel="noopener">View live</a>
            <button type="button" class="btn outline listing-btn edit-listing-btn" data-id="${a._id}">${isEditing ? "Close editor" : "Edit"}</button>
            <button type="button" class="btn danger listing-btn delete-listing-btn" data-id="${a._id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");

  adminApartmentsEl.querySelectorAll(".edit-listing-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      editingListingId = editingListingId === btn.dataset.id ? null : btn.dataset.id;
      renderListings(currentFilteredListings());
    });
  });

  adminApartmentsEl.querySelectorAll(".cancel-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      editingListingId = null;
      renderListings(currentFilteredListings());
    });
  });

  adminApartmentsEl.querySelectorAll(".delete-listing-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteListing(btn.dataset.id));
  });

  adminApartmentsEl.querySelectorAll(".quick-edit-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      saveListingEdit(form);
    });
  });
}

function currentFilteredListings() {
  const term = (listingSearchInput.value || "").trim().toLowerCase();
  if (!term) return allListings;
  return allListings.filter(
    (a) =>
      (a.title || "").toLowerCase().includes(term) ||
      (a.location || "").toLowerCase().includes(term)
  );
}

let listingSearchDebounce = null;
listingSearchInput.addEventListener("input", () => {
  clearTimeout(listingSearchDebounce);
  listingSearchDebounce = setTimeout(() => renderListings(currentFilteredListings()), 300);
});

async function saveListingEdit(form) {
  const id = form.dataset.id;
  const payload = {
    title: form.title.value.trim(),
    price: form.price.value,
    location: form.location.value.trim(),
    propertyType: form.propertyType.value,
    amenities: form.amenities.value,
  };

  const submitBtn = form.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    const res = await authedFetch(`/apartments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.showToast?.(data.message || "Failed to update listing", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Save changes";
      return;
    }
    window.showToast?.("Listing updated", "success");
    editingListingId = null;
    loadedTabs.delete("listings");
    loadListings();
  } catch (err) {
    console.error(err);
  }
}

async function deleteListing(id) {
  const confirmed = window.showConfirm
    ? await window.showConfirm("Delete this listing permanently? This can't be undone.", { confirmText: "Delete" })
    : window.confirm("Delete this listing permanently?");
  if (!confirmed) return;

  try {
    const res = await authedFetch(`/apartments/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.showToast?.(data.message || "Failed to delete listing", "error");
      return;
    }
    window.showToast?.("Listing deleted", "success");
    loadedTabs.delete("listings");
    loadListings();
  } catch (err) {
    console.error(err);
  }
}

// ── Users tab ─────────────────────────────────────────────────────────────
const usersTableBody = document.getElementById("usersTableBody");
const userSearchInput = document.getElementById("userSearchInput");
const currentUserId = session.user?.id || session.user?._id || null;

async function loadUsers(searchTerm = "") {
  usersTableBody.innerHTML = `<tr><td colspan="5">Loading users…</td></tr>`;
  try {
    const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
    const res = await authedFetch(`/admin/users${query}`);
    const data = await res.json().catch(() => ([]));
    if (!res.ok) {
      usersTableBody.innerHTML = `<tr><td colspan="5">${escapeHtml(data.message || "Could not load users.")}</td></tr>`;
      return;
    }
    renderUsers(data);
  } catch (err) {
    console.error(err);
  }
}

function renderUsers(users) {
  if (!users.length) {
    usersTableBody.innerHTML = `<tr><td colspan="5">No users match.</td></tr>`;
    return;
  }

  usersTableBody.innerHTML = users
    .map((u) => {
      const isSelf = String(u.id) === String(currentUserId);
      const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—";
      return `
        <tr data-id="${u.id}">
          <td>
            <div class="user-name-cell">${escapeHtml(u.name || "—")}</div>
            <div class="user-email-cell">${escapeHtml(u.email || "")}</div>
          </td>
          <td>
            <select class="role-select" data-id="${u.id}" ${isSelf ? "disabled title=\"You can't change your own role\"" : ""}>
              ${["student", "landlord", "admin"].map((r) => `<option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}
            </select>
          </td>
          <td>
            <span class="role-badge ${u.disabled ? "disabled-badge" : ""}">${u.disabled ? "Disabled" : "Active"}</span>
          </td>
          <td>${joined}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn outline toggle-disable-btn" data-id="${u.id}" data-disabled="${u.disabled}" ${isSelf ? "disabled title=\"You can't disable your own account\"" : ""}>
                ${u.disabled ? "Enable" : "Disable"}
              </button>
              <button type="button" class="btn danger delete-user-btn" data-id="${u.id}" ${isSelf ? "disabled title=\"You can't delete your own account here\"" : ""}>
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  usersTableBody.querySelectorAll(".role-select").forEach((select) => {
    select.addEventListener("change", () => updateUser(select.dataset.id, { role: select.value }));
  });

  usersTableBody.querySelectorAll(".toggle-disable-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextDisabled = btn.dataset.disabled !== "true";
      updateUser(btn.dataset.id, { disabled: nextDisabled });
    });
  });

  usersTableBody.querySelectorAll(".delete-user-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteUser(btn.dataset.id));
  });
}

async function updateUser(id, payload) {
  try {
    const res = await authedFetch(`/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.showToast?.(data.message || "Could not update user", "error");
      loadUsers(userSearchInput.value.trim());
      return;
    }
    window.showToast?.("User updated", "success");
    loadUsers(userSearchInput.value.trim());
    loadedTabs.delete("overview");
  } catch (err) {
    console.error(err);
  }
}

async function deleteUser(id) {
  const confirmed = window.showConfirm
    ? await window.showConfirm(
        "Delete this user permanently? If they're a landlord, all of their listings and media are deleted too. This can't be undone.",
        { confirmText: "Delete" }
      )
    : window.confirm("Delete this user permanently?");
  if (!confirmed) return;

  try {
    const res = await authedFetch(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.showToast?.(data.message || "Could not delete user", "error");
      return;
    }
    window.showToast?.("User deleted", "success");
    loadUsers(userSearchInput.value.trim());
    loadedTabs.delete("overview");
    loadedTabs.delete("listings");
  } catch (err) {
    console.error(err);
  }
}

let userSearchDebounce = null;
userSearchInput.addEventListener("input", () => {
  clearTimeout(userSearchDebounce);
  userSearchDebounce = setTimeout(() => loadUsers(userSearchInput.value.trim()), 400);
});

// ── Content tab: announcement banner ─────────────────────────────────────
const announcementForm = document.getElementById("announcementForm");
const announcementText = document.getElementById("announcementText");
const announcementActive = document.getElementById("announcementActive");
const announcementCharCount = document.getElementById("announcementCharCount");

announcementText.addEventListener("input", () => {
  announcementCharCount.textContent = announcementText.value.length;
});

async function loadSiteConfig() {
  try {
    const res = await authedFetch("/admin/site-config");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    announcementText.value = data.announcement || "";
    announcementActive.checked = !!data.announcementActive;
    announcementCharCount.textContent = announcementText.value.length;
  } catch (err) {
    console.error(err);
  }
}

announcementForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById("saveAnnouncementBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {
    const res = await authedFetch("/admin/site-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        announcement: announcementText.value.trim(),
        announcementActive: announcementActive.checked,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.showToast?.(data.message || "Could not save announcement", "error");
      return;
    }
    window.showToast?.("Announcement saved", "success");
  } catch (err) {
    console.error(err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
});
