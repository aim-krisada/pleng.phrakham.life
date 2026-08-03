// B118 — the arc geometry shared by the SHEET overlay (SongSheet) and the EDITOR overlay
// (EditorMode). Tier A: pure functions with mocked rects, so the split/single decision and
// the row-edge maths are pinned without a browser. The pixel rendering itself is verified
// live (Tier B) against the real editor.
import { describe, it, expect } from 'vitest'
import { buildArc, planArcs, makeHalfHider, ROW_TOL } from './slurArcs.js'

// a DOMRect-alike; notes are 10 wide / 20 tall unless told otherwise
const r = (left, top, width = 10, height = 20) => ({
  left, top, width, height, right: left + width, bottom: top + height,
})
const ORIGIN = r(0, 0, 1000, 500)
// pull the "M x,y" start and the end x of the first cubic out of a built path
// NB: control points can be negative (the apex rises above the overlay's y=0), so this
// must not assume digits-only between the two C commands.
const ends = (arc) => {
  const m = arc.d.match(/^M([\d.-]+),([\d.-]+) C.*? ([\d.-]+),([\d.-]+) C/)
  return { x1: +m[1], x2: +m[3] }
}

describe('buildArc', () => {
  it('spans exactly the two x it was given and closes the filled lens', () => {
    const a = buildArc(15, 105, 0, 20)
    expect(ends(a)).toEqual({ x1: 15, x2: 105 })
    expect(a.d.endsWith('Z')).toBe(true)
  })

  it('gives arcs at different positions different keys (so Vue re-renders them)', () => {
    expect(buildArc(15, 105, 0, 20).key).not.toBe(buildArc(15, 105, 40, 20).key)
  })
})

describe('planArcs — one continuous curve when both notes share a visual row', () => {
  it('draws ONE arc from the open notehead to the close notehead, across the barline', () => {
    // this is the B118 case: ห้อง A's last note → ห้อง B's first note, same row
    const out = planArcs(r(10, 0), r(100, 0), ORIGIN, [r(10, 0), r(100, 0)])
    expect(out).toHaveLength(1)
    expect(ends(out[0])).toEqual({ x1: 15, x2: 105 }) // note CENTRES, not edges
  })

  it('measures relative to the overlay origin, not the viewport', () => {
    const out = planArcs(r(310, 200), r(400, 200), r(300, 200, 1000, 500), [])
    expect(ends(out[0])).toEqual({ x1: 15, x2: 105 })
  })

  it('skips a pair that is too narrow to draw (receiver on top of the source)', () => {
    expect(planArcs(r(10, 0), r(10, 0), ORIGIN, [])).toHaveLength(0)
  })

  it('returns nothing unmeasurable, so the caller keeps its NoteRow fallback', () => {
    expect(planArcs(r(10, 0, 0), r(100, 0), ORIGIN, [])).toHaveLength(0)
    expect(planArcs(r(10, 0), r(100, 0, 0), ORIGIN, [])).toHaveLength(0)
  })

  it('treats a small vertical jitter as the same row (font/baseline wobble)', () => {
    const jitter = 20 * ROW_TOL - 1 // just inside the tolerance
    expect(planArcs(r(10, 0), r(100, jitter), ORIGIN, [])).toHaveLength(1)
  })
})

describe('planArcs — standard engraving split when a wrap falls between the notes', () => {
  const rowRects = [
    r(10, 0), r(50, 0), // row 0, rightmost note ends at 60
    r(5, 100), r(100, 100), // row 1, leftmost note starts at 5
  ]

  it('draws TWO halves: open→end of its row, then start of the next row→close', () => {
    const out = planArcs(r(10, 0), r(100, 100), ORIGIN, rowRects)
    expect(out).toHaveLength(2)
    expect(ends(out[0])).toEqual({ x1: 15, x2: 60 }) // open centre → row 0's right edge
    expect(ends(out[1])).toEqual({ x1: 5, x2: 105 }) // row 1's left edge → close centre
  })

  it('never runs a half past the notes on its row', () => {
    const [first, second] = planArcs(r(10, 0), r(100, 100), ORIGIN, rowRects)
    expect(ends(first).x2).toBeLessThanOrEqual(60)
    expect(ends(second).x1).toBeGreaterThanOrEqual(5)
  })

  it('draws nothing when the rows cannot be measured, keeping the NoteRow fallback', () => {
    // no row rects → neither half has a reachable edge, so we must not claim (hide) the
    // stubs NoteRow already drew. This is the rule that stops a half vanishing entirely.
    expect(planArcs(r(10, 0), r(100, 100), ORIGIN, [])).toHaveLength(0)
  })
})

describe('makeHalfHider', () => {
  it('hides the NoteRow halves an overlay replaced, and puts them all back', () => {
    const a = { style: { display: '' } }
    const b = { style: { display: '' } }
    const h = makeHalfHider()
    h.hide(a)
    h.hide(b)
    expect([a.style.display, b.style.display]).toEqual(['none', 'none'])
    h.restore()
    expect([a.style.display, b.style.display]).toEqual(['', ''])
  })

  it('ignores a missing element (nothing to hide is not an error)', () => {
    const h = makeHalfHider()
    expect(() => { h.hide(null); h.restore() }).not.toThrow()
  })

  it('forgets restored elements, so a later restore cannot un-hide a fresh hide', () => {
    const a = { style: { display: '' } }
    const h = makeHalfHider()
    h.hide(a)
    h.restore()
    h.hide(a)
    expect(a.style.display).toBe('none')
  })
})
