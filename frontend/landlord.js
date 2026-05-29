const token = localStorage.getItem("token");
const form = document.getElementById("addApartmentForm");
const container = document.getElementById("myApartments");

if (!token) {
  alert("Please login as a landlord first.");
  window.location.href = "login.html";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("title", title.value);
  formData.append("price", price.value);
  formData.append("location", location.value);
  formData.append("distanceFromCampus", distance.value);
  formData.append("amenities", amenities.value);
  formData.append("latitude", latitude.value);
  formData.append("longitude", longitude.value);

  if (image.files[0]) {
    formData.append("image", image.files[0]);
  }

  const res = await fetch("http://localhost:5000/api/apartments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.message || "Failed to add apartment");
    return;
  }

  alert("Apartment added!");
  form.reset();
  loadApartments();
});

async function loadApartments() {
  const res = await fetch("http://localhost:5000/api/apartments");
  const data = await res.json();

  container.innerHTML = "";

  data.forEach((a) => {
    const imageMarkup = a.image
      ? `<img src="http://localhost:5000${a.image}" alt="Apartment" width="100%" />`
      : `<div class="card-placeholder" aria-label="Apartment image placeholder"></div>`;
    container.innerHTML += `
      <div class="apartment">
        ${imageMarkup}
        <h3>${a.title}</h3>
        <p>${a.location}</p>
        <p>&#8358;${a.price}</p>
      </div>
    `;
  });
}

loadApartments();
