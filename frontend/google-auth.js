const loadGoogleClientId = async () => {
  try {
    const res = await fetch("/api/config");
    if (!res.ok) return "";
    const json = await res.json();
    return json.googleClientId || "";
  } catch (err) {
    console.warn("Failed to load Google client ID:", err);
    return "";
  }
};

const waitForGoogleAccounts = () =>
  new Promise((resolve) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, 10000);
  });

const showGoogleFallback = (buttonId, message) => {
  const buttonContainer = document.getElementById(buttonId);
  if (!buttonContainer) return;

  buttonContainer.innerHTML = `
    <button type="button" class="btn google-fallback-button" disabled>
      <span class="google-icon">G</span>
      Continue with Google
    </button>
    <p class="google-fallback-note">${message}</p>
  `;
};

// Full-viewport "please wait" screen shown the instant a Google login starts.
// Uses inline styles only (no dependency on style.css having loaded) so it
// paints immediately even on a slow mobile connection, instead of leaving
// the student staring at a blank white screen while the next page loads or
// the backend (Render free tier) spins up from a cold start.
let googleLoadingOverlay = null;
const showGoogleLoadingOverlay = () => {
  if (googleLoadingOverlay) return;
  googleLoadingOverlay = document.createElement("div");
  googleLoadingOverlay.setAttribute("id", "googleLoadingOverlay");
  googleLoadingOverlay.setAttribute(
    "style",
    "position:fixed;inset:0;z-index:99999;background:#ffffff;display:flex;" +
      "flex-direction:column;align-items:center;justify-content:center;gap:14px;" +
      "font-family:system-ui,-apple-system,sans-serif;"
  );
  googleLoadingOverlay.innerHTML = `
    <div style="width:36px;height:36px;border-radius:50%;border:3px solid #e5e7eb;border-top-color:#2357d8;animation:googleAuthSpin 0.8s linear infinite;"></div>
    <p style="margin:0;color:#4b5563;font-size:0.95rem;">Signing you in&hellip;</p>
    <style>@keyframes googleAuthSpin{to{transform:rotate(360deg);}}</style>
  `;
  document.body.appendChild(googleLoadingOverlay);
};
const hideGoogleLoadingOverlay = (message) => {
  if (!googleLoadingOverlay) return;
  if (message) {
    googleLoadingOverlay.innerHTML = `<p style="margin:0;color:#b91c1c;font-size:0.95rem;max-width:300px;text-align:center;">${message}</p>`;
  } else {
    googleLoadingOverlay.remove();
    googleLoadingOverlay = null;
  }
};
window.showGoogleLoadingOverlay = showGoogleLoadingOverlay;
window.hideGoogleLoadingOverlay = hideGoogleLoadingOverlay;

const initGoogleSignIn = async (buttonId) => {
  const clientId = await loadGoogleClientId();
  if (!clientId) {
    showGoogleFallback(buttonId, "Google sign-in is unavailable. Make sure you run the app through http://localhost:5000 and that GOOGLE_CLIENT_ID is set.");
    return;
  }

  await waitForGoogleAccounts();
  if (!window.google?.accounts?.id) {
    showGoogleFallback(buttonId, "Google scripts did not load. Refresh the page or verify your network connection.");
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredentialResponse,
      ux_mode: "popup",
      error_callback: (err) => {
        console.error("Google sign-in prompt error:", err);
      },
    });

    const buttonContainer = document.getElementById(buttonId);
    if (buttonContainer) {
      google.accounts.id.renderButton(buttonContainer, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: "100",
        text: "continue_with",
      });
    }

    // Deliberately NOT calling google.accounts.id.prompt() (One Tap) here.
    // One Tap depends on third-party cookies/FedCM support that mobile
    // Chrome and Safari are inconsistent about, and when it silently fails
    // mid-flow it's a common cause of "logs in, then blank page" reports.
    // The rendered button above is the reliable path - it still opens the
    // standard Google account chooser, just without the fragile auto-prompt.
  } catch (err) {
    console.error("Google sign-in initialization failed:", err);
    showGoogleFallback(buttonId, "Google sign-in could not be initialized. Check the browser console for details.");
  }
};