// ใบ v3/pleng#146 — ก่อนพิมพ์ lays the A4 paper out at its REAL size (210mm wide, the print font) on every
// screen and shrinks only the picture of it (`transform: scale`) to fit the window or the zoom.
// Laying it out small instead drew the type at 7px on a phone, where glyph widths stop shrinking in
// step with the font: the sheet fitted its lines at 85% instead of 91% and a 2-page song counted 3
// (song 353, 2 พ.ย. 2569).
//
// A transform scales what getBoundingClientRect reports, but not clientWidth, offsetWidth or the
// computed styles — and the sheet measures with both. So every box it measures goes through here:
// divided by the picture's scale, it is a layout length again and matches the rest. The scale is read
// off the page itself (picture width ÷ layout width of the marked host), never stored, so it is right
// in every medium. With no marked host — every other page, and print — this IS getBoundingClientRect.
export function layoutScale(el) {
  const host = el?.closest?.('[data-layout-scale]')
  if (!host || !host.offsetWidth) return 1
  const k = host.getBoundingClientRect().width / host.offsetWidth
  return k > 0 ? k : 1
}

export function layoutRect(el) {
  const r = el.getBoundingClientRect()
  const k = layoutScale(el)
  if (Math.abs(k - 1) < 1e-6) return r
  return {
    left: r.left / k, right: r.right / k, top: r.top / k, bottom: r.bottom / k,
    x: r.x / k, y: r.y / k, width: r.width / k, height: r.height / k,
  }
}
