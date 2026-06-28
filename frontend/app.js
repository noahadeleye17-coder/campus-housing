// Make API base configurable (can be overridden on the page)
const API_BASE = window.API_BASE || "/api";

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

function showSkeletons(container, count = 6) {
  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "apartment skeleton skeleton-card";

    skeleton.innerHTML = `
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-line medium"></div>
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line"></div>
    `;

    container.appendChild(skeleton);
  }
}

// ============================
// ELEMENTS
// ============================
const apartmentContainer = document.getElementById("apartments");
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
const menuOverlay = document.getElementById("menuOverlay");
const mobileSavedBtn = document.getElementById("mobileSavedBtn");
const authActions = document.getElementById("authActions");
const searchForm = document.getElementById("apartmentSearchForm");
const searchInput = document.getElementById("apartmentSearchInput");
const savedCountEl = document.getElementById("savedCount");
const savedFilterBtn = document.getElementById("savedFilterBtn");

// --- Filter panel elements ---
const filterToggleBtn = document.getElementById("filterToggleBtn");
const filterPanel = document.getElementById("filterPanel");
const minPriceInput = document.getElementById("minPriceInput");
const maxPriceInput = document.getElementById("maxPriceInput");
const maxDistanceInput = document.getElementById("maxDistanceInput");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

let allApartments = [];
let showOnlySaved = false; // ✅ FIX 1: removed duplicate declaration

let openMenu;
let closeMenu;

const demoApartments = [
  {
    _id: "demo-1",
    title: "Modern Studio Near Main Campus",
    price: 450000,
    location: "University Road, 8 minutes from campus gate",
    distanceFromCampus: 1.2,
    amenities: ["Wi-Fi", "Water", "Security", "Kitchenette"],
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
  },
  {
    _id: "demo-2",
    title: "Shared 2-Bed Apartment",
    price: 320000,
    location: "Student Village Extension",
    distanceFromCampus: 2.4,
    amenities: ["Furnished", "Prepaid meter", "Water", "Wardrobe"],
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
  },
  {
    _id: "demo-3",
    title: "Self-Contain Room",
    price: 280000,
    location: "South Gate Area",
    distanceFromCampus: 0.8,
    amenities: ["Private bathroom", "Tiles", "Water", "Secure compound"],
    image: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80",
  },
  {
    _id: "demo-4",
    title: "Quiet Mini Flat With Study Space",
    price: 520000,
    location: "North Gate Area",
    distanceFromCampus: 3.1,
    amenities: ["Study desk", "Kitchen", "Parking", "Security"],
    image: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&q=80",
  },
  {
    _id: "demo-5",
    title: "Budget Friendly Single Room",
    price: 180000,
    location: "Apatapiti Student Area",
    distanceFromCampus: 1.9,
    amenities: ["Shared bathroom", "Water", "Prepaid meter", "Gated compound"],
    image: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80",
  },
  {
    _id: "demo-6",
    title: "Premium 1-Bed Apartment",
    price: 750000,
    location: "Campus View Apartments",
    distanceFromCampus: 0.6,
    amenities: ["Air conditioning", "Private kitchen", "Backup power", "CCTV"],
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
  },
];
// ============================
// MOBILE MENU
// ============================
if (hamburger && mobileMenu && menuOverlay) {
  hamburger.setAttribute("aria-expanded", "false");
  mobileMenu.setAttribute("aria-hidden", "true");

  openMenu = () => {
    mobileMenu.classList.add("open");
    menuOverlay.classList.add("show");
    hamburger.setAttribute("aria-expanded", "true");
    mobileMenu.setAttribute("aria-hidden", "false");
  };

  closeMenu = () => {
    mobileMenu.classList.remove("open");
    menuOverlay.classList.remove("show");
    hamburger.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("aria-hidden", "true");
  };

  hamburger.addEventListener("click", () => {
    if (mobileMenu.classList.contains("open")) closeMenu();
    else openMenu();
  });

  menuOverlay.addEventListener("click", closeMenu);
}

// ============================
// AUTH UI
// ============================
const user = JSON.parse(localStorage.getItem("user"));
const profileNameEl = document.getElementById("profileName");
const profileStatusEl = document.getElementById("profileStatus");
const avatarEl = document.getElementById("avatar");
const ctaTitleEl = document.getElementById("ctaTitle");
const ctaActionEl = document.getElementById("ctaAction");

if (user) {
  if (profileNameEl) {
    profileNameEl.textContent = user.name || user.email || "Member";
  }

  if (profileStatusEl) {
    profileStatusEl.textContent = `Logged in as ${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Member"}`;
  }

  if (avatarEl && user.name) {
    avatarEl.textContent = user.name.charAt(0).toUpperCase();
  }
}

if (authActions) {
  if (user) {
    authActions.innerHTML = `
      <button class="pill-btn primary" id="logoutBtn">Logout</button>
    `;

    document.getElementById("logoutBtn").onclick = () => {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      location.reload();
    };
  } else {
    authActions.innerHTML = `
      <a href="login.html" class="pill-btn outline">Login</a>
      <a href="register.html" class="pill-btn primary">Sign Up</a>
    `;
  }
}

function updateCta() {
  if (!ctaTitleEl || !ctaActionEl) return;

  const ctaByRole = {
    student: {
      title: "Ready to Find a Compatible Roommate?",
      label: "Open Roommate Finder",
      href: "roommate.html",
    },
    landlord: {
      title: "Have a Place Students Should See?",
      label: "Post a Listing",
      href: "landlord.html",
    },
    admin: {
      title: "Welcome Back",
      label: "Browse Listings",
      href: "#apartments",
    },
  };

  const cta = user ? ctaByRole[user.role] || ctaByRole.admin : {
    title: "Ready to Find Your Perfect Apartment?",
    label: "Sign Up Now",
    href: "register.html",
  };

  ctaTitleEl.textContent = cta.title;
  ctaActionEl.textContent = cta.label;
  ctaActionEl.href = cta.href;
}

updateCta();

// ============================
// FETCH APARTMENTS
// ============================
async function fetchApartments() {
  if (!apartmentContainer) return;

  showSkeletons(apartmentContainer);

  try {
    const res = await fetch(`${API_BASE}/apartments`);

    if (!res.ok) throw new Error("Fetch failed");

    allApartments = await res.json();
    renderApartments(allApartments);
    updateSavedUi();

  } catch (err) {
    console.error(err);
    allApartments = demoApartments;
    renderApartments(allApartments);
    updateSavedUi();
  }
}

function getSavedIds() {
  try {
    const saved = JSON.parse(localStorage.getItem("savedApartmentIds") || "[]");
    return new Set(saved.map((id) => String(id)));
  } catch (error) {
    return new Set();
  }
}

function setSavedIds(ids) {
  localStorage.setItem("savedApartmentIds", JSON.stringify(Array.from(ids)));
}

function toggleSavedId(id) {
  const savedIds = getSavedIds();
  if (savedIds.has(id)) {
    savedIds.delete(id);
  } else {
    savedIds.add(id);
  }
  setSavedIds(savedIds);
  return savedIds;
}

function updateSavedUi() {
  if (savedCountEl) {
    savedCountEl.textContent = `${getSavedIds().size} saved`;
  }

  if (savedFilterBtn) {
    savedFilterBtn.textContent = showOnlySaved ? "Show all" : "Show saved";
    savedFilterBtn.classList.toggle("active", showOnlySaved);
  }
}

function renderApartments(apartments) {
  apartmentContainer.innerHTML = "";

  if (apartments.length === 0) {
    apartmentContainer.innerHTML = "<p class='loading'>No apartments matched your search.</p>";
    return;
  }

  apartments.forEach(apartment => {
    const isSaved = getSavedIds().has(String(apartment._id));
    const div = document.createElement("div");
    div.className = "apartment";
    const detailUrl = `apartment.html?id=${encodeURIComponent(apartment._id)}`;
    div.dataset.href = detailUrl;
    div.setAttribute("role", "link");
    div.setAttribute("tabindex", "0");
    div.setAttribute("aria-label", `View details for ${apartment.title}`);
    const imageMarkup = apartment.image
      ? `<img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.title)}">`
      : `<div class="card-placeholder" aria-label="Apartment image placeholder"></div>`;
    const price = Number(apartment.price);

    div.innerHTML = `
      <div class="card-image">
        ${imageMarkup}
        <span class="distance-badge">${escapeHtml(apartment.distanceFromCampus ?? "N/A")}km</span>
        <span class="verified-badge">Verified</span>
      </div>

      <div class="card-body">
        <h3>${escapeHtml(apartment.title)}</h3>
        <p class="location">${escapeHtml(apartment.location)}</p>
        <p class="price">&#8358;${Number.isNaN(price) ? "N/A" : price.toLocaleString()}</p>
        <div class="card-trust" aria-label="Listing trust signals">
          <span>Photos checked</span>
          <span>Landlord confirmed</span>
        </div>

        <div class="card-actions">
          <a href="${detailUrl}" class="btn">
            View Details
          </a>
          <button type="button" class="btn favorite-btn ${isSaved ? "saved" : ""}" data-id="${escapeHtml(apartment._id)}">
            ${isSaved ? "★ Saved" : "☆ Save"}
          </button>
        </div>
      </div>
    `;

    apartmentContainer.appendChild(div);
  });
}

function getActiveFilters() {
  const query = searchInput.value.trim().toLowerCase();

  const minPrice = minPriceInput && minPriceInput.value !== ""
    ? Number(minPriceInput.value)
    : null;
  const maxPrice = maxPriceInput && maxPriceInput.value !== ""
    ? Number(maxPriceInput.value)
    : null;
  const maxDistance = maxDistanceInput && maxDistanceInput.value !== ""
    ? Number(maxDistanceInput.value)
    : null;

  return { query, minPrice, maxPrice, maxDistance };
}

function filterApartments(list) {
  const { query, minPrice, maxPrice, maxDistance } = getActiveFilters();

  return list.filter((apartment) => {
    const title = apartment.title?.toLowerCase() || "";
    const location = apartment.location?.toLowerCase() || "";
    if (query && !title.includes(query) && !location.includes(query)) {
      return false;
    }

    const price = Number(apartment.price);
    if (minPrice !== null && !Number.isNaN(price) && price < minPrice) {
      return false;
    }
    if (maxPrice !== null && !Number.isNaN(price) && price > maxPrice) {
      return false;
    }

    const distance = Number(apartment.distanceFromCampus);
    if (maxDistance !== null && !Number.isNaN(distance) && distance > maxDistance) {
      return false;
    }

    return true;
  });
}

function searchApartments() {
  let filteredApartments = filterApartments(allApartments);

  if (showOnlySaved) {
    const savedIds = getSavedIds();
    filteredApartments = filteredApartments.filter((apartment) => savedIds.has(String(apartment._id)));
  }

  renderApartments(filteredApartments);
  updateSavedUi();
  updateFilterToggleState();
}

function resetFilters() {
  if (searchInput) searchInput.value = "";
  if (minPriceInput) minPriceInput.value = "";
  if (maxPriceInput) maxPriceInput.value = "";
  if (maxDistanceInput) maxDistanceInput.value = "";
  searchApartments();
}

// --- Highlights the filter toggle button when any filter is active ---
function updateFilterToggleState() {
  if (!filterToggleBtn) return;
  const { minPrice, maxPrice, maxDistance } = getActiveFilters();
  const hasActiveFilter = minPrice !== null || maxPrice !== null || maxDistance !== null;
  filterToggleBtn.classList.toggle("active", hasActiveFilter);
}

if (searchForm && searchInput) {
  const clearBtn = document.getElementById("clearSearchBtn");

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    searchApartments();
  });

  const onSearchInputChange = () => {
    if (clearBtn) {
      clearBtn.style.display = searchInput.value.trim() ? "flex" : "none";
    }
    searchApartments();
  };

  searchInput.addEventListener("input", onSearchInputChange);

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      searchInput.value = "";
      clearBtn.style.display = "none";
      searchApartments();
      searchInput.focus();
    });
  }
}

// --- Filter panel toggle + listeners ---
if (filterToggleBtn && filterPanel) {
  filterToggleBtn.addEventListener("click", () => {
    const isHidden = filterPanel.hasAttribute("hidden");
    if (isHidden) {
      filterPanel.removeAttribute("hidden");
      filterToggleBtn.setAttribute("aria-expanded", "true");
    } else {
      filterPanel.setAttribute("hidden", "");
      filterToggleBtn.setAttribute("aria-expanded", "false");
    }
  });
}

[minPriceInput, maxPriceInput, maxDistanceInput].forEach((input) => {
  if (!input) return;
  input.addEventListener("input", () => {
    searchApartments();
  });
});

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    if (minPriceInput) minPriceInput.value = "";
    if (maxPriceInput) maxPriceInput.value = "";
    if (maxDistanceInput) maxDistanceInput.value = "";
    searchApartments();
  });
}

if (apartmentContainer) {
  apartmentContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".favorite-btn");
    if (button) {
      const apartmentId = button.dataset.id;
      if (!apartmentId) return;

      event.preventDefault();
      event.stopPropagation();
      toggleSavedId(String(apartmentId));
      searchApartments();
      return;
    }

    if (event.target.closest("a")) return;

    const card = event.target.closest(".apartment[data-href]");
    if (card?.dataset.href) {
      window.location.href = card.dataset.href;
    }
  });

  apartmentContainer.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button, a, input, select, textarea")) return;

    const card = event.target.closest(".apartment[data-href]");
    if (!card?.dataset.href) return;

    event.preventDefault();
    window.location.href = card.dataset.href;
  });
}

if (savedFilterBtn) {
  savedFilterBtn.addEventListener("click", () => {
    showOnlySaved = !showOnlySaved;
    if (showOnlySaved && getSavedIds().size === 0) {
      showOnlySaved = false;
    }
    searchApartments();
  });
}

if (mobileSavedBtn) {
  mobileSavedBtn.addEventListener("click", (event) => {
    event.preventDefault();
    showOnlySaved = !showOnlySaved;
    if (showOnlySaved && getSavedIds().size === 0) {
      showOnlySaved = false;
    }
    searchApartments();
    if (typeof closeMenu === "function") {
      closeMenu();
    }
  });
}

fetchApartments();