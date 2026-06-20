const API_BASE = window.API_BASE || "/api";

const form = document.getElementById("forgotPasswordForm");
const messageEl = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  if (!email) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";
  messageEl.style.color = "";
  messageEl.textContent = "";

  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
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
      throw new Error(data.message || "Could not send reset link");
    }

    messageEl.style.color = "#04786f";
    messageEl.textContent = data.message || "If an account exists for that email, a reset link has been sent.";
    form.reset();
  } catch (error) {
    messageEl.textContent = error.message || "Something went wrong. Please try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send reset link";
  }
});