// G1 — order-free modifiers. A note box takes its modifiers in any order and is
// sorted back into the canonical form before parsing. Covers the real broken spots
// from docs/reports/broken-notation-for-content-owner.md (อาการ 1 + 2) plus the
// regression list in docs/ds/note-symbol-set.md §8.1.
import { describe, it, expect } from 'vitest'
import { canonicalizeNote, canonicalizeNoteString, parseNotes, beatCount } from './notation.js'

const note = (s) => parseNotes(s).find((t) => t.type === 'note')

describe('canonicalizeNote — the five real broken spots', () => {
  // อาการ 1: '^' written before the dot / beam
  it('#103 A/4/2 "5^." -> "5.^" and the bar fills 3 beats', () => {
    expect(canonicalizeNote('5^.')).toBe('5.^')
    expect(beatCount(parseNotes('1_ 1_ 1_ 5^.'))).toBe(3)
  })
  it('#760 A/2/2 "2^." -> "2.^" and the bar fills 3 beats', () => {
    expect(canonicalizeNote('2^.')).toBe('2.^')
    expect(beatCount(parseNotes('1_ .7_ 1_ 2^.'))).toBe(3)
  })
  it('#760 B/1/5 "#4^_" -> "#4_^" and the bar fills 3 beats', () => {
    expect(canonicalizeNote('#4^_')).toBe('#4_^')
    expect(beatCount(parseNotes('(5^ #4^_ 4^) 0_'))).toBe(3)
  })
  it('#760 B/2/3 "1^_" "2^_" -> "1_^" "2_^" and the bar fills 3 beats', () => {
    expect(canonicalizeNote('1^_')).toBe('1_^')
    expect(canonicalizeNote('2^_')).toBe('2_^')
    expect(beatCount(parseNotes('1_ 1_ 4_ 3_ 1^_ 2^_'))).toBe(3)
  })
  // อาการ 2: sharp written after the low-octave dot
  it('#109 A/4/2 ".#4" -> "#.4" — sharp AND low octave both survive', () => {
    expect(canonicalizeNote('.#4')).toBe('#.4')
    const t = note('.#4')
    expect(t.accidental).toBe('#')
    expect(t.low).toBe(1)
    expect(beatCount(parseNotes('.2 .3_ .#4 .5_'))).toBe(3)
  })
  it('none of the five leaves a raw (unreadable) token behind', () => {
    for (const s of ['5^.', '2^.', '#4^_', '1^_', '2^_', '.#4']) {
      expect(parseNotes(s).some((t) => t.type === 'raw')).toBe(false)
    }
  })
})

describe('canonicalizeNote — every order of a modifier set lands on one form', () => {
  const perms = (arr) =>
    arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]))

  it('side-free modifiers (#, _, ^, \') reach the same note however they are typed', () => {
    // '5' with a sharp, one beam, a fermata and a high-octave mark
    const out = new Set()
    for (const p of perms(['#', '_', '^', "'"])) {
      for (let cut = 0; cut <= p.length; cut++) {
        const s = p.slice(0, cut).join('') + '5' + p.slice(cut).join('')
        out.add(canonicalizeNote(s))
      }
    }
    expect([...out]).toEqual(["#5'_^"])
  })

  it('every ordering parses to the same token fields', () => {
    const base = note("#5'_^")
    for (const p of perms(['#', '_', '^', "'"])) {
      for (let cut = 0; cut <= p.length; cut++) {
        const t = note(p.slice(0, cut).join('') + '5' + p.slice(cut).join(''))
        expect(t).toEqual(base)
      }
    }
  })

  it('reordering never adds or drops a character', () => {
    const sort = (s) => [...s].sort().join('')
    for (const s of ['5^.', '.#4', '#4^_', '_^#4', '4#', '.4b', '~4#', "^5'_", '(5^', '4^)']) {
      expect(sort(canonicalizeNote(s))).toBe(sort(s))
    }
  })

  it('is idempotent', () => {
    for (const s of ['5^.', '.#4', '#4^_', '~5.^', "#.4'_"]) {
      expect(canonicalizeNote(canonicalizeNote(s))).toBe(canonicalizeNote(s))
    }
  })
})

describe("'.' and '~' keep the side they were written on", () => {
  it('".5" stays a low octave, "5." stays an augmentation dot', () => {
    expect(canonicalizeNote('.5')).toBe('.5')
    expect(canonicalizeNote('5.')).toBe('5.')
    expect(note('.5').low).toBe(1)
    expect(note('.5').dots).toBe(0)
    expect(note('5.').low).toBe(0)
    expect(note('5.').dots).toBe(1)
  })
  it('"~5" stays a tie-end, "5~" stays a tie-start', () => {
    expect(note('~5').tieEnd).toBe(true)
    expect(note('~5').tieStart).toBe(false)
    expect(note('5~').tieStart).toBe(true)
    expect(note('5~').tieEnd).toBe(false)
  })
  it('a dot on each side keeps both meanings ("5.^" + low octave)', () => {
    expect(canonicalizeNote('.^5.')).toBe('.5.^')
    const t = note('.^5.')
    expect(t.low).toBe(1)
    expect(t.dots).toBe(1)
    expect(t.fermata).toBe(true)
  })
})

describe('leaves alone what it cannot be sure about', () => {
  it.each([
    ['5..5', 'two notes in one box (legacy ambiguity rule)'],
    ['123', 'spaceless run of notes'],
    ['5___', 'three beams — parser tops out at two'],
    ['5...', 'three augmentation dots'],
    ['#b4', 'two accidentals'],
    ['5x', 'unknown character'],
    ['-', 'not a note'],
    ['|', 'bar separator'],
    ['', 'empty box'],
  ])('%s is returned unchanged (%s)', (s) => {
    expect(canonicalizeNote(s)).toBe(s)
  })

  it('"5..5" still parses as dotted-5 then low-octave-5', () => {
    const ts = parseNotes('5..5')
    expect(ts.map((t) => [t.pitch, t.dots, t.low])).toEqual([['5', 1, 0], ['5', 0, 1]])
  })

  it('unknown characters still surface as raw tokens', () => {
    expect(parseNotes('5x').some((t) => t.type === 'raw')).toBe(true)
    expect(parseNotes('%').some((t) => t.type === 'raw')).toBe(true)
  })

  it('an unmatched ")" is untouched — อาการ 3 is not this fix', () => {
    expect(canonicalizeNote('~6)')).toBe('~6)')
    expect(canonicalizeNoteString('1_ {1_ .6_ 1_})')).toBe('1_ {1_ .6_ 1_})')
    const ts = parseNotes('~6) - 3')
    expect(ts.filter((t) => t.type === 'close').length).toBe(1)
    expect(ts.filter((t) => t.type === 'open').length).toBe(0)
  })
})

describe('regressions listed in note-symbol-set.md §8.1', () => {
  it.each([
    ['.5', 'low octave', (t) => t.low === 1],
    ['..5', 'double low octave', (t) => t.low === 2],
    ['5.', 'dotted', (t) => t.dots === 1],
    ['5..', 'double dotted', (t) => t.dots === 2],
    ["5'", 'high octave', (t) => t.high === 1],
    ['5__', 'two beams', (t) => t.underlines === 2],
    ['n5', 'natural', (t) => t.accidental === 'n'],
  ])('%s (%s) parses as before', (s, _label, ok) => {
    expect(ok(note(s))).toBe(true)
  })

  it('iOS smart punctuation still means "up one octave"', () => {
    for (const q of ["'", '‘', '’', '′']) expect(note('5' + q).high).toBe(1)
    expect(canonicalizeNote('^5‘')).toBe('5‘^')
  })

  it('the old fixAccidental cases are now a subset of order-free', () => {
    expect(canonicalizeNote('4#')).toBe('#4')
    expect(canonicalizeNote('.4b')).toBe('b.4')
    expect(canonicalizeNote('~4#')).toBe('~#4')
  })

  it('group brackets ride along untouched', () => {
    expect(canonicalizeNote('(5^')).toBe('(5^')
    expect(canonicalizeNote('{4^_')).toBe('{4_^')
    expect(canonicalizeNote('1^_}')).toBe('1_^}')
  })

  it('a whole line keeps its length and its bar separators', () => {
    const line = '1_ .7_ 1_ 2^. | .#4 5^.'
    const out = canonicalizeNoteString(line)
    expect(out).toBe('1_ .7_ 1_ 2.^ | #.4 5.^')
    expect(out.length).toBe(line.length)
  })
})
