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
import { activeSymbolsAt, withTie, withToggledBox, withToggledSlur, withNoteMark, withAccidental } from './songEdit.js'

function makeContent(note, a = ['a', 'b', 'c'], d = ['d', 'e', 'f']) {
  return {
    key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 's1', lines: [[{ type: 'segment', note, chord: 'C' }]] }],
    arrangement: [{ stanza: 's1', syllables: a }, { stanza: 's1', syllables: d }],
  }
}
const LINE = { _stanza: 's1', _stanzaLine: 0, _entryIndex: 0 }
const at = (syk) => ({ resolvedLine: LINE, si: 0, syk })
const noteOf = (c) => c.stanzas[0].lines[0].find((i) => i.type === 'segment').note
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

  it('a separate slur lights ( on its FIRST note and ) on its LAST note', () => {
    let c = withToggledSlur(makeContent('6 5 2'), at(0), '(') // ( before note 6
    c = withToggledSlur(c, at(1), ')') // ) after note 5
    expect(noteOf(c)).toBe('( 6 5 ) 2')
    expect(active(c, 0)).toEqual(['(']) // note 6 bears the opener
    expect(active(c, 1)).toEqual([')']) // note 5 bears the closer
    expect(active(c, 2)).toEqual([]) // the trailing 2 sits outside the slur
    // lit ⇔ removable: re-pressing the lit bracket now clears the WHOLE pair (BI-011b)
    expect(noteOf(withToggledSlur(c, at(0), '('))).toBe('6 5 2')
  })

  it('BI-011b — a FUSED slur ("(6 5) 2") also lights ( / ) (was dark → looked unremovable)', () => {
    const c = makeContent('(6 5) 2') // legacy imported form: bracket fused on the note token
    expect(active(c, 0)).toEqual(['(']) // note 6 carries the fused opener
    expect(active(c, 1)).toEqual([')']) // note 5 carries the fused closer
    expect(active(c, 2)).toEqual([]) // the trailing 2 is outside
    // lit ⇔ removable: the fused pair strips cleanly from either endpoint
    expect(noteOf(withToggledSlur(c, at(0), '('))).toBe('6 5 2')
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
