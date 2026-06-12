const API_BASE = window.API_BASE || "/api";
const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("authToken");
const storedRole = localStorage.getItem("role") || localStorage.getItem("userRole");

// ── Auth helpers ─────────────────────────────────────────────────────────────

const safeParseJson = (value) => {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
};

const parseJwt = (jwt) => {
  if (!jwt || typeof jwt !== "string") return null;
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
};

let user = safeParseJson(localStorage.getItem("user"));
if (!user && token) {
  const payload = parseJwt(token);
  if (payload) {
    user = {
      name: payload.name || payload.username || payload.email || null,
      email: payload.email || null,
      role: payload.role || payload.userRole || storedRole || null,
    };
  }
}
if (user && !user.role && storedRole) user.role = storedRole;

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

let allProfiles = [];
let activeProfileId = null;

// ── Render helpers ───────────────────────────────────────────────────────────

const initial = (profile) => {
  const name = profile.userId?.name || profile.name || "";
  return name ? name.charAt(0).toUpperCase() : "S";
};

const displayName = (profile) => profile.userId?.name || profile.name || "Student";

const renderCard = (profile) => {
  const score = compatScore(profile);
  const interests = Array.isArray(profile.interests) ? profile.interests.slice(0, 3) : [];
  const budget = [formatCurrency(profile.budgetMin), formatCurrency(profile.budgetMax)]
    .filter(Boolean).join(" – ");

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
      <button class="view-btn">View profile</button>
    </div>
  `;

  card.addEventListener("click", () => openModal(profile));
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") openModal(profile); });
  return card;
};

const renderEmpty = (message) => {
  grid.innerHTML = `
    <div class="browse-state">
      <div class="state-icon">🔍</div>
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
  sendRequestBtn.disabled = false;
  sendRequestBtn.textContent = "Send roommate request";

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
  const myId = parseJwt(token)?.id || parseJwt(token)?._id;
  const theirId = profile.userId?._id || profile.userId || profile._id;
  if (!token || (myId && myId === String(theirId))) {
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
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.message || "Could not send request.");

    requestStatus.textContent = "Request sent! They'll be notified.";
    requestStatus.className = "request-status success";
    sendRequestBtn.textContent = "Request sent";
  } catch (err) {
    requestStatus.textContent = err.message || "Something went wrong.";
    requestStatus.className = "request-status error";
    sendRequestBtn.disabled = false;
    sendRequestBtn.textContent = "Send roommate request";
  }
});

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
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
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
    if (res.ok) myProfile = await res.json().catch(() => null);
  } catch { /* non-critical */ }
};

const loadProfiles = async () => {
  if (!token) {
    grid.innerHTML = `
      <div class="browse-state">
        <div class="state-icon">🔒</div>
        <p>Please <a href="login.html">log in</a> to browse roommate profiles.</p>
      </div>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/roommates`, {
      headers: { Authorization: `Bearer ${token}` },
    });

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
        <div class="state-icon">⚠️</div>
        <p>${err.message || "Could not load profiles."}</p>
      </div>`;
  }
};

// ── Boot ─────────────────────────────────────────────────────────────────────

setupMenu();
loadMyProfile().then(loadProfiles);