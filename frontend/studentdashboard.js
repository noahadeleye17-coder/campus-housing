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
  window.location.href = "login.html?next=studentdashboard.html";
}

if (user && user.role === "landlord") {
  // This dashboard is for students; landlords already have their own.
  window.location.href = "landlord.html";
}

if (user && user.role === "admin") {
  window.location.href = "admin.html";
}

// ── Sidebar: user card, logout, mobile toggle ────────────────────────────────

const sideAvatar = document.getElementById("sideAvatar");
const sideName = document.getElementById("sideName");
const sideRole = document.getElementById("sideRole");
const sideLogoutBtn = document.getElementById("sideLogoutBtn");
const dashSidebar = document.getElementById("dashSidebar");
const dashOverlay = document.getElementById("dashOverlay");
const dashMobileToggle = document.getElementById("dashMobileToggle");

const renderSideUser = (profile) => {
  const name = profile?.name || user?.name || user?.email || "Student";
  if (sideName) sideName.textContent = name;
  if (sideRole) sideRole.textContent = profile?.role || user?.role || "student";
  if (sideAvatar) {
    if (profile?.profileImage) {
      sideAvatar.innerHTML = `<img src="${escapeHtml(profile.profileImage)}" alt="Profile photo">`;
    } else {
      sideAvatar.textContent = name.charAt(0).toUpperCase();
    }
  }
};
renderSideUser(null);

if (sideLogoutBtn) {
  sideLogoutBtn.addEventListener("click", () => {
    window.AuthSession?.clear();
    window.location.href = "login.html";
  });
}

const closeMobileSidebar = () => {
  dashSidebar?.classList.remove("open");
  dashOverlay?.classList.remove("show");
};

if (dashMobileToggle) {
  dashMobileToggle.addEventListener("click", () => {
    dashSidebar?.classList.add("open");
    dashOverlay?.classList.add("show");
  });
}
if (dashOverlay) {
  dashOverlay.addEventListener("click", closeMobileSidebar);
}

// ── Sidebar navigation (Home / Saved / Requests / Recent / Settings) ────────

const navItems = document.querySelectorAll(".dash-nav-item");
const panels = {
  home: document.getElementById("panel-home"),
  saved: document.getElementById("panel-saved"),
  requests: document.getElementById("panel-requests"),
  recent: document.getElementById("panel-recent"),
  settings: document.getElementById("panel-settings"),
};

const goToPanel = (name) => {
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.panel === name));
  Object.entries(panels).forEach(([key, panel]) => {
    if (panel) panel.classList.toggle("active", key === name);
  });
  closeMobileSidebar();
  window.scrollTo({ top: 0, behavior: "instant" });
};

navItems.forEach((item) => {
  item.addEventListener("click", () => goToPanel(item.dataset.panel));
});

document.querySelectorAll("[data-goto]").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    goToPanel(el.dataset.goto);
  });
});

// ── Home greeting ─────────────────────────────────────────────────────────────

const homeGreeting = document.getElementById("homeGreeting");
const renderGreeting = (name) => {
  if (!homeGreeting) return;
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const firstName = (name || "there").split(" ")[0];
  homeGreeting.textContent = `Good ${timeOfDay}, ${firstName}!`;
};

// ── Profile / Settings panel ─────────────────────────────────────────────────

const profileAvatarLg = document.getElementById("profileAvatarLg");
const profileNameInput = document.getElementById("profileNameInput");
const profileEmailInput = document.getElementById("profileEmailInput");
const changePhotoBtn = document.getElementById("changePhotoBtn");
const profileImageInput = document.getElementById("profileImageInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileSaveStatus = document.getElementById("profileSaveStatus");
const contactEmailText = document.getElementById("contactEmailText");
const contactBadge = document.getElementById("contactBadge");
const notifToggle = document.getElementById("notifToggle");
const currentPasswordGroup = document.getElementById("currentPasswordGroup");
const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const passwordStatus = document.getElementById("passwordStatus");
const passwordHint = document.getElementById("passwordHint");
const showDeleteBtn = document.getElementById("showDeleteBtn");
const deleteConfirmPanel = document.getElementById("deleteConfirmPanel");
const deletePasswordGroup = document.getElementById("deletePasswordGroup");
const deletePasswordInput = document.getElementById("deletePasswordInput");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const deleteStatus = document.getElementById("deleteStatus");

let pendingImageFile = null;
let currentProfile = null;

const renderAccountMeta = (profile) => {
  if (!profile) return;

  if (contactEmailText) contactEmailText.textContent = profile.email || "";

  const isGoogle = profile.authProvider === "google";
  if (contactBadge) {
    contactBadge.textContent = isGoogle ? "Verified via Google" : "Password account";
    contactBadge.className = `verify-badge ${isGoogle ? "verified" : "standard"}`;
  }

  // Google accounts never set their own password, so they don't need to
  // supply a "current" one to change or delete it.
  if (currentPasswordGroup) currentPasswordGroup.style.display = isGoogle ? "none" : "";
  if (deletePasswordGroup) deletePasswordGroup.style.display = isGoogle ? "none" : "";
  if (passwordHint) {
    passwordHint.textContent = isGoogle
      ? "You signed in with Google — you can set a new password below without entering a current one."
      : "Enter your current password, then choose a new one.";
  }

  if (notifToggle) notifToggle.checked = profile.notificationsEnabled !== false;
};

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
    renderSideUser(profile);
    renderGreeting(profile.name);
    renderAccountMeta(profile);

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
      renderSideUser(currentProfile);
      renderGreeting(currentProfile.name);

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

// ── Notifications toggle ─────────────────────────────────────────────────────

if (notifToggle) {
  notifToggle.addEventListener("change", async () => {
    const nextValue = notifToggle.checked;
    notifToggle.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/users/me/notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: nextValue }),
      });
      if (res.status === 401) {
        handleExpiredSession();
        return;
      }
      if (!res.ok) throw new Error("Could not update notification setting.");
      const data = await res.json();
      if (currentProfile) currentProfile.notificationsEnabled = data.notificationsEnabled;
    } catch {
      notifToggle.checked = !nextValue; // revert on failure
    } finally {
      notifToggle.disabled = false;
    }
  });
}

// ── Change password ──────────────────────────────────────────────────────────

const setPasswordStatus = (message, type = "") => {
  if (!passwordStatus) return;
  passwordStatus.textContent = message;
  passwordStatus.className = `profile-status ${type}`;
};

if (changePasswordBtn) {
  changePasswordBtn.addEventListener("click", async () => {
    const isGoogle = currentProfile?.authProvider === "google";
    const newPassword = newPasswordInput?.value || "";
    const confirmPassword = confirmPasswordInput?.value || "";
    const currentPassword = currentPasswordInput?.value || "";

    if (!isGoogle && !currentPassword) {
      setPasswordStatus("Enter your current password.", "error");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus("New password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("New passwords don't match.", "error");
      return;
    }

    changePasswordBtn.disabled = true;
    setPasswordStatus("Updating…");

    try {
      const res = await fetch(`${API_BASE}/users/me/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401 && /not authorized|token|no longer exists/i.test(data.message || "")) {
        handleExpiredSession();
        return;
      }
      if (!res.ok) throw new Error(data.message || "Could not update password.");

      if (currentPasswordInput) currentPasswordInput.value = "";
      if (newPasswordInput) newPasswordInput.value = "";
      if (confirmPasswordInput) confirmPasswordInput.value = "";
      setPasswordStatus("Password updated.", "success");
    } catch (err) {
      setPasswordStatus(err.message || "Could not update password.", "error");
    } finally {
      changePasswordBtn.disabled = false;
    }
  });
}

// ── Danger zone: delete account ──────────────────────────────────────────────

if (showDeleteBtn) {
  showDeleteBtn.addEventListener("click", () => {
    deleteConfirmPanel.hidden = !deleteConfirmPanel.hidden;
  });
}

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener("click", () => {
    deleteConfirmPanel.hidden = true;
    if (deletePasswordInput) deletePasswordInput.value = "";
    if (deleteStatus) deleteStatus.textContent = "";
  });
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", async () => {
    const isGoogle = currentProfile?.authProvider === "google";
    const password = deletePasswordInput?.value || "";

    if (!isGoogle && !password) {
      deleteStatus.textContent = "Enter your password to confirm.";
      deleteStatus.className = "profile-status error";
      return;
    }

    const confirmed = await window.showConfirm(
      "This will permanently delete your account. This can't be undone. Continue?",
      { confirmText: "Delete account" }
    );
    if (!confirmed) return;

    confirmDeleteBtn.disabled = true;
    deleteStatus.textContent = "Deleting…";
    deleteStatus.className = "profile-status";

    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401 && /not authorized|token|no longer exists/i.test(data.message || "")) {
        handleExpiredSession();
        return;
      }
      if (!res.ok) throw new Error(data.message || "Could not delete account.");

      window.AuthSession?.clear();
      window.location.href = "index.html";
    } catch (err) {
      deleteStatus.textContent = err.message || "Could not delete account.";
      deleteStatus.className = "profile-status error";
      confirmDeleteBtn.disabled = false;
    }
  });
}

// ── Saved apartments (grid renderer shared by Home preview + Saved page) ────

const savedGrid = document.getElementById("savedGrid");
const homeSavedPreview = document.getElementById("homeSavedPreview");
const statSaved = document.getElementById("statSaved");
const statBrowsed = document.getElementById("statBrowsed");
const statRequests = document.getElementById("statRequests");

const savedEmptyMarkup = (message, showBrowseLink) => `
  <div class="dash-state">
    <span class="state-icon">🏠</span>
    ${escapeHtml(message)}
    ${showBrowseLink ? `<br><a href="index.html">Browse properties &rarr;</a>` : ""}
  </div>`;

const savedCardMarkup = (apartment) => {
  const price = Number(apartment.price);
  const imageMarkup = apartment.image
    ? `<img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.title)}">`
    : `<span class="saved-card-placeholder">Photos coming soon</span>`;

  return `
    <div class="saved-card">
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
    </div>`;
};

const attachRemoveHandlers = (container) => {
  container?.querySelectorAll(".saved-remove-btn").forEach((btn) => {
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
        window.showToast(err.message || "Something went wrong.", "error");
      }
    });
  });
};

const renderSavedApartments = (apartments) => {
  if (statSaved) statSaved.textContent = apartments.length;

  if (savedGrid) {
    savedGrid.innerHTML = apartments.length
      ? apartments.map(savedCardMarkup).join("")
      : savedEmptyMarkup("You haven't saved any apartments yet. Browse listings and tap the heart icon to save one.", true);
    attachRemoveHandlers(savedGrid);
  }

  if (homeSavedPreview) {
    const preview = apartments.slice(0, 3);
    homeSavedPreview.innerHTML = preview.length
      ? preview.map(savedCardMarkup).join("")
      : savedEmptyMarkup("No saved properties yet.", true);
    attachRemoveHandlers(homeSavedPreview);
  }
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
    const message = err.message || "Could not load saved apartments.";
    if (savedGrid) savedGrid.innerHTML = savedEmptyMarkup(message, false);
    if (homeSavedPreview) homeSavedPreview.innerHTML = savedEmptyMarkup(message, false);
  }
};

// ── Recently viewed (tracked client-side in localStorage from apartment.js) ─

const recentGrid = document.getElementById("recentGrid");

const getRecentlyViewed = () => {
  try {
    const list = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const renderRecentlyViewed = () => {
  const items = getRecentlyViewed();
  if (statBrowsed) statBrowsed.textContent = items.length;
  if (!recentGrid) return;

  if (!items.length) {
    recentGrid.innerHTML = `
      <div class="dash-state">
        <span class="state-icon">🕓</span>
        You haven't viewed any properties yet.
        <br><a href="index.html">Browse properties &rarr;</a>
      </div>`;
    return;
  }

  recentGrid.innerHTML = items.map((item) => {
    const price = Number(item.price);
    const imageMarkup = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">`
      : `<span class="saved-card-placeholder">Photos coming soon</span>`;
    const viewedAgo = item.viewedAt ? new Date(item.viewedAt).toLocaleDateString() : "";

    return `
      <div class="saved-card">
        <div class="saved-card-img">${imageMarkup}</div>
        <div class="saved-card-body">
          <p class="saved-card-title">${escapeHtml(item.title || "Apartment")}</p>
          <p class="saved-card-location">${escapeHtml(item.location || "")}</p>
          <p class="saved-card-price">&#8358;${Number.isNaN(price) ? "N/A" : price.toLocaleString()}</p>
          ${viewedAgo ? `<p class="recent-card-viewed">Viewed ${escapeHtml(viewedAgo)}</p>` : ""}
          <div class="saved-card-actions">
            <a href="apartment.html?id=${encodeURIComponent(item.id)}" class="btn">View again</a>
          </div>
        </div>
      </div>`;
  }).join("");
};

// ── Roommate requests panel ──────────────────────────────────────────────────

const requestsList = document.getElementById("requestsList");
const sideRequestsBadge = document.getElementById("sideRequestsBadge");

const parseJwt = window.AuthSession?.parseJwt || (() => null);
const myId = () => user?.id || parseJwt(token)?.id || parseJwt(token)?._id;

const waLink = (number) => {
  const digits = String(number || "").replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `234${digits.slice(1)}` : digits.replace(/^234?/, "234");
  return `https://wa.me/${intl}`;
};

const waBadge = `<span class="wa-badge" aria-hidden="true"><svg viewBox="0 0 448 512" fill="#fff"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg></span>`;

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
      ? `<a class="req-whatsapp-btn" href="${waLink(req.matchedWhatsapp)}" target="_blank" rel="noopener">${waBadge}Chat on WhatsApp</a>`
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
        window.showToast(err.message || "Something went wrong.", "error");
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

    if (sideRequestsBadge) {
      sideRequestsBadge.hidden = pendingIncoming === 0;
      sideRequestsBadge.textContent = pendingIncoming;
    }
    if (statRequests) statRequests.textContent = pendingIncoming;
  } catch (err) {
    requestsList.innerHTML = `<p class="requests-empty">${escapeHtml(err.message || "Could not load roommate requests.")}</p>`;
  }
};

// ── Boot ──────────────────────────────────────────────────────────────────────

renderGreeting(user?.name);
renderRecentlyViewed();

if (token) {
  loadProfile();
  migrateLocalSavedApartments().then(loadSavedApartments);
  loadRequests();
}