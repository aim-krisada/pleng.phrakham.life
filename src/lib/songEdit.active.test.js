// BI-011 — the toolbar must LIGHT the keys already on the selected note so the toggle-to-remove is
// discoverable: a person who sees an arc over a note but cannot find how to take it off now sees the
// `~` (or `(` / `)`) key already lit → "press again = เอาออกเส้นโค้ง". `activeSymbolsAt` drives that
// active state, and a lit key must mean a WORKING removal — the predicates mirror each symbol's
// toggle-off path (withTie / withToggledBox / withNoteMark / withAccidental), so this test asserts
// BOTH: the right key lights AND re-pressing it removes the mark (lit ⇔ removable).
//
// Kept in its OWN file (imports songEdit.js only, never midi.js) so it runs without the audio graph:
// songEdit.toggle.test.js pulls midi→sampler→`smplr`, and `smplr` is a declared dependency that is
// currently out of sync with package-lock (so `npm ci` skips it and vitest cannot resolve it in this
// worktree). This split keeps the BI-011 coverage runnable regardless of that pre-existing drift.
import { describe, it, expect } from 'vitest'
import { activeSymbolsAt, activeMarksAt, withTie, withToggledBox, withNoteMark, withAccidental, withBracketRemovedAt, bracketSpanAt } from './songEdit.js'
import { applySymbolToContent } from './editorCommands.js'

function makeContent(note, a = ['a', 'b', 'c'], d = ['d', 'e', 'f']) {
  return {
    key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 's1', lines: [[{ type: 'segment', note, chord: 'C' }]] }],
    arrangement: [{ stanza: 's1', syllables: a }, { stanza: 's1', syllables: d }],
  }
}
// a line of several segments (all in stanza s1 / line 0) — for cross-segment slur coverage
function makeLine(segNotes) {
  return {
    key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 's1', lines: [segNotes.map((n) => ({ type: 'segment', note: n, chord: '' }))] }],
    arrangement: [{ stanza: 's1', syllables: segNotes.flatMap((_, i) => ['w' + i]) }],
  }
}
const LINE = { _stanza: 's1', _stanzaLine: 0, _entryIndex: 0 }
const at = (syk) => ({ resolvedLine: LINE, si: 0, syk })
const atSi = (si, syk) => ({ resolvedLine: LINE, si, syk })
const noteOf = (c) => c.stanzas[0].lines[0].find((i) => i.type === 'segment').note
const notesOf = (c) => c.stanzas[0].lines[0].filter((i) => i.type === 'segment').map((s) => s.note)
const active = (c, syk) => activeSymbolsAt(c, at(syk))

describe('BI-011 — activeSymbolsAt lights exactly the symbols a re-press would remove', () => {
  it('a tied note (either end) reports ~ active; an untied note reports nothing', () => {
    const c = withTie(makeContent('6 6 2'), at(0)) // → 6~ ~6 2
    expect(noteOf(c)).toBe('6~ ~6 2')
    expect(active(c, 0)).toEqual(['~'])
    expect(active(c, 1)).toEqual(['~'])
    expect(active(c, 2)).toEqual([]) // the lone 2 has no arc
    // lit ⇔ removable: pressing ~ on the lit note takes the arc off
    expect(noteOf(withTie(c, at(1)))).toBe('6 6 2')
  })

  it('a slur lights BOTH ( and ) on every note inside it (head, middle, tail)', () => {
    // attached real-data form: (6 5 2)  — boxes "(6" "5" "2)"
    const c = makeContent('(6 5 2)')
    expect(active(c, 0).sort()).toEqual(['(', ')']) // head
    expect(active(c, 1).sort()).toEqual(['(', ')']) // MIDDLE — the case that used to light nothing
    expect(active(c, 2).sort()).toEqual(['(', ')']) // tail
    const outside = makeContent('(6 5) 2') // note "2" is not in the slur
    expect(active(outside, 2)).toEqual([]) // the trailing 2 sits outside
  })

  it('marks / fermata / accidental stack as active on one note', () => {
    let c = withNoteMark(makeContent('5 6'), at(0), '^')
    c = withNoteMark(c, at(0), '_')
    c = withAccidental(c, at(0), '#')
    expect(active(c, 0).sort()).toEqual(['#', '^', '_'])
  })

  it('the aug-dot . lights, but an octave-low note (also written with .) does NOT light .', () => {
    const dotted = withNoteMark(makeContent('5'), at(0), '.') // 5.
    expect(active(dotted, 0)).toEqual(['.'])
    // octave-low `.5` must not read as an aug dot (that key is the dedicated ต่ำ↓ / , command)
    const lowOct = makeContent('.5')
    expect(active(lowOct, 0)).toEqual([])
  })

  it('is empty for no selection / no loc', () => {
    expect(activeSymbolsAt(makeContent('6 5'), null)).toEqual([])
  })
})

// BI-011a — a slur/เอื้อน must be removable from ANY note it spans (head, middle, tail), whether
// the brackets are ATTACHED to a digit ("(3 1)") or SEPARATE, and whether the slur stays in one
// segment or CROSSES segments. This is the real field bug: on song 141 pressing ( / ) did nothing
// because the old code only removed a separate "(" box next to the cursor.
describe('BI-011a — remove the whole slur from any note it spans', () => {
  const press = (c, si, syk, ch) => applySymbolToContent(c, atSi(si, syk), ch)

  it('removes a 3-note slur from the MIDDLE note (attached form)', () => {
    const c = makeContent('(3 4 5)') // boxes "(3" "4" "5)"
    expect(noteOf(press(c, 0, 1, '('))).toBe('3 4 5') // press ( on the middle note
    expect(noteOf(press(c, 0, 1, ')'))).toBe('3 4 5') // ) on the middle note works too
    expect(noteOf(press(c, 0, 0, '('))).toBe('3 4 5') // head
    expect(noteOf(press(c, 0, 2, ')'))).toBe('3 4 5') // tail
  })

  it('removes a slur that CROSSES segments without leaving a dangling bracket', () => {
    const x = makeLine(['(3 - 2', '1) -']) // ( in seg0, ) in seg1
    expect(bracketSpanAt(x, atSi(0, 0), '(', ')')).toBeTruthy()
    expect(notesOf(press(x, 0, 0, '('))).toEqual(['3 - 2', '1 -']) // from the open side
    expect(notesOf(press(x, 1, 0, ')'))).toEqual(['3 - 2', '1 -']) // from the close side
  })

  it('the ADD path is unchanged: ( then ) builds a slur, then ( removes the whole thing', () => {
    let c = makeContent('3 4')
    c = press(c, 0, 0, '(') // insert opener before note 0
    expect(noteOf(c)).toBe('( 3 4')
    c = press(c, 0, 1, ')') // insert closer after note 1
    expect(noteOf(c)).toBe('( 3 4 )')
    expect(noteOf(press(c, 0, 1, '('))).toBe('3 4') // now a complete slur → any note removes it
  })

  it('withBracketRemovedAt is a no-op when the note is in no slur', () => {
    const n = makeContent('3 4 5')
    expect(withBracketRemovedAt(n, at(1), '(', ')')).toBe(n) // reference-equal
  })

  it('activeMarksAt collapses a slur to ONE friendly chip on every spanned note', () => {
    const c = makeContent('(3 4 5)')
    expect(activeMarksAt(c, at(1))).toEqual([{ act: 'slur', label: 'เอื้อน' }])
    const tied = withTie(makeContent('6 6 2'), at(0))
    expect(activeMarksAt(tied, at(0))).toEqual([{ act: '~', label: 'โยงเสียง' }])
  })
})
