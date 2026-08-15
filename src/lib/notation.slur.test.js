// issues5 — GOLDEN tests for line-level slur pairing (DoD ชั้น 2ก · Tier A, no layout).
// slurSpans() pairs a '(' with its ')' ACROSS segments (a slur that opens at a bar's end and
// closes at the next bar's start), which groupNotes can't do within one string. It reports
// each pair's anchor notes as {si, idx} so SongSheet can draw ONE overlay arc over the bar.
// arcPlan() decides single-arc (same visual row) vs split-arc (a line wrap fell between) from
// the measured rects — the only layout-dependent decision, isolated here so it is testable.
import { describe, it, expect } from 'vitest'
import { slurSpans, arcPlan, slurBeamOnly, beamGroups } from './notation.js'

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

// v3/pleng#48 — WHICH slur groups give up their arc and are drawn as the beam alone.
// issues2 says a short เอื้อน inside one beat is engraved as the connected underline; #48 is the
// case that rule swallowed by mistake — a REPEATED digit, where the beam cannot say "hold".
describe('slurBeamOnly — arc dropped only for a beam of different digits (#48)', () => {
  // the real token stream NoteRow works from (notes stamped .beamed), so the test can't drift
  const slurTokens = (notes, syllables = null) =>
    beamGroups(notes, syllables).groups.filter((g) => g.group === 'slur').map((g) => g.tokens)

  it('เพลง 454 เล่มใหญ่: "(.6__ .6__)" repeats one digit → KEEPS its arc', () => {
    expect(slurBeamOnly(slurTokens('(.6__ .6__)')[0])).toBe(false)
  })

  it('the whole ห้อง from เพลง 454 บรรทัด 1 behaves the same in context', () => {
    // ".6_. #.5__ .7_ .6 (.6__ .6__)" = 3 จังหวะ พอดี — the bar พี่เปา typed
    expect(slurBeamOnly(slurTokens('.6_. #.5__ .7_ .6 (.6__ .6__)')[0])).toBe(false)
  })

  it('issues2 unchanged: "(6_ 5_)" — two different digits in one beat → beam only, no arc', () => {
    expect(slurBeamOnly(slurTokens('(6_ 5_)')[0])).toBe(true)
  })

  it('a repeat anywhere in a longer beamed group is enough to keep the arc', () => {
    // sixteenths so all three still sit inside ONE beat (one beam run)
    expect(slurBeamOnly(slurTokens('(6__ 5__ 5__)')[0])).toBe(false)
    expect(slurBeamOnly(slurTokens('(6__ 5__ 4__)')[0])).toBe(true)
  })

  // v3/pleng#53: the rule the songbook actually follows is about the UNDERLINE, not the
  // note count — a เอื้อน carried by ONE connected underline needs no curve, but the moment
  // the underline breaks (a beat boundary, a new word) nothing is left saying "one syllable",
  // so the curve comes back. Evidence: the book page in `git show
  // c675cd8:docs/reports/assets/eaun-book-innalok.png` draws a curve over "3 - 3 4" (two
  // beats) while "6 5" (one beat) carries only its beam.
  it('a group whose notes fall in TWO beam runs keeps its arc (#53)', () => {
    // 4 eighths = 2 beats → beams [[0,1],[2,3]]: two underlines, so the beam alone can't
    // say "one syllable"
    expect(slurBeamOnly(slurTokens('(6_ 5_ 4_ 3_)')[0])).toBe(false)
    expect(slurBeamOnly(slurTokens('(6_ 5_ 4_ 3_ 2_ 1_ 7_ 6_)')[0])).toBe(false)
  })

  it('four SIXTEENTHS are one beat = one beam run → still beam only (#53)', () => {
    // the guard is the underline, not the digit count: these four fit in one beat
    expect(slurBeamOnly(slurTokens('(6__ 5__ 4__ 3__)')[0])).toBe(true)
  })

  it('a new word inside the group breaks the underline → arc stays (#53)', () => {
    // issue8 cuts the beam before a note that starts a new syllable, so these two eighths
    // sit in one beat but in two runs of one → not beamed at all → arc
    expect(slurBeamOnly(slurTokens('(6_ 5_)', ['ดี', 'ใจ'])[0])).toBe(false)
    expect(slurBeamOnly(slurTokens('(6_ 5_)', ['ดี', ''])[0])).toBe(true)
  })

  it('same digit but a different OCTAVE is not a repeat — still beam only', () => {
    expect(slurBeamOnly(slurTokens("(6_ 6'_)")[0])).toBe(true)
  })

  it('same digit with a different accidental is not a repeat either', () => {
    expect(slurBeamOnly(slurTokens('(6_ #6_)')[0])).toBe(true)
  })

  it('a group holding a quarter / an extension was never beam-only (B062 phrase melisma)', () => {
    expect(slurBeamOnly(slurTokens('(3 - 3_)')[0])).toBe(false)
    expect(slurBeamOnly(slurTokens('(1 2 3 4)')[0])).toBe(false)
  })

  it('a single-note group is never beam-only', () => {
    expect(slurBeamOnly(slurTokens('(6_)')[0])).toBe(false)
    expect(slurBeamOnly([])).toBe(false)
    expect(slurBeamOnly(undefined)).toBe(false)
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
