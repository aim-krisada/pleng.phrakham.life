// ใบ v3/pleng#154 — count how often each song is opened, and by how many people (Google Analytics 4).
//
// SHIPPED ASLEEP. Until GA_ID below holds a real code, nothing here runs: no bar, no script, no request
// to Google. Waking it up = change that ONE line.
//
// Rules (Thai PDPA — consent first):
//   · nothing is loaded from Google until the visitor presses ยอมรับ on the bar (ConsentBar.vue);
//   · the choice is kept on this device (localStorage `pleng.analyticsConsent`) and can be changed on
//     เกี่ยวกับเรา (About.vue);
//   · the router is hash mode and GA4 does not count hash changes, so every page view is sent by hand
//     (trackPage) with ONLY its title, a real-looking address and its path — no name, email, login
//     state or song content ever goes out;
//   · offline or with an ad blocker the script simply never arrives — gtag() then only queues into
//     window.dataLayer, so nothing on screen breaks.
import { ref, computed } from 'vue'
import { songName } from './songName.js'
import { categoryName } from './bookshelf.js'

// ▼▼▼ put the G-XXXX code here (Google Analytics → Admin → Data streams → Measurement ID) ▼▼▼
export const GA_ID = ''
// ▲▲▲ leave it '' and the whole feature stays off ▲▲▲

const ID_RE = /^G-[A-Z0-9]+$/
export function validId(id) {
  return typeof id === 'string' && ID_RE.test(id)
}

// the id in use — a ref only so the tests can switch it; the site reads GA_ID
const gaId = ref(GA_ID)
export const analyticsOn = computed(() => validId(gaId.value))

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

// ---- page views ---------------------------------------------------------------------------------------
// The page on screen, and the last page actually sent — one view per page open: a mode switch on a song
// (?mode=edit) or a second call for the same page sends nothing more.
let current = null
let sentPath = null

// '/song/abc?mode=edit' → '/song/abc'
function cleanPath(path) {
  const p = String(path || '/').split(/[?#]/)[0]
  return p.startsWith('/') ? p : '/' + p
}

export function trackPage(path, title) {
  const p = cleanPath(path)
  if (current?.path !== p) sentPath = null
  current = { path: p, title: String(title || '') }
  flush()
}

function flush() {
  if (!current || !analyticsOn.value || consent.value !== 'granted' || !started) return
  if (sentPath === current.path) return
  sentPath = current.path
  try {
    gtag('event', 'page_view', {
      page_title: current.title,
      page_location: location.origin + current.path,
      page_path: current.path,
    })
  } catch { /* never let counting break a page */ }
}

// ---- page names ---------------------------------------------------------------------------------------
const PAGE_NAMES = {
  '/': 'รายการเพลง',
  '/guide': 'คู่มือใช้งานโปรแกรม',
  '/notation': 'คู่มือทำเพลง',
  '/about': 'เกี่ยวกับเรา',
  '/studio': 'เพลงใหม่',
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

// tests only
export function _resetForTest({ id = GA_ID } = {}) {
  gaId.value = id
  consent.value = readConsent()
  started = false
  current = null
  sentPath = null
}
