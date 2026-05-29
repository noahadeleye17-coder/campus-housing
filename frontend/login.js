const form = document.getElementById("loginForm");
const errorText = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      if (errorText) errorText.textContent = data.message;
      return;
    }

    // SAVE TOKEN
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("user", JSON.stringify(data.user));

    // DEBUG LOGS
    console.log("LOGIN RESPONSE:", data);
    console.log("ROLE:", data.user.role);

    // REDIRECT BASED ON ROLE
    if (data.user.role.toLowerCase() === "landlord") {
      window.location.href = "landlord.html";
    } else {
      window.location.href = "index.html";
    }

  } catch (error) {
    if (errorText) errorText.textContent = "Server error";
  }
});
