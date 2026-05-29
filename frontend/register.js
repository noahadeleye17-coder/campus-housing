const form = document.getElementById("registerForm");
const errorText = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  try {
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await res.json();

    if (!res.ok) {
      errorText.textContent = data.message;
      return;
    }

    alert("Registration successful. Please login.");
    window.location.href = "login.html";

  } catch (error) {
    errorText.textContent = "Server error";
  }
});
