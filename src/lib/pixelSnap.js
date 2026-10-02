// ใบ v3/pleng#99 (พี่เปา 2 ต.ค. 2569: "ถ้าขนาดปกติมันจะดูเส้นมันขีดซ้อนๆกัน แต่ถ้า zoom in เข้าไปเส้นมันตรง") — one
// underline used to be painted by TWO painters: each digit's own CSS border, which the browser lays on
// whole device pixels, and the beam bar / cross-segment bridge placed from MEASURED fractional positions,
// which the browser smears over an extra half-lit pixel row. At normal size the two land a row apart and
// the line reads doubled; zoomed in, the half row is too thin to see. The bar and the bridge now sit on
// whole device pixels with one shared thickness (this file), and the digit border under a drawn bar is
// made transparent, so a beam is painted once.
export const LINE_TH = 1.5 // CSS px — the underline thickness everywhere (`.num.u1` border, beam bar, bridge)
export const LINE_GAP = 1 // CSS px between two underline levels (the old `4px double` border)

export function pixelRatio() {
  const r = typeof window !== 'undefined' ? Number(window.devicePixelRatio) : 1
  return r > 0 ? r : 1
}
// a CSS-px coordinate moved onto the nearest device-pixel boundary
export function snapPx(v, dpr = pixelRatio()) {
  return Math.round(v * dpr) / dpr
}
// the underline thickness as a whole number of device pixels, never thinner than one — rounded DOWN, the
// way Chrome draws the 1.5px `.num.u1` border (1px on a 1× screen, 2px at 1.5×, 3px at 2×), so a beamed
// eighth and a lone eighth are the same weight
const devTh = (dpr) => Math.max(1, Math.floor(LINE_TH * dpr + 1e-6))
export function lineThickness(dpr = pixelRatio()) {
  return devTh(dpr) / dpr
}
// top of underline LEVEL `level` (1 = eighth, 2 = sixteenth …) for a digit whose content bottom is
// `baseline` (viewport CSS px), snapped — the same y for a beam bar and a bridge on that digit row.
// Level 1 is snapped; each further level steps a WHOLE number of device pixels, never less than the
// line plus one empty pixel row, so two levels can't merge into one thick line at any zoom.
export function levelTop(baseline, level, dpr = pixelRatio()) {
  const th = devTh(dpr)
  const step = Math.max(th + 1, Math.round((LINE_TH + LINE_GAP) * dpr))
  return snapPx(baseline, dpr) + ((level - 1) * step) / dpr
}
