/* Pillar Flow service worker — build 20261110-1050-1cd3518
 *
 * This file is a template: build.sh writes sw.js from it with the build id
 * filled in. A new id means a new worker, so every publish reaches the phones.
 *
 * Two caches:
 *   pillarflow-<build>   the app itself. Replaced whole on each new version.
 *   pillarflow-tiles     satellite imagery and fonts. Kept across versions so
 *                        imagery downloaded for a job survives an app update.
 */
var CACHE = "pillarflow-20261110-1050-1cd3518";
var TILES = "pillarflow-tiles";
var TILE_CAP = 6000;                // ~100 MB of imagery at most; oldest go first
var SHELL = ["./index.html", "./manifest.webmanifest", "./icon.svg",
             "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // The page must come from the network, not the browser's HTTP cache, or
      // a new worker could install with the old page inside it.
      return c.add(new Request("./index.html", { cache: "reload" })).then(function () {
        return Promise.all(SHELL.slice(1).map(function (u) { return c.add(u).catch(function () {}); }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return (k === CACHE || k === TILES) ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// The app page opens instantly from the phone, signal or not. Each new version
// is fetched in the background when its worker installs; the page then offers
// a Reload instead of switching under someone's thumb mid-plant.
function appPage() {
  return caches.open(CACHE).then(function (c) {
    return c.match("./index.html").then(function (hit) {
      if (hit) return hit;
      return fetch("./index.html").then(function (res) {
        // Only a real copy of the app goes in the cache — never an error page
        // or a captive-portal login served in its place.
        var type = (res.headers.get("content-type") || "");
        if (res.ok && !res.redirected && type.indexOf("text/html") === 0) c.put("./index.html", res.clone());
        return res;
      });
    });
  }).catch(function () { return new Response("Offline", { status: 503 }); });
}

var puts = 0;
function trimTiles() {
  caches.open(TILES).then(function (c) {
    return c.keys().then(function (keys) {
      var extra = keys.length - TILE_CAP;
      for (var i = 0; i < extra; i++) c.delete(keys[i]);
    });
  }).catch(function () {});
}

function cacheFirst(req, name) {
  return caches.open(name).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        // CORS responses only: an opaque response costs megabytes of quota each.
        if (res && res.ok && res.type !== "opaque") {
          c.put(req, res.clone());
          if (name === TILES && ++puts % 100 === 0) trimTiles();
        }
        return res;
      });
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // The database and file storage are always live, never cached here.
  if (url.hostname.indexOf("supabase.co") >= 0) return;

  if (req.mode === "navigate" && url.origin === location.origin) { e.respondWith(appPage()); return; }

  if (url.hostname === "server.arcgisonline.com" ||
      url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(cacheFirst(req, TILES));
    return;
  }

  if (url.origin === location.origin && !/\.html$/.test(url.pathname) && url.pathname.slice(-1) !== "/") {
    e.respondWith(cacheFirst(req, CACHE));
  }
  // Anything else goes straight to the network.
});
