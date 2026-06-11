const apartmentContainer = document.getElementById("apartment");
const mapContainer = document.getElementById("map");

// Get the apartment ID from the URL, e.g., apartment.html?id=696daf60f45a29f675e04f0f
const urlParams = new URLSearchParams(window.location.search);
const apartmentId = urlParams.get("id");

async function fetchApartment() {
  try {
    const res = await fetch(`http://localhost:5000/api/apartments/${apartmentId}`);
    const apartment = await res.json();

    apartmentContainer.innerHTML = `
      <h2>${apartment.title}</h2>
      <p>${apartment.location}</p>
      <p class="price">₦${apartment.price}</p>
      <p>Distance: ${apartment.distanceFromCampus} km</p>
      <p>Amenities: ${apartment.amenities.join(", ")}</p>
      <p>${apartment.description || ""}</p>
    `;

    // Initialize Google Map
    initMap(apartment);
  } catch (error) {
    apartmentContainer.innerHTML = "Failed to load apartment details";
    console.error(error);
  }
}

// Initialize Google Map
function initMap(apartment) {
  const map = new google.maps.Map(mapContainer, {
    zoom: 15,
    center: { lat: 6.5244, lng: 3.3792 }, // Default: Lagos coordinates, you can update dynamically
  });

  // Add marker
  new google.maps.Marker({
    position: map.getCenter(), // Update with real apartment coordinates if available
    map: map,
    title: apartment.title,
  });
}

fetchApartment();
