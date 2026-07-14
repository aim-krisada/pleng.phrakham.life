// B104 — chordToIntervals: a chord SYMBOL's suffix → semitone intervals above the root,
// the piece that lets the player sound "exactly the chord the sheet shows". Every quality
// the Studio picker (QUALITIES) can produce must map correctly; anything unknown falls back
// to a plain major triad instead of throwing or going silent.
import { describe, it, expect } from 'vitest'
import { chordToIntervals, parseChord } from './chords.js'

describe('chordToIntervals — quality → intervals', () => {
  const cases = {
    '': [0, 4, 7], // major triad
    m: [0, 3, 7], // minor triad
    7: [0, 4, 7, 10], // dominant 7
    m7: [0, 3, 7, 10],
    maj7: [0, 4, 7, 11],
    sus4: [0, 5, 7],
    sus2: [0, 2, 7],
    dim: [0, 3, 6],
    6: [0, 4, 7, 9],
    m6: [0, 3, 7, 9],
    9: [0, 4, 7, 10, 14],
    add9: [0, 4, 7, 14],
  }
  for (const [suffix, intervals] of Object.entries(cases)) {
    it(`"${suffix || '(major)'}" → ${intervals.join(' ')}`, () => {
      expect(chordToIntervals(suffix)).toEqual(intervals)
    })
  }

  it('every interval set starts on the root (0) so the root always sounds', () => {
    for (const intervals of Object.values(cases)) expect(intervals[0]).toBe(0)
  })

  it('unknown suffix falls back to a major triad (never throws / never empty)', () => {
    expect(chordToIntervals('wat')).toEqual([0, 4, 7])
    expect(chordToIntervals('/B')).toEqual([0, 4, 7]) // slash chord: parseChord gives suffix "/B"
    expect(chordToIntervals(undefined)).toEqual([0, 4, 7])
  })

  it('a slash keeps the QUALITY before it (fixes "Cm7/G" losing its m7)', () => {
    expect(chordToIntervals('m7/G')).toEqual([0, 3, 7, 10]) // was [0,4,7] (slash → major fallback)
    expect(chordToIntervals('sus4/C')).toEqual([0, 5, 7])
    expect(chordToIntervals('/B')).toEqual([0, 4, 7]) // plain major over a slash bass
  })
})

describe('parseChord — slash chords expose the bass note', () => {
  it('parses "G/B" root G + bass B without changing the verbatim suffix', () => {
    const p = parseChord('G/B')
    expect(p.root).toBe('G')
    expect(p.bass).toBe('B')
    expect(p.bassIndex).toBe(11) // B
    expect(p.suffix).toBe('/B') // suffix kept verbatim → transposeChord/chordToRoman unaffected
  })
  it('a plain chord has no bass override', () => {
    const p = parseChord('Am7')
    expect(p.bass).toBeNull()
    expect(p.bassIndex).toBe(-1)
  })
  it('ignores a garbage bass note (no crash)', () => {
    expect(parseChord('C/X').bassIndex).toBe(-1)
  })
})
