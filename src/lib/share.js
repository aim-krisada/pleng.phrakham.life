// ใบ v3/pleng#151 — ปุ่มแชร์ in the shared top bar, beside 🔍, on every page.
// Pure helpers (no Vue) so the rules below are unit-tested on their own.
//
// Standards followed (links in the ใบ):
//   web.dev "share the website they are on" — use the device's own share sheet
//     (navigator.share); a cancelled sheet (AbortError) is normal, not an error; use the
//     device's own share glyph.
//   NN/g Icon Usability — the share glyph is not universally known, so the word แชร์ is
//     always visible next to it.
//   Fallback when there is no share sheet = copy the link (our pick: the church uses LINE,
//     so a link to paste beats web.dev's "open a social site" fallback).
import { SITE_NAME } from './songName.js'

// What the current page shares, or null = hide the button.
//   /song/:id (ฝึกร้อง · ก่อนพิมพ์ · แก้ไข of a saved song) → the song's ฝึกร้อง page. The query
//     (?mode=edit …) is dropped: the receiver can't edit, and unsaved edits never ride along.
//   /studio (a new song or a draft not yet saved) → null: nobody else can open it yet.
//   any other page → that page.
// `base` = the site root as the browser sees it, e.g. "https://pleng.phrakham.life/".
export function shareTarget(path, song, base) {
  const root = base.endsWith('/') ? base : base + '/'
  const m = /^\/song\/([^/?#]+)/.exec(path || '')
  if (m) {
    const name = (song?.title_th || song?.title_en || '').trim()
    return {
      url: `${root}#/song/${m[1]}`,
      title: name ? `${name} · ${SITE_NAME}` : SITE_NAME,
    }
  }
  if (path === '/studio' || (path || '').startsWith('/studio/')) return null
  if (!path || path === '/') return { url: root, title: SITE_NAME }
  return { url: `${root}#${path}`, title: SITE_NAME }
}

// iPhone · iPad · Mac show Apple's share glyph (box + up-arrow); every other device the
// three joined circles (web.dev: respect the platform's own share icon). iPadOS reports
// itself as "Macintosh", so the Mac test covers it.
export function isApple(nav) {
  const n = nav || {}
  const p = (n.userAgentData && n.userAgentData.platform) || n.platform || ''
  return /mac|iphone|ipad|ipod|ios/i.test(p) || /Macintosh|iPhone|iPad|iPod/.test(n.userAgent || '')
}

// Share the target. Resolves to what happened, so the bar can say so:
//   'shared'  — the share sheet took it
//   'cancel'  — the person closed the sheet (say nothing)
//   'copied'  — no share sheet → the link is on the clipboard
//   'manual'  — could not copy either → show the link so they can copy it by hand
export async function shareLink(target, nav) {
  const n = nav || {}
  // the title rides in `text` too: some share targets drop `title` (web.dev)
  const data = { title: target.title, text: target.title, url: target.url }
  if (typeof n.share === 'function' && (typeof n.canShare !== 'function' || n.canShare(data))) {
    try {
      await n.share(data)
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancel'
      // anything else (blocked, not allowed) → fall through to copying
    }
  }
  try {
    if (!n.clipboard || typeof n.clipboard.writeText !== 'function') throw new Error('no clipboard')
    await n.clipboard.writeText(target.url)
    return 'copied'
  } catch {
    return 'manual'
  }
}
