// Fermata (`^`) playback hold — พี่เปา issue12 · P'Aim "ตอนเล่นไม่ลากเสียงจริง" + fermata-hold M2.
//
// THE MODEL (M2): a fermata note sounds `written + hold` beats, where `hold` is an EDITABLE
// absolute number of beats stored per note-box in `seg.holds` (out of the note string). When no
// hold is stored the value is the SUGGESTED default: "fill to the end of the bar" so the next note
// lands on the next downbeat (last note of the bar), else ~2× the written note (mid-bar). This
// replaced the old fixed ×1.75 factor, which could not be edited and never aligned the next bar.
//
// INVARIANT guarded here: the hold is added to the note's DURATION only — bar counting (beatCount)
// never sees it, so bars still sum to the time signature (the fix for "the next bar drifts").
import { describe, it, expect } from 'vitest'
import { songToNotes } from './midi.js'
import { beatCount, parseNotes, suggestHoldForBar } from './notation.js'

// total played beats for one segment (a note's '-' boxes fold into the note, so sum the list)
const seg = (note, extra = {}) => ({ type: 'segment', note, ...extra })
const beatsOf = (content) => songToNotes(content).reduce((s, n) => s + n.beats, 0)
// one bare segment, no time signature (expected = null → the ~2× fallback applies)
const beats = (note, holds) => beatsOf({ key: 'C', lines: [[seg(note, holds ? { holds } : {})]] })

describe('fermata hold — stored value drives the duration', () => {
  it('a stored hold adds exactly that many beats to the written note', () => {
    expect(beats('5^', { 0: 3 })).toBeCloseTo(1 + 3, 6) // quarter + 3 = 4
    expect(beats('5^', { 0: 0.5 })).toBeCloseTo(1 + 0.5, 6) // the minimum hold
    expect(beats('1^ -', { 0: 2 })).toBeCloseTo(2 + 2, 6) // written 2 (digit + '-') + 2
  })

  it('the hold is added ONCE to the whole note, not per box (no weakening as it runs)', () => {
    // written length grows box by box; the stored hold (2) is added once to each.
    expect(beats('1^', { 0: 2 })).toBeCloseTo(1 + 2, 6)
    expect(beats('1^ -', { 0: 2 })).toBeCloseTo(2 + 2, 6)
    expect(beats('1^ - -', { 0: 2 })).toBeCloseTo(3 + 2, 6)
    expect(beats('1^ - - -', { 0: 2 })).toBeCloseTo(4 + 2, 6)
  })

  it('holds a fermata REST too (a held silence is still a hold)', () => {
    expect(beats('0^', { 0: 1.5 })).toBeCloseTo(1 + 1.5, 6)
  })

  it('applies the hold ONLY to the box that carries the mark', () => {
    // song #118 shape: fermata on the 6 only (stored 1.5); the 2_ 3_ eighths are untouched.
    expect(beats('6^ 2_ 3_', { 0: 1.5 })).toBeCloseTo(1 + 1.5 + 0.5 + 0.5, 6)
  })

  it('leaves notation without a fermata exactly as printed', () => {
    expect(beats('1')).toBe(1)
    expect(beats('1 -')).toBe(2)
    expect(beats('1 - - -')).toBe(4)
  })
})

describe('fermata hold — auto-suggested default (no stored hold)', () => {
  it('fills to the end of the bar so the NEXT note lands on the next downbeat', () => {
    // bar 1 = "5^" (a quarter) in 4/4; bar 2 = "3". Suggested hold = fill the bar (3 more beats),
    // so 5^ sounds 4 beats and 3 starts exactly on beat 4 (the next downbeat).
    const notes = songToNotes({
      key: 'C', timeSignature: '4/4',
      lines: [[seg('5^'), { type: 'bar' }, seg('3')]],
    })
    const held = notes[0]
    const next = notes[notes.length - 1]
    expect(held.beats).toBeCloseTo(4, 6) // written 1 + suggested 3
    const startOfNext = notes.slice(0, -1).reduce((s, n) => s + n.beats, 0)
    expect(startOfNext).toBeCloseTo(4, 6) // downbeat of bar 2
    expect(next.midi).toBe(64) // E — the note after the hold, re-attacked
  })

  it('a MID-bar fermata falls back to ~2× the written note (does not swallow later notes)', () => {
    // "5^ 3 1" in 4/4: 5^ is NOT the last note → fallback = add the written value (1) → total 2.
    const notes = songToNotes({ key: 'C', timeSignature: '4/4', lines: [[seg('5^ 3 1')]] })
    expect(notes[0].beats).toBeCloseTo(2, 6) // 1 written + 1 suggested (2×)
    expect(notes[1].beats).toBeCloseTo(1, 6) // the 3 is untouched
    expect(notes[2].beats).toBeCloseTo(1, 6) // the 1 is untouched
  })

  it('the pure suggester agrees: last-note fills the bar, mid-note doubles', () => {
    expect(suggestHoldForBar(['5^'], 0, '4/4')).toBeCloseTo(3, 6) // fill 4-beat bar from a quarter
    expect(suggestHoldForBar(['1', '1', '5^'], 2, '4/4')).toBeCloseTo(1, 6) // 3 beats before → +1
    expect(suggestHoldForBar(['5^', '3', '1'], 0, '4/4')).toBeCloseTo(1, 6) // mid-bar → 2× (add 1)
    expect(suggestHoldForBar(['5^'], 0, undefined)).toBeCloseTo(1, 6) // no time sig → 2× fallback
  })

  it('never suggests below the 0.5-beat minimum', () => {
    // a fermata on a note that already fills the bar → bar-fill is 0, clamped up to 0.5.
    expect(suggestHoldForBar(['1', '1', '1', '5^'], 3, '4/4')).toBeCloseTo(0.5, 6)
  })
})

describe('fermata hold — bar math never counts the hold (the drift fix)', () => {
  it('beatCount ignores the fermata mark and the hold entirely', () => {
    // the mark is in the string; the hold is out of it — neither reaches beatCount.
    expect(beatCount(parseNotes('5^'))).toBe(1)
    expect(beatCount(parseNotes('5^ 3 1'))).toBe(3)
    expect(beatCount(parseNotes('1^ - - -'))).toBe(4)
  })
})
