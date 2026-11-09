/* Pillar Flow service worker — build 20261109-1615-d1f82f9
 *
 * This file is a template: build.sh writes sw.js from it with the build id
 * filled in. A new id means a new cache, so every publish reaches the phones.
 */
var CACHE = "pillarflow-20261109-1615-d1f82f9";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// The app page: always try the network first so a new version is picked up on
// the very next open. With a weak signal in the field, give it three seconds,
// then fall back to the copy on the phone rather than leave the crew waiting.
function networkFirst(req) {
  return new Promise(function (resolve) {
    var settled = false;
    function done(res) { if (!settled && res) { settled = true; resolve(res); } }
    function fromCache() {
      return caches.match(req, { ignoreSearch: true })
        .then(function (hit) { return hit || caches.match("./index.html"); });
    }
    var timer = setTimeout(function () { fromCache().then(done); }, 3000);
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
      }
      clearTimeout(timer);
      done(res);
    }).catch(function () {
      clearTimeout(timer);
      fromCache().then(function (hit) { done(hit || new Response("Offline", { status: 503 })); });
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Never cache the database or file storage — those must always be live.
  if (url.hostname.indexOf("supabase.co") >= 0) return;

  var isPage = req.mode === "navigate" ||
               (url.origin === location.origin &&
                (url.pathname.slice(-1) === "/" || /\.html$/.test(url.pathname)));
  if (isPage) { e.respondWith(networkFirst(req)); return; }

  // Everything else (icon, manifest, fonts, imagery): cache first, refresh behind.
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
