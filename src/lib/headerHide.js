// ใบ v3/pleng#114 — on a phone the site header steps out of the way while you scroll DOWN through a
// song and comes back as soon as you scroll UP (a "partially persistent" header — Nielsen Norman
// Group, sticky headers; Material 3 top app bar, scroll behaviour). It gives the page back the
// header's 2 rows (~120px) while you read or type, and is one flick away when you need it.
//
// Only below COMPACT_Q (narrower than 1024px) and only on the song pages (App.vue decides where).
// From 1024px the header stays where it is.
// ใบ v3/pleng#118 — this used to be phones only (< 600px). Measured in the editor with its headers
// pinned, the room left to work in was 54% of the screen on a Fold 6 opened (712×884), 46% at
// 768×1024, 50% at 840 and 900 wide, and 30% on the Fold turned sideways (884×712) — the header,
// the edit header, the ท่อน header and the bar cost ~500px at every width under 1024. So every
// width under 1024 now gets the phone's treatment (Android's compact + medium window sizes, plus
// the short "expanded" ones: a Fold turned sideways, a small tablet or browser window).
//
// The header always comes back when
//   • the page is near its top (less than the header's own height scrolled),
//   • focus moves into it (Tab, or a screen reader) — nothing focused may sit hidden,
//   • one of its menus / the ☰ drawer is open,
//   • the screen grows to 1024px or wider, or the page changes.
// A scroll made by the page itself to keep a field in view (lib/focusClear.js) is not a "scroll
// up" by the user: it is marked with markProgrammaticScroll() and does not change anything.
//
// The look lives in styles.css (`html.hdr-hidden .shell-bar` slides up; no slide when the user
// asks for reduced motion). Sticky things under the header read `headerHidden` to pin at 0
// instead of under it (EditorMode's ท่อน header and, from 761px, its edit header), so no gap opens
// and nothing hides under it.
import { ref } from 'vue'

/** a phone: narrower than 600px (Android "compact" window size) */
export const PHONE_Q = '(max-width: 599px)'
/** anything narrower than 1024px: a phone, a Fold (opened or turned sideways), a tablet held
 *  upright, a small window. The header hides, the ท่อน header is one row and the note keypad comes
 *  up only for a note cell below this width (ใบ v3/pleng#118). From 1024px nothing changes. Keep in
 *  step with the `@media (max-width: 1023px)` blocks in EditorMode.vue. */
export const COMPACT_Q = '(max-width: 1023px)'
/** px of scrolling in one direction before the header changes (stops jitter on tiny moves) */
export const HIDE_AFTER = 12
export const SHOW_AFTER = 12
export const HIDDEN_CLASS = 'hdr-hidden'

/** true while the header is slid away (reactive — sticky offsets follow it) */
export const headerHidden = ref(false)

/**
 * One scroll step. Pure: everything it needs comes in, the new state goes out.
 * @param {object} s
 * @param {boolean} s.hidden   header hidden now
 * @param {number}  s.y        scroll position now
 * @param {number}  s.lastY    scroll position at the previous step
 * @param {number}  s.acc      px scrolled so far in the current direction (+ down · − up)
 * @param {number}  s.headerH  the header's height
 * @returns {{ hidden: boolean, acc: number }}
 */
export function scrollStep({ hidden, y, lastY, acc = 0, headerH = 0, hideAfter = HIDE_AFTER, showAfter = SHOW_AFTER }) {
  // near the top the header is part of the page: always shown
  if (y <= Math.max(0, headerH)) return { hidden: false, acc: 0 }
  const d = y - lastY
  if (!d) return { hidden, acc }
  // keep adding while the direction stays the same; a turn starts counting again from 0
  const next = d > 0 ? Math.max(0, acc) + d : Math.min(0, acc) + d
  if (!hidden && next >= hideAfter) return { hidden: true, acc: 0 }
  if (hidden && next <= -showAfter) return { hidden: false, acc: 0 }
  return { hidden, acc: next }
}

let progUntil = 0
/** the next scroll events (for `ms`) were made by the page, not the user: leave the header alone */
export function markProgrammaticScroll(ms = 120) {
  progUntil = Date.now() + ms
}

/**
 * Wire it up once (App.vue). `active()` says whether hiding is allowed on this page right now
 * (song page + phone width); `pinned()` says the header must stay (a menu is open).
 * Returns { update, uninstall }: call update() when active()/pinned() may have changed.
 */
export function installHeaderHide({ active, pinned = () => false, doc = document, win = window } = {}) {
  let lastY = win.scrollY || 0
  let acc = 0
  const root = doc.documentElement
  const header = () => doc.querySelector('.shell-bar')
  const set = (h) => {
    if (headerHidden.value !== h) headerHidden.value = h
    root.classList.toggle(HIDDEN_CLASS, h)
  }
  const allowed = () => !!active() && !pinned() && !header()?.contains(doc.activeElement)
  function onScroll() {
    const y = win.scrollY || 0
    if (!allowed()) { lastY = y; acc = 0; set(false); return }
    if (Date.now() < progUntil) { lastY = y; acc = 0; return }
    const s = scrollStep({ hidden: headerHidden.value, y, lastY, acc, headerH: header()?.offsetHeight || 0 })
    lastY = y
    acc = s.acc
    set(s.hidden)
  }
  // focus inside the header (Tab · screen reader) brings it back at once
  function onFocusIn(e) { if (headerHidden.value && header()?.contains(e.target)) set(false) }
  function update() { if (!allowed()) set(false); lastY = win.scrollY || 0; acc = 0 }
  win.addEventListener('scroll', onScroll, { passive: true })
  win.addEventListener('resize', update)
  doc.addEventListener('focusin', onFocusIn)
  update()
  return {
    update,
    uninstall() {
      win.removeEventListener('scroll', onScroll)
      win.removeEventListener('resize', update)
      doc.removeEventListener('focusin', onFocusIn)
      set(false)
    },
  }
}
