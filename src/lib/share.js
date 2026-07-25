// Sharing — links, native share, clipboard. NO account, NO PII (mission · EPIC H): a share is
// only a canonical URL the user already holds; nothing is sent to any server, nothing is logged.
//
// Song link = the hash route /#/song/:id (+ optional ?key= to open at a chosen transpose).
// List link = /#/list?d=<encoded> (encoding lives in lib/playlists.js — ids + a user-set name
// only, never anything identifying). buildListUrl just wraps a pre-encoded blob in the route.

// The public site this app is published to. A shared link/QR must resolve on SOMEONE ELSE'S
// device — so it has to point here, at the real host, NOT at the dev/preview origin
// (127.0.0.1, localhost, a `vite --host` LAN IP), which only means "this machine" and so a
// scanned QR opens the scanning phone itself, not the site (BI-010). Overridable at build time
// for a fork/staging host via VITE_PUBLIC_ORIGIN.
const PUBLIC_ORIGIN =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PUBLIC_ORIGIN) ||
  'https://pleng.phrakham.life'

// True when the current origin is a dev / preview / LAN host — reachable only from the PC running
// the server, never as the public site. These are the origins we must NOT bake into a share link.
function isLocalOrigin(loc) {
  if (loc.protocol === 'file:') return true
  const h = (loc.hostname || '').replace(/^\[|\]$/g, '') // strip IPv6 brackets: [::1] → ::1
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true
  if (h === '127.0.0.1' || h === '0.0.0.0' || h === '::1') return true
  // private LAN ranges handed out by `vite --host` (phone hits e.g. 192.168.x.x:port)
  if (/^10\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  return false
}

// The canonical origin+path to hang the hash route off. Everything after the '#' is the hash
// route, so we always rebuild from here, never trust a stored absolute URL.
//   · on the real host (prod, or the /v2/ sub-path) → use the live origin+path verbatim, so the
//     '/v2/' prefix rides along automatically and survives the eventual root cut-over.
//   · on a dev/preview/LAN origin → swap in the public origin but KEEP the deploy sub-path (from
//     the pathname, which in dev already mirrors vite's base), so the link opens the real site.
export function appBase() {
  const loc = window.location
  // a file:// pathname is a disk path, not a web deploy sub-path — pin it to root
  if (loc.protocol === 'file:') return PUBLIC_ORIGIN + '/'
  // normalise the deploy sub-path: drop a trailing index.html, keep the '/v2/' prefix
  const path = (loc.pathname || '/').replace(/[^/]*\.html?$/i, '') || '/'
  return (isLocalOrigin(loc) ? PUBLIC_ORIGIN : loc.origin) + path
}

export function buildSongUrl(id, key) {
  const base = appBase() + '#/song/' + encodeURIComponent(id)
  return key ? base + '?key=' + encodeURIComponent(key) : base
}

export function buildListUrl(encoded) {
  return appBase() + '#/list?d=' + encoded
}

// Is the OS share sheet available (mobile mostly)? Hosts use this to pick native-share vs our
// own fallback sheet. Guarded for non-DOM/test hosts.
export function canNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

// Copy text to the clipboard; true on success. Falls back to a hidden textarea + execCommand for
// older/insecure contexts where navigator.clipboard is missing.
export async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch { return false }
}

// Fire the OS share sheet. Returns 'shared' | 'cancelled' | 'unavailable'. The caller opens our
// own fallback sheet when this returns 'unavailable' (never auto-copies behind the user's back).
export async function nativeShare({ title, text, url }) {
  if (!canNativeShare()) return 'unavailable'
  try {
    await navigator.share({ title, text, url })
    return 'shared'
  } catch (e) {
    return e && e.name === 'AbortError' ? 'cancelled' : 'unavailable'
  }
}

// Open the user's own mail app with a prefilled message. mailto only — the address is typed by
// the user each time and is NEVER stored/logged (mission hard-constraint). Attachments aren't
// possible via mailto, so the share LINK carries the content in the body.
export function mailtoLink({ to = '', subject, body }) {
  const q = []
  if (subject) q.push('subject=' + encodeURIComponent(subject))
  if (body) q.push('body=' + encodeURIComponent(body))
  return 'mailto:' + encodeURIComponent(to) + (q.length ? '?' + q.join('&') : '')
}
