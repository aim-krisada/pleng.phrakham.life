// ใบ v3/pleng#146 — where a printed แผ่นเพลง starts each new A4 page, worked out on the screen preview.
// The preview paper (Studio .pv-paper) is A4 to scale, with the sheet at the print font size in paper mm,
// so lengths on it are paper lengths. A page holds 297mm − the @page margins (15mm top, 16mm bottom —
// styles.css) = 266mm of sheet. The printer keeps each ท่อน (.song-section, `break-inside: avoid` in print)
// whole when it fits on a page, and otherwise breaks between its lines (.song-line, also kept whole).
// Returns the y (px, from the top of `paper`) of each page start after the first.
import { layoutRect } from './layoutRect.js'

export const PAGE_MM = 297 - 15 - 16

export function pageBreaks(paper, root) {
  const fontPx = parseFloat(getComputedStyle(root).fontSize) || 16
  const mmPx = fontPx / 4.2333 // the sheet's font is the print size, 4.2333mm
  const pageH = PAGE_MM * mmPx
  const top0 = layoutRect(paper).top
  const box = (el) => {
    const r = layoutRect(el)
    return { top: r.top - top0, bottom: r.bottom - top0, h: r.height }
  }
  // the content starts at the paper's top padding (the 15mm margin) — measure from the first box
  const lines = [...root.querySelectorAll('.song-line')].filter((el) => layoutRect(el).height > 0)
  if (!lines.length) return []
  const first = root.querySelector('.sheet-print-title, .sheet-head') || lines[0]
  let pageTop = box(first).top
  const out = []
  // group the lines by their ท่อน, in order
  const groups = []
  for (const el of lines) {
    const sec = el.closest('.song-section')
    const g = groups.at(-1)
    if (g && g.sec === sec) g.lines.push(box(el))
    else groups.push({ sec, lines: [box(el)] })
  }
  for (const g of groups) {
    const gTop = g.lines[0].top
    const gBottom = g.lines.at(-1).bottom
    if (gBottom - pageTop <= pageH) continue // the whole ท่อน fits on this page
    if (gBottom - gTop <= pageH && gTop > pageTop) { // fits on a fresh page → it moves there whole
      pageTop = gTop
      out.push(gTop)
      continue
    }
    for (const ln of g.lines) { // taller than a page (or already at a page top): break between lines
      if (ln.bottom - pageTop > pageH && ln.top > pageTop) {
        pageTop = ln.top
        out.push(ln.top)
      }
    }
  }
  return out
}
