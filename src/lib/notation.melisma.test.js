import { describe, it, expect } from 'vitest'
import { melismaSpans } from './notation.js'

// P2 — derive melisma slur spans from v2 syllable slots (a worded note + following blank
// 'attack' notes = one held vowel). Tier A: pure, no layout.
describe('melismaSpans', () => {
  it('spans a worded note to the blank attack note it is held across (song 141 ใจ/รับ bar)', () => {
    // ...หนึ่ง ดวง | [6 1 6] with ["","ใจ","รับ"] — "ดวง" is held onto the first (blank) 6
    const segments = [
      { si: 2, note: '2 1_', syllables: ['หนึ่ง', 'ดวง'] },
      { si: 3, note: '.6_ 1_ .6_', syllables: ['', 'ใจ', 'รับ'] },
    ]
    expect(melismaSpans(segments)).toEqual([
      { open: { si: 2, idx: 1 }, close: { si: 3, idx: 0 }, sameSegment: false },
    ])
  })

  it('spans a within-segment melisma (พักตร์ over the first two notes)', () => {
    const segments = [{ si: 0, note: '6_ 1_ 6_', syllables: ['พักตร์', '', 'ประ'] }]
    expect(melismaSpans(segments)).toEqual([
      { open: { si: 0, idx: 0 }, close: { si: 0, idx: 1 }, sameSegment: true },
    ])
  })

  it('reaches the LAST of several consecutive blank attack notes', () => {
    const segments = [{ si: 0, note: '1 6 6', syllables: ['a', '', ''] }]
    expect(melismaSpans(segments)).toEqual([
      { open: { si: 0, idx: 0 }, close: { si: 0, idx: 2 }, sameSegment: true },
    ])
  })

  it('draws nothing when every note carries its own word', () => {
    expect(melismaSpans([{ si: 0, note: '1 2 3', syllables: ['a', 'b', 'c'] }])).toEqual([])
  })

  it('does NOT sweep a rest (0) — silence is not a melisma', () => {
    expect(melismaSpans([{ si: 0, note: '1 0', syllables: ['a', ''] }])).toEqual([])
  })

  it('does NOT sweep a - extension — the dash already shows the hold', () => {
    expect(melismaSpans([{ si: 0, note: '1 -', syllables: ['a', ''] }])).toEqual([])
  })

  it('does NOT sweep a tie (~) — same pitch is shown by the tie, not a melisma slur', () => {
    expect(melismaSpans([{ si: 0, note: '1~ ~1', syllables: ['a', ''] }])).toEqual([])
  })

  it('ignores a leading blank with no worded note before it (no cross-line anchor)', () => {
    expect(melismaSpans([{ si: 0, note: '6 1', syllables: ['', 'b'] }])).toEqual([])
  })

  // song 109 "เวลาก่อสร้างพระวิหาร" — a stray “ ” / . rode onto a note slot as its own
  // syllable; it must not ANCHOR a melisma (Tester found a bogus arc), nor be swept into one.
  it('does NOT anchor a melisma on a punctuation-only syllable (quote mark)', () => {
    // “ (attack) followed by a blank attack note — the quote must not start an arc
    expect(melismaSpans([{ si: 0, note: '6 1', syllables: ['“', ''] }])).toEqual([])
  })

  it('does NOT anchor on a bare period syllable', () => {
    expect(melismaSpans([{ si: 0, note: '6 1', syllables: ['.', ''] }])).toEqual([])
  })

  it('treats a punctuation syllable as a barrier — a real word is not swept across it', () => {
    // "a" (attack) then “ (attack) then blank: the quote stops the run, so no arc reaches it
    expect(melismaSpans([{ si: 0, note: '1 6 6', syllables: ['a', '“', ''] }])).toEqual([])
  })

  it('still draws a real-word melisma that ends before a later punctuation note', () => {
    // "a" + blank (arc a→blank), then “ starts nothing
    expect(melismaSpans([{ si: 0, note: '1 6 6', syllables: ['a', '', '”'] }])).toEqual([
      { open: { si: 0, idx: 0 }, close: { si: 0, idx: 1 }, sameSegment: true },
    ])
  })
})
