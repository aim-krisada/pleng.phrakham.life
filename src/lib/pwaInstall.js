/* pwaInstall.js — the ONE install logic behind every "ติดตั้งแอพ" button (ใบ v3/pleng#156).
 *
 * WHY THIS FILE EXISTS
 *   pleng already ships a full PWA (public/site.webmanifest + public/sw.js precache the
 *   samples for offline; registered in main.js). What was missing is a VISIBLE way to install
 *   that works the same on every device. The home page card (InstallCard.vue) and the ☰ drawer
 *   row (InstallAppTool.vue) both call startInstall(); this module decides what one tap does:
 *
 *     1. in-app browsers (LINE · Facebook · Messenger · Instagram) cannot install at all →
 *        a sheet that sends the page to the real browser (LINE: ?openExternalBrowser=1 ·
 *        Android Meta apps: a Chrome intent:// link · iOS Meta apps: text steps only).
 *     2. the browser gave us beforeinstallprompt → its own install dialog, at once.
 *     3. no such event → a sheet of numbered steps (max 3) for THIS browser:
 *        iOS Safari · iOS Chrome/Edge/Firefox · Android (Samsung, Firefox, Chrome before its
 *        engagement check) · anything else (generic).
 *   When beforeinstallprompt arrives later, the same button turns into step 2 by itself,
 *   because the decision is made at tap time, never cached.
 *
 *   Design: install-design.html (owner-approved 8 พ.ย. 2569). Thai menu labels of each
 *   browser come from the browsers' docs — they still need checking on real phones.
 *
 * WHY A MODULE, NOT COMPONENT-LOCAL STATE
 *   `beforeinstallprompt` fires ONCE, early, on window — often before any Vue component
 *   mounts. main.js imports this module at startup, so the listener is registered before
 *   createApp().mount() and the captured event survives until a button is tapped.
 */
import { ref } from 'vue'

// Android/Chrome/Edge/desktop captured a beforeinstallprompt we can replay via a button.
export const canInstall = ref(false)
// The app is running as an installed PWA (Android/desktop standalone, or iOS home-screen).
export const isStandalone = ref(detectStandalone())

// The stashed BeforeInstallPromptEvent — replayed once when the user taps "ติดตั้งแอพ".
let deferredPrompt = null

function detectStandalone() {
  if (typeof window === 'undefined') return false
  const mm = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches
  // iOS Safari doesn't support the display-mode media query; it exposes navigator.standalone.
  const iosStandalone = window.navigator && window.navigator.standalone === true
  return Boolean(mm || iosStandalone)
}

// ---- which browser is this? (pure — unit-tested with real user-agent strings) ----------------
// Returns { inApp: 'line'|'meta'|null, app, ios, ipad, android, browser, safariMajor }.
//   browser: 'safari' | 'chrome-ios' | 'edge-ios' | 'firefox-ios' | 'samsung' | 'firefox'
//            | 'chrome' | 'other'
export function browserInfo(ua = '', nav = {}) {
  const s = String(ua || '')
  // iPadOS 13+ reports itself as a Mac — a Mac with a touch screen is an iPad.
  const ipad = /iPad/.test(s) || (/Macintosh/.test(s) && Number(nav.maxTouchPoints) > 1)
  const ios = ipad || /iPhone|iPod/.test(s)
  const android = !ios && /Android/i.test(s)
  let inApp = null
  let app = ''
  if (/\bLine\//.test(s)) { inApp = 'line'; app = 'LINE' }
  else if (/Instagram/.test(s)) { inApp = 'meta'; app = 'Instagram' }
  else if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A|MessengerForiOS|Orca-Android/.test(s)) {
    inApp = 'meta'
    app = /Messenger|Orca/.test(s) ? 'Messenger' : 'Facebook'
  }
  let browser = 'other'
  if (ios) {
    if (/CriOS\//.test(s)) browser = 'chrome-ios'
    else if (/EdgiOS\//.test(s)) browser = 'edge-ios'
    else if (/FxiOS\//.test(s)) browser = 'firefox-ios'
    else if (/Version\/[\d.]+.*Safari\//.test(s) && !/OPiOS|GSA\/|YaBrowser|DuckDuckGo/.test(s)) browser = 'safari'
  } else if (android) {
    if (/SamsungBrowser\//.test(s)) browser = 'samsung'
    else if (/Firefox\//.test(s)) browser = 'firefox'
    else if (/Chrome\//.test(s)) browser = 'chrome' // Chrome, Edge, Opera… all have ⋮ and an install item
  }
  const m = /Version\/(\d+)/.exec(s)
  const safariMajor = browser === 'safari' && m ? Number(m[1]) : 0
  return { inApp, app, ios, ipad, android, browser, safariMajor }
}

// ---- links that leave an in-app browser ----------------------------------------------------
// LINE opens a link in the phone's real browser when the URL carries openExternalBrowser=1.
// It must go in the query BEFORE the '#': the hash is the page inside the site (hash router),
// so it is kept exactly as it was. URL() always writes search before hash.
export const LINE_PARAM = 'openExternalBrowser'
export function lineExternalUrl(href) {
  try {
    const u = new URL(href)
    u.searchParams.set(LINE_PARAM, '1')
    return u.toString()
  } catch { return href }
}

// Android only: ask the system to open this page in Chrome. If Chrome is missing, Android falls
// back to browser_fallback_url. Android splits an intent URI at its LAST '#', so the page's own
// hash route can stay inside the data part.
export function chromeIntentUrl(href) {
  try {
    const u = new URL(href)
    return `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${u.protocol.replace(':', '')};`
      + `package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`
  } catch { return '' }
}

// ---- the sheets ------------------------------------------------------------------------------
// A step is a list of parts: plain text { t } or a key the reader looks for on screen { k }
// (drawn as a small box). { icon: 'share' } draws Apple's share glyph inside the key box.
const T = (t) => ({ t })
const K = (k, icon) => (icon ? { k, icon } : { k })

function inAppSheet(b, href) {
  if (b.inApp === 'line') {
    return {
      id: 'line',
      title: 'ติดตั้งจากใน LINE ไม่ได้',
      intro: 'ต้องเปิดเว็บใน Chrome หรือ Safari ก่อน แล้วกด ติดตั้งแอพ อีกครั้ง',
      action: { label: 'เปิดใน Chrome / Safari', href: lineExternalUrl(href) },
      note: b.ios
        ? 'ถ้าไม่เปิด แตะ ⋯ มุมขวาบน แล้วเลือก "เปิดในเบราว์เซอร์"'
        : 'ถ้าไม่เปิด แตะ ⋮ มุมขวาบน แล้วเลือก "เปิดในเบราว์เซอร์"',
      steps: [],
    }
  }
  // Facebook · Messenger · Instagram
  if (b.android) {
    return {
      id: 'meta-android',
      title: `ติดตั้งจากใน ${b.app} ไม่ได้`,
      intro: 'ต้องเปิดเว็บใน Chrome ก่อน แล้วกด ติดตั้งแอพ อีกครั้ง',
      action: { label: 'เปิดใน Chrome', href: chromeIntentUrl(href) },
      note: 'ถ้าไม่เปิด แตะ ⋮ มุมขวาบน แล้วเลือก "เปิดใน Chrome"',
      steps: [],
    }
  }
  // iPhone: a web page cannot hand itself to Safari — only words.
  return {
    id: 'meta-ios',
    title: `ติดตั้งจากใน ${b.app} ไม่ได้`,
    intro: 'ต้องเปิดเว็บใน Safari ก่อน',
    steps: [
      [T('แตะ '), K('⋯'), T(' มุมขวาบนหรือขวาล่าง')],
      [T('แตะ '), K('เปิดใน Safari'), T(' หรือ '), K('เปิดในเบราว์เซอร์')],
      [T('ใน Safari แตะ '), K('ติดตั้งแอพ'), T(' อีกครั้ง')],
    ],
  }
}

function device(b) { return b.ipad ? 'iPad' : 'iPhone' }

function iosSafariSheet(b) {
  // iOS 26 Safari moved แชร์ into the ⋯ button (bottom right on iPhone). Older iPhones and iPads
  // show the share button itself (bottom bar on iPhone, top bar on iPad).
  const step1 = b.safariMajor >= 26 && !b.ipad
    ? [T('แตะ '), K('⋯'), T(' มุมล่างขวา แล้วแตะ '), K('แชร์', 'share')]
    : [T('แตะปุ่มแชร์ '), K('', 'share'), T(b.ipad ? ' ด้านบน' : ' ด้านล่าง')]
  return {
    id: 'ios-safari',
    title: `ติดตั้งบน ${device(b)} · 3 ขั้น`,
    steps: [
      step1,
      [T('เลื่อนลง แตะ '), K('เพิ่มไปยังหน้าจอโฮม')],
      [T('เปิด "เปิดเป็นเว็บแอป" ทิ้งไว้ แล้วแตะ '), K('เพิ่ม')],
    ],
  }
}

const IOS_NAMES = { 'chrome-ios': 'Chrome', 'edge-ios': 'Edge', 'firefox-ios': 'Firefox' }
function iosOtherSheet(b) {
  return {
    id: 'ios-other',
    title: `ติดตั้งจาก ${IOS_NAMES[b.browser]} บน ${device(b)} · 2 ขั้น`,
    steps: [
      [T('แตะ '), K('', 'share'), T(' ปุ่มแชร์ ข้างที่อยู่เว็บด้านบน')],
      [T('แตะ '), K('เพิ่มไปยังหน้าจอโฮม'), T(' แล้วแตะ '), K('เพิ่ม')],
    ],
  }
}

function androidSheet(b) {
  if (b.browser === 'samsung') {
    return {
      id: 'android-samsung',
      title: 'ติดตั้งบน Android · 2 ขั้น',
      steps: [
        [T('แตะเมนู '), K('≡'), T(' มุมล่างขวา')],
        [T('แตะ '), K('เพิ่มหน้าไปยัง'), T(' แล้วแตะ '), K('หน้าจอหลัก')],
      ],
    }
  }
  if (b.browser === 'firefox') {
    return {
      id: 'android-firefox',
      title: 'ติดตั้งบน Android · 2 ขั้น',
      steps: [
        [T('แตะเมนู '), K('⋮'), T(' ของเบราว์เซอร์')],
        [T('แตะ '), K('ติดตั้ง'), T(' หรือ '), K('เพิ่มแอปไปยังหน้าจอหลัก')],
      ],
    }
  }
  return {
    id: 'android',
    title: 'ติดตั้งบน Android · 2 ขั้น',
    steps: [
      [T('แตะเมนู '), K('⋮'), T(' หรือ '), K('≡'), T(' ของเบราว์เซอร์')],
      [T('แตะ '), K('ติดตั้งแอป'), T(' หรือ '), K('เพิ่มไปยังหน้าจอหลัก')],
    ],
  }
}

function genericSheet() {
  return {
    id: 'generic',
    title: 'ติดตั้งเป็นแอพ · 2 ขั้น',
    steps: [
      [T('เปิดเมนูของเบราว์เซอร์ มักเป็นปุ่ม '), K('⋮'), T(' '), K('⋯'), T(' หรือ '), K('≡')],
      [T('เลือก '), K('ติดตั้งแอพ'), T(' หรือ '), K('เพิ่มไปยังหน้าจอหลัก')],
    ],
  }
}

// THE decision — what one tap on "ติดตั้งแอพ" does. Pure, so its order is unit-tested:
//   installed → nothing · in-app → leave-the-app sheet · captured prompt → native dialog ·
//   iOS Safari → iOS Safari steps · iOS Chrome/Edge/Firefox → their steps · Android → Android
//   steps · anything else → generic steps.
export function installPlan({ ua = '', nav = {}, hasPrompt = false, standalone = false, href = '' } = {}) {
  if (standalone) return { kind: 'installed' }
  const b = browserInfo(ua, nav)
  if (b.inApp) return { kind: 'sheet', sheet: inAppSheet(b, href) }
  if (hasPrompt) return { kind: 'native' }
  if (b.ios && b.browser === 'safari') return { kind: 'sheet', sheet: iosSafariSheet(b) }
  if (b.ios && IOS_NAMES[b.browser]) return { kind: 'sheet', sheet: iosOtherSheet(b) }
  if (b.android) return { kind: 'sheet', sheet: androidSheet(b) }
  return { kind: 'sheet', sheet: genericSheet() }
}

// ---- the open sheet (one at a time, shown by InstallSheet.vue in App.vue) --------------------
export const installSheet = ref(null)
let returnFocusEl = null

// Called by every "ติดตั้งแอพ" button. `trigger` = the element focus goes back to when the
// sheet closes. Resolves to what happened: 'accepted' | 'dismissed' | 'sheet' | 'installed'.
export async function startInstall(trigger) {
  const nav = typeof navigator !== 'undefined' ? navigator : {}
  const plan = installPlan({
    ua: nav.userAgent,
    nav,
    hasPrompt: !!deferredPrompt,
    standalone: isStandalone.value,
    href: typeof location !== 'undefined' ? location.href : '',
  })
  if (plan.kind === 'installed') return 'installed'
  if (plan.kind === 'native') {
    const outcome = await promptInstall()
    // Cancel = the card simply stays; no message (design rule 2).
    return outcome || 'dismissed'
  }
  returnFocusEl = trigger || (typeof document !== 'undefined' ? document.activeElement : null)
  installSheet.value = plan.sheet
  return 'sheet'
}

export function closeInstallSheet() {
  installSheet.value = null
  const el = returnFocusEl
  returnFocusEl = null
  if (el && typeof el.focus === 'function' && el.isConnected !== false) {
    try { el.focus() } catch { /* element gone */ }
  }
}

// ---- the home-page card's ✕ — remembered on this device --------------------------------------
const CARD_KEY = 'pleng:install-card-dismissed'
export const installCardDismissed = ref(readFlag(CARD_KEY))
function readFlag(k) {
  try { return localStorage.getItem(k) === '1' } catch { return false }
}
export function dismissInstallCard() {
  installCardDismissed.value = true
  try { localStorage.setItem(CARD_KEY, '1') } catch { /* private mode — hidden for this visit only */ }
}

// Replay the captured prompt. Resolves to 'accepted' | 'dismissed' | null (nothing to show).
export async function promptInstall() {
  if (!deferredPrompt) return null
  const evt = deferredPrompt
  deferredPrompt = null
  canInstall.value = false          // the event is single-use; it won't re-fire this session
  let outcome = null
  try {
    await evt.prompt()
    outcome = (await evt.userChoice)?.outcome ?? null
  } catch { /* user closed the dialog / prompt refused */ }
  return outcome
}

// tests only
export function _setDeferredPrompt(e) { deferredPrompt = e; canInstall.value = !!e }

// ---- Register listeners at module load (earliest possible — see header) ----
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Stop Chrome's own mini-infobar; we drive our own discoverable button instead.
    e.preventDefault()
    deferredPrompt = e
    canInstall.value = !isStandalone.value
  })
  // The user installed (via our button OR the browser's own menu) — retire the affordance.
  window.addEventListener('appinstalled', () => {
    isStandalone.value = true
    canInstall.value = false
    deferredPrompt = null
    installSheet.value = null
  })
  // Launched-into-standalone can flip after install without a reload — keep state in sync.
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(display-mode: standalone)')
    const onChange = (e) => { isStandalone.value = e.matches; if (e.matches) canInstall.value = false }
    if (mq && typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
    else if (mq && typeof mq.addListener === 'function') mq.addListener(onChange) // older Safari
  }
}
