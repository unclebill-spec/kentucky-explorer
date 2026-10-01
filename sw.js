// Kentucky Explorer service worker: offline app shell, data and viewed map tiles.
// Registered as sw.js?v=<build stamp>; every publish has a new stamp -> a new worker -> old shell/data caches are deleted.
const V = new URL(self.location).searchParams.get("v") || "0";
const SHELL = "kyx-shell-" + V, DATA = "kyx-data-" + V, TILES = "kyx-tiles", PHOTOS = "kyx-photos";
const PRE = ["./", "index.html", "app.js?v=" + V, "style.css?v=" + V, "data/core.js?v=" + V, "vendor/leaflet.js", "vendor/leaflet.css",
  "manifest.webmanifest", "img/icon-192.png", "img/icon-512.png"];
const TILE_MAX = 3000, PHOTO_MAX = 400;
self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => /^kyx-(shell|data)-/.test(k) && k !== SHELL && k !== DATA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trim(name, max) { const c = await caches.open(name), ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
async function cacheFirst(req, name, max) {
  const c = await caches.open(name), hit = await c.match(req); if (hit) return hit;
  const res = await fetch(req); if (res && (res.ok || res.type === "opaque")) { c.put(req, res.clone()); if (max && Math.random() < 0.05) trim(name, max); }
  return res;
}
async function networkFirst(req, name) {
  const c = await caches.open(name);
  try { const res = await fetch(req); if (res && res.ok) c.put(req, res.clone()); return res; }
  catch (err) { const hit = await c.match(req) || await caches.match(req, { ignoreSearch: true }); if (hit) return hit; throw err; }
}
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (/(^|\.)tile\.openstreetmap\.org$|arcgisonline\.com$|basemaps\.cartocdn\.com$|tile\.opentopomap\.org$/.test(u.hostname)) { e.respondWith(cacheFirst(req, TILES, TILE_MAX)); return; }
  if (u.origin !== self.location.origin) return;
  if (req.mode === "navigate") { e.respondWith(networkFirst(req, SHELL).catch(() => caches.match("index.html"))); return; }
  if (u.searchParams.has("v") || u.pathname.includes("/vendor/")) { e.respondWith(cacheFirst(req, u.pathname.includes("/data/") ? DATA : SHELL)); return; }
  if (u.pathname.includes("/img/")) { e.respondWith(cacheFirst(req, PHOTOS, PHOTO_MAX)); return; }
  e.respondWith(networkFirst(req, DATA));
});
