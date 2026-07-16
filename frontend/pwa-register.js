// Off-Campus Hub — PWA registration
// Include this script (or its contents) on every page, e.g.:
//   <script src="/pwa-register.js" defer></script>

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // Fails silently in browsers/contexts that don't support it
      // (e.g. non-HTTPS in dev) — installability just won't be offered.
      console.warn('Service worker registration failed:', err);
    });
  });
}
