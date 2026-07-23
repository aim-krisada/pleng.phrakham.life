// P'Pao hotfix — the current editor must let the user enter EVERY standard chord, not just a
// fixed quick-pick set. The parse/transpose engine already accepts arbitrary standard chords
// (root + verbatim quality/extension + optional slash bass); these tests pin that contract so a
// future engine refactor can't silently narrow the vocabulary the free-text input now depends on.
import { describe, it, expect } from 'vitest'
import { parseChord, transposeChord, semitonesBetween } from './chords.js'

describe('parseChord accepts the full standard chord vocabulary', () => {
  const good = [
    ['Cmaj7', 'C', 'maj7'],
    ['F#m7b5', 'F#', 'm7b5'],
    ['Dsus4', 'D', 'sus4'],
    ['Csus2', 'C', 'sus2'],
    ['Bb13', 'Bb', '13'],
    ['A°', 'A', '°'],
    ['Gaug', 'G', 'aug'],
    ['C+', 'C', '+'],
    ['Eadd9', 'E', 'add9'],
    ['Am7', 'A', 'm7'],
    ['G6', 'G', '6'],
  ]
  it.each(good)('parses %s as root %s + verbatim suffix %s', (chord, root, suffix) => {
    const p = parseChord(chord)
    expect(p).not.toBeNull()
    expect(p.root).toBe(root)
    expect(p.suffix).toBe(suffix)
  })

  it('parses a slash bass into its own field (root/suffix kept verbatim)', () => {
    const p = parseChord('G/B')
    expect(p).toMatchObject({ root: 'G', suffix: '/B', bass: 'B' })
    const p2 = parseChord('Cm7/G')
    expect(p2).toMatchObject({ root: 'C', suffix: 'm7/G', bass: 'G' })
  })

  it('rejects genuine junk (no valid root)', () => {
    for (const junk of ['Xyz', 'H', 'Hmaj7', '123', 'n', '', ' ', '/G']) {
      expect(parseChord(junk)).toBeNull()
    }
  })
})

describe('transposeChord keeps quality/extension while moving the root', () => {
  const s = semitonesBetween('C', 'D') // +2, spell in D (sharp key)
  it.each([
    ['Cmaj7', 'Dmaj7'],
    ['F#m7b5', 'G#m7b5'],
    ['Dsus4', 'Esus4'],
    ['Csus2', 'Dsus2'],
    ['Bb13', 'C13'],
    ['A°', 'B°'],
    ['Gaug', 'Aaug'],
    ['Eadd9', 'F#add9'],
  ])('transposes %s up a whole step to %s', (chord, expected) => {
    expect(transposeChord(chord, s, 'D')).toBe(expected)
  })

  it('spells for a flat target key', () => {
    // C -> Eb is +3; Cmaj7 should read Ebmaj7 (flat spelling), not D#maj7
    expect(transposeChord('Cmaj7', semitonesBetween('C', 'Eb'), 'Eb')).toBe('Ebmaj7')
  })

  it('leaves a non-chord string untouched', () => {
    expect(transposeChord('', 2, 'D')).toBe('')
    expect(transposeChord('Xyz', 2, 'D')).toBe('Xyz')
  })

  // KNOWN LIMITATION (flagged to PM, not fixed in this input-side hotfix): the slash bass is kept
  // verbatim in the suffix, so only the ROOT transposes — G/B up a whole step yields A/B, not the
  // musically-correct A/C#. Pinned here so the day the engine is fixed, this test flips and forces
  // a conscious update. The root DOES transpose correctly.
  it('transposes a slash chord root but currently NOT its bass (documented gap)', () => {
    expect(transposeChord('G/B', semitonesBetween('C', 'D'), 'D')).toBe('A/B')
  })
})
