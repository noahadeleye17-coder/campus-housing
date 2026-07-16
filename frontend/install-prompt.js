// Off-Campus Hub — custom "Install App" banner
//
// Chrome/Android/desktop Chrome: hooks the real beforeinstallprompt event so
// tapping our own button triggers the native install dialog. Once the user
// actually installs, we set a permanent flag and never show the button again
// on this device/browser.
//
// iOS Safari: there is no installable event to hook at all — Apple doesn't
// support it. We just show a small instruction banner ("tap Share, then Add
// to Home Screen"). Dismissing it is remembered so it doesn't nag every
// visit.
//
// On either platform, if the site is already running installed (standalone
// mode), this script does nothing.

(function () {
  var INSTALLED_KEY = "ochPwaInstalled";
  var IOS_DISMISSED_KEY = "ochIosInstallDismissed";

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true // iOS Safari specific
    );
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  // Already installed / already running as the installed app — nothing to do.
  if (isStandalone()) {
    try { localStorage.setItem(INSTALLED_KEY, "1"); } catch (e) {}
    return;
  }

  // User already has the site installed on this device (Chrome told us so
  // previously) — never show the banner again even if they're viewing it
  // in a normal browser tab.
  try {
    if (localStorage.getItem(INSTALLED_KEY) === "1") return;
  } catch (e) {}

  var styleTag = document.createElement("style");
  styleTag.textContent = [
    "#och-install-banner {",
    "  position: fixed; left: 16px; right: 16px; bottom: 16px; z-index: 9999;",
    "  max-width: 420px; margin: 0 auto;",
    "  background: #2357d8; color: #fff;",
    "  border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.25);",
    "  padding: 14px 16px; display: flex; align-items: center; gap: 12px;",
    "  font-family: inherit; font-size: 14px; line-height: 1.35;",
    "}",
    "#och-install-banner .och-install-text { flex: 1; }",
    "#och-install-banner button {",
    "  font-family: inherit; font-size: 14px; cursor: pointer; border: none;",
    "}",
    "#och-install-banner .och-install-action {",
    "  background: #fff; color: #2357d8; font-weight: 600;",
    "  padding: 8px 14px; border-radius: 8px; white-space: nowrap;",
    "}",
    "#och-install-banner .och-install-close {",
    "  background: transparent; color: #fff; opacity: 0.8;",
    "  font-size: 18px; line-height: 1; padding: 4px 6px;",
    "}",
    "#och-install-banner .och-install-close:hover { opacity: 1; }",
  ].join("\n");
  document.head.appendChild(styleTag);

  function showBanner(innerHTML, onAction) {
    if (document.getElementById("och-install-banner")) return;

    var banner = document.createElement("div");
    banner.id = "och-install-banner";
    banner.innerHTML = innerHTML;
    document.body.appendChild(banner);

    var closeBtn = banner.querySelector(".och-install-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        banner.remove();
      });
    }

    var actionBtn = banner.querySelector(".och-install-action");
    if (actionBtn && onAction) {
      actionBtn.addEventListener("click", function () {
        onAction(banner);
      });
    }
  }

  if (isIOS()) {
    // No installable event on iOS — just show instructions once.
    var alreadyDismissed = false;
    try { alreadyDismissed = localStorage.getItem(IOS_DISMISSED_KEY) === "1"; } catch (e) {}
    if (alreadyDismissed) return;

    showBanner(
      '<div class="och-install-text">Install Off-Campus Hub: tap the ' +
      '<strong>Share</strong> icon, then <strong>Add to Home Screen</strong>.</div>' +
      '<button class="och-install-close" aria-label="Dismiss">&times;</button>'
    );

    var iosBanner = document.getElementById("och-install-banner");
    var iosCloseBtn = iosBanner && iosBanner.querySelector(".och-install-close");
    if (iosCloseBtn) {
      iosCloseBtn.addEventListener("click", function () {
        try { localStorage.setItem(IOS_DISMISSED_KEY, "1"); } catch (e) {}
      });
    }
    return;
  }

  // Chrome / Android / desktop Chrome / Edge path.
  var deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;

    showBanner(
      '<div class="och-install-text">Install Off-Campus Hub for quick, one-tap access.</div>' +
      '<button class="och-install-action">Install</button>' +
      '<button class="och-install-close" aria-label="Dismiss">&times;</button>',
      function (banner) {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          if (choice.outcome === "accepted") {
            try { localStorage.setItem(INSTALLED_KEY, "1"); } catch (e) {}
          }
          banner.remove();
          deferredPrompt = null;
        });
      }
    );
  });

  // Fires when install actually completes, regardless of how it was
  // triggered — belt-and-suspenders alongside the userChoice check above.
  window.addEventListener("appinstalled", function () {
    try { localStorage.setItem(INSTALLED_KEY, "1"); } catch (e) {}
    var existing = document.getElementById("och-install-banner");
    if (existing) existing.remove();
  });
})();
