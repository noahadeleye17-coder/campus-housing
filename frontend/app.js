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

// Cloudinary auto-generates a JPG frame from any uploaded video when you
// request the same video URL with a .jpg extension instead of .mp4/.mov/etc.
// Used so listings with a video but no photos still get a real preview image
// on the card, instead of falling straight to the "no photos" placeholder.
const cloudinaryVideoThumbnail = (videoUrl) => {
  if (!videoUrl || !videoUrl.includes("res.cloudinary.com")) return null;
  return videoUrl.replace(/\.[^/.]+$/, ".jpg");
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
const typeSelect = document.getElementById("apartmentTypeSelect");
const savedCountEl = document.getElementById("savedCount");
const savedFilterBtn = document.getElementById("savedFilterBtn");

let allApartments = [];
let showOnlySaved = false;

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
const session = window.AuthSession?.getSession() || {};
if (session.expired) {
  window.AuthSession?.redirectToLogin();
}

const user = session.user || null;
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
      if (window.AuthSession) {
        window.AuthSession.clear();
      } else {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
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
// PAGINATION UI
// ============================
const paginationBar = document.getElementById("paginationBar");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const resultsCountEl = document.getElementById("resultsCount");

let currentPage = 1;
let totalPages = 1;
let totalListings = 0;
let isFetchingMore = false;
let activeSearch = ""; // tracks what term is currently loaded from the server
let activeType = ""; // tracks the currently loaded property-type filter

function updatePaginationUi() {
  if (!paginationBar) return;

  const hasMore = currentPage < totalPages;

  if (totalListings === 0) {
    paginationBar.style.display = "none";
    return;
  }

  paginationBar.style.display = "block";

  if (resultsCountEl) {
    const realShown = allApartments.filter(a => !String(a._id).startsWith("demo-")).length;
    const typeLabel = activeType ? ` in "${activeType}"` : "";
    if (activeSearch) {
      resultsCountEl.textContent = `${totalListings} result${totalListings !== 1 ? "s" : ""} for "${activeSearch}"${typeLabel}`;
    } else if (activeType) {
      resultsCountEl.textContent = `${totalListings} result${totalListings !== 1 ? "s" : ""}${typeLabel}`;
    } else if (totalListings > 0) {
      resultsCountEl.textContent = `Showing ${realShown} of ${totalListings} listing${totalListings !== 1 ? "s" : ""}`;
    } else {
      resultsCountEl.textContent = "";
    }
  }

  if (loadMoreBtn) {
    loadMoreBtn.style.display = hasMore ? "inline-flex" : "none";
    loadMoreBtn.disabled = isFetchingMore;
    loadMoreBtn.textContent = isFetchingMore ? "Loading…" : "Load more listings";
  }
}

// ============================
// FETCH APARTMENTS
// ============================
async function fetchApartments(page = 1, search = "", type = "") {
  if (!apartmentContainer) return;

  const isFirstPage = page === 1;

  if (isFirstPage) {
    showSkeletons(apartmentContainer);
    allApartments = [];
  } else {
    isFetchingMore = true;
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = "Loading…";
    }
  }

  try {
    const params = new URLSearchParams({ page, limit: 9 });
    if (search) params.set("search", search);
    if (type) params.set("type", type);

    const res = await fetch(`${API_BASE}/apartments?${params}`);
    if (!res.ok) throw new Error("Fetch failed");

    const data = await res.json();
    const incoming = Array.isArray(data) ? data : (data.apartments || []);

    currentPage = data.page || page;
    totalPages = data.pages || 1;
    totalListings = data.total || incoming.length;
    activeSearch = search;
    activeType = type;

    allApartments = isFirstPage ? incoming : [...allApartments, ...incoming];

    renderApartments(applySavedFilter(allApartments));
    updateSavedUi();
    updatePaginationUi();

  } catch (err) {
    console.error(err);
    if (isFirstPage) {
      allApartments = demoApartments;
      currentPage = 1;
      totalPages = 1;
      totalListings = 0;
      activeSearch = "";
      activeType = "";
      renderApartments(allApartments);
      updateSavedUi();
    }
  } finally {
    isFetchingMore = false;
    updatePaginationUi();
  }
}

let savedIds = new Set(); // populated from the account (server) when logged in

async function loadSavedIdsFromServer() {
  if (!user || !window.AuthSession?.getToken()) return;
  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${window.AuthSession.getToken()}` },
    });
    if (!res.ok) return;
    const profile = await res.json();
    savedIds = new Set((profile.savedApartments || []).map((a) => String(a._id || a)));
    updateSavedUi();
    renderApartments(applySavedFilter(allApartments));
  } catch {
    /* non-critical */
  }
}

function getSavedIds() {
  return savedIds;
}

async function toggleSavedId(id) {
  const token = window.AuthSession?.getToken();

  if (!token) {
    // Saving now requires an account so it can sync across devices.
    if (window.confirm("Log in to save apartments to your account. Go to the login page now?")) {
      window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    return savedIds;
  }

  const isSaved = savedIds.has(String(id));
  try {
    const res = await fetch(`${API_BASE}/users/me/saved/${id}`, {
      method: isSaved ? "DELETE" : "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      window.AuthSession?.redirectToLogin();
      return savedIds;
    }
    if (!res.ok) throw new Error("Could not update saved apartments.");

    if (isSaved) {
      savedIds.delete(String(id));
    } else {
      savedIds.add(String(id));
    }
  } catch (err) {
    console.error(err);
  }

  return savedIds;
}

function formatTravelTime(distanceKm) {
  const km = Number(distanceKm);
  if (!km || Number.isNaN(km)) return "Time pending";

  const walkMinutes = Math.max(3, Math.round(km * 12));
  const rideMinutes = Math.max(3, Math.round(km * 5));
  return km <= 1.5 ? `${walkMinutes} min walk` : `${rideMinutes} min ride`;
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
    const videoThumb = cloudinaryVideoThumbnail(apartment.video);
    let imageMarkup;

    if (apartment.image) {
      imageMarkup = `<img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.title)}" onerror="this.replaceWith(Object.assign(document.createElement('div'), { className: 'card-placeholder', innerHTML: '<span class=&quot;card-placeholder-label&quot;>Photos coming soon</span>' }));">`;
    } else if (videoThumb) {
      // No photos uploaded, but there's a video — show its first frame as
      // the card image, with a small badge so it's clear it's a video.
      imageMarkup = `
        <img src="${escapeHtml(videoThumb)}" alt="${escapeHtml(apartment.title)}" onerror="this.replaceWith(Object.assign(document.createElement('div'), { className: 'card-placeholder', innerHTML: '<span class=&quot;card-placeholder-label&quot;>Photos coming soon</span>' }));">
        <span class="video-badge" aria-label="Video available" title="Video available">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        </span>
      `;
    } else {
      imageMarkup = `<div class="card-placeholder"><span class="card-placeholder-label">Photos coming soon</span></div>`;
    }

    const price = Number(apartment.price);

    div.innerHTML = `
      <div class="card-image">
        ${imageMarkup}
        <span class="distance-badge">${escapeHtml(formatTravelTime(apartment.distanceFromCampus))}</span>
        <span class="verified-badge" aria-label="Verified listing" title="Verified listing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
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
          <button type="button" class="btn favorite-btn ${isSaved ? "saved" : ""}" data-id="${escapeHtml(apartment._id)}" style="display:inline-flex; align-items:center; justify-content:center; gap:0.35rem;">
            ${isSaved
              ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Saved'
              : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Save'
            }
          </button>
        </div>
      </div>
    `;

    apartmentContainer.appendChild(div);
  });
}

function applySavedFilter(list) {
  if (!showOnlySaved) return list;
  const savedIds = getSavedIds();
  return list.filter(a => savedIds.has(String(a._id)));
}

function searchApartments() {
  renderApartments(applySavedFilter(allApartments));
  updateSavedUi();
  updatePaginationUi();
}

function resetFilters() {
  if (searchInput) searchInput.value = "";
  if (typeSelect) typeSelect.value = "";
  fetchApartments(1, "", "");
}

if (searchForm && searchInput) {
  const clearBtn = document.getElementById("clearSearchBtn");
  let searchDebounce = null;

  const doSearch = () => {
    const term = searchInput.value.trim();
    const type = typeSelect ? typeSelect.value : "";
    fetchApartments(1, term, type);
  };

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearTimeout(searchDebounce);
    doSearch();
  });

  searchInput.addEventListener("input", () => {
    if (clearBtn) {
      clearBtn.style.display = searchInput.value.trim() ? "flex" : "none";
    }
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(doSearch, 400);
  });

  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      clearTimeout(searchDebounce);
      doSearch();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearTimeout(searchDebounce);
      searchInput.value = "";
      clearBtn.style.display = "none";
      doSearch();
      searchInput.focus();
    });
  }
}

if (apartmentContainer) {
  apartmentContainer.addEventListener("click", async (event) => {
    const button = event.target.closest(".favorite-btn");
    if (button) {
      const apartmentId = button.dataset.id;
      if (!apartmentId) return;

      event.preventDefault();
      event.stopPropagation();
      await toggleSavedId(String(apartmentId));
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

if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", () => {
    if (!isFetchingMore && currentPage < totalPages) {
      fetchApartments(currentPage + 1, activeSearch, activeType);
    }
  });
}

fetchApartments();
loadSavedIdsFromServer();