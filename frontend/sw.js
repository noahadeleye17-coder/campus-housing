// Off-Campus Hub service worker: caches the app shell + public listings so
// repeat visits are fast and usable on weak networks. Never caches auth/user APIs.
const V = "och-v2";
const SHELL = ["/", "/style.css", "/app.js", "/auth-session.js", "/ui-feedback.js"];

const swr = async (req) => {
  const c = await caches.open(V);
  const hit = await c.match(req);
  const net = fetch(req)
    .then((r) => { if (r.ok) c.put(req, r.clone()); return r; })
    .catch(() => hit);
  return hit || net;
};

self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname === "/sw.js") return;
  const isApi = u.pathname.startsWith("/api/");
  if (isApi && u.pathname !== "/api/apartments") return; // auth/user data: network only
  if (u.pathname === "/apartment.html") return;          // server-rendered per listing
  e.respondWith(swr(r));
});
