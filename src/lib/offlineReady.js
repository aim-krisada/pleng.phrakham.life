// "พร้อมใช้แบบไม่มีเน็ตแล้ว" — m1.wpa.24.app.02 (ใบ v3/pleng#155).
//
// The home page tells the reader, in one small line, whether this device can open the songs with
// no internet. It may say "ready" ONLY when every piece the offline app needs is really here:
//   1. the service worker (public/sw.js) is active — it is what answers when there is no network;
//   2. every instrument sample in samples/manifest.json `precache` is in the samples cache;
//   3. every built file in asset-manifest.json is in the app cache (the app itself);
//   4. the song catalog is saved in IndexedDB (lib/offlineSongs.js).
// Anything less is "กำลังเก็บ…" with a percent, or — when it cannot finish — a plain amber message
// saying it is not ready and what to do. Never "ready" too early (design figure 7).
//
// Light on the battery: the page counts the caches on load, again when the service worker reports
// progress (sw.js posts `pleng-cache` messages while it fills), when the catalog is saved, when the
// device comes back online — plus at most RETRIES timed re-checks. No polling loop.
import { ref, watch } from 'vue'
import { readCatalog, catalogSavedAt, catalogSaveFailed } from './offlineSongs.js'
import { isStandalone } from './pwaInstall.js'

// ---- the decision (pure — unit-tested) --------------------------------------------------------
// state: 'none'          — nothing to say (dev build / browser without service workers)
//        'filling'       — still saving; `percent` 0–99
//        'ready'         — all four pieces are here
//        'at-risk'       — all here, but the installed app was refused permanent storage
//        'failed'        — cannot finish (storage full, or the worker finished with files missing)
//        'offline-empty' — no internet and nothing saved yet
export function offlineState(p = {}) {
  const {
    supported = false, online = true, swActive = false,
    samples = { expected: 0, have: 0 }, shell = { expected: 0, have: 0 },
    catalog = null, storageFull = false, settled = false, persistDenied = false, standalone = false,
  } = p
  if (!supported) return { state: 'none' }
  const count = catalog ? catalog.count : 0
  const at = catalog ? catalog.at : 0
  if (!catalog && !online) return { state: 'offline-empty' }
  if (storageFull) return { state: 'failed', reason: 'full', count, at }
  const samplesDone = samples.expected > 0 && samples.have >= samples.expected
  const shellDone = shell.expected > 0 && shell.have >= shell.expected
  if (swActive && samplesDone && shellDone && catalog) {
    return { state: persistDenied && standalone ? 'at-risk' : 'ready', count, at }
  }
  // Offline with only part of it saved, or the worker finished and files are still missing.
  if (!online || settled) return { state: 'failed', reason: 'incomplete', count, at }
  // percent of files saved (the catalog counts as one file; the worker being active as one)
  const total = samples.expected + shell.expected + 2
  const have = Math.min(samples.have, samples.expected) + Math.min(shell.have, shell.expected)
    + (catalog ? 1 : 0) + (swActive ? 1 : 0)
  const percent = total > 2 ? Math.min(99, Math.floor((have / total) * 100)) : 0
  return { state: 'filling', percent, count, at }
}

// "8 พ.ย." — the day the songs were last saved (design figure 8).
export function shortDate(ms) {
  if (!ms) return ''
  try { return new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) } catch { return '' }
}

// The words on the line. `tone`: 'ok' (green) | 'wait' (amber).
export function statusText(s) {
  switch (s && s.state) {
    case 'ready':
      return { tone: 'ok', text: `✓ พร้อมใช้แบบไม่มีเน็ตแล้ว · ${s.count} เพลง · ${shortDate(s.at)}` }
    case 'filling':
      return { tone: 'wait', text: `กำลังเก็บเพลงไว้ในเครื่อง… ${s.percent}%` }
    case 'at-risk':
      return { tone: 'wait', text: `เก็บ ${s.count} เพลงไว้แล้ว แต่เครื่องอาจลบทิ้งเองถ้าที่เก็บเหลือน้อย · เปิดแอพตอนมีเน็ตบ้าง เพลงจะกลับมาครบ` }
    case 'failed':
      return s.reason === 'full'
        ? { tone: 'wait', text: 'ยังไม่พร้อมใช้แบบไม่มีเน็ต · ที่เก็บในเครื่องเต็ม ลบรูปหรือแอพที่ไม่ใช้ แล้วเปิดเว็บนี้อีกครั้งตอนมีเน็ต' }
        : { tone: 'wait', text: 'ยังไม่พร้อมใช้แบบไม่มีเน็ต · เก็บเพลงไว้ไม่ครบ เปิดเว็บนี้อีกครั้งตอนมีเน็ต' }
    case 'offline-empty':
      return { tone: 'wait', text: 'ยังไม่ได้เก็บเพลงไว้ในเครื่อง · ต่อเน็ตแล้วเปิดเว็บนี้ 1 ครั้ง เพลงจะใช้ได้แม้ไม่มีเน็ต' }
    default:
      return null
  }
}

// What the home page shows OUTSIDE the install card (card closed with ✕, or app installed) —
// ใบ v3/pleng#157. Amber lines always show: they tell the reader to wait or to do something.
// The green line shows only as a short "just finished" message (`flash`, see readyFlash below);
// on a visit where it was ready from the start there is nothing new to say, so nothing shows.
export function standaloneLine(text, flash = false) {
  if (!text) return null
  if (text.tone === 'wait') return text
  return flash ? text : null
}

// ---- reading the device (browser only) -----------------------------------------------------------
const MATCH = { ignoreVary: true }

// Same naming as sw.js: the cache names carry the scope the worker serves ('' at the site root).
export function cacheNames(scopePath) {
  const root = scopePath || '/'
  const suffix = root === '/' ? '' : '--' + root.replace(/^\/|\/$/g, '').replace(/\//g, '-')
  return { root, app: 'pleng-app-v1' + suffix, samples: 'pleng-samples-v1' + suffix }
}

async function readJson(url) {
  try {
    const hit = await caches.match(url, MATCH)
    if (hit) return await hit.json()
  } catch { /* fall through */ }
  try {
    const r = await fetch(url, { cache: 'no-cache' })
    if (r.ok) return await r.json()
  } catch { /* offline */ }
  return null
}

async function pathsIn(name) {
  try {
    if (!(await caches.has(name))) return new Set()
    const keys = await (await caches.open(name)).keys()
    return new Set(keys.map((r) => new URL(r.url).pathname))
  } catch { return new Set() }
}

function countHave(list, have) {
  let n = 0
  for (const u of list) {
    try { if (have.has(new URL(u, location.origin).pathname)) n++ } catch { /* bad entry */ }
  }
  return n
}

// Everything offlineState() needs, read from this device.
export async function probeDevice() {
  const online = typeof navigator === 'undefined' || navigator.onLine !== false
  const base = { supported: false, online }
  if (!import.meta.env.PROD) return base // sw.js is registered in production builds only (main.js)
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof caches === 'undefined') return base
  const cat = await readCatalog()
  const catalog = cat ? { count: cat.rows.length, at: cat.at } : null
  let reg = null
  try { reg = await navigator.serviceWorker.getRegistration() } catch { /* blocked */ }
  const scope = reg ? new URL(reg.scope).pathname : new URL('.', location.href).pathname
  const names = cacheNames(scope)
  const sm = await readJson(names.root + 'samples/manifest.json')
  const rebase = (u) => (names.root === '/' ? u : String(u).replace(/^\/samples\//, names.root + 'samples/'))
  const sampleList = sm && Array.isArray(sm.precache) ? sm.precache.map(rebase) : []
  const am = await readJson(names.root + 'asset-manifest.json')
  const shellList = (Array.isArray(am) ? am : []).map((u) => (names.root === '/' ? u : String(u).replace(/^\//, names.root)))
  const [sHave, aHave] = await Promise.all([pathsIn(names.samples), pathsIn(names.app)])
  let storageFull = false
  try {
    const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null
    if (est && est.quota && est.usage / est.quota > 0.98) storageFull = true
  } catch { /* no estimate */ }
  return {
    supported: true,
    online,
    swActive: !!(reg && reg.active),
    swInstalling: !!(reg && (reg.installing || reg.waiting)),
    samples: { expected: sampleList.length, have: countHave(sampleList, sHave) },
    shell: { expected: shellList.length, have: countHave(shellList, aHave) },
    catalog,
    storageFull: storageFull || catalogSaveFailed.value,
  }
}

// ---- the live status (one checker for the whole page) -------------------------------------------
export const offlineStatus = ref({ state: 'none' })
export const RETRIES = [3000, 8000, 20000, 45000]

// The green "just finished" flash (ใบ v3/pleng#157): true only when THIS visit saw the line be
// something other than ready (e.g. filling) and then turn ready; it goes false by itself after
// READY_FLASH_MS. 'none' (not checked yet / no service worker) does not count as "not ready".
export const READY_FLASH_MS = 8000
export const readyFlash = ref(false)
let seenNotReady = false
let flashTimer = null

export function noteOfflineState(state) {
  if (!state || state === 'none') return
  if (state === 'ready') {
    if (!seenNotReady) return
    seenNotReady = false
    readyFlash.value = true
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flashTimer = null; readyFlash.value = false }, READY_FLASH_MS)
    return
  }
  seenNotReady = true
  clearTimeout(flashTimer)
  flashTimer = null
  readyFlash.value = false
}
watch(offlineStatus, (s) => noteOfflineState(s && s.state), { flush: 'sync' })

let started = false
let retryIdx = 0
let retryTimer = null
let running = null
let again = false
let persistAsked = false
let persistDenied = false
let probe = probeDevice

async function askPersist() {
  if (persistAsked) return
  persistAsked = true
  try {
    const st = typeof navigator !== 'undefined' ? navigator.storage : null
    if (!st || typeof st.persist !== 'function') return // old browser — nothing to ask
    if (typeof st.persisted === 'function' && await st.persisted()) return
    persistDenied = !(await st.persist())
  } catch { /* refused to answer — treat as unknown, not denied */ }
}

export async function refreshOfflineStatus() {
  if (running) { again = true; return running }
  running = (async () => {
    do {
      again = false
      const d = await probe()
      // The worker finished installing and the timed re-checks are used up → whatever is still
      // missing will not arrive by itself on this visit.
      const settled = retryIdx >= RETRIES.length && d.swActive && !d.swInstalling
      let s = offlineState({ ...d, settled, persistDenied, standalone: isStandalone.value })
      if (s.state === 'ready' && !persistAsked) {
        await askPersist()
        s = offlineState({ ...d, settled, persistDenied, standalone: isStandalone.value })
      }
      offlineStatus.value = s
      scheduleRetry(s)
    } while (again)
  })()
  try { await running } finally { running = null }
}

function scheduleRetry(s) {
  clearTimeout(retryTimer)
  retryTimer = null
  if (s.state !== 'filling' || retryIdx >= RETRIES.length) return
  retryTimer = setTimeout(() => { retryIdx++; refreshOfflineStatus() }, RETRIES[retryIdx])
}

// Start once (the first page that shows the line). Re-checks only on real events.
export function watchOfflineStatus() {
  if (started) return
  started = true
  refreshOfflineStatus()
  if (typeof window === 'undefined') return
  const sw = typeof navigator !== 'undefined' && navigator.serviceWorker
  if (sw && typeof sw.addEventListener === 'function') {
    sw.addEventListener('message', (e) => {
      if (e && e.data && e.data.type === 'pleng-cache') refreshOfflineStatus()
    })
    sw.addEventListener('controllerchange', () => refreshOfflineStatus())
  }
  window.addEventListener('online', () => { retryIdx = 0; refreshOfflineStatus() })
  window.addEventListener('offline', () => refreshOfflineStatus())
  window.addEventListener('appinstalled', () => { persistAsked = false; refreshOfflineStatus() })
}
// a catalog save finished (or failed) → look again at once
watch([catalogSavedAt, catalogSaveFailed], () => { if (started) refreshOfflineStatus() })

// tests only
export function _resetOfflineStatus(probeFn) {
  clearTimeout(retryTimer)
  retryTimer = null
  started = false
  retryIdx = 0
  running = null
  again = false
  persistAsked = false
  persistDenied = false
  probe = probeFn || probeDevice
  offlineStatus.value = { state: 'none' }
  clearTimeout(flashTimer)
  flashTimer = null
  seenNotReady = false
  readyFlash.value = false
}
