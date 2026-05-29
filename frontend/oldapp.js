console.log("app.js loaded");

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
  hamburger.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
    menuOverlay.classList.toggle("show");
  });

  menuOverlay.addEventListener("click", () => {
    mobileMenu.classList.remove("open");
    menuOverlay.classList.remove("show");
  });
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

  try {
    const res = await fetch("http://localhost:5000/api/apartments");

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

      div.innerHTML = `
        <div class="card-image">
          <img src="images/room1.jpg" alt="Apartment">
          <span class="distance-badge">${apartment.distanceFromCampus}km</span>
        </div>

        <div class="card-body">
          <h3>${apartment.title}</h3>
          <p class="location">${apartment.location}</p>
          <p class="price">₦${apartment.price.toLocaleString()}</p>

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