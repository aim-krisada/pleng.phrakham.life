// Tiny i18n layer (no framework — KISS · P'Aim 22 ก.ค.). One place turns a key into text so no
// Thai string is hard-coded in a component; add a locale = add a file, never a rewrite.
//
// UI language (ไทย/จีน/อังกฤษ) ≠ song-content language. Per-browser, no account (localStorage),
// like the reading-font + Thai-typeface prefs in store.js. Ships Thai; zh/en are REGISTERED (so
// the switcher can show them) but not READY until their dict is added — until then everything
// falls back to Thai, and the switcher offers them as "เร็วๆ นี้".
import { ref } from 'vue'
import th from './th.js'

// Loaded dictionaries — a locale is READY the moment its dict appears here.
const DICTS = { th }
// Everything the switcher may display, in menu order (ไทย default first).
export const LOCALES = [
  { code: 'th', native: 'ไทย' },
  { code: 'zh', native: '中文' },
  { code: 'en', native: 'English' },
]
const DEFAULT = 'th'
const KEY = 'pleng.lang'

export function isReady(code) {
  return Object.prototype.hasOwnProperty.call(DICTS, code)
}

// First-visit language: a saved (ready) choice wins; else the first browser language whose
// dict we actually have; else Thai. Never returns a not-ready code (avoids a half-translated UI).
function detect() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && isReady(saved)) return saved
    const navs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''])
      .map((l) => String(l).toLowerCase())
    for (const l of navs) {
      const code = l.startsWith('th') ? 'th' : l.startsWith('zh') ? 'zh' : l.startsWith('en') ? 'en' : null
      if (code && isReady(code)) return code
    }
  } catch { /* no storage / SSR — fall through to the default */ }
  return DEFAULT
}

export const locale = ref(detect())

function applyLang(code) {
  try { document.documentElement.setAttribute('lang', code) } catch { /* no DOM */ }
}
applyLang(locale.value)

// Walk a dotted key ("list.favTitle") through a dict; undefined if any segment is missing.
function resolve(dict, key) {
  return key.split('.').reduce((o, k) => (o != null && o[k] != null ? o[k] : undefined), dict)
}

// The one translator. Reads locale.value so Vue templates re-render when the language changes.
// Missing in the active dict → fall back to Thai → finally the key itself (never blank).
export function t(key, params) {
  const dict = DICTS[locale.value] || DICTS[DEFAULT]
  let s = resolve(dict, key)
  if (s == null) s = resolve(DICTS[DEFAULT], key)
  if (s == null) return key
  if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`))
  return s
}

export function setLocale(code) {
  if (!isReady(code)) return // not-ready languages are inert (shown as "เร็วๆ นี้" in the UI)
  locale.value = code
  try { localStorage.setItem(KEY, code) } catch { /* ignore */ }
  applyLang(code)
}

// Convenience for components: `const { t } = useI18n()`.
export function useI18n() {
  return { t, locale, setLocale, LOCALES, isReady }
}
