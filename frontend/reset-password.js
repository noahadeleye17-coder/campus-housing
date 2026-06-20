const API_BASE = window.API_BASE || "/api";

const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const email = params.get("email");

const form = document.getElementById("resetPasswordForm");
const messageEl = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");

if (!token || !email) {
  messageEl.textContent = "This reset link is missing required information. Please request a new one.";
  if (form) {
    Array.from(form.elements).forEach((el) => (el.disabled = true));
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    messageEl.textContent = "Passwords do not match";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Resetting...";
  messageEl.style.color = "";
  messageEl.textContent = "";

  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, password }),
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
      throw new Error(data.message || "Could not reset password");
    }

    messageEl.style.color = "#04786f";
    messageEl.textContent = "Password reset successful. Redirecting to login...";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1800);
  } catch (error) {
    messageEl.textContent = error.message || "Something went wrong. Please try again.";
    submitBtn.disabled = false;
    submitBtn.textContent = "Reset password";
  }
});