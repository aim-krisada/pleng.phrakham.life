/* pwaInstall.js — the "ติดตั้งแอพ" affordance state (pwa-install stream).
 *
 * WHY THIS FILE EXISTS
 *   pleng already ships a full PWA (public/site.webmanifest + public/sw.js precache the
 *   samples for offline; registered in main.js). What was MISSING is a VISIBLE way to
 *   install: Android/Chrome hides "Install app" in the ⋮ menu, and iOS Safari needs the
 *   user to do Share → Add to Home Screen by hand. This module owns the small bit of
 *   reactive state the drawer's InstallAppTool reads to surface that affordance. It does
 *   NOT touch the manifest or the service worker — those already work.
 *
 * WHY A MODULE, NOT COMPONENT-LOCAL STATE
 *   `beforeinstallprompt` fires ONCE, early, on window — often before any Vue component
 *   mounts. If we only listened inside a component's onMounted we could miss it. main.js
 *   imports this module at startup, so the listener is registered during the import phase
 *   (before createApp().mount()), and the captured event survives regardless of when the
 *   ☰ drawer is first opened.
 */
import { ref, computed } from 'vue'

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

// iOS Safari has no beforeinstallprompt, so the only path is the manual Share → Add to
// Home Screen. Detect an iOS device on Safari (in-app browsers / Chrome-iOS can't install
// either, and their own share sheet differs — keep the hint to real Safari).
export function isIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOSDevice = /iPad|iPhone|iPod/.test(ua)
    // iPadOS 13+ masquerades as desktop Safari on Mac — disambiguate by touch points.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua)
  return iOSDevice && isSafari
}

// One-time dismissal of the iOS hint, persisted so it doesn't nag on every visit.
const HINT_KEY = 'pleng:ios-install-hint-dismissed'
export const iosHintDismissed = ref(readDismissed())

function readDismissed() {
  try { return localStorage.getItem(HINT_KEY) === '1' } catch { return false }
}
export function dismissIosHint() {
  iosHintDismissed.value = true
  try { localStorage.setItem(HINT_KEY, '1') } catch { /* private mode — hide for this session only */ }
}

// Show the iOS instruction only on an iOS Safari that isn't already installed and where the
// user hasn't dismissed it.
export const showIosHint = computed(() => {
  // Read the reactive refs FIRST so the computed always tracks them. isIOS() reads the UA
  // (static at runtime, non-reactive); if it led the && it would short-circuit before the
  // refs were touched, leaving the computed with no deps and a stale cached value.
  const dismissed = iosHintDismissed.value
  const standalone = isStandalone.value
  return isIOS() && !standalone && !dismissed
})

// Replay the captured prompt. Resolves to 'accepted' | 'dismissed' | null (nothing to show).
export async function promptInstall() {
  if (!deferredPrompt) return null
  const evt = deferredPrompt
  deferredPrompt = null
  canInstall.value = false          // the event is single-use; it won't re-fire this session
  evt.prompt()
  let outcome = null
  try { outcome = (await evt.userChoice)?.outcome ?? null } catch { /* user closed the dialog */ }
  return outcome
}

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
  })
  // Launched-into-standalone can flip after install without a reload — keep state in sync.
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(display-mode: standalone)')
    const onChange = (e) => { isStandalone.value = e.matches; if (e.matches) canInstall.value = false }
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
    else if (typeof mq.addListener === 'function') mq.addListener(onChange) // older Safari
  }
}
