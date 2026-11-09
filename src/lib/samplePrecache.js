// ใบ v1#166 — which instrument samples the service worker downloads ahead of time.
//
// samples/manifest.json `precache` is the list public/sw.js saves for offline use, and the list the
// home page counts before it says "พร้อมใช้แบบไม่มีเน็ต" (offlineReady.js). It must hold ONLY the
// instruments the site can play: with PIANO_ONLY on, that is the grand piano (120 files) — not the
// guitar / violin / cello files that sit unused on every reader's phone.
//
// One source of truth: PRECACHE_INSTRUMENTS in soundOptions.js. The list is rebuilt from the files
// on disk at every `vite build` (vite.config.js) and by `npm run samples:precache` (the committed
// copy, checked by samplePrecache.test.js) — so turning PIANO_ONLY off puts the other instruments
// back in the list by itself. The sample FILES all stay in public/samples either way.
//
// Pure (no node:fs) so vite.config.js, the tool script and the tests can all share it.

// Files under public/samples that are not samples.
export const NOT_SAMPLES = new Set(['manifest.json', 'README.md', '.gitattributes'])

// What part of public/samples one instrument owns: a folder ('CC0/nylon/') or one file
// ('FluidR3_GM/acoustic_guitar_steel-mp3.js'). `reuses` follows to the instrument it is built on
// (felt = the grand files through a filter).
function ownedBy(instruments, name, seen = new Set()) {
  const inst = instruments && instruments[name]
  if (!inst || seen.has(name)) return []
  seen.add(name)
  if (inst.reuses) return ownedBy(instruments, inst.reuses, seen)
  if (inst.baseUrl) return [{ dir: inst.baseUrl.replace(/\/+$/, '') + '/' }]
  if (inst.instrumentUrl) return [{ file: inst.instrumentUrl }]
  return []
}

// files: every path under public/samples, relative and '/'-separated ('CC0/nylon/31.ogg').
// names: the instruments to keep (manifest `instruments` keys), or null = every file.
// → the sample files to precache, relative, sorted.
export function precacheFiles(manifest, files, names) {
  const all = files.filter((f) => !NOT_SAMPLES.has(f))
  if (names == null) return [...all].sort()
  const parts = names.flatMap((n) => ownedBy(manifest.instruments, n))
  const keep = (f) => parts.some((p) => (p.dir ? f.startsWith(p.dir) : f === p.file))
  return all.filter(keep).sort()
}

// Relative file → the same-origin URL the service worker fetches ('/samples/PP%20G2.ogg').
export function sampleUrl(f) {
  return '/samples/' + f.split('/').map(encodeURIComponent).join('/')
}

// The manifest with `precache` (and its size, `precacheMB`) rebuilt for `names`. Everything else —
// the per-instrument data, `totalMB` = every sample file on disk — is kept as it is.
// sizes: { [relative file]: bytes }.
export function withPrecache(manifest, files, sizes, names) {
  const list = precacheFiles(manifest, files, names)
  const mb = (fs) => +(fs.reduce((t, f) => t + (sizes[f] || 0), 0) / 1e6).toFixed(2)
  return {
    ...manifest,
    totalMB: mb(files.filter((f) => !NOT_SAMPLES.has(f))),
    precacheMB: mb(list),
    precache: list.map(sampleUrl).sort(),
  }
}
