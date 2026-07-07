const API_BASE = window.API_BASE || "/api";
const session = window.AuthSession?.getSession() || {};
const token = session.token || null;

if (session.expired) {
  window.AuthSession?.redirectToLogin();
}

let user = session.user || null;

const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" };
    return entities[char];
  });
};

const handleExpiredSession = () => {
  window.AuthSession?.redirectToLogin();
};

if (!token) {
  window.location.href = "login.html?next=student-dashboard.html";
}

if (user && user.role === "landlord") {
  // This dashboard is for students; landlords already have their own.
  window.location.href = "landlord.html";
}

// ── Nav / menu setup (same pattern used on other pages) ─────────────────────

const setupMenu = () => {
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  const authActions = document.getElementById("authActions");
  const profileNameEl = document.getElementById("profileName");
  const profileStatusEl = document.getElementById("profileStatus");
  const avatarEl = document.getElementById("avatar");

  if (user) {
    if (profileNameEl) profileNameEl.textContent = user.name || user.email || "Member";
    if (profileStatusEl) profileStatusEl.textContent = `Logged in as ${user.role || "member"}`;
    if (avatarEl) avatarEl.textContent = (user.name || user.email || "U").charAt(0).toUpperCase();
  }

  if (authActions) {
    if (user) {
      authActions.innerHTML = `<button class="pill-btn primary" id="logoutBtn">Logout</button>`;
      document.getElementById("logoutBtn").addEventListener("click", () => {
        window.AuthSession?.clear();
        window.location.href = "login.html";
      });
    } else {
      authActions.innerHTML = `
        <a href="login.html" class="pill-btn outline">Login</a>
        <a href="register.html" class="pill-btn primary">Sign Up</a>
      `;
    }
  }

  if (!hamburger || !mobileMenu || !menuOverlay) return;

  const closeMenu = () => {
    mobileMenu.classList.remove("open");
    menuOverlay.classList.remove("show");
    hamburger.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("aria-hidden", "true");
  };

  hamburger.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("open");
    menuOverlay.classList.toggle("show", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
    mobileMenu.setAttribute("aria-hidden", String(!isOpen));
  });

  menuOverlay.addEventListener("click", closeMenu);
};

// ── Tabs ──────────────────────────────────────────────────────────────────────

const tabs = document.querySelectorAll(".dash-tab");
const panels = {
  profile: document.getElementById("panel-profile"),
  saved: document.getElementById("panel-saved"),
  requests: document.getElementById("panel-requests"),
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");

    Object.values(panels).forEach((panel) => panel && panel.classList.remove("active"));
    const target = panels[tab.dataset.panel];
    if (target) target.classList.add("active");
  });
});

// ── Profile panel ─────────────────────────────────────────────────────────────

const profileAvatarLg = document.getElementById("profileAvatarLg");
const profileNameInput = document.getElementById("profileNameInput");
const profileEmailInput = document.getElementById("profileEmailInput");
const changePhotoBtn = document.getElementById("changePhotoBtn");
const profileImageInput = document.getElementById("profileImageInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileSaveStatus = document.getElementById("profileSaveStatus");
const requestPasswordResetBtn = document.getElementById("requestPasswordResetBtn");

let pendingImageFile = null;
let currentProfile = null;

const renderAvatar = (profile) => {
  if (!profileAvatarLg) return;
  if (profile?.profileImage) {
    profileAvatarLg.innerHTML = `<img src="${escapeHtml(profile.profileImage)}" alt="Profile photo">`;
  } else {
    profileAvatarLg.textContent = (profile?.name || profile?.email || "U").charAt(0).toUpperCase();
  }
};

const setProfileStatus = (message, type = "") => {
  if (!profileSaveStatus) return;
  profileSaveStatus.textContent = message;
  profileSaveStatus.className = `profile-status ${type}`;
};

const loadProfile = async () => {
  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      handleExpiredSession();
      return null;
    }
    if (!res.ok) throw new Error("Could not load profile.");
    const profile = await res.json();
    currentProfile = profile;

    if (profileNameInput) profileNameInput.value = profile.name || "";
    if (profileEmailInput) profileEmailInput.value = profile.email || "";
    renderAvatar(profile);

    return profile;
  } catch (err) {
    setProfileStatus(err.message || "Could not load profile.", "error");
    return null;
  }
};

if (changePhotoBtn && profileImageInput) {
  changePhotoBtn.addEventListener("click", () => profileImageInput.click());

  profileImageInput.addEventListener("change", () => {
    const file = profileImageInput.files?.[0];
    if (!file) return;
    pendingImageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      if (profileAvatarLg) {
        profileAvatarLg.innerHTML = `<img src="${reader.result}" alt="Profile photo preview">`;
      }
    };
    reader.readAsDataURL(file);
  });
}

if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    saveProfileBtn.disabled = true;
    setProfileStatus("Saving…");

    try {
      const formData = new FormData();
      formData.append("name", profileNameInput.value.trim());
      if (pendingImageFile) {
        formData.append("profileImage", pendingImageFile);
      }

      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        handleExpiredSession();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not save profile.");

      currentProfile = { ...currentProfile, ...data };
      pendingImageFile = null;
      renderAvatar(currentProfile);

      // Keep the locally stored session in sync so the nav avatar/name update too.
      const storedUser = window.AuthSession?.getUser();
      if (storedUser) {
        localStorage.setItem("user", JSON.stringify({ ...storedUser, name: data.name, profileImage: data.profileImage }));
      }

      setProfileStatus("Profile updated.", "success");
    } catch (err) {
      setProfileStatus(err.message || "Could not save profile.", "error");
    } finally {
      saveProfileBtn.disabled = false;
    }
  });
}

if (requestPasswordResetBtn) {
  requestPasswordResetBtn.addEventListener("click", async () => {
    requestPasswordResetBtn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentProfile?.email || user?.email }),
      });
      const data = await res.json().catch(() => ({}));
      setProfileStatus(data.message || "If an account exists, a reset link has been sent.", res.ok ? "success" : "error");
    } catch {
      setProfileStatus("Could not send reset email. Try again later.", "error");
    } finally {
      requestPasswordResetBtn.disabled = false;
    }
  });
}

// ── Saved apartments panel ────────────────────────────────────────────────────

const savedGrid = document.getElementById("savedGrid");

const renderSavedEmpty = (message) => {
  if (!savedGrid) return;
  savedGrid.innerHTML = `
    <div class="dash-state">
      <div class="state-icon">🏠</div>
      <p>${escapeHtml(message)}</p>
    </div>`;
};

const renderSavedApartments = (apartments) => {
  if (!savedGrid) return;
  if (!apartments.length) {
    renderSavedEmpty("You haven't saved any apartments yet. Browse listings and tap the heart icon to save one.");
    return;
  }

  savedGrid.innerHTML = "";
  apartments.forEach((apartment) => {
    const card = document.createElement("div");
    card.className = "saved-card";

    const price = Number(apartment.price);
    const imageMarkup = apartment.image
      ? `<img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.title)}">`
      : `<span class="saved-card-placeholder">Photos coming soon</span>`;

    card.innerHTML = `
      <div class="saved-card-img">${imageMarkup}</div>
      <div class="saved-card-body">
        <p class="saved-card-title">${escapeHtml(apartment.title)}</p>
        <p class="saved-card-location">${escapeHtml(apartment.location)}</p>
        <p class="saved-card-price">&#8358;${Number.isNaN(price) ? "N/A" : price.toLocaleString()}</p>
        <div class="saved-card-actions">
          <a href="apartment.html?id=${encodeURIComponent(apartment._id)}" class="btn">View</a>
          <button type="button" class="saved-remove-btn" data-id="${escapeHtml(apartment._id)}">Remove</button>
        </div>
      </div>
    `;
    savedGrid.appendChild(card);
  });

  savedGrid.querySelectorAll(".saved-remove-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/users/me/saved/${btn.dataset.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          handleExpiredSession();
          return;
        }
        if (!res.ok) throw new Error("Could not remove apartment.");
        await loadSavedApartments();
      } catch (err) {
        btn.disabled = false;
        alert(err.message || "Something went wrong.");
      }
    });
  });
};

// One-time migration: move any locally-saved apartment IDs onto the account,
// then clear localStorage so nobody loses their currently-saved apartments.
const migrateLocalSavedApartments = async () => {
  let localIds = [];
  try {
    localIds = JSON.parse(localStorage.getItem("savedApartmentIds") || "[]");
  } catch {
    localIds = [];
  }

  if (!Array.isArray(localIds) || !localIds.length) return;

  try {
    const res = await fetch(`${API_BASE}/users/me/saved/migrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: localIds }),
    });

    if (res.ok) {
      // Only clear localStorage once the server confirms the IDs are saved.
      localStorage.removeItem("savedApartmentIds");
    }
  } catch {
    /* Non-critical — the locally-saved list stays put and we'll retry next visit. */
  }
};

const loadSavedApartments = async () => {
  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      handleExpiredSession();
      return;
    }
    if (!res.ok) throw new Error("Could not load saved apartments.");
    const profile = await res.json();
    renderSavedApartments(profile.savedApartments || []);
  } catch (err) {
    renderSavedEmpty(err.message || "Could not load saved apartments.");
  }
};

// ── Roommate requests panel ──────────────────────────────────────────────────

const requestsList = document.getElementById("requestsList");
const dashRequestsBadge = document.getElementById("dashRequestsBadge");

const parseJwt = window.AuthSession?.parseJwt || (() => null);
const myId = () => user?.id || parseJwt(token)?.id || parseJwt(token)?._id;

const waLink = (number) => {
  const digits = String(number || "").replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `234${digits.slice(1)}` : digits.replace(/^234?/, "234");
  return `https://wa.me/${intl}`;
};

const renderRequestCard = (req) => {
  const meId = myId();
  const isIncoming = req.toUser?._id === meId || req.toUser?._id === String(meId);
  const counterpart = isIncoming ? req.fromUser : req.toUser;
  const card = document.createElement("div");
  card.className = "request-card";

  let actionsHtml = "";
  if (req.status === "pending" && isIncoming) {
    actionsHtml = `
      <button class="req-action-btn req-accept" data-id="${req._id}" data-action="accepted">Accept</button>
      <button class="req-action-btn req-decline" data-id="${req._id}" data-action="declined">Decline</button>
    `;
  } else if (req.status === "pending") {
    actionsHtml = `<span class="req-pending-label">Waiting for response…</span>`;
  } else if (req.status === "accepted") {
    actionsHtml = req.matchedWhatsapp
      ? `<a class="req-whatsapp-btn" href="${waLink(req.matchedWhatsapp)}" target="_blank" rel="noopener">Chat on WhatsApp</a>`
      : `<span class="req-pending-label">Matched</span>`;
  } else {
    actionsHtml = `<span class="req-declined-label">Declined</span>`;
  }

  card.innerHTML = `
    <div class="request-card-info">
      <div class="card-avatar">${escapeHtml((counterpart?.name || "S").charAt(0).toUpperCase())}</div>
      <div>
        <p class="request-card-name">${escapeHtml(counterpart?.name || "Student")}</p>
        <p class="request-card-sub">${isIncoming ? "Wants to be your roommate" : "Roommate request sent"}</p>
      </div>
    </div>
    <div class="request-card-actions">${actionsHtml}</div>
  `;
  return card;
};

const renderRequests = (requests) => {
  if (!requestsList) return;
  if (!requests.length) {
    requestsList.innerHTML = `<p class="requests-empty">No roommate requests yet. <a href="roommate-browse.html">Browse roommates</a> to send one.</p>`;
    return;
  }
  requestsList.innerHTML = "";
  requests.forEach((req) => requestsList.appendChild(renderRequestCard(req)));

  requestsList.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/roommates/requests/${btn.dataset.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: btn.dataset.action }),
        });

        if (res.status === 401) {
          handleExpiredSession();
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Could not update request.");
        await loadRequests();
      } catch (err) {
        btn.disabled = false;
        alert(err.message || "Something went wrong.");
      }
    });
  });
};

const loadRequests = async () => {
  if (!requestsList) return;
  try {
    const res = await fetch(`${API_BASE}/roommates/requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      handleExpiredSession();
      return;
    }
    if (!res.ok) throw new Error("Could not load roommate requests.");
    const requests = await res.json().catch(() => []);
    renderRequests(requests);

    const meId = myId();
    const pendingIncoming = requests.filter(
      (r) => r.status === "pending" && (r.toUser?._id === meId || r.toUser?._id === String(meId))
    ).length;
    if (dashRequestsBadge) {
      dashRequestsBadge.hidden = pendingIncoming === 0;
      dashRequestsBadge.textContent = pendingIncoming;
    }
  } catch (err) {
    requestsList.innerHTML = `<p class="requests-empty">${escapeHtml(err.message || "Could not load roommate requests.")}</p>`;
  }
};

// ── Boot ──────────────────────────────────────────────────────────────────────

setupMenu();

if (token) {
  loadProfile();
  migrateLocalSavedApartments().then(loadSavedApartments);
  loadRequests();
}