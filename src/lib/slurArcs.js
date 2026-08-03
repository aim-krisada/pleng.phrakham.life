// Shared engraved slur/tie arc geometry (B118).
//
// TWO hosts draw the same curve and must never drift apart:
//   · the SHEET  — SongSheet.vue, one overlay SVG per `.song-line`
//   · the EDITOR — EditorMode.vue, one overlay SVG per `.ed-strip`
//
// The editor needs its own overlay because it renders every ห้อง as its OWN mini-SongSheet
// (`barContent`), so no single sheet component spans a barline: a tie/slur running from one
// ห้อง into the next drew a dangling stub on each side and read as broken
// (พี่เปา, 20 ก.ค. — "เส้น slur โค้งไม่ต่อเนื่องกัน"). Keeping the geometry here means one
// edit fixes both surfaces.
import { arcPlan } from './notation.js'

// How far apart two note tops may sit and still count as the same visual row, as a
// fraction of a note's height. Mirrors arcPlan()'s tolerance so "same row" means the same
// thing everywhere.
export const ROW_TOL = 0.6

// One engraved arc: a filled lens (thin points at each note, thickest at the apex), bowing
// above the digits. x/y are in the overlay's own coordinate space; h = a note's height.
export function buildArc(x1, x2, yTop, h) {
  const span = Math.max(x2 - x1, 6)
  const y = yTop + h * 0.14 // just above the digit, in the octave-dot band
  const rise = Math.min(Math.max(span * 0.12, h * 0.16), h * 0.42)
  const th = Math.max(h * 0.06, 1.1) // apex thickness
  const cx1 = x1 + span * 0.24
  const cx2 = x2 - span * 0.24
  const top = y - rise
  const r = (n) => n.toFixed(1)
  const d =
    `M${r(x1)},${r(y)} C${r(cx1)},${r(top)} ${r(cx2)},${r(top)} ${r(x2)},${r(y)}` +
    ` C${r(cx2)},${r(top + th)} ${r(cx1)},${r(top + th)} ${r(x1)},${r(y)} Z`
  return { d, key: `${x1.toFixed(0)}_${x2.toFixed(0)}_${yTop.toFixed(0)}` }
}

// Plan the arc(s) for ONE open→close pair, in the coordinate space of `originRect`.
//   both anchors on the same visual row → ONE continuous curve straight over the barline
//   a wrap fell between them          → the standard engraving split: open→end of its row,
//                                       then start of the close's row→close
// `rowRects` = every note rect of the line, used to find each row's outer edge so a half
// never runs past the notes. Returns [] when nothing is measurable, so a caller that cannot
// measure keeps whatever fallback it already drew (never hide a half we didn't replace).
export function planArcs(openRect, closeRect, originRect, rowRects) {
  if (!openRect || !closeRect || !openRect.width || !closeRect.width) return []
  const h = Math.max(openRect.height, closeRect.height)
  const xOpen = openRect.left + openRect.width / 2 - originRect.left
  const xClose = closeRect.left + closeRect.width / 2 - originRect.left
  const out = []
  if (arcPlan(openRect, closeRect, h) === 'single') {
    if (xClose - xOpen >= 2) {
      out.push(buildArc(xOpen, xClose, Math.min(openRect.top, closeRect.top) - originRect.top, h))
    }
    return out
  }
  let rowRight = xOpen
  let rowLeft = xClose
  for (const r of rowRects || []) {
    if (!r || !r.width) continue
    if (Math.abs(r.top - openRect.top) <= h * ROW_TOL) rowRight = Math.max(rowRight, r.right - originRect.left)
    if (Math.abs(r.top - closeRect.top) <= h * ROW_TOL) rowLeft = Math.min(rowLeft, r.left - originRect.left)
  }
  if (rowRight - xOpen >= 2) out.push(buildArc(xOpen, rowRight, openRect.top - originRect.top, h))
  if (xClose - rowLeft >= 2) out.push(buildArc(rowLeft, xClose, closeRect.top - originRect.top, h))
  return out
}

// Bookkeeping for the NoteRow half-arcs an overlay replaces. Every host restores before it
// re-measures, so hide/draw can never drift apart: a half only stays hidden while the
// overlay arc that replaced it is actually drawn.
export function makeHalfHider() {
  let hidden = []
  return {
    hide(el) {
      if (el) {
        el.style.display = 'none'
        hidden.push(el)
      }
    },
    restore() {
      for (const el of hidden) el.style.display = ''
      hidden = []
    },
  }
}
