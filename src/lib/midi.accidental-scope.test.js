// G20 — an accidental holds for the rest of its BAR (DS note-symbol-set §2.1.3, R1-R7).
// 变音记号: the mark affects its own note and any later note in the SAME bar with the SAME
// degree AND the SAME octave. Playback used to read each token on its own, so the second such
// note sounded a semitone low — while the lint has been telling users the rule exists.
//
// Expected pitches are worked out from the standard, not from the current output:
//   key C → root 60 · degrees 1-7 = +0 +2 +4 +5 +7 +9 +11 · octave = ±12 · # = +1 · b = -1
// so in key C: 4 = 65 (F) · #4 = 66 (F#) · 4' = 77 · #4' = 78 · 3 = 64 · b3 = 63.
import { describe, it, expect } from 'vitest'
import { songToNotes } from './midi.js'

// one v1-shaped line, split into bars by { type: 'bar' } items — the shape songToNotes consumes
const song = (...items) => ({ key: 'C', timeSignature: '4/4', lines: [items] })
const seg = (note) => ({ type: 'segment', note })
const BAR = { type: 'bar' }
const pitches = (content) => songToNotes(content).filter((n) => n.midi != null).map((n) => n.midi)

describe('G20 — accidental scope within a bar', () => {
  it('R1: a later note of the same degree in the same bar inherits the sharp', () => {
    // "#4 4" → F# then F# (NOT F). This is the shape of the one real case in the library:
    // song #760 ท่อน B, bar "(5^ #4_^ 4^) 0_" — the third note must sound ฟาชาร์ป.
    expect(pitches(song(seg('#4 4')))).toEqual([66, 66])
  })

  it('R1: a flat carries the same way (not just sharps)', () => {
    expect(pitches(song(seg('b3 3')))).toEqual([63, 63])
  })

  it('R2: a different OCTAVE does not inherit — degree alone is not enough', () => {
    // #4 (F#4) then 4' (F5, written an octave up, unmarked) → 66 then 77, NOT 78
    expect(pitches(song(seg("#4 4'")))).toEqual([66, 77])
    // and the octave-up mark carries only to its own octave
    expect(pitches(song(seg("#4' 4' 4")))).toEqual([78, 78, 65])
  })

  it('R3: the bar line ends it — the next bar starts clean', () => {
    expect(pitches(song(seg('#4 4'), BAR, seg('4')))).toEqual([66, 66, 65])
  })

  it('R3: each bar is independent, so a mark written again works again', () => {
    expect(pitches(song(seg('#4 4'), BAR, seg('#4 4')))).toEqual([66, 66, 66, 66])
  })

  it('R4: ♮ cancels for the rest of the bar', () => {
    expect(pitches(song(seg('#4 4 n4 4')))).toEqual([66, 66, 65, 65])
  })

  it('R4: a ♮ in the next bar leaves that bar clean (nothing to cancel)', () => {
    expect(pitches(song(seg('#4 4'), BAR, seg('n4 4')))).toEqual([66, 66, 65, 65])
  })

  it('R5: a tie across the bar line keeps the altered pitch (it is the same sound held)', () => {
    // "#4~ | ~4" — the tied note continues F#, and mergeTies folds it into one held note
    const notes = songToNotes(song(seg('#4~'), BAR, seg('~4'))).filter((n) => n.midi != null)
    expect(notes.map((n) => n.midi)).toEqual([66])
    expect(notes[0].beats).toBe(2) // one sound, both bars' worth of beats
  })

  it('R5: but a NEW note in the next bar does not ride on that tie', () => {
    const notes = songToNotes(song(seg('#4~'), BAR, seg('~4 4'))).filter((n) => n.midi != null)
    expect(notes.map((n) => n.midi)).toEqual([66, 65]) // held F#, then a plain F
  })

  it('R6: a repeated section starts counting again every round', () => {
    const content = {
      key: 'C',
      timeSignature: '4/4',
      lines: [[{ type: 'repeat-start' }, seg('#4 4'), BAR, seg('4'), { type: 'repeat-end' }]],
    }
    // both rounds identical: F# F# F · F# F# F — the repeat neither leaks nor loses the mark
    expect(pitches(content)).toEqual([66, 66, 65, 66, 66, 65])
  })

  it('a bar with no accidental at all is untouched (no song may drift)', () => {
    expect(pitches(song(seg('1 2 3 4 5'), BAR, seg("6 7 1'")))).toEqual([60, 62, 64, 65, 67, 69, 71, 72])
  })

  it('resolves at play time only — the stored song is never rewritten', () => {
    const content = song(seg('#4 4'))
    const before = JSON.stringify(content)
    songToNotes(content)
    expect(JSON.stringify(content)).toBe(before) // the standard says the mark is not repeated
  })
})
