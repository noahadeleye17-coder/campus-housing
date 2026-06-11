const API_BASE = window.API_BASE || "/api";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

const form = document.getElementById("roommateForm");
const loginNotice = document.getElementById("loginNotice");
const formMessage = document.getElementById("formMessage");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const deleteProfileBtn = document.getElementById("deleteProfileBtn");
const statusCard = document.getElementById("profileStatusCard");

const fields = {
  bio: document.getElementById("bio"),
  campus: document.getElementById("campus"),
  preferredLocation: document.getElementById("preferredLocation"),
  budgetMin: document.getElementById("budgetMin"),
  budgetMax: document.getElementById("budgetMax"),
  moveInDate: document.getElementById("moveInDate"),
  visible: document.getElementById("visible"),
  sleepSchedule: document.getElementById("sleepSchedule"),
  cleanliness: document.getElementById("cleanliness"),
  noisePreference: document.getElementById("noisePreference"),
  guestPreference: document.getElementById("guestPreference"),
  studyPreference: document.getElementById("studyPreference"),
  interests: document.getElementById("interests"),
};

const labels = {
  early: "Early",
  flexible: "Flexible",
  late: "Late",
  relaxed: "Relaxed",
  moderate: "Moderate",
  very_clean: "Very clean",
  quiet: "Quiet",
  lively: "Lively",
  rarely: "Rarely",
  sometimes: "Sometimes",
  often: "Often",
  home: "At home",
  library: "Library",
  mixed: "Mixed",
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

const setMessage = (message, type = "info") => {
  if (!formMessage) return;
  formMessage.textContent = message;
  formMessage.dataset.type = type;
};

const setStatus = (status, detail) => {
  if (!statusCard) return;
  statusCard.innerHTML = `
    <span>${escapeHtml(status)}</span>
    <strong>${escapeHtml(detail)}</strong>
  `;
};

const formatCurrency = (value) => {
  const number = Number(value);
  if (!number || Number.isNaN(number)) return "";
  return `₦${number.toLocaleString()}`;
};

const formatDateForInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const splitInterests = (value) => {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getProfilePayload = () => ({
  bio: fields.bio.value.trim(),
  campus: fields.campus.value.trim(),
  preferredLocation: fields.preferredLocation.value.trim(),
  budgetMin: fields.budgetMin.value,
  budgetMax: fields.budgetMax.value,
  moveInDate: fields.moveInDate.value,
  visible: fields.visible.value === "true",
  sleepSchedule: fields.sleepSchedule.value,
  cleanliness: fields.cleanliness.value,
  noisePreference: fields.noisePreference.value,
  guestPreference: fields.guestPreference.value,
  studyPreference: fields.studyPreference.value,
  interests: splitInterests(fields.interests.value),
});

const fillForm = (profile) => {
  fields.bio.value = profile.bio || "";
  fields.campus.value = profile.campus || "";
  fields.preferredLocation.value = profile.preferredLocation || "";
  fields.budgetMin.value = profile.budgetMin || "";
  fields.budgetMax.value = profile.budgetMax || "";
  fields.moveInDate.value = formatDateForInput(profile.moveInDate);
  fields.visible.value = String(profile.visible !== false);
  fields.sleepSchedule.value = profile.sleepSchedule || "";
  fields.cleanliness.value = profile.cleanliness || "";
  fields.noisePreference.value = profile.noisePreference || "";
  fields.guestPreference.value = profile.guestPreference || "";
  fields.studyPreference.value = profile.studyPreference || "";
  fields.interests.value = Array.isArray(profile.interests) ? profile.interests.join(", ") : "";
};

const updatePreview = () => {
  const payload = getProfilePayload();
  const name = user?.name || "Your profile";
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";
  const budget = [formatCurrency(payload.budgetMin), formatCurrency(payload.budgetMax)]
    .filter(Boolean)
    .join(" - ");
  const lifestyle = [
    labels[payload.sleepSchedule],
    labels[payload.cleanliness],
    labels[payload.noisePreference],
  ].filter(Boolean).join(" / ");
  const interests = payload.interests.join(", ");

  document.getElementById("previewInitial").textContent = initial;
  document.getElementById("previewName").textContent = name;
  document.getElementById("previewBio").textContent = payload.bio || "Start filling out the form to preview your roommate profile.";
  document.getElementById("previewCampus").textContent = payload.campus || "Not set";
  document.getElementById("previewBudget").textContent = budget || "Not set";
  document.getElementById("previewLifestyle").textContent = lifestyle || "Not set";
  document.getElementById("previewInterests").textContent = interests || "Not set";
};

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

const loadProfile = async () => {
  try {
    const res = await fetch(`${API_BASE}/roommates/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 404) {
      setStatus("Profile status", "Not created");
      setMessage("Fill out the form, then save your profile.", "info");
      updatePreview();
      return;
    }

    if (!res.ok) {
      throw new Error(data.message || "Could not load your roommate profile.");
    }

    fillForm(data);
    deleteProfileBtn.hidden = false;
    setStatus("Profile status", data.visible === false ? "Hidden" : "Visible");
    setMessage("Your existing profile is loaded.", "success");
    updatePreview();
  } catch (error) {
    setStatus("Profile status", "Unavailable");
    setMessage(error.message || "Could not load your profile.", "error");
  }
};

if (!token) {
  loginNotice.hidden = false;
  form.classList.add("is-disabled");
  Array.from(form.elements).forEach((element) => {
    element.disabled = true;
  });
  setStatus("Profile status", "Login required");
} else if (user?.role && user.role !== "student" && user.role !== "admin") {
  setMessage("Only student accounts can create roommate profiles.", "error");
  setStatus("Profile status", "Student only");
  Array.from(form.elements).forEach((element) => {
    element.disabled = true;
  });
} else {
  loadProfile();
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", updatePreview);
  field.addEventListener("change", updatePreview);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!token) return;

  saveProfileBtn.disabled = true;
  setMessage("Saving your profile...", "info");

  try {
    const res = await fetch(`${API_BASE}/roommates/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(getProfilePayload()),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || "Could not save your roommate profile.");
    }

    fillForm(data);
    deleteProfileBtn.hidden = false;
    setStatus("Profile status", data.visible === false ? "Hidden" : "Visible");
    setMessage("Profile saved. Your matches can now use these preferences.", "success");
    updatePreview();
  } catch (error) {
    setMessage(error.message || "Could not save your profile.", "error");
  } finally {
    saveProfileBtn.disabled = false;
  }
});

deleteProfileBtn.addEventListener("click", async () => {
  const confirmed = window.confirm("Delete your roommate profile?");
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/roommates/me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || "Could not delete your profile.");
    }

    form.reset();
    deleteProfileBtn.hidden = true;
    setStatus("Profile status", "Not created");
    setMessage("Profile deleted.", "success");
    updatePreview();
  } catch (error) {
    setMessage(error.message || "Could not delete your profile.", "error");
  }
});

setupMenu();
updatePreview();
