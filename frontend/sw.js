// Off-Campus Hub — minimal service worker
//
// Purpose: satisfy PWA installability requirements only.
// Deliberately does NOT cache anything and does NOT serve offline content.
// Every request just passes straight through to the network.

self.addEventListener('install', (event) => {
  // Activate this SW as soon as it's installed, without waiting
  // for old tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of any open pages immediately.
  event.waitUntil(self.clients.claim());
});

// A fetch handler is required by some browsers' install criteria,
// but this one does nothing except pass the request straight to
// the network — no cache, no offline fallback.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
