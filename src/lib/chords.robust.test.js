// P'Aim, 11 Oct 2026 — "I can enter G/A on the iPad but not on the computer", and "the bass
// chord turns into a different one". Two different bugs behind one report:
//   1. the iPad auto-capitalises the first letter of a text field, a desktop keyboard does not,
//      so the same keystrokes gave "G/A" on one device and "g/a" on the other — and the parser
//      only ever accepted an UPPER-case root, so the desktop entry was refused without a word.
//   2. a slash bass was kept verbatim, so it was dropped from the audio when typed in lower case
//      and it did NOT move when the key changed (G/B up a whole step read A/B, not A/C#).
// These tests pin the fix, including the "must not change" side: a chord with no slash must
// transpose exactly as it always did, and every chord already stored in the song bank must keep
// parsing (verified separately against the live bank: 88 distinct symbols, 0 refused).
import { describe, it, expect } from 'vitest'
import {
  parseChord,
  normalizeChord,
  chordError,
  transposeChord,
  chordToRoman,
  chordToIntervals,
  semitonesBetween,
  displayChord,
  KEYS,
} from './chords.js'

describe('typing in any letter case works the same on every device', () => {
  it.each(['G/A', 'g/a', 'G/a', 'g/A'])('"%s" means the same chord as G/A', (typed) => {
    expect(normalizeChord(typed)).toBe('G/A')
    expect(parseChord(typed)).toMatchObject({ root: 'G', bass: 'A', bassIndex: 9, suffix: '/A' })
  })

  it('a lower-case root alone is accepted and tidied up', () => {
    expect(normalizeChord('g')).toBe('G')
    expect(normalizeChord('am7')).toBe('Am7')
    expect(normalizeChord('f#m7b5')).toBe('F#m7b5')
  })

  // "b" after a note letter is a FLAT, so it must never be swept up by the capitalising
  it('"bb" is B flat, not BB', () => {
    expect(normalizeChord('bb')).toBe('Bb')
    expect(parseChord('bb')).toMatchObject({ root: 'Bb', quality: '' })
    expect(normalizeChord('bbm7')).toBe('Bbm7')
    expect(normalizeChord('eb')).toBe('Eb')
  })

  // the quality keeps its own case: "m" is minor, "M" would read as major
  it('"Gm" stays Gm (the quality is never re-cased)', () => {
    expect(normalizeChord('Gm')).toBe('Gm')
    expect(normalizeChord('gm')).toBe('Gm')
    expect(normalizeChord('Cmaj7')).toBe('Cmaj7')
    expect(parseChord('gm').suffix).toBe('m')
  })
})

describe('spaces and look-alike slashes are accepted', () => {
  const BACKSLASH = 'G' + String.fromCharCode(92) + 'A'
  it.each([
    ['G / A', 'spaces around the slash'],
    [' G/A ', 'spaces around the whole chord'],
    ['G／A', 'full-width slash'],
    ['G∕A', 'division slash'],
    ['G⁄A', 'fraction slash'],
    ['G╱A', 'box-drawing slash'],
    [BACKSLASH, 'back slash'],
    ['g / a', 'spaces and lower case together'],
  ])('"%s" (%s) becomes G/A', (typed) => {
    expect(normalizeChord(typed)).toBe('G/A')
  })

  it('a sharp/flat sign from a music font is accepted too', () => {
    expect(normalizeChord('F♯m')).toBe('F#m')
    expect(normalizeChord('B♭')).toBe('Bb')
  })
})

describe('changing key moves the bass note with the chord', () => {
  it('G/B up a whole step into D is A/C#', () => {
    expect(transposeChord('G/B', semitonesBetween('C', 'D'), 'D')).toBe('A/C#')
  })

  it.each([
    ['C/E', 'D/F#'],
    ['Am7/G', 'Bm7/A'],
    ['D/F#', 'E/G#'],
    ['F/A', 'G/B'],
  ])('%s up a whole step into D is %s', (chord, expected) => {
    expect(transposeChord(chord, semitonesBetween('C', 'D'), 'D')).toBe(expected)
  })

  it('the bass is spelt for the target key (flat key gets flats)', () => {
    expect(transposeChord('C/E', semitonesBetween('C', 'Eb'), 'Eb')).toBe('Eb/G')
    expect(transposeChord('G/B', semitonesBetween('C', 'Ab'), 'Ab')).toBe('Eb/G')
    expect(transposeChord('D/A', semitonesBetween('D', 'Db'), 'Db')).toBe('Db/Ab')
  })

  it('the gap between root and bass never changes, in any key', () => {
    for (const k of KEYS) {
      const moved = transposeChord('G/B', semitonesBetween('C', k), k)
      const p = parseChord(moved)
      expect(p.bass).not.toBeNull()
      expect((p.bassIndex - p.rootIndex + 12) % 12).toBe(4) // B is 4 semitones above G
    }
  })

  it('a slash that is NOT a bass note ("C6/9") is left alone', () => {
    expect(transposeChord('C6/9', semitonesBetween('C', 'D'), 'D')).toBe('D6/9')
    expect(transposeChord('A/F#m', semitonesBetween('C', 'D'), 'D')).toBe('B/F#m')
  })
})

describe('chords with no slash transpose exactly as before (nothing may shift)', () => {
  // the whole plain-chord vocabulary, through every key — this is the "do not break what works"
  // guard that matches the full-song-bank comparison run before the change was merged.
  const PLAIN = [
    'C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
    'Am', 'Bm', 'C#m', 'Dm', 'Em', 'F#m', 'Gm', 'G#m', 'Bbm', 'D#m', 'Fm', 'Cm',
    'A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'C#7', 'F#7', 'G#7', 'Bb7',
    'Am7', 'Bm7', 'Dm7', 'Em7', 'C#m7', 'F#m7',
    'Cmaj7', 'Dmaj7', 'Emaj7', 'Fmaj7', 'Amaj7', 'F#maj7',
    'Gsus4', 'Dsus4', 'Esus4', 'Csus2', 'Gadd9', 'C9', 'D9', 'Bb13',
    'Bdim', 'Gdim', 'Fdim', 'F#dim', 'G#dim', 'A#dim', 'C#dim', 'D#dim',
    'Caug', 'E+', 'B+', 'D+', 'Cm6', 'A°', 'F#m7b5', 'F#(+5)', 'C6', 'A#',
  ]
  it.each(PLAIN)('%s keeps its root letter + quality in every key', (chord) => {
    const p = parseChord(chord)
    expect(p, chord).not.toBeNull()
    for (const k of KEYS) {
      const moved = transposeChord(chord, semitonesBetween('C', k), k)
      // same quality, and the root moved by exactly the right number of semitones
      const q = parseChord(moved)
      expect(q.quality).toBe(p.quality)
      expect((q.rootIndex - p.rootIndex + 12) % 12).toBe(semitonesBetween('C', k))
    }
  })

  it('the audio keeps hearing the same chord shape', () => {
    for (const chord of PLAIN) {
      expect(chordToIntervals(parseChord(chord).suffix)).toEqual(
        chordToIntervals(chord.replace(/^[A-G][#b]?/, ''))
      )
    }
  })
})

describe('a typing mistake says why, instead of the field snapping back in silence', () => {
  it.each(['Gฝ', 'Gเ', 'ก', 'Cเม'])('Thai letters are refused: %s', (junk) => {
    expect(parseChord(junk)).toBeNull()
    expect(chordError(junk)).toMatch(/ภาษาไทย/)
  })

  it.each(['Xyz', 'H', 'Hmaj7', '123', 'n', '/G', 'Zqx'])('plain junk is refused: %s', (junk) => {
    expect(parseChord(junk)).toBeNull()
    expect(typeof chordError(junk)).toBe('string')
    expect(chordError(junk).length).toBeGreaterThan(0)
  })

  it('a bad bass note is refused and the message points at the slash', () => {
    expect(parseChord('C/X')).toBeNull()
    expect(chordError('C/X')).toMatch(/ขีดทับ/)
  })

  it('an empty field is not an error — it just means "no chord"', () => {
    expect(chordError('')).toBeNull()
    expect(chordError('   ')).toBeNull()
  })

  it('a real chord never gets an error message', () => {
    const real = ['F#m7b5', 'Csus4', 'Gadd9', 'Bdim', 'Caug', 'C6/9', 'D+', 'Cmaj7', 'A°', 'Bb13', 'G/A', 'g/a', 'G / A']
    for (const c of real) {
      expect(parseChord(c), c).not.toBeNull()
      expect(chordError(c), c).toBeNull()
    }
  })
})

describe('the rest of the engine is untouched', () => {
  it('the Roman-numeral view reads the same as before', () => {
    expect(chordToRoman('G', 'C')).toBe('V')
    expect(chordToRoman('Am', 'C')).toBe('vi')
    expect(chordToRoman('Bdim', 'C')).toBe('vii°')
    expect(chordToRoman('Cmaj7', 'C')).toBe('Imaj7')
    // the slash bass still shows as a letter in this view — left as-is on purpose, pending a
    // decision on what it should read (see the note sent with this change).
    expect(chordToRoman('G/B', 'C')).toBe('V/B')
  })

  it('displayChord leaves a chord alone when the key has not changed', () => {
    expect(displayChord('G/B', { system: 'letter', originalKey: 'C', displayKey: 'C' })).toBe('G/B')
    expect(displayChord('Cmaj7', { system: 'letter', originalKey: 'C', displayKey: 'C' })).toBe('Cmaj7')
  })

  it('a non-chord string is still handed back untouched', () => {
    expect(transposeChord('', 2, 'D')).toBe('')
    expect(transposeChord('Xyz', 2, 'D')).toBe('Xyz')
    expect(normalizeChord('Xyz')).toBeNull()
  })
})
