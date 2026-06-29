const form = document.getElementById("loginForm");
const errorText = document.getElementById("error");
const params = new URLSearchParams(window.location.search);

if (params.get("expired") === "1") {
  window.AuthSession?.clear();
  if (errorText) errorText.textContent = "Your session expired. Please log in again.";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
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
      const message = data.message || (data.errors && data.errors[0]?.msg) || "Invalid email or password";
      if (errorText) errorText.textContent = message;
      return;
    }

    // SAVE TOKEN
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("user", JSON.stringify(data.user));

    // REDIRECT BASED ON ROLE
    if (data.user.role.toLowerCase() === "landlord") {
      window.location.href = "landlord.html";
    } else {
      window.location.href = "index.html";
    }

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
