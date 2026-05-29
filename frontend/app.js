console.log("app.js loaded");

// Make API base configurable (can be overridden on the page)
const API_BASE = window.API_BASE || "http://localhost:5000/api";

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
const authActions = document.getElementById("authActions");

// ============================
// MOBILE MENU
// ============================
if (hamburger && mobileMenu && menuOverlay) {
  // ensure initial ARIA state
  hamburger.setAttribute("aria-expanded", "false");
  mobileMenu.setAttribute("aria-hidden", "true");

  const openMenu = () => {
    mobileMenu.classList.add("open");
    menuOverlay.classList.add("show");
    hamburger.setAttribute("aria-expanded", "true");
    mobileMenu.setAttribute("aria-hidden", "false");
  };

  const closeMenu = () => {
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

// ============================
// FETCH APARTMENTS
// ============================
async function fetchApartments() {
  if (!apartmentContainer) return;

  showSkeletons(apartmentContainer);

  try {
    const res = await fetch(`${API_BASE}/apartments`);

    if (!res.ok) throw new Error("Fetch failed");

    const apartments = await res.json();
    apartmentContainer.innerHTML = "";

    if (apartments.length === 0) {
      apartmentContainer.innerHTML = "<p>No apartments found.</p>";
      return;
    }

    apartments.forEach(apartment => {
      const div = document.createElement("div");
      div.className = "apartment";
      const imageMarkup = apartment.image
        ? `<img src="http://localhost:5000${apartment.image}" alt="Apartment">`
        : `<div class="card-placeholder" aria-label="Apartment image placeholder"></div>`;

      div.innerHTML = `
        <div class="card-image">
          ${imageMarkup}
          <span class="distance-badge">${apartment.distanceFromCampus}km</span>
        </div>

        <div class="card-body">
          <h3>${apartment.title}</h3>
          <p class="location">${apartment.location}</p>
          <p class="price">&#8358;${apartment.price.toLocaleString()}</p>

          <a href="apartment.html?id=${apartment._id}" class="btn">
            View Details
          </a>
        </div>
      `;

      apartmentContainer.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    apartmentContainer.innerHTML =
      "<p class='loading'>Failed to load apartments</p>";
  }
}

fetchApartments();
// ============================
// END OF FILE
// ============================
