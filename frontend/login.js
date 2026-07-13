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
    const loggedInRole = data.user.role.toLowerCase();
    if (loggedInRole === "admin") {
      window.location.href = "admin.html";
    } else if (loggedInRole === "landlord") {
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

  // Paint a "Signing you in..." screen right away so a slow mobile
  // connection or a cold backend start (Render free tier) shows feedback
  // instead of a blank white screen while the next request/page loads.
  window.showGoogleLoadingOverlay?.();

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
      window.hideGoogleLoadingOverlay?.();
      if (errorText) errorText.textContent = message;
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("user", JSON.stringify(data.user));

    // Confirm the write actually landed before navigating away - on some
    // mobile browsers under memory pressure a localStorage write can be
    // delayed, and navigating before it lands is what causes the next
    // page to think there's no session.
    if (localStorage.getItem("token") !== data.token) {
      window.hideGoogleLoadingOverlay?.(
        "Almost done - tap below to continue."
      );
      if (errorText) errorText.textContent = "Could not save your session. Please try again.";
      return;
    }

    const loggedInRole = data.user.role.toLowerCase();
    const destination =
      loggedInRole === "admin" ? "admin.html" : loggedInRole === "landlord" ? "landlord.html" : "index.html";
    window.location.replace(destination);
  } catch (error) {
    window.hideGoogleLoadingOverlay?.();
    if (errorText) errorText.textContent = error.message || "Google login failed";
  }
};

window.addEventListener("load", () => {
  if (typeof initGoogleSignIn === "function") {
    initGoogleSignIn("googleSignInButton");
  }
});