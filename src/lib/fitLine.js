// ใบ v3/pleng#132 — how much to shrink one line of music so it fits the page on ONE row.
//
// พี่เปา 20 ต.ค. 2569: "ขอให้หน้าแผ่นเพลงทำให้ซ้าย-ขวาขยายเต็ม A4 สวยๆ … ตามบรรทัดที่ที่เราใส่ไว้".
// The line breaks she typed ARE the layout, so a line that does not fit must be made smaller
// rather than spilled onto a second row.
//
// The ratio avail / natural would be exact if text scaled linearly with its font size. It does
// not: a glyph's advance width is rounded to whole device pixels, so a line set 9% smaller is
// not 9% narrower. One pass therefore lands close but can still overflow by a hair, which on a
// no-wrap row means a note hanging past the margin. Measuring again after each step converges in
// two or three passes, and the loop stops the moment the line fits — so a line that already fits
// is never touched and never re-rendered.
//
// `naturalAt(scale)` must APPLY that scale and return the line's natural width at it; the caller
// owns the DOM. Kept here as plain arithmetic so the convergence can be tested without a layout
// engine (jsdom measures nothing).

// Aim this far INSIDE the margin. Widths come back rounded to whole pixels, and a flex row wraps
// on an excess of a hundredth — measured 463.1 against a 463 line, which sent the last bar of a
// fitted line down to a row of its own (song 140, 20 ต.ค. 2569). One pixel of air costs nothing
// visible and takes the rounding out of the answer.
const FIT_GAP_PX = 1

export function fitScale(avail, naturalAt, passes = 3) {
  if (!(avail > 0) || typeof naturalAt !== 'function') return 1
  let scale = 1
  for (let i = 0; i < passes; i++) {
    const natural = naturalAt(scale)
    if (!(natural > 0)) return scale // nothing measurable (hidden line, no layout yet)
    const target = avail - FIT_GAP_PX
    if (natural <= target) return scale
    const next = scale * (target / natural)
    // a measurement that does not move the line is a dead end — stop instead of spinning
    if (!(next < scale)) return scale
    scale = next
  }
  // Out of passes with the line still over. The last step was computed but never measured, so
  // the caller — not this function — has to apply the answer before giving up on it.
  return scale
}

// ใบ v3/pleng#140 — how much of a short line's row must stay EMPTY.
//
// A short line reaches the margins by widening its ช่องไฟ, but past a point the notes drift so far
// apart that the line stops reading as music: song 139's three-bar last line came out at twice its
// own width — "บางบรรทัดที่เนื้อและโน้ตมีน้อยกว่า ช่องไฟก็จะประหลาด" (พี่เปา 31 ต.ค. 2569). So a line
// stretches to at most MAX_SPREAD times its natural width, and the rest of the row is left empty,
// the way a printed songbook leaves a short last line. Returns that empty part in px (0 = fill).
export const MAX_SPREAD = 1.5

export function spreadPadding(avail, natural, max = MAX_SPREAD) {
  if (!(avail > 0) || !(natural > 0)) return 0
  return Math.max(0, avail - natural * max)
}
