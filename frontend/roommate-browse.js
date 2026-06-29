const API_BASE = window.API_BASE || "/api";
const session = window.AuthSession?.getSession() || {};
const token = session.token || null;
const storedRole = localStorage.getItem("role") || localStorage.getItem("userRole");

if (session.expired) {
  window.AuthSession?.redirectToLogin();
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

const parseJwt = window.AuthSession?.parseJwt || (() => null);

let user = session.user || null;
if (user && !user.role && storedRole) user.role = storedRole;

const handleExpiredSession = () => {
  window.AuthSession?.redirectToLogin();
};

// ── Label maps ───────────────────────────────────────────────────────────────

const LABELS = {
  early: "Early riser", flexible: "Flexible", late: "Night owl",
  relaxed: "Relaxed", moderate: "Moderate", very_clean: "Very clean",
  quiet: "Quiet", lively: "Lively",
  rarely: "Guests rarely", sometimes: "Guests sometimes", often: "Guests often",
  home: "Studies at home", library: "Studies at library", mixed: "Studies mixed",
};

const label = (val) => LABELS[val] || val || "—";

const formatCurrency = (val) => {
  const n = Number(val);
  return n && !Number.isNaN(n) ? `₦${n.toLocaleString()}` : null;
};

// ── Compatibility score (0–100) ──────────────────────────────────────────────
// Compares the browsing user's own saved profile against each listed profile.

let myProfile = null; // loaded once from /api/roommates/me

const compatScore = (theirs) => {
  if (!myProfile) return null;
  const checks = [
    ["sleepSchedule", 25],
    ["cleanliness", 25],
    ["noisePreference", 20],
    ["guestPreference", 15],
    ["studyPreference", 15],
  ];
  let score = 0;
  let total = 0;
  for (const [key, weight] of checks) {
    if (myProfile[key] && theirs[key]) {
      total += weight;
      if (myProfile[key] === theirs[key]) score += weight;
    }
  }
  return total === 0 ? null : Math.round((score / total) * 100);
};

const compatClass = (score) => {
  if (score === null) return "";
  if (score >= 70) return "compat-high";
  if (score >= 40) return "compat-mid";
  return "compat-low";
};

const compatText = (score) => {
  if (score === null) return "No score yet";
  return `${score}% match`;
};

// ── DOM refs ─────────────────────────────────────────────────────────────────

const grid = document.getElementById("profilesGrid");
const searchInput = document.getElementById("searchInput");
const filterSleep = document.getElementById("filterSleep");
const filterClean = document.getElementById("filterClean");
const countEl = document.getElementById("profileCount");
const modal = document.getElementById("profileModal");
const modalClose = document.getElementById("modalClose");
const sendRequestBtn = document.getElementById("sendRequestBtn");
const requestStatus = document.getElementById("requestStatus");
const requestsToggleBtn = document.getElementById("requestsToggleBtn");
const requestsBadge = document.getElementById("requestsBadge");
const requestsPanel = document.getElementById("requestsPanel");
const requestsList = document.getElementById("requestsList");

let allProfiles = [];
let activeProfileId = null;
let requestStatusByUser = new Map(); // counterpart userId -> { status, requestId }

// ── Render helpers ───────────────────────────────────────────────────────────

const getCounterpartId = (profile) => profile.user?._id || profile.user || profile._id;

const getRequestState = (profile) => {
  const id = getCounterpartId(profile);
  return requestStatusByUser.get(String(id)) || null;
};

const initial = (profile) => {
  const name = profile.user?.name || profile.name || "";
  return name ? name.charAt(0).toUpperCase() : "S";
};

const displayName = (profile) => profile.user?.name || profile.name || "Student";

const renderCard = (profile) => {
  const score = compatScore(profile);
  const interests = Array.isArray(profile.interests) ? profile.interests.slice(0, 3) : [];
  const budget = [formatCurrency(profile.budgetMin), formatCurrency(profile.budgetMax)]
    .filter(Boolean).join(" – ");
  const reqState = getRequestState(profile);
  const chatIconSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  const viewBtnLabel = reqState?.status === "accepted" ? `Matched ${chatIconSvg}` : reqState?.status === "pending" ? "Requested" : "View profile";

  const card = document.createElement("div");
  card.className = "profile-card";
  card.dataset.id = profile._id;
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `View profile of ${displayName(profile)}`);

  card.innerHTML = `
    <div class="card-top">
      <div class="card-avatar">${initial(profile)}</div>
      <div>
        <p class="card-name">${displayName(profile)}</p>
        <p class="card-dept">${profile.campus || profile.department || "No department set"}</p>
      </div>
    </div>
    ${profile.bio ? `<p class="card-bio">${profile.bio}</p>` : ""}
    ${interests.length ? `
      <div class="card-tags">
        ${interests.map(i => `<span class="tag">${i}</span>`).join("")}
      </div>` : ""}
    <div class="card-meta">
      <div class="meta-item">
        <span class="meta-label">Budget</span>
        <span class="meta-value">${budget || "Not set"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Sleep</span>
        <span class="meta-value">${label(profile.sleepSchedule)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Cleanliness</span>
        <span class="meta-value">${label(profile.cleanliness)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Noise</span>
        <span class="meta-value">${label(profile.noisePreference)}</span>
      </div>
    </div>
    <div class="card-footer">
      ${score !== null ? `<span class="compatibility-badge ${compatClass(score)}">${compatText(score)}</span>` : "<span></span>"}
      <button class="view-btn" ${reqState ? 'style="opacity:0.6;"' : ""}>${viewBtnLabel}</button>
    </div>
  `;

  card.addEventListener("click", () => openModal(profile));
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") openModal(profile); });
  return card;
};

const renderEmpty = (message) => {
  grid.innerHTML = `
    <div class="browse-state">
      <div class="state-icon"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
      <p>${message}</p>
    </div>`;
};

const renderProfiles = (profiles) => {
  if (!profiles.length) {
    renderEmpty("No profiles match your filters.");
    countEl.textContent = "";
    return;
  }
  grid.innerHTML = "";
  profiles.forEach(p => grid.appendChild(renderCard(p)));
  countEl.textContent = `${profiles.length} student${profiles.length !== 1 ? "s" : ""}`;
};

// ── Filter + search ──────────────────────────────────────────────────────────

const applyFilters = () => {
  const query = searchInput.value.toLowerCase().trim();
  const sleep = filterSleep.value;
  const clean = filterClean.value;

  const filtered = allProfiles.filter((p) => {
    if (sleep && p.sleepSchedule !== sleep) return false;
    if (clean && p.cleanliness !== clean) return false;
    if (query) {
      const name = displayName(p).toLowerCase();
      const dept = (p.campus || p.department || "").toLowerCase();
      const interests = (Array.isArray(p.interests) ? p.interests.join(" ") : "").toLowerCase();
      if (!name.includes(query) && !dept.includes(query) && !interests.includes(query)) return false;
    }
    return true;
  });

  // Sort by compatibility score descending (nulls last)
  filtered.sort((a, b) => {
    const sa = compatScore(a) ?? -1;
    const sb = compatScore(b) ?? -1;
    return sb - sa;
  });

  renderProfiles(filtered);
};

searchInput.addEventListener("input", applyFilters);
filterSleep.addEventListener("change", applyFilters);
filterClean.addEventListener("change", applyFilters);

// ── Modal ────────────────────────────────────────────────────────────────────

const openModal = (profile) => {
  activeProfileId = profile._id;
  requestStatus.textContent = "";
  requestStatus.className = "request-status";

  const reqState = getRequestState(profile);
  if (reqState?.status === "pending") {
    sendRequestBtn.disabled = true;
    sendRequestBtn.textContent = "Request pending";
  } else if (reqState?.status === "accepted") {
    sendRequestBtn.disabled = true;
    sendRequestBtn.textContent = "Already matched";
  } else {
    sendRequestBtn.disabled = false;
    sendRequestBtn.textContent = "Send roommate request";
  }

  document.getElementById("modalAvatar").textContent = initial(profile);
  document.getElementById("modalName").textContent = displayName(profile);
  document.getElementById("modalDept").textContent = profile.campus || profile.department || "No department set";
  document.getElementById("modalBio").textContent = profile.bio || "No bio provided.";

  const score = compatScore(profile);
  const budget = [formatCurrency(profile.budgetMin), formatCurrency(profile.budgetMax)]
    .filter(Boolean).join(" – ");

  const fields = [
    ["Budget", budget || "Not set"],
    ["Location", profile.preferredLocation || "Not set"],
    ["Move-in", profile.moveInDate ? new Date(profile.moveInDate).toLocaleDateString() : "Not set"],
    ["Sleep", label(profile.sleepSchedule)],
    ["Cleanliness", label(profile.cleanliness)],
    ["Noise", label(profile.noisePreference)],
    ["Guests", label(profile.guestPreference)],
    ["Study", label(profile.studyPreference)],
    ...(score !== null ? [["Compatibility", compatText(score)]] : []),
  ];

  document.getElementById("modalGrid").innerHTML = fields.map(([k, v]) => `
    <div class="modal-field">
      <dt>${k}</dt>
      <dd>${v}</dd>
    </div>
  `).join("");

  const interests = Array.isArray(profile.interests) ? profile.interests : [];
  document.getElementById("modalInterests").innerHTML = interests.length
    ? interests.map(i => `<span class="tag">${i}</span>`).join("")
    : "<span style='opacity:0.45;font-size:0.85rem'>No interests listed</span>";

  // Hide request button if not logged in or viewing own profile
  const ownId = parseJwt(token)?.id || parseJwt(token)?._id;
  const theirId = getCounterpartId(profile);
  if (!token || (ownId && ownId === String(theirId))) {
    sendRequestBtn.style.display = "none";
  } else {
    sendRequestBtn.style.display = "";
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
};

const closeModal = () => {
  modal.classList.remove("open");
  document.body.style.overflow = "";
  activeProfileId = null;
};

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// ── Send roommate request ────────────────────────────────────────────────────

sendRequestBtn.addEventListener("click", async () => {
  if (!activeProfileId) return;

  sendRequestBtn.disabled = true;
  sendRequestBtn.textContent = "Sending…";
  requestStatus.textContent = "";
  requestStatus.className = "request-status";

  try {
    const res = await fetch(`${API_BASE}/roommates/${activeProfileId}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      handleExpiredSession();
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.message || "Could not send request.");

    requestStatus.textContent = "Request sent! They'll be notified.";
    requestStatus.className = "request-status success";
    sendRequestBtn.textContent = "Request sent";
    loadRequests();
  } catch (err) {
    requestStatus.textContent = err.message || "Something went wrong.";
    requestStatus.className = "request-status error";
    sendRequestBtn.disabled = false;
    sendRequestBtn.textContent = "Send roommate request";
  }
});

// ── My Requests panel ────────────────────────────────────────────────────────

const myId = () => parseJwt(token)?.id || parseJwt(token)?._id;

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
      ? `<a class="req-whatsapp-btn" href="${waLink(req.matchedWhatsapp)}" target="_blank" rel="noopener"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Chat on WhatsApp</a>`
      : `<span class="req-pending-label">Matched</span>`;
  } else {
    actionsHtml = `<span class="req-declined-label">Declined</span>`;
  }

  card.innerHTML = `
    <div class="request-card-info">
      <div class="card-avatar" style="width:38px;height:38px;font-size:0.95rem;">${(counterpart?.name || "S").charAt(0).toUpperCase()}</div>
      <div>
        <p class="request-card-name">${counterpart?.name || "Student"}</p>
        <p class="request-card-sub">${isIncoming ? "Wants to be your roommate" : "Roommate request sent"}</p>
      </div>
    </div>
    <div class="request-card-actions">${actionsHtml}</div>
  `;
  return card;
};

const renderRequests = (requests) => {
  if (!requests.length) {
    requestsList.innerHTML = `<p class="requests-empty">No roommate requests yet.</p>`;
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
        await loadProfiles(); // matched profiles drop out of browse immediately
      } catch (err) {
        btn.disabled = false;
        alert(err.message || "Something went wrong.");
      }
    });
  });
};

const loadRequests = async () => {
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/roommates/requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      handleExpiredSession();
      return;
    }
    if (!res.ok) return;
    const requests = await res.json().catch(() => []);
    renderRequests(requests);

    const meId = myId();
    requestStatusByUser = new Map();
    requests.forEach((r) => {
      const counterpart = r.toUser?._id === meId || r.toUser?._id === String(meId) ? r.fromUser : r.toUser;
      const counterpartId = String(counterpart?._id || counterpart);
      // An accepted match always takes priority over any other stray request with the same person
      const existing = requestStatusByUser.get(counterpartId);
      if (!existing || r.status === "accepted") {
        requestStatusByUser.set(counterpartId, { status: r.status, requestId: r._id });
      }
    });
    if (allProfiles.length) applyFilters(); // refresh card labels now that request states are known

    const pendingIncoming = requests.filter(
      (r) => r.status === "pending" && (r.toUser?._id === meId || r.toUser?._id === String(meId))
    ).length;
    if (requestsBadge) {
      requestsBadge.hidden = pendingIncoming === 0;
      requestsBadge.textContent = pendingIncoming;
    }
  } catch {
    /* non-critical */
  }
};

if (requestsToggleBtn) {
  requestsToggleBtn.addEventListener("click", () => {
    requestsPanel.classList.toggle("open");
  });
}

// ── Nav / menu setup ─────────────────────────────────────────────────────────

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

// ── Load data ────────────────────────────────────────────────────────────────

const loadMyProfile = async () => {
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/roommates/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      handleExpiredSession();
      return;
    }
    if (res.ok) myProfile = await res.json().catch(() => null);
  } catch { /* non-critical */ }
};

const loadProfiles = async () => {
  if (!token) {
    grid.innerHTML = `
      <div class="browse-state">
        <div class="state-icon"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
        <p>Please <a href="login.html">log in</a> to browse roommate profiles.</p>
      </div>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/roommates`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      handleExpiredSession();
      return;
    }

    if (!res.ok) throw new Error("Could not load profiles.");

    const data = await res.json().catch(() => []);
    allProfiles = Array.isArray(data)
  ? data.map(item => item.profile ? { ...item.profile, _compatScore: item.compatibility?.score } : item)
  : [];

    if (!allProfiles.length) {
      renderEmpty("No roommate profiles yet. Be the first to create one!");
      return;
    }

    applyFilters();
  } catch (err) {
    grid.innerHTML = `
      <div class="browse-state">
        <div class="state-icon"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <p>${err.message || "Could not load profiles."}</p>
      </div>`;
  }
};

// ── Boot ─────────────────────────────────────────────────────────────────────

setupMenu();
loadMyProfile().then(() => loadRequests().then(loadProfiles));
