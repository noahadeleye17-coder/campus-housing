const apartmentContainer = document.getElementById("apartments");
const searchTitle = document.getElementById("searchTitle");
const maxPrice = document.getElementById("maxPrice");
const maxDistance = document.getElementById("maxDistance");
const filterBtn = document.getElementById("filterBtn");

let apartments = []; // all apartments fetched from backend

// Fetch apartments from backend
async function fetchApartments() {
  try {
    const res = await fetch("http://localhost:5000/api/apartments");
    apartments = await res.json();
    displayApartments(apartments);
  } catch (error) {
    apartmentContainer.innerHTML = "Failed to load apartments";
    console.error(error);
  }
}

// Display apartments in the container
function displayApartments(list) {
  apartmentContainer.innerHTML = "";
  if (list.length === 0) {
    apartmentContainer.innerHTML = "<p>No apartments found</p>";
    return;
  }

  list.forEach(apartment => {
    const div = document.createElement("div");
    div.className = "apartment";
    div.innerHTML = `
    <a href="apartment.html?id=${apartment._id}" style="text-decoration:none; color:inherit;">
      <h3>${apartment.title}</h3>
      <p>${apartment.location}</p>
      <p class="price">₦${apartment.price}</p>
      <p>Distance: ${apartment.distanceFromCampus} km</p>
      <p>Amenities: ${apartment.amenities.join(", ")}</p>
      </a>
    `;
    apartmentContainer.appendChild(div);
  });
}

// Filter apartments
function filterApartments() {
  const title = searchTitle.value.toLowerCase();
  const price = Number(maxPrice.value);
  const distance = Number(maxDistance.value);

  const filtered = apartments.filter(a => {
    return (
      (!title || a.title.toLowerCase().includes(title)) &&
      (!price || a.price <= price) &&
      (!distance || a.distanceFromCampus <= distance)
    );
  });

  displayApartments(filtered);
}

// Event listener
filterBtn.addEventListener("click", filterApartments);

// Load apartments on page load
fetchApartments();
