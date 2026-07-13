// issues5 — GOLDEN tests for line-level slur pairing (DoD ชั้น 2ก · Tier A, no layout).
// slurSpans() pairs a '(' with its ')' ACROSS segments (a slur that opens at a bar's end and
// closes at the next bar's start), which groupNotes can't do within one string. It reports
// each pair's anchor notes as {si, idx} so SongSheet can draw ONE overlay arc over the bar.
// arcPlan() decides single-arc (same visual row) vs split-arc (a line wrap fell between) from
// the measured rects — the only layout-dependent decision, isolated here so it is testable.
import { describe, it, expect } from 'vitest'
import { slurSpans, arcPlan } from './notation.js'

describe('slurSpans — cross-segment slur pairing (issues5)', () => {
  it('a slur opening at a bar end and closing at the next bar start pairs across segments', () => {
    // seg0 "5 (1'": notes 5(idx0) 1'(idx1) → open anchor = 1'(idx1)
    // seg1 "6) 5":  notes 6(idx0) 5(idx1)  → close anchor = 6(idx0)
    const spans = slurSpans(['5 (1\'', '6) 5'])
    expect(spans.length).toBe(1)
    expect(spans[0]).toEqual({ open: { si: 0, idx: 1 }, close: { si: 1, idx: 0 }, sameSegment: false })
  })

  it('a slur wholly inside one segment is a sameSegment pair (NoteRow keeps drawing it)', () => {
    const spans = slurSpans(['(1 2 3 4)'])
    expect(spans.length).toBe(1)
    expect(spans[0].sameSegment).toBe(true)
    expect(spans[0]).toMatchObject({ open: { si: 0, idx: 0 }, close: { si: 0, idx: 3 } })
  })

  it('no slur → no pairs', () => {
    expect(slurSpans(['1 2 3'])).toEqual([])
  })

  it('several slurs pair independently (a same-segment one and a cross-segment one)', () => {
    // seg0 "(1 2)" closes in-place; seg1 "(3" opens and seg2 "4)" closes it → crosses
    const spans = slurSpans(['(1 2)', '(3', '4)'])
    expect(spans.length).toBe(2)
    expect(spans[0].sameSegment).toBe(true) // (1 2)
    expect(spans[1].sameSegment).toBe(false) // (3 … 4)
    expect(spans[1]).toMatchObject({ open: { si: 1 }, close: { si: 2 } })
  })

  it('the open anchor is the FIRST note after "(", skipping a leading dash', () => {
    // seg0 "1 (- 2'": open should anchor to 2'(idx2), not the '-' extension(idx1)
    const spans = slurSpans(['1 (- 2\'', '3) 4'])
    expect(spans[0].open).toEqual({ si: 0, idx: 2 })
  })

  it('a dangling "(" with no ")" produces no pair (never a half span)', () => {
    expect(slurSpans(['(1 2', '3 4'])).toEqual([])
  })

  it('triplet brackets do not shift note idx or get mistaken for a slur', () => {
    // seg0 "{1 2 3} (4'": the triplet is transparent; open anchors to 4'(idx3)
    const spans = slurSpans(['{1 2 3} (4\'', '5) 6'])
    expect(spans.length).toBe(1)
    expect(spans[0]).toMatchObject({ open: { si: 0, idx: 3 }, close: { si: 1, idx: 0 }, sameSegment: false })
  })
})

describe('arcPlan — single vs split decision (issues5, Tier A with mocked rects)', () => {
  const rect = (top, height = 20) => ({ top, height, width: 10, left: 0 })

  it('same visual row (tops within tolerance) → single continuous arc', () => {
    expect(arcPlan(rect(100), rect(108), 20)).toBe('single')
  })

  it('a big vertical gap (line wrap between the notes) → split arc', () => {
    expect(arcPlan(rect(100), rect(160), 20)).toBe('split')
  })

  it('exactly on the tolerance edge stays single (<= 0.6·h)', () => {
    expect(arcPlan(rect(100), rect(112), 20)).toBe('single') // 12 == 0.6*20
    expect(arcPlan(rect(100), rect(113), 20)).toBe('split') // just over
  })

  it('falls back to the notes\' own height when rowH is not given', () => {
    expect(arcPlan(rect(100, 30), rect(110, 30))).toBe('single') // 10 <= 0.6*30
  })
})
