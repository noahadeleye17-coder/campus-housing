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
    });

    const buttonContainer = document.getElementById(buttonId);
    if (buttonContainer) {
      google.accounts.id.renderButton(buttonContainer, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: "100%",
        text: "continue_with",
      });
    }

    google.accounts.id.prompt();
  } catch (err) {
    console.error("Google sign-in initialization failed:", err);
    showGoogleFallback(buttonId, "Google sign-in could not be initialized. Check the browser console for details.");
  }
};
