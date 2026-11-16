// ใบ v3/pleng#154 — count how often each song is opened, and by how many people (Google Analytics 4).
// ใบ v3/pleng#164–#174 (หน้าสถิติ) — switched ON with the main site's code, plus the few events the stats
// page needs: web or installed app on every hit · searches · how a song was reached · buttons used ·
// dead ends · key changes. The stats page itself reads them back later; this file only sends.
//
// Rules (Thai PDPA — consent first):
//   · nothing is loaded from Google until the visitor presses ยอมรับ on the bar (ConsentBar.vue);
//   · the choice is kept on this device (localStorage `pleng.analyticsConsent`) and can be changed on
//     เกี่ยวกับเรา (About.vue);
//   · the router is hash mode and GA4 does not count hash changes, so every page view is sent by hand
//     (trackPage) with ONLY its title, a real-looking address and its path — no name, email, login
//     state or song content ever goes out; a search term is cut to 40 characters;
//   · offline or with an ad blocker the script simply never arrives — gtag() then only queues into
//     window.dataLayer, so nothing on screen breaks;
//   · it runs only on the live site (pleng.phrakham.life): the code is shared with phrakham.life, and a
//     dev server or a preview must never add to the real numbers.
import { ref, computed } from 'vue'
import { songName } from './songName.js'
import { categoryName } from './bookshelf.js'

// The main site's code (phrakham.life) — one shared property, split by hostname on the stats page
// (พี่เอม 16 พ.ย. 2569). Empty = the whole feature off.
export const GA_ID = 'G-W3XP4T2FFE'
export const LIVE_HOST = 'pleng.phrakham.life'

const ID_RE = /^G-[A-Z0-9]+$/
export function validId(id) {
  return typeof id === 'string' && ID_RE.test(id)
}
function onLiveHost() {
  try { return location.hostname === LIVE_HOST } catch { return false }
}

// the id in use — refs only so the tests can switch them; the site reads GA_ID on the live host
const gaId = ref(GA_ID)
const anyHost = ref(false)
export const analyticsOn = computed(() => validId(gaId.value) && (anyHost.value || onLiveHost()))

// ---- the visitor's choice -------------------------------------------------------------------------
const CONSENT_KEY = 'pleng.analyticsConsent'
const CHOICES = ['granted', 'denied']
function readConsent() {
  try { const v = localStorage.getItem(CONSENT_KEY); if (CHOICES.includes(v)) return v } catch { /* storage blocked */ }
  return null
}
// null = not answered yet · 'granted' · 'denied'
export const consent = ref(readConsent())
// the bar shows only while the feature is on and the visitor has not answered
export const askConsent = computed(() => analyticsOn.value && consent.value == null)

export function setConsent(choice) {
  if (!CHOICES.includes(choice)) return
  consent.value = choice
  try { localStorage.setItem(CONSENT_KEY, choice) } catch { /* storage blocked — the choice lasts this visit */ }
  if (!analyticsOn.value) return
  if (choice === 'granted') start()
  else stop()
}

// ---- Google's script --------------------------------------------------------------------------------
const SCRIPT_SRC = 'https://www.googletagmanager.com/gtag/js?id='
let started = false

function gtag() {
  // the standard snippet: Google's script reads this queue when (if) it arrives
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(arguments)
}

function start() {
  const id = gaId.value
  window['ga-disable-' + id] = false
  if (started) {
    gtag('consent', 'update', { analytics_storage: 'granted' })
  } else {
    started = true
    window.gtag = window.gtag || gtag
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
    gtag('js', new Date())
    gtag('config', id, {
      send_page_view: false, // we send each page ourselves (hash router)
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    })
    try {
      const s = document.createElement('script')
      s.async = true
      s.src = SCRIPT_SRC + encodeURIComponent(id)
      s.dataset.ga = '1'
      s.onerror = () => { /* blocked or offline — nothing to do, gtag() keeps queueing quietly */ }
      document.head.appendChild(s)
    } catch { /* no DOM — nothing to load */ }
    watchPrint()
  }
  flush()
}

function stop() {
  const id = gaId.value
  window['ga-disable-' + id] = true
  if (started) gtag('consent', 'update', { analytics_storage: 'denied' })
  sentPath = null
  removeGaCookies()
}

// _ga and _ga_<stream> live on the site's domain (or a parent of it) — clear every variant
function removeGaCookies() {
  try {
    const names = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^_ga/.test(n))
    const host = location.hostname
    const parts = host.split('.')
    const domains = ['']
    for (let i = 0; i < parts.length - 1; i++) domains.push('; domain=.' + parts.slice(i).join('.'))
    for (const n of names) {
      for (const d of domains) document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`
    }
  } catch { /* no cookies to clear */ }
}

const counting = () => analyticsOn.value && consent.value === 'granted' && started

// ---- web or installed app (ใบ v3/pleng#164, พี่เอม 16 พ.ย. 2569) -----------------------------------------
// An installed app opens full screen, with no address bar. That works on iPhone too, which never sends
// the browser's "installed" event — so the count is not low on iPhones.
export function displayMode() {
  try {
    if (window.navigator?.standalone === true) return 'app'
    const mm = window.matchMedia
    if (mm && (mm('(display-mode: standalone)').matches || mm('(display-mode: fullscreen)').matches)) return 'app'
  } catch { /* no window — a browser tab */ }
  return 'web'
}

// ---- page views ---------------------------------------------------------------------------------------
// The page on screen, and the last page actually sent — one view per page open: a mode switch on a song
// (?mode=edit) or a second call for the same page sends nothing more.
let current = null
let sentPath = null
let pagesSeen = 0 // pages opened in this visit — the first one came from outside (a link, a bookmark)
let openFrom = null // how the next song page is being reached, set by the song list just before it opens
let doneOnPage = new Set() // feature / dead-end / key events already sent for the page on screen

// '/song/abc?mode=edit' → '/song/abc'
function cleanPath(path) {
  const p = String(path || '/').split(/[?#]/)[0]
  return p.startsWith('/') ? p : '/' + p
}

export function trackPage(path, title) {
  const p = cleanPath(path)
  if (current?.path !== p) {
    sentPath = null
    doneOnPage = new Set()
    current = { path: p, title: String(title || ''), from: isSongPath(p) ? songOpenFrom() : null }
    pagesSeen++ // counted whether or not the visitor has answered yet — "first page" means first page
  } else {
    current = { ...current, title: String(title || '') }
  }
  flush()
}

// ใบ v3/pleng#173 — how people reach a song: by its number, by name or words, from a book, from their
// starred songs, or from a link someone sent (the first page of a visit). Anything else = 'other'.
export const OPEN_FROM = ['number', 'text', 'book', 'fav', 'link', 'other']
export function noteOpenFrom(src) {
  if (OPEN_FROM.includes(src)) openFrom = src
}
function songOpenFrom() {
  const src = openFrom || (pagesSeen === 0 ? 'link' : 'other')
  openFrom = null
  return src
}

function flush() {
  if (!current || !counting()) return
  if (sentPath === current.path) return
  sentPath = current.path
  const params = {
    page_title: current.title,
    page_location: location.origin + current.path,
    page_path: current.path,
    display_mode: displayMode(),
  }
  if (current.from) params.open_from = current.from
  try {
    gtag('event', 'page_view', params)
  } catch { /* never let counting break a page */ }
}

// ---- events (ใบ v3/pleng#167 ถึง #172) ----------------------------------------------------------------
// Every event carries the page it happened on and web-or-app. Nothing is queued before ยอมรับ.
export function trackEvent(name, params = {}) {
  if (!counting()) return false
  try {
    gtag('event', name, {
      ...params,
      page_location: location.origin + (current?.path || '/'),
      page_path: current?.path || '/',
      display_mode: displayMode(),
    })
  } catch { /* never let counting break a page */ }
  return true
}

const songIdOfPage = () => (current && isSongPath(current.path) ? current.path.slice('/song/'.length) : '')

// once per page open for each kind — the stats page counts "song opens that used X", not clicks
function oncePerPage(key, send) {
  if (!counting() || !current || doneOnPage.has(key)) return false
  doneOnPage.add(key)
  return send()
}

// ใบ v3/pleng#171 — which buttons a song open used
export const FEATURES = ['sheet', 'play', 'tempo', 'section', 'key', 'chord_system', 'print']
export function trackFeature(feature) {
  if (!FEATURES.includes(feature)) return false
  return oncePerPage('f:' + feature, () => trackEvent('feature_use', { feature, song_id: songIdOfPage() }))
}

// ใบ v3/pleng#172 — opened a face the song cannot fill yet
export const DEAD_ENDS = ['sing_no_notes', 'sheet_no_chords']
export function trackDeadEnd(kind) {
  if (!DEAD_ENDS.includes(kind)) return false
  return oncePerPage('d:' + kind, () => trackEvent('dead_end', { dead_end: kind, song_id: songIdOfPage() }))
}

// ใบ v3/pleng#168 — the key a song was moved to (once per key per song open)
export function trackKeyChange(from, to) {
  if (!to || from === to) return false
  trackFeature('key')
  return oncePerPage('k:' + to, () => trackEvent('key_change', { song_id: songIdOfPage(), key_from: String(from || ''), key_to: String(to) }))
}

// ใบ v3/pleng#167 · #169 — searches. The term is tidied (spaces, upper/lower case) and cut to 40 characters.
export function searchTerm(q) {
  return String(q || '').trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 40)
}
let lastSearch = ''
export function trackSearch(q, found) {
  const term = searchTerm(q)
  if (!term || term === lastSearch) return false
  if (!trackEvent('search', { search_term: term, search_found: found > 0 ? 'yes' : 'no' })) return false
  lastSearch = term
  return true
}
export function trackSearchSelect(q) {
  const term = searchTerm(q)
  if (!term) return false
  return trackEvent('search_select', { search_term: term })
}

// Every way of printing (our button, the sheet's button, Ctrl+P) ends in the browser's print.
let printWatched = false
function watchPrint() {
  if (printWatched) return
  printWatched = true
  try { window.addEventListener('beforeprint', () => trackFeature('print')) } catch { /* no window */ }
}

// ---- the song's parts — for the dead ends ------------------------------------------------------------
// v1 lines and v2 stanzas both keep `note` and `chord` on their segments, so one walk finds both.
export function songParts(content) {
  const out = { notes: false, chords: false }
  const seen = new Set()
  const walk = (v) => {
    if (!v || typeof v !== 'object' || seen.has(v) || (out.notes && out.chords)) return
    seen.add(v)
    if (Array.isArray(v)) { v.forEach(walk); return }
    if (typeof v.note === 'string' && /[1-7]/.test(v.note)) out.notes = true
    if (typeof v.chord === 'string' && v.chord.trim()) out.chords = true
    for (const k in v) if (v[k] && typeof v[k] === 'object') walk(v[k])
  }
  walk(content)
  return out
}

// ---- page names ---------------------------------------------------------------------------------------
const PAGE_NAMES = {
  '/': 'รายการเพลง',
  '/guide': 'คู่มือใช้งานโปรแกรม',
  '/notation': 'คู่มือทำเพลง',
  '/about': 'เกี่ยวกับเรา',
  '/studio': 'เพลงใหม่',
  '/stats': 'สถิติ',
}
export function pageTitle(path) {
  return PAGE_NAMES[cleanPath(path)] || 'เพลง.พระคำ.ชีวิต'
}

// A song page: the book first, because song numbers repeat across books — "เล่มใหญ่ · 12. ชื่อเพลง".
export function songPageTitle(song) {
  if (!song) return 'ไม่พบเพลง'
  const book = categoryName(song.category)
  const name = songName(song)
  return book ? `${book} · ${name}` : name
}

export function isSongPath(path) {
  return /^\/song\//.test(cleanPath(path))
}

// Wire every non-song page to the router; song pages are sent by Studio.vue once the song has loaded.
export function installPageTracking(router) {
  router.afterEach((to) => {
    if (!isSongPath(to.path)) trackPage(to.path, pageTitle(to.path))
  })
  // a visitor who said yes before: load at startup
  if (analyticsOn.value && consent.value === 'granted') start()
}

// tests only — `anyHost` lets the code run under the test runner's localhost
export function _resetForTest({ id = GA_ID, host = true } = {}) {
  gaId.value = id
  anyHost.value = host
  consent.value = readConsent()
  started = false
  current = null
  sentPath = null
  pagesSeen = 0
  openFrom = null
  doneOnPage = new Set()
  lastSearch = ''
}
