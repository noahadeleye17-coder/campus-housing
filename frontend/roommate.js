const API_BASE = window.API_BASE || "/api";
const session = window.AuthSession?.getSession() || {};
const token = session.token || null;
const storedRole = localStorage.getItem("role") || localStorage.getItem("userRole");

if (session.expired) {
  window.AuthSession?.redirectToLogin();
}

let user = session.user || null;
if (user && !user.role && storedRole) {
  user.role = storedRole;
}

const form = document.getElementById("roommateForm");
const loginNotice = document.getElementById("loginNotice");
const formMessage = document.getElementById("formMessage");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const deleteProfileBtn = document.getElementById("deleteProfileBtn");
const statusCard = document.getElementById("profileStatusCard");
const roommatePreview = document.querySelector(".roommate-preview");

const fields = {
  bio: document.getElementById("bio"),
  department: document.getElementById("department"),
  preferredLocation: document.getElementById("preferredLocation"),
  budgetMin: document.getElementById("budgetMin"),
  budgetMax: document.getElementById("budgetMax"),
  moveInDate: document.getElementById("moveInDate"),
  whatsappNumber: document.getElementById("whatsappNumber"),
  gender: document.getElementById("gender"),
  educationLevel: document.getElementById("educationLevel"),
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
  male: "Male",
  female: "Female",
};

const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" };
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

const getProfileValue = (field, defaultValue = "") => {
  if (!field) return defaultValue;
  return field.value || defaultValue;
};

const getProfilePayload = () => ({
  bio: getProfileValue(fields.bio).trim(),
  campus: getProfileValue(fields.department).trim(),
  preferredLocation: getProfileValue(fields.preferredLocation).trim(),
  budgetMin: getProfileValue(fields.budgetMin),
  budgetMax: getProfileValue(fields.budgetMax),
  moveInDate: getProfileValue(fields.moveInDate),
  whatsappNumber: getProfileValue(fields.whatsappNumber).trim(),
  gender: getProfileValue(fields.gender),
  educationLevel: getProfileValue(fields.educationLevel),
  visible: getProfileValue(fields.visible) === "true",
  sleepSchedule: getProfileValue(fields.sleepSchedule),
  cleanliness: getProfileValue(fields.cleanliness),
  noisePreference: getProfileValue(fields.noisePreference),
  guestPreference: getProfileValue(fields.guestPreference),
  studyPreference: getProfileValue(fields.studyPreference),
  interests: splitInterests(getProfileValue(fields.interests)),
});

const fillForm = (profile) => {
  if (fields.bio) fields.bio.value = profile.bio || "";
  if (fields.department) fields.department.value = profile.campus || profile.department || "";
  if (fields.preferredLocation) fields.preferredLocation.value = profile.preferredLocation || "";
  if (fields.budgetMin) fields.budgetMin.value = profile.budgetMin || "";
  if (fields.budgetMax) fields.budgetMax.value = profile.budgetMax || "";
  if (fields.moveInDate) fields.moveInDate.value = formatDateForInput(profile.moveInDate);
  if (fields.whatsappNumber) fields.whatsappNumber.value = profile.whatsappNumber || "";
  if (fields.gender) fields.gender.value = profile.gender || "";
  if (fields.educationLevel) fields.educationLevel.value = profile.educationLevel || "";
  if (fields.visible) fields.visible.value = String(profile.visible !== false);
  if (fields.sleepSchedule) fields.sleepSchedule.value = profile.sleepSchedule || "";
  if (fields.cleanliness) fields.cleanliness.value = profile.cleanliness || "";
  if (fields.noisePreference) fields.noisePreference.value = profile.noisePreference || "";
  if (fields.guestPreference) fields.guestPreference.value = profile.guestPreference || "";
  if (fields.studyPreference) fields.studyPreference.value = profile.studyPreference || "";
  if (fields.interests) fields.interests.value = Array.isArray(profile.interests) ? profile.interests.join(", ") : "";
};

const updatePreview = () => {
  const payload = getProfilePayload();
  const name = user?.name || "Your profile";
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";
  const budget = [formatCurrency(payload.budgetMin), formatCurrency(payload.budgetMax)]
    .filter(Boolean)
    .join(" – ");
  const lifestyle = [
    labels[payload.sleepSchedule],
    labels[payload.cleanliness],
    labels[payload.noisePreference],
  ].filter(Boolean).join(" / ");
  const interests = payload.interests.join(", ");

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set("previewInitial", initial);
  set("previewName", name);
  set("previewBio", payload.bio || "Start filling out the form to preview your roommate profile.");
  set("previewDepartment", payload.campus || "Not set");
  set("previewGender", labels[payload.gender] || "Not set");
  set("previewEducationLevel", payload.educationLevel ? `${payload.educationLevel} level` : "Not set");
  set("previewBudget", budget || "Not set");
  set("previewLifestyle", lifestyle || "Not set");
  set("previewInterests", interests || "Not set");
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

const handleExpiredSession = () => {
  window.AuthSession?.redirectToLogin();
};

const loadProfile = async () => {
  try {
    const res = await fetch(`${API_BASE}/roommates/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      handleExpiredSession();
      return;
    }

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
    if (deleteProfileBtn) deleteProfileBtn.hidden = false;
    setStatus("Profile status", data.visible === false ? "Hidden" : "Visible");
    setMessage("Your existing profile is loaded.", "success");
    updatePreview();
  } catch (error) {
    setStatus("Profile status", "Unavailable");
    setMessage(error.message || "Could not load your profile.", "error");
  }
};

const getSignInStatus = () => {
  if (token && user) return { status: "Signed in", detail: `Welcome back, ${user.name || user.email || "student"}` };
  if (token) return { status: "Signed in", detail: "Token found" };
  if (user) return { status: "Signed in locally", detail: `Welcome, ${user.name || user.email || "student"}` };
  return { status: "Not signed in", detail: "Login required" };
};

if (user?.role && user.role !== "student" && user.role !== "admin") {
  setMessage("Only student accounts can create roommate profiles.", "error");
  setStatus("Profile status", "Student only");
  if (form) Array.from(form.elements || []).forEach((element) => { element.disabled = true; });
} else {
  if (loginNotice) loginNotice.hidden = true;
  if (token) {
    const signIn = getSignInStatus();
    setStatus(signIn.status, signIn.detail);
    loadProfile();
  } else if (user) {
    const signIn = getSignInStatus();
    setStatus(signIn.status, signIn.detail);
    updatePreview();
  } else {
    const signIn = getSignInStatus();
    setStatus(signIn.status, signIn.detail);
    if (loginNotice) loginNotice.hidden = false;
    if (form) form.hidden = true;
    if (roommatePreview) roommatePreview.hidden = true;
  }
}

Object.values(fields).forEach((field) => {
  if (!field) return;
  field.addEventListener("input", updatePreview);
  field.addEventListener("change", updatePreview);
});

if (!form) {
  console.warn("Roommate form not found on this page.");
} else {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!token) {
      window.location.href = "login.html";
      return;
    }

    if (saveProfileBtn) saveProfileBtn.disabled = true;
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

      if (res.status === 401) {
        handleExpiredSession();
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || (data.errors && data.errors[0]?.msg) || "Could not save your roommate profile.");
      }

      fillForm(data);
      if (deleteProfileBtn) deleteProfileBtn.hidden = false;
      setStatus("Profile status", data.visible === false ? "Hidden" : "Visible");
      setMessage("Profile saved. Your matches can now use these preferences.", "success");
      updatePreview();
    } catch (error) {
      setMessage(error.message || "Could not save your profile.", "error");
    } finally {
      if (saveProfileBtn) saveProfileBtn.disabled = false;
    }
  });
}

if (deleteProfileBtn) {
  deleteProfileBtn.addEventListener("click", async () => {
    const confirmed = window.confirm("Delete your roommate profile?");
    if (!confirmed) return;
    if (!token) {
      window.location.href = "login.html";
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/roommates/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        handleExpiredSession();
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Could not delete your profile.");
      }

      if (form) form.reset();
      deleteProfileBtn.hidden = true;
      setStatus("Profile status", "Not created");
      setMessage("Profile deleted.", "success");
      updatePreview();
    } catch (error) {
      setMessage(error.message || "Could not delete your profile.", "error");
    }
  });
}

setupMenu();
updatePreview();
