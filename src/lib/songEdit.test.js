import { describe, it, expect } from 'vitest'
import { noteBoxes, boxIndexForSlot, setNotePitch, locateSegment, withNotePitch } from './songEdit.js'

describe('noteBoxes', () => {
  it('splits on whitespace; empty → one blank slot', () => {
    expect(noteBoxes('1 2 3')).toEqual(['1', '2', '3'])
    expect(noteBoxes('  1   2 ')).toEqual(['1', '2'])
    expect(noteBoxes('')).toEqual([''])
    expect(noteBoxes(null)).toEqual([''])
  })
})

describe('boxIndexForSlot', () => {
  it('maps a slot to its box token index (plain)', () => {
    expect(boxIndexForSlot('1 2 3', 0)).toBe(0)
    expect(boxIndexForSlot('1 2 3', 2)).toBe(2)
    expect(boxIndexForSlot('1 2 3', 3)).toBe(-1)
  })
  it('skips ( ) { } structure brackets (they bear no slot)', () => {
    // boxes: (  1  2  )  → slots 0,1 live on box idx 1,2
    expect(boxIndexForSlot('( 1 2 )', 0)).toBe(1)
    expect(boxIndexForSlot('( 1 2 )', 1)).toBe(2)
  })
  it('a held "-" box keeps its own slot', () => {
    // boxes: 1  -  2 → slots 0,1,2 (the hold is a slot, not a bracket)
    expect(boxIndexForSlot('1 - 2', 1)).toBe(1)
    expect(boxIndexForSlot('1 - 2', 2)).toBe(2)
  })
})

describe('setNotePitch', () => {
  it('overwrites the pitch of the chosen slot', () => {
    expect(setNotePitch('1 2 3', 1, '5')).toBe('1 5 3')
  })
  it('keeps accidental / octave / underline marks around the digit', () => {
    expect(setNotePitch('b.5_ 2', 0, '3')).toBe('b.3_ 2')
    expect(setNotePitch("5' 2", 0, '1')).toBe("1' 2")
  })
  it('turns a held "-" or rest "0" box into the typed note', () => {
    expect(setNotePitch('1 - 3', 1, '2')).toBe('1 2 3')
    expect(setNotePitch('1 0 3', 1, '4')).toBe('1 4 3')
  })
  it('rejects an out-of-range slot or a non 0-7 key (unchanged)', () => {
    expect(setNotePitch('1 2 3', 9, '5')).toBe('1 2 3')
    expect(setNotePitch('1 2 3', 0, '9')).toBe('1 2 3')
    expect(setNotePitch('1 2 3', 0, 'x')).toBe('1 2 3')
  })
})

// a tiny v2 song: one stanza 'A', two lines; a second arrangement verse reuses stanza A
const song = () => ({
  version: 2,
  key: 'C',
  stanzas: [
    {
      id: 'A',
      lines: [
        [{ type: 'segment', note: '1 2 3', chord: 'C' }, { type: 'bar' }, { type: 'segment', note: '4 5' }],
        [{ type: 'segment', note: '5 5 5' }],
      ],
    },
  ],
  arrangement: [
    { stanza: 'A', label: '', syllables: [] },
    { stanza: 'A', label: 'ข้อ 2', syllables: [] },
  ],
})

describe('locateSegment', () => {
  it('finds the si-th segment in the source line', () => {
    const c = song()
    const rline = { _stanza: 'A', _stanzaLine: 0 }
    expect(locateSegment(c, rline, 0)).toEqual({ stanzaIndex: 0, lineIndex: 0, segIndex: 0 })
    // si=1 is the SECOND segment — after the {type:'bar'} item (segIndex 2)
    expect(locateSegment(c, rline, 1)).toEqual({ stanzaIndex: 0, lineIndex: 0, segIndex: 2 })
  })
  it('returns null for an unknown stanza / missing segment', () => {
    expect(locateSegment(song(), { _stanza: 'Z', _stanzaLine: 0 }, 0)).toBeNull()
    expect(locateSegment(song(), { _stanza: 'A', _stanzaLine: 0 }, 9)).toBeNull()
  })
})

describe('withNotePitch', () => {
  it('overwrites one note, structurally sharing untouched parts', () => {
    const before = song()
    const after = withNotePitch(before, { resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 0, syk: 1 }, '7')
    // the edited segment reflects the change
    expect(after.stanzas[0].lines[0][0].note).toBe('1 7 3')
    // original is untouched (pure)
    expect(before.stanzas[0].lines[0][0].note).toBe('1 2 3')
    // untouched line shares its reference (cheap update, no full clone)
    expect(after.stanzas[0].lines[1]).toBe(before.stanzas[0].lines[1])
  })
  it('edits the second segment of a line (past a bar item)', () => {
    const after = withNotePitch(song(), { resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 1, syk: 0 }, '1')
    expect(after.stanzas[0].lines[0][2].note).toBe('1 5')
  })
  it('returns the same content when the edit is a no-op', () => {
    const c = song()
    expect(withNotePitch(c, { resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 0, syk: 0 }, '1')).toBe(c)
  })
})
