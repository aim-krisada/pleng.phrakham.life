// BI-003 + BI-009 — every note symbol must APPLY and REMOVE from the same key, `~` must actually
// tie (parse → held-classification → playback merge), and octave must work both ways from the
// keyboard. These drive the SHARED dispatch (applySymbolToContent) exactly as the toolbar button
// and the keydown handler do, so a green run means the real editor behaves this way.
import { describe, it, expect } from 'vitest'
import { applySymbolToContent } from './editorCommands.js'
import { parseNotes, noteBoxKinds } from './notation.js'
import { songToNotes } from './midi.js'

// one stanza + two linked verses, so a slot-bearing insert/remove's ripple is observable. The two
// verses' syllables match the note's slot count so a ripple is visible box-for-box.
function makeContent(note = '1 1 2', a = ['a', 'b', 'c'], d = ['d', 'e', 'f']) {
  return {
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 's1', lines: [[{ type: 'segment', note, chord: 'C' }]] }],
    arrangement: [
      { stanza: 's1', syllables: a },
      { stanza: 's1', syllables: d },
    ],
  }
}
// a v1-shaped (flat `lines`) song from a raw note string — the shape songToNotes plays.
const v1 = (note) => ({ key: 'C', timeSignature: '4/4', lines: [[{ type: 'segment', note, chord: 'C' }]] })
const LINE = { _stanza: 's1', _stanzaLine: 0, _entryIndex: 0 }
const at = (syk) => ({ resolvedLine: LINE, si: 0, syk })
const noteOf = (c) => c.stanzas[0].lines[0].find((i) => i.type === 'segment').note
const press = (c, syk, ch) => applySymbolToContent(c, at(syk), ch)

describe('BI-003 — every symbol applies AND removes from the same key', () => {
  it('marks _ and . cycle back to nothing (0→1→2→0)', () => {
    let c = press(makeContent('1 2'), 0, '_')
    expect(noteOf(c)).toBe('1_ 2')
    c = press(c, 0, '_')
    expect(noteOf(c)).toBe('1__ 2')
    c = press(c, 0, '_') // third press removes it
    expect(noteOf(c)).toBe('1 2')
    let d = press(makeContent('1 2'), 1, '.')
    d = press(d, 1, '.')
    d = press(d, 1, '.')
    expect(noteOf(d)).toBe('1 2')
  })

  it('fermata ^ toggles off on the second press', () => {
    let c = press(makeContent('1 2'), 0, '^')
    expect(parseNotes(noteOf(c))[0].fermata).toBe(true)
    c = press(c, 0, '^')
    expect(parseNotes(noteOf(c))[0].fermata).toBe(false)
  })

  it('accidentals # b n each toggle off, and switch between one another', () => {
    for (const acc of ['#', 'b', 'n']) {
      let c = press(makeContent('1 2'), 0, acc)
      expect(parseNotes(noteOf(c))[0].accidental).toBe(acc)
      c = press(c, 0, acc)
      expect(parseNotes(noteOf(c))[0].accidental).toBe('') // pressed again → cleared
    }
    let c = press(makeContent('1 2'), 0, '#') // # then b replaces, not stacks
    c = press(c, 0, 'b')
    expect(parseNotes(noteOf(c))[0].accidental).toBe('b')
  })

  it('hold - inserts then removes (and the verses ripple both ways)', () => {
    let c = press(makeContent('1 2', ['a', 'b'], ['d', 'e']), 0, '-')
    expect(noteOf(c)).toBe('1 - 2')
    expect(c.arrangement.map((e) => e.syllables)).toEqual([['a', '', 'b'], ['d', '', 'e']])
    c = press(c, 0, '-') // same key again = remove
    expect(noteOf(c)).toBe('1 2')
    expect(c.arrangement.map((e) => e.syllables)).toEqual([['a', 'b'], ['d', 'e']])
  })

  it('slur ( ) and triplet { } brackets insert then remove; verses never shift', () => {
    for (const [open, close] of [['(', ')'], ['{', '}']]) {
      let c = press(makeContent('1 2', ['a', 'b'], ['d', 'e']), 0, open) // opener BEFORE the note
      expect(noteOf(c)).toBe(`${open} 1 2`)
      c = press(c, 1, close) // closing bracket AFTER the 2nd note (slot 1 is the '2')
      expect(noteOf(c)).toBe(`${open} 1 2 ${close}`)
      expect(c.arrangement.map((e) => e.syllables)).toEqual([['a', 'b'], ['d', 'e']]) // no ripple
      c = press(c, 0, open) // re-press removes the WHOLE bracket pair from any note in the span (BI-011 — no dangling half-bracket)
      expect(noteOf(c)).toBe('1 2')
    }
  })

  it('bar | splits then merges back on the same note', () => {
    let c = press(makeContent('1 2', ['a', 'b'], ['d', 'e']), 0, '|')
    const line = c.stanzas[0].lines[0]
    expect(line.map((i) => i.type)).toEqual(['segment', 'bar', 'segment'])
    c = press(c, 0, '|') // cursor still on the last note of the first half → merge
    expect(c.stanzas[0].lines[0].map((i) => i.type)).toEqual(['segment'])
    expect(noteOf(c)).toBe('1 2')
  })
})

describe('BI-009 §2 — octave works both directions and auto-positions the dot', () => {
  it("' raises (dot ABOVE = ' after digit), , lowers (dot BELOW = . before digit)", () => {
    let up = press(makeContent('5'), 0, "'")
    expect(noteOf(up)).toBe("5'")
    expect(parseNotes(noteOf(up))[0].high).toBe(1)
    let dn = press(makeContent('5'), 0, ',')
    expect(noteOf(dn)).toBe('.5')
    expect(parseNotes(noteOf(dn))[0].low).toBe(1)
  })
  it("' and , reverse each other (press , to undo a ')", () => {
    let c = press(makeContent('5'), 0, "'") // 5'
    c = press(c, 0, ',') // back to 5
    expect(noteOf(c)).toBe('5')
  })
})

describe('BI-009 §3 — ~ actually ties: parse, held-classification, and playback all connect', () => {
  it('~ marks BOTH notes (tie-start + tie-end) between same-pitch neighbours', () => {
    const c = press(makeContent('1 1 2'), 0, '~')
    expect(noteOf(c)).toBe('1~ ~1 2')
    const toks = parseNotes(noteOf(c))
    expect(toks[0].tieStart).toBe(true)
    expect(toks[1].tieEnd).toBe(true)
  })

  it('the tied second note is classified HELD (no new word) — the render/lyric chain', () => {
    const c = press(makeContent('1 1 2'), 0, '~')
    expect(noteBoxKinds(noteOf(c))).toEqual(['attack', 'held', 'attack'])
  })

  it('playback MERGES the tie into one sustained note (beats fold, no re-attack)', () => {
    // the editor turns '1 1 2' into '1~ ~1 2' (proven above); play that exact string
    const before = songToNotes(v1('1 1 2')).filter((n) => n.midi != null)
    expect(before.map((n) => n.beats)).toEqual([1, 1, 1]) // three separate attacks
    const after = songToNotes(v1('1~ ~1 2')).filter((n) => n.midi != null)
    expect(after.length).toBe(2) // the two 1s became ONE note
    expect(after[0].beats).toBe(2) // its beats folded (1 + 1)
  })

  it('~ unties on the second press (removes both marks)', () => {
    let c = press(makeContent('1 1 2'), 0, '~')
    c = press(c, 0, '~')
    expect(noteOf(c)).toBe('1 1 2')
    expect(parseNotes(noteOf(c))[0].tieStart).toBe(false)
  })

  it('~ ties BACKWARD when the next note is not a match (falls back to the previous)', () => {
    // note at slot 2 is the second '1'; its next ('2') differs, its prev ('1') matches → tie back
    const c = press(makeContent('2 1 1'), 2, '~')
    expect(noteOf(c)).toBe('2 1~ ~1')
  })

  it('~ is a NO-OP between different pitches (a tie is same-pitch only; use ( ) for a slur)', () => {
    const base = makeContent('1 2 3')
    expect(press(base, 0, '~')).toBe(base) // reference-equal = untouched
  })

  it('a tie preserves a group bracket riding on a legacy box ("(5" / "5)")', () => {
    // legacy spaceless brackets: the slur "( 5 5 )" written as attached tokens
    const c = press(makeContent('(5 5)', ['a', 'b'], ['d', 'e']), 0, '~')
    expect(noteOf(c)).toBe('(5~ ~5)') // ~ added, ( and ) kept
  })
})
