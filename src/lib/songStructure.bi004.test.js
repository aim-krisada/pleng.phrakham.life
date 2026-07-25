// BI-004 — explicit insertion-point paste + absolute-index reorder for bars/lines.
// Proves WHERE pasted/moved content lands (the whole point of the bug: the old paste always
// appended to the end, invisibly). Words must stay aligned under their notes.
import { describe, it, expect } from 'vitest'
import {
  copyBar, copyLine, pasteBarAt, pasteLineAt, moveBarTo, moveLineTo,
  pasteBarInLine, pasteLineInStanza,
} from './songStructure.js'

// A tiny v2 content: one melody 'A' with 3 lines, each a single bar of 2 plain quarter notes,
// and one worded verse whose syllables map 1:1 onto the 6 note-slots (l1: a b, l2: c d, l3: e f).
function makeContent() {
  const seg = (note) => ({ type: 'segment', note, lyric: '' })
  const line = (n1, n2) => [seg(n1), { type: 'bar' }, seg(n2)] // "n1 | n2" — one bar-line, 2 notes
  return {
    stanzas: [{ id: 'A', lines: [line('1', '2'), line('3', '4'), line('5', '6')] }],
    arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: ['a', 'b', 'c', 'd', 'e', 'f'] }],
  }
}
const notesOfLine = (ln) => (ln || []).filter((it) => it.type === 'segment').map((s) => s.note).join('')
const lineNotes = (c) => c.stanzas[0].lines.map(notesOfLine)
const words = (c) => c.arrangement[0].syllables

describe('pasteLineAt — line lands at the chosen index, not the end', () => {
  it('pastes a copied line BEFORE index 1 (middle), not appended', () => {
    const c = makeContent()
    const clip = copyLine(c, { stanzaId: 'A', lineIndex: 2 }) // copy line 3 ("56")
    const out = pasteLineAt(c, 'A', 1, clip) // insert before line index 1
    expect(lineNotes(out)).toEqual(['12', '56', '34', '56'])
  })
  it('index === line count appends at the end (same as the old behaviour)', () => {
    const c = makeContent()
    const clip = copyLine(c, { stanzaId: 'A', lineIndex: 0 })
    const atEnd = pasteLineAt(c, 'A', 3, clip)
    const oldWay = pasteLineInStanza(c, 'A', clip)
    expect(lineNotes(atEnd)).toEqual(lineNotes(oldWay))
    expect(lineNotes(atEnd)).toEqual(['12', '34', '56', '12'])
  })
  it('keeps existing verse words under their notes when inserting mid-melody', () => {
    const c = makeContent()
    const clip = copyLine(c, { stanzaId: 'A', lineIndex: 0 }) // 2 note-slots
    const out = pasteLineAt(c, 'A', 1, clip) // insert before line 1 → 2 blank slots open at offset 2
    // a b | (blank blank for pasted line) | c d | e f
    expect(words(out)).toEqual(['a', 'b', '', '', 'c', 'd', 'e', 'f'])
  })
})

describe('pasteBarAt — bar lands at the chosen index within a line', () => {
  it('pastes a copied bar BEFORE bar 0 (start of line), not at the end', () => {
    const c = makeContent()
    // each line is "n1 | n2" → 2 bars of 1 note each. copy line 2's first bar = note "5"
    const clip = copyBar(c, { stanzaId: 'A', lineIndex: 2, barOrdinal: 0 })
    const out = pasteBarAt(c, 'A', 0, 0, clip) // insert before bar 0 of line 0
    expect(notesOfLine(out.stanzas[0].lines[0])).toEqual('512') // 5, then 1, 2
  })
  it('index === bar count appends the bar at the end of the line (old behaviour)', () => {
    const c = makeContent()
    const clip = copyBar(c, { stanzaId: 'A', lineIndex: 0, barOrdinal: 0 }) // note "1"
    const nBars = 2
    const atEnd = pasteBarAt(c, 'A', 0, nBars, clip)
    const oldWay = pasteBarInLine(c, 'A', 0, clip)
    expect(notesOfLine(atEnd.stanzas[0].lines[0])).toEqual(notesOfLine(oldWay.stanzas[0].lines[0]))
    expect(notesOfLine(atEnd.stanzas[0].lines[0])).toEqual('121')
  })
  it('opens a blank word-slot at the insertion so following words stay aligned', () => {
    const c = makeContent()
    const clip = copyBar(c, { stanzaId: 'A', lineIndex: 0, barOrdinal: 0 }) // 1 note-slot
    const out = pasteBarAt(c, 'A', 0, 1, clip) // insert before bar 1 (between the 2 notes of line 0)
    // line0 was "a b"; a blank opens at flat offset 1 → a _ b, then c d e f
    expect(words(out)).toEqual(['a', '', 'b', 'c', 'd', 'e', 'f'])
  })
})

describe('moveLineTo — one drop reorders + carries words', () => {
  it('moves line 0 to index 2 and drags its words with it', () => {
    const c = makeContent()
    const out = moveLineTo(c, 'A', 0, 2)
    expect(lineNotes(out)).toEqual(['34', '56', '12'])
    expect(words(out)).toEqual(['c', 'd', 'e', 'f', 'a', 'b'])
  })
  it('moves line 2 up to the front', () => {
    const c = makeContent()
    const out = moveLineTo(c, 'A', 2, 0)
    expect(lineNotes(out)).toEqual(['56', '12', '34'])
    expect(words(out)).toEqual(['e', 'f', 'a', 'b', 'c', 'd'])
  })
  it('no-op when from === to', () => {
    const c = makeContent()
    expect(moveLineTo(c, 'A', 1, 1)).toBe(c)
  })
})

describe('moveBarTo — reorder bars within a line', () => {
  it('moves bar 0 to index 1 (swap the two bars of line 0)', () => {
    const c = makeContent()
    const out = moveBarTo(c, 'A', 0, 0, 1)
    expect(notesOfLine(out.stanzas[0].lines[0])).toEqual('21')
  })
  it('no-op when from === to', () => {
    const c = makeContent()
    expect(moveBarTo(c, 'A', 0, 1, 1)).toBe(c)
  })
})
