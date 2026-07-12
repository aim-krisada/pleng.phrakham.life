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

const APP_CACHE = 'pleng-app-v1'
const SAMPLES_CACHE = 'pleng-samples-v1'
const MANIFEST_URL = '/samples/manifest.json'
// App-shell URLs we always want cached (the hashed assets are added at runtime on first fetch).
const APP_SHELL = ['/', '/index.html', '/favicon.ico']

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // Precache the samples from the manifest so offline playback works on the first offline launch.
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-cache' })
      if (res.ok) {
        const manifest = await res.json()
        const urls = [MANIFEST_URL, ...(Array.isArray(manifest.precache) ? manifest.precache : [])]
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
        const r = await fetch('/asset-manifest.json', { cache: 'no-cache' })
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
    const keep = new Set([APP_CACHE, SAMPLES_CACHE])
    const names = await caches.keys()
    await Promise.all(names.map((n) => (keep.has(n) ? null : caches.delete(n))))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // never touch cross-origin

  // Samples: cache-first (immutable content; the whole point of the offline precache).
  if (url.pathname.startsWith('/samples/')) {
    event.respondWith((async () => {
      const cached = await caches.match(req)
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
        return (await caches.match(req)) || (await caches.match('/index.html')) || (await caches.match('/')) || Response.error()
      }
    })())
    return
  }

  // Other same-origin assets (hashed JS/CSS/fonts): stale-while-revalidate — instant from cache,
  // refreshed in the background when online.
  event.respondWith((async () => {
    const cached = await caches.match(req)
    const network = fetch(req).then((res) => {
      if (res.ok) { caches.open(APP_CACHE).then((c) => c.put(req, res.clone())) }
      return res
    }).catch(() => cached)
    return cached || network
  })())
})
