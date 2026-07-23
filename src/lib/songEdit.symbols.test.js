// B-fix (23 ก.ค.) — the jianpu symbols the inline editor types onto the sheet.
// Tester found ~10 of them silently dead in โหมดแก้ inline; these lock the engine side:
// marks cycle on the selected note, structural boxes insert (with the RIGHT ripple), and a
// bar line splits the segment. Everything must come back through the shared parser
// (notation.js) — no second grammar.
import { describe, it, expect } from 'vitest'
import { withNoteMark, withInsertedBox, withBarAfter } from './songEdit.js'
import { parseNotes } from './notation.js'

// one stanza (2 notes) + two verses linked to it, so ripple is observable
function makeContent() {
  return {
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 's1', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] }],
    arrangement: [
      { stanza: 's1', syllables: ['สรร', 'เส'] },
      { stanza: 's1', syllables: ['พระ', 'เจ้า'] },
    ],
  }
}
const LINE = { _stanza: 's1', _stanzaLine: 0, _entryIndex: 0 }
const at = (syk) => ({ resolvedLine: LINE, si: 0, syk })
const noteOf = (c) => c.stanzas[0].lines[0].find((i) => i.type === 'segment').note
const sylsOf = (c) => c.arrangement.map((e) => e.syllables)

describe('withNoteMark — the four marks that ride on a note', () => {
  it('_ cycles เขบ็ต 0 → 1 → 2 → 0', () => {
    let c = withNoteMark(makeContent(), at(0), '_')
    expect(noteOf(c)).toBe('1_ 2')
    c = withNoteMark(c, at(0), '_')
    expect(noteOf(c)).toBe('1__ 2')
    c = withNoteMark(c, at(0), '_')
    expect(noteOf(c)).toBe('1 2')
  })

  it('. cycles the augmentation dot 0 → 1 → 2 → 0', () => {
    let c = withNoteMark(makeContent(), at(1), '.')
    expect(noteOf(c)).toBe('1 2.')
    c = withNoteMark(c, at(1), '.')
    expect(noteOf(c)).toBe('1 2..')
    c = withNoteMark(c, at(1), '.')
    expect(noteOf(c)).toBe('1 2')
  })

  it('~ and ^ toggle on/off and survive as parsed marks', () => {
    let c = withNoteMark(makeContent(), at(0), '~')
    expect(parseNotes(noteOf(c))[0].tieStart).toBe(true)
    c = withNoteMark(c, at(0), '^')
    expect(parseNotes(noteOf(c))[0].fermata).toBe(true)
    c = withNoteMark(c, at(0), '~')
    expect(parseNotes(noteOf(c))[0].tieStart).toBe(false)
    expect(parseNotes(noteOf(c))[0].fermata).toBe(true) // ~ off did not eat ^
  })

  it('keeps G1 canonical order however the marks were typed', () => {
    // aug dot first, then เขบ็ต — stored canonically as 1_. (parses as an eighth + dot)
    let c = withNoteMark(makeContent(), at(0), '.')
    c = withNoteMark(c, at(0), '_')
    expect(noteOf(c)).toBe('1_. 2')
    const t = parseNotes(noteOf(c))[0]
    expect(t.underlines).toBe(1)
    expect(t.dots).toBe(1)
  })

  it('marks never touch the words, and an unsupported character is a no-op', () => {
    const base = makeContent()
    const c = withNoteMark(base, at(0), '_')
    expect(sylsOf(c)).toEqual(sylsOf(base))
    expect(withNoteMark(base, at(0), ',')).toBe(base) // ',' has no meaning today
    expect(withNoteMark(base, at(0), '!')).toBe(base)
  })
})

describe('withInsertedBox — the structural symbols', () => {
  it("'-' grows the melody and ripples EVERY linked verse", () => {
    const c = withInsertedBox(makeContent(), at(0), '-')
    expect(noteOf(c)).toBe('1 - 2')
    expect(sylsOf(c)).toEqual([['สรร', '', 'เส'], ['พระ', '', 'เจ้า']])
  })

  it('a slur bracket bears no syllable slot → no verse shifts', () => {
    let c = withInsertedBox(makeContent(), at(0), '(', true) // opening bracket = before
    expect(noteOf(c)).toBe('( 1 2')
    c = withInsertedBox(c, at(1), ')') // closing = after the 2nd note
    expect(noteOf(c)).toBe('( 1 2 )')
    expect(sylsOf(c)).toEqual(sylsOf(makeContent()))
    // and the parser reads it back as one slur group over both notes
    expect(parseNotes(noteOf(c)).filter((t) => t.type === 'open')).toHaveLength(1)
  })

  it('triplet brackets work the same way', () => {
    let c = withInsertedBox(makeContent(), at(0), '{', true)
    c = withInsertedBox(c, at(1), '}')
    expect(noteOf(c)).toBe('{ 1 2 }')
    expect(sylsOf(c)).toEqual(sylsOf(makeContent()))
  })
})

describe('withBarAfter — | splits the segment', () => {
  it('splits at the cursor, keeping the chord on the first half', () => {
    const c = withBarAfter(makeContent(), at(0))
    const line = c.stanzas[0].lines[0]
    expect(line.map((i) => i.type)).toEqual(['segment', 'bar', 'segment'])
    expect(line[0]).toMatchObject({ note: '1', chord: 'C' })
    expect(line[2]).toMatchObject({ note: '2' })
    expect(sylsOf(c)).toEqual(sylsOf(makeContent())) // same boxes, same order → no ripple
  })

  it('at the last note it just adds the bar (no empty segment)', () => {
    const c = withBarAfter(makeContent(), at(1))
    expect(c.stanzas[0].lines[0].map((i) => i.type)).toEqual(['segment', 'bar'])
    expect(noteOf(c)).toBe('1 2')
  })
})
