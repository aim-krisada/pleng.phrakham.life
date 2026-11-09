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
// device comes back online, when a new service worker appears or changes state (a deploy) — plus
// at most RETRIES timed re-checks. No polling loop.
//
// It always ENDS (ใบ v3/pleng#164 — the owner saw "กำลังเก็บ… 98%" that never moved after a day of
// deploys): when the timed re-checks run out and it still says "กำลังเก็บ…", the page asks the
// active worker once to fetch whatever is missing ('pleng-fill'); when the worker answers (or
// FILL_WAIT passes) the line turns green or amber. If the worker is still installing, the page
// waits for its state changes, but never longer than GIVE_UP_MS — then amber, which still turns
// green by itself if the files arrive later.
//
// The green line has a ✕ (ใบ v3/pleng#158). Outside the install card it stays until the reader
// taps ✕; then it stays hidden on this device until the saved song list is DIFFERENT from the one
// they closed it on (songs added, fixed or removed — the list is re-saved by itself on every online
// visit, lib/offlineSongs.js). Then it comes back saying what changed. See songPrints / readyNews.
import { ref, computed, watch } from 'vue'
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
// `news` (readyNews below): when the song list changed since the reader closed the green line, the
// green line says it was updated by itself and what changed (a part whose count is 0 is left out).
export function statusText(s, news = null) {
  switch (s && s.state) {
    case 'ready': {
      if (news && news.changed) {
        const parts = ['✓ อัปเดตเพลงให้แล้วอัตโนมัติ']
        if (news.added) parts.push(`เพิ่ม ${news.added} เพลง`)
        if (news.edited) parts.push(`แก้ ${news.edited} เพลง`)
        if (news.removed) parts.push(`ลบ ${news.removed} เพลง`)
        parts.push(`พร้อมใช้แบบไม่มีเน็ต ${s.count} เพลง`, shortDate(s.at))
        return { tone: 'ok', text: parts.join(' · ') }
      }
      return { tone: 'ok', text: `✓ พร้อมใช้แบบไม่มีเน็ตแล้ว · ${s.count} เพลง · ${shortDate(s.at)}` }
    }
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
// ใบ v3/pleng#157 · #158. Amber lines always show, with no ✕: they tell the reader to wait or to
// do something. The green line shows until the reader closes it with ✕ (`closable`); once closed
// it shows again only when the song list changed since (`news.changed`).
export function standaloneLine(text, news = null) {
  if (!text) return null
  if (text.tone === 'wait') return { ...text, closable: false }
  if (!news || !news.closed || news.changed) return { ...text, closable: true }
  return null
}

// ---- "is there new song data?" — a short fingerprint per song (ใบ v3/pleng#158) ----------------
// There is no "last changed" column, so each song gets a short hash of the fields a reader sees.
// Comparing two { id: hash } maps tells how many songs were added, changed or removed.
export const PRINT_FIELDS = ['number', 'title_th', 'title_en', 'content', 'category', 'theme', 'book_refs', 'scripture']

function fnv1a(str) { // 32-bit FNV-1a → base 36 (≤ 7 chars)
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

export function songPrint(row) {
  return fnv1a(JSON.stringify(PRINT_FIELDS.map((f) => (row && row[f] !== undefined ? row[f] : null))))
}

export function songPrints(rows) {
  const out = {}
  for (const r of Array.isArray(rows) ? rows : []) if (r && r.id != null) out[String(r.id)] = songPrint(r)
  return out
}

// { added, edited, removed } between the list the reader closed the line on and the one saved now.
export function diffPrints(before, now) {
  const a = before || {}
  const b = now || {}
  let added = 0
  let edited = 0
  let removed = 0
  for (const id in b) {
    if (!(id in a)) added++
    else if (a[id] !== b[id]) edited++
  }
  for (const id in a) if (!(id in b)) removed++
  return { added, edited, removed }
}

// ---- reading the device (browser only) -----------------------------------------------------------
const MATCH = { ignoreVary: true }

// The fingerprints of the saved list, worked out once per save (the list is ~3.8 MB).
let printsFor = { at: -1, prints: null }
function printsOf(cat) {
  if (printsFor.at !== cat.at) printsFor = { at: cat.at, prints: songPrints(cat.rows) }
  return printsFor.prints
}

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
  const catalog = cat ? { count: cat.rows.length, at: cat.at, prints: printsOf(cat) } : null
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
export const FILL_WAIT = 60000   // how long to wait for the worker's answer to 'pleng-fill'
export const GIVE_UP_MS = 120000 // after the last re-check: the longest the percent may stay up

// Ask the active worker to fetch the files still missing (sw.js 'pleng-fill'). true = asked.
async function askWorkerFill() {
  try {
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : null
    const reg = sw ? await sw.getRegistration() : null
    if (!reg || !reg.active) return false
    reg.active.postMessage({ type: 'pleng-fill' })
    return true
  } catch { return false }
}

// ---- the green line's ✕ — remembered on this device (ใบ v3/pleng#158) ---------------------------
// On ✕ the fingerprints of the saved list are kept as "closed on". The line comes back when the
// saved list differs from them. localStorage may throw (private mode) → hidden for this visit only.
export const READY_ACK_KEY = 'pleng:ready-line-closed-on'
export const savedPrints = ref(null) // fingerprints of the list saved on this device now
function readAck() {
  try {
    const v = JSON.parse(localStorage.getItem(READY_ACK_KEY) || 'null')
    return v && typeof v === 'object' ? v : null
  } catch { return null }
}
const closedOn = ref(readAck())
const closedThisVisit = ref(false) // ✕ before the list's fingerprints were known

export function dismissReadyLine() {
  const now = savedPrints.value
  if (!now) { closedThisVisit.value = true; return }
  closedOn.value = now
  try { localStorage.setItem(READY_ACK_KEY, JSON.stringify(now)) } catch { /* private mode — this visit only */ }
}

// { closed, changed, added, edited, removed } — never closed → closed: false.
export const readyNews = computed(() => {
  if (closedOn.value && savedPrints.value) {
    const d = diffPrints(closedOn.value, savedPrints.value)
    return { closed: true, changed: d.added + d.edited + d.removed > 0, ...d }
  }
  const closed = !!closedOn.value || closedThisVisit.value
  return { closed, changed: false, added: 0, edited: 0, removed: 0 }
})

let started = false
let retryIdx = 0
let retryTimer = null
let running = null
let again = false
let persistAsked = false
let persistDenied = false
let probe = probeDevice
let askFill = askWorkerFill
let fillAsked = false   // 'pleng-fill' sent on this round
let fillDone = false    // the worker answered it (or FILL_WAIT passed / it could not be asked)
let gaveUp = false      // GIVE_UP_MS passed after the last re-check
let fillTimer = null
let giveUpTimer = null

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
      // The timed re-checks are used up and the worker has already tried to fetch what is missing
      // (or we waited long enough) → whatever is still missing will not arrive on this visit.
      const settled = retryIdx >= RETRIES.length && (fillDone || gaveUp)
      let s = offlineState({ ...d, settled, persistDenied, standalone: isStandalone.value })
      if (s.state === 'ready' && !persistAsked) {
        await askPersist()
        s = offlineState({ ...d, settled, persistDenied, standalone: isStandalone.value })
      }
      savedPrints.value = (d.catalog && d.catalog.prints) || null
      offlineStatus.value = s
      scheduleRetry(s, d)
    } while (again)
  })()
  try { await running } finally { running = null }
}

function scheduleRetry(s, d) {
  clearTimeout(retryTimer)
  retryTimer = null
  if (s.state !== 'filling') { clearTimeout(giveUpTimer); giveUpTimer = null; return }
  if (retryIdx < RETRIES.length) {
    retryTimer = setTimeout(() => { retryIdx++; refreshOfflineStatus() }, RETRIES[retryIdx])
    return
  }
  // Re-checks used up, still filling. Never leave the percent up for ever:
  if (!giveUpTimer) giveUpTimer = setTimeout(() => { gaveUp = true; refreshOfflineStatus() }, GIVE_UP_MS)
  // The worker is idle (not installing) → ask it once to fetch what is missing. While it is still
  // installing, its state changes (watchOfflineStatus) bring us back here.
  if (!fillAsked && d && d.swActive && !d.swInstalling) {
    fillAsked = true
    Promise.resolve(askFill()).catch(() => false).then((asked) => {
      if (!asked) { fillDone = true; refreshOfflineStatus(); return }
      clearTimeout(fillTimer)
      fillTimer = setTimeout(() => { fillDone = true; refreshOfflineStatus() }, FILL_WAIT)
    })
  }
}

// A fresh round (back online): re-checks, the top-up and the give-up start again.
function restartRound() {
  retryIdx = 0
  fillAsked = false
  fillDone = false
  gaveUp = false
  clearTimeout(fillTimer)
  clearTimeout(giveUpTimer)
  fillTimer = null
  giveUpTimer = null
}

// sw.js 'pleng-cache' message → look again; its answer to 'pleng-fill' ends the wait.
export function onWorkerMessage(data) {
  if (!data || data.type !== 'pleng-cache') return
  if (data.fill && data.done && fillAsked) { fillDone = true; clearTimeout(fillTimer); fillTimer = null }
  refreshOfflineStatus()
}

// A deploy installs a new worker: re-check when it appears and at each step (installed,
// activated — or redundant, when a newer deploy or a failed install replaced it).
export function followRegistration(reg) {
  if (!reg || typeof reg.addEventListener !== 'function' || reg._plengFollowed) return
  reg._plengFollowed = true
  const follow = (w) => {
    if (w && typeof w.addEventListener === 'function') w.addEventListener('statechange', () => refreshOfflineStatus())
  }
  follow(reg.installing)
  follow(reg.waiting)
  reg.addEventListener('updatefound', () => { follow(reg.installing); refreshOfflineStatus() })
}

// Start once (the first page that shows the line). Re-checks only on real events.
export function watchOfflineStatus() {
  if (started) return
  started = true
  refreshOfflineStatus()
  if (typeof window === 'undefined') return
  const sw = typeof navigator !== 'undefined' && navigator.serviceWorker
  if (sw && typeof sw.addEventListener === 'function') {
    sw.addEventListener('message', (e) => onWorkerMessage(e && e.data))
    sw.addEventListener('controllerchange', () => refreshOfflineStatus())
    // main.js registers on window 'load' — maybe after this runs; `ready` covers a first visit.
    Promise.resolve()
      .then(() => (typeof sw.getRegistration === 'function' ? sw.getRegistration() : null))
      .then((reg) => reg || sw.ready)
      .then((reg) => followRegistration(reg))
      .catch(() => { /* blocked */ })
  }
  window.addEventListener('online', () => { restartRound(); refreshOfflineStatus() })
  window.addEventListener('offline', () => refreshOfflineStatus())
  window.addEventListener('appinstalled', () => { persistAsked = false; refreshOfflineStatus() })
}
// a catalog save finished (or failed) → look again at once
watch([catalogSavedAt, catalogSaveFailed], () => { if (started) refreshOfflineStatus() })

// tests only
export function _resetOfflineStatus(probeFn, fillFn) {
  clearTimeout(retryTimer)
  retryTimer = null
  restartRound()
  askFill = fillFn || askWorkerFill
  started = false
  retryIdx = 0
  running = null
  again = false
  persistAsked = false
  persistDenied = false
  probe = probeFn || probeDevice
  offlineStatus.value = { state: 'none' }
  savedPrints.value = null
  closedOn.value = readAck()
  closedThisVisit.value = false
}
