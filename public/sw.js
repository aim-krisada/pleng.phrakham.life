// B107 step 9 — PWA service worker for OFFLINE playback. pleng is meant to work in a church with
// no signal, so once visited it must load AND play its instruments offline. Two jobs:
//
//   1. PRECACHE the self-hosted instrument samples. On install we read /samples/manifest.json and
//      cache every URL in its `precache[]` list (~115 same-origin files, ~10.6 MB). This is what
//      lets the FIRST offline launch play a never-before-played instrument — smplr's own
//      CacheStorage only covers instruments already fetched online.
//   2. RUNTIME-CACHE the app shell. Vite hashes the JS/CSS filenames at build time (unknown here),
//      so instead of precaching them we cache same-origin GETs as they're fetched, and serve from
//      cache when offline. After one online visit the whole app works offline.
//
// Cache-versioned by name; bump SAMPLES_CACHE when the sample catalogue changes (keeps the mirror
// in step with sampler.js's pleng-samples-v1). ACTIVATE prunes old versions.

// ---- SCOPE-RELATIVE (side-by-side /v2 deploy · docs/deploy-v2.md) -------------------------------
// The same sw.js file is served at BOTH '/sw.js' (current version) and '/v2/sw.js' (the new one).
// Registration is relative ('sw.js' from the page), so each gets the scope of its own folder — but
// CacheStorage is per-ORIGIN, not per-scope, so hard-coded '/...' URLs and shared cache NAMES would
// make the two versions read and evict each other's files. Everything below is derived from
// `registration.scope` instead: ROOT is '/' for the current version and '/v2/' for the new one.
const ROOT = new URL(self.registration.scope).pathname   // '/' | '/v2/'
// '' at the root so the current version keeps its EXISTING cache names byte-for-byte (an update
// must not orphan what visitors already have); '--v2' for the subfolder build.
const SUFFIX = ROOT === '/' ? '' : '--' + ROOT.replace(/^\/|\/$/g, '').replace(/\//g, '-')

const APP_CACHE = 'pleng-app-v1' + SUFFIX
const SAMPLES_CACHE = 'pleng-samples-v1' + SUFFIX
const SAMPLES_PATH = ROOT + 'samples/'
const MANIFEST_URL = SAMPLES_PATH + 'manifest.json'
// App-shell URLs we always want cached (the hashed assets are added at runtime on first fetch).
// Includes the PWA manifest + install icons so an offline "add to home screen" still resolves
// them (they're static public/ files, not in the hashed asset-manifest).
const APP_SHELL = [
  ROOT, 'index.html', 'favicon.ico', 'phrakham.ico',
  'site.webmanifest',
  'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png',
  'android-chrome-192x192.png', 'android-chrome-512x512.png',
].map((p) => (p === ROOT ? p : ROOT + p))

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // Precache the samples from the manifest so offline playback works on the first offline launch.
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-cache' })
      if (res.ok) {
        const manifest = await res.json()
        // The manifest ships site-root paths ('/samples/…'), so rebase them onto THIS scope —
        // otherwise the /v2 SW would fill its cache with the root deployment's 205 sample files
        // (measured: 205 root paths inside pleng-samples-v1--v2 before this line existed).
        const rebase = (u) => (ROOT === '/' ? u : String(u).replace(/^\/samples\//, SAMPLES_PATH))
        const urls = [MANIFEST_URL, ...(Array.isArray(manifest.precache) ? manifest.precache.map(rebase) : [])]
        const cache = await caches.open(SAMPLES_CACHE)
        // Individually (not addAll) so one missing file can't abort the whole precache.
        await Promise.allSettled(urls.map(async (u) => {
          const r = await fetch(u, { cache: 'no-cache' })
          if (r.ok) await cache.put(u, r.clone())
        }))
      }
    } catch { /* offline at install time → runtime caching still fills in on later online visits */ }
    // Precache the app shell + every built asset (hashed JS/CSS chunks, incl. the smplr audio
    // engine) from the build-time asset-manifest.json, so the first OFFLINE launch boots and can
    // play — not just serve samples. Best-effort: a missing file can't abort the install.
    try {
      const cache = await caches.open(APP_CACHE)
      let assets = []
      try {
        const r = await fetch(ROOT + 'asset-manifest.json', { cache: 'no-cache' })
        if (r.ok) assets = await r.json()
      } catch { /* no manifest (dev) → shell only */ }
      const shell = [...APP_SHELL, ...(Array.isArray(assets) ? assets : [])]
      await Promise.allSettled(shell.map(async (u) => {
        try { const res = await fetch(u, { cache: 'no-cache' }); if (res.ok) await cache.put(u, res.clone()) } catch { /* skip */ }
      }))
    } catch { /* ignore */ }
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Prune old versions of OUR caches only. A cache name carries the scope it belongs to
    // ('…--v2'), so the root SW never deletes the /v2 build's files and vice versa — the two
    // deployments share an origin but must not evict each other (docs/deploy-v2.md).
    const keep = new Set([APP_CACHE, SAMPLES_CACHE])
    const mine = (n) => n.startsWith('pleng-') &&
      (SUFFIX ? n.endsWith(SUFFIX) : !/--/.test(n))
    const names = await caches.keys()
    await Promise.all(names.map((n) => (!mine(n) || keep.has(n) ? null : caches.delete(n))))
    await self.clients.claim()
  })())
})

// ⚠️ ALL cache lookups pass { ignoreVary: true }. Vite marks the module <script> `crossorigin`,
// so the browser sends an `Origin` header and the served asset carries `Vary: Origin`. A plain
// caches.match(req) HONOURS Vary, so offline (where the request's Origin/headers differ from what
// was cached) it MISSES → falls through to the dead network → import() fails → the app never boots.
// ignoreVary makes the match key the URL alone, which is what we want for these static assets.
const MATCH = { ignoreVary: true }

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // never touch cross-origin

  // Samples: cache-first (immutable content; the whole point of the offline precache).
  // Requests belonging to the OTHER deployment (e.g. '/assets/…' seen by the /v2 SW because the
  // root SW's scope also covers this page on a first visit) are left to the network / the SW that
  // owns them — caching them here would mix the two builds' shells in one cache.
  if (!url.pathname.startsWith(ROOT)) return
  if (ROOT === '/' && url.pathname.startsWith('/v2/')) return

  if (url.pathname.startsWith(SAMPLES_PATH)) {
    event.respondWith((async () => {
      const cached = await caches.match(req, MATCH)
      if (cached) return cached
      const res = await fetch(req)
      if (res.ok) { const c = await caches.open(SAMPLES_CACHE); c.put(req, res.clone()) }
      return res
    })())
    return
  }

  // Navigations: network-first (fresh app when online), fall back to the cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req)
        const c = await caches.open(APP_CACHE); c.put(req, res.clone())
        return res
      } catch {
        return (await caches.match(req, MATCH)) || (await caches.match(ROOT + 'index.html', MATCH)) || (await caches.match(ROOT, MATCH)) || Response.error()
      }
    })())
    return
  }

  // Other same-origin assets (hashed JS/CSS/fonts): stale-while-revalidate — instant from cache,
  // refreshed in the background when online.
  event.respondWith((async () => {
    const cached = await caches.match(req, MATCH)
    const network = fetch(req).then((res) => {
      if (res.ok) { caches.open(APP_CACHE).then((c) => c.put(req, res.clone())) }
      return res
    }).catch(() => cached)
    return cached || network
  })())
})
