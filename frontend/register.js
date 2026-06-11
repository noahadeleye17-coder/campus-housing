const form = document.getElementById("registerForm");
const errorText = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password, role })
    });

    const contentType = res.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(text || `Server responded with status ${res.status}`);
    }

    if (!res.ok) {
      const message = data.message || (data.errors && data.errors[0]?.msg) || "Registration failed";
      if (errorText) errorText.textContent = message;
      return;
    }

    alert("Registration successful. Please login.");
    window.location.href = "login.html";

  } catch (error) {
    if (errorText) errorText.textContent = error.message || "Server error. Make sure the backend is running and the page is served from the Express app.";
  }
});

window.handleGoogleCredentialResponse = async (response) => {
  if (!response?.credential) return;

  try {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken: response.credential }),
    });

    const contentType = res.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(text || `Server responded with status ${res.status}`);
    }

    if (!res.ok) {
      const message = data.message || "Google login failed";
      if (errorText) errorText.textContent = message;
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("user", JSON.stringify(data.user));

    if (data.user.role.toLowerCase() === "landlord") {
      window.location.href = "landlord.html";
    } else {
      window.location.href = "index.html";
    }
  } catch (error) {
    if (errorText) errorText.textContent = error.message || "Google login failed";
  }
};

window.addEventListener("load", () => {
  if (typeof initGoogleSignIn === "function") {
    initGoogleSignIn("googleSignInButton");
  }
});
