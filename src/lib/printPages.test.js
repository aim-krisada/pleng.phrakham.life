// ใบ v3/pleng#146 ข้อ 6 — a song longer than one A4 page: the preview must show where page 2 starts,
// and never cut the end off unseen. jsdom lays nothing out, so the boxes are handed in by hand —
// in the paper's own px, where 1mm = 16px / 4.2333 (the sheet sits at the print font size).
import { describe, it, expect } from 'vitest'
import { pageBreaks, PAGE_MM } from './printPages.js'

const MM = 16 / 4.2333
const PAGE = PAGE_MM * MM // ≈ 1005px of sheet per page

// build a paper with ท่อน of `h` px lines: secs = [[lineH, lineH, …], …]; title on top
function paperOf(secs, { lineGap = 0, title = 20 } = {}) {
  const at = (el, top, h) => { el.getBoundingClientRect = () => ({ top, bottom: top + h, height: h }); return el }
  const paper = at(document.createElement('div'), 0, 4000)
  const root = document.createElement('div')
  root.className = 'sheet-root'
  root.style.fontSize = '16px'
  paper.appendChild(root)
  let y = 57 // the 15mm top margin
  root.appendChild(at(Object.assign(document.createElement('h1'), { className: 'sheet-print-title' }), y, title))
  y += title
  const tops = []
  for (const sec of secs) {
    const s = Object.assign(document.createElement('div'), { className: 'song-section' })
    root.appendChild(s)
    for (const h of sec) {
      s.appendChild(at(Object.assign(document.createElement('div'), { className: 'song-line' }), y, h))
      tops.push(y)
      y += h + lineGap
    }
  }
  return { paper, root, tops }
}

describe('ใบ#146 — where each new A4 page starts', () => {
  it('a page holds 297mm less the 15mm top and 16mm bottom margins', () => {
    expect(PAGE_MM).toBe(266)
  })

  it('a song that fits on one page has no break (ทั้งหมด 1 หน้า)', () => {
    const { paper, root } = paperOf([[100, 100], [100, 100]])
    expect(pageBreaks(paper, root)).toEqual([])
  })

  it('a ท่อน that would cross the page end moves to page 2 whole', () => {
    // 4 ท่อน of 300px: the 4th runs from 977 to 1277 — past the page end at 57 + 1005
    const { paper, root, tops } = paperOf([[150, 150], [150, 150], [150, 150], [150, 150]])
    expect(pageBreaks(paper, root)).toEqual([tops[6]])
  })

  it('a ท่อน taller than a page breaks between its lines, never inside one', () => {
    const { paper, root, tops } = paperOf([Array(12).fill(120)])
    const out = pageBreaks(paper, root)
    expect(out.length).toBe(1)
    expect(tops).toContain(out[0]) // on a line's top edge
    expect(out[0] - 57 + 120).toBeGreaterThan(PAGE) // the line it starts did not fit on page 1
  })

  it('a long song gets every page, so its end is never off the count', () => {
    const { paper, root } = paperOf(Array(12).fill([150, 150]))
    expect(pageBreaks(paper, root).length).toBe(3) // 3600px of ท่อน on 1005px pages → 4 pages
  })

  it('a sheet with no lines has no pages to break', () => {
    const paper = document.createElement('div')
    const root = document.createElement('div')
    paper.appendChild(root)
    expect(pageBreaks(paper, root)).toEqual([])
  })
})
