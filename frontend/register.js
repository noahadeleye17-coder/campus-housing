const form = document.getElementById("registerForm");
const errorText = document.getElementById("error");

// ── Toasts (replaces alert()) ────────────────────────────────────────────────
let toastContainer = null;

const showToast = (message, type = "info") => {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 200);
  }, 3200);
};

const goToRoleHome = (userRole) => {
  window.location.href = userRole.toLowerCase() === "landlord" ? "landlord.html" : "index.html";
};

form.addEventListener("submit", async (e) => {
e.preventDefault();

const name = document.getElementById("name").value;
const email = document.getElementById("email").value;
const password = document.getElementById("password").value;
const confirmPassword = document.getElementById("confirmPassword").value;
const roleInput = document.querySelector('input[name="roleChoice"]:checked');
const role = roleInput ? roleInput.value : "student";

if (password !== confirmPassword) {
if (errorText) errorText.textContent = "Passwords do not match";
return;
}

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
  const message =
    data.message ||
    (data.errors && data.errors[0]?.msg) ||
    "Registration failed";

  if (errorText) errorText.textContent = message;
  return;
}

localStorage.setItem("token", data.token);
localStorage.setItem("role", data.user.role);
localStorage.setItem("user", JSON.stringify(data.user));

showToast("Welcome! Your account is ready.", "success");
setTimeout(() => goToRoleHome(data.user.role), 600);

} catch (error) {
if (errorText) {
errorText.textContent =
error.message ||
"Server error. Make sure the backend is running and the page is served from the Express app.";
}
}
});

window.handleGoogleCredentialResponse = async (response) => {
if (!response?.credential) return;

try {
const roleInput = document.querySelector('input[name="roleChoice"]:checked');
const role = roleInput ? roleInput.value : "student";

const res = await fetch("/api/auth/google", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({ idToken: response.credential, role }),
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

if (data.roleMismatch) {
  showToast(
    `This Google account is already registered as a ${data.user.role}. Signing you in there instead.`,
    "info"
  );
  setTimeout(() => goToRoleHome(data.user.role), 1400);
} else {
  goToRoleHome(data.user.role);
}

} catch (error) {
if (errorText) {
errorText.textContent =
error.message || "Google login failed";
}
}
};

window.addEventListener("load", () => {
if (typeof initGoogleSignIn === "function") {
initGoogleSignIn("googleSignInButton");
}
});