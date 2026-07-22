// Sharing — links, native share, clipboard. NO account, NO PII (mission · EPIC H): a share is
// only a canonical URL the user already holds; nothing is sent to any server, nothing is logged.
//
// Song link = the hash route /#/song/:id (+ optional ?key= to open at a chosen transpose).
// List link = /#/list?d=<encoded> (encoding lives in lib/playlists.js — ids + a user-set name
// only, never anything identifying). buildListUrl just wraps a pre-encoded blob in the route.

// The app's own origin+path (works on both hosts + GitHub Pages subpaths). Everything after the
// '#' is the hash route, so we always rebuild from location, never trust a stored absolute URL.
export function appBase() {
  return window.location.origin + window.location.pathname
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
