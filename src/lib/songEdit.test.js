import { describe, it, expect } from 'vitest'
import {
  noteBoxes, boxIndexForSlot, setNotePitch, locateSegment, withNotePitch,
  insertBoxAtSlot, removeBoxAtSlot, withInsertedNote, withDeletedNote, withRestAt,
  withOctaveShift, withAccidental, withClearedSyllable, withSetSyllable, withChord,
} from './songEdit.js'

const loc0 = (syk) => ({ resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 0, syk })
const oneNote = (note) => ({ version: 2, stanzas: [{ id: 'A', lines: [[{ type: 'segment', note }]] }], arrangement: [{ stanza: 'A', syllables: [] }] })
const noteOf = (c) => c.stanzas[0].lines[0][0].note

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

describe('insertBoxAtSlot / removeBoxAtSlot', () => {
  it('inserts a box at the slot, pushing later boxes right', () => {
    expect(insertBoxAtSlot('1 2 3', 1, '5')).toBe('1 5 2 3')
    expect(insertBoxAtSlot('1 2 3', 3, '5')).toBe('1 2 3 5') // past the end → append
    expect(insertBoxAtSlot('', 0, '5')).toBe('5') // empty segment
  })
  it('removes a box at the slot, pulling later boxes left', () => {
    expect(removeBoxAtSlot('1 2 3', 1)).toBe('1 3')
    expect(removeBoxAtSlot('5', 0)).toBe('') // last box → empty
    expect(removeBoxAtSlot('1 2', 9)).toBe('1 2') // out of range → unchanged
  })
})

// a stanza with words on BOTH verses, to prove the ripple keeps every verse aligned
const wordy = () => ({
  version: 2,
  key: 'C',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3' }]] }],
  arrangement: [
    { stanza: 'A', label: '', syllables: ['โอ', 'พระ', 'เจ้า'] },
    { stanza: 'A', label: 'ข้อ 2', syllables: ['รัก', 'มั่น', 'คง'] },
  ],
})

describe('withInsertedNote — grows the melody + ripples every linked verse', () => {
  it('inserts a note AFTER the cursor + opens a blank syllable slot there in ALL verses', () => {
    // cursor on slot 1 (note "2") → the new note lands after it: "1 2 4 3"
    const after = withInsertedNote(wordy(), { resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 0, syk: 1 }, '4')
    expect(after.stanzas[0].lines[0][0].note).toBe('1 2 4 3')
    // both verses gain a blank at index 2 (after "พระ"/"มั่น"), words stay under their notes
    expect(after.arrangement[0].syllables).toEqual(['โอ', 'พระ', '', 'เจ้า'])
    expect(after.arrangement[1].syllables).toEqual(['รัก', 'มั่น', '', 'คง'])
  })
})

describe('withDeletedNote — shrinks the melody + closes the slot in every verse', () => {
  it('deletes a note and pulls the words tight in ALL verses', () => {
    const after = withDeletedNote(wordy(), { resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 0, syk: 1 })
    expect(after.stanzas[0].lines[0][0].note).toBe('1 3')
    expect(after.arrangement[0].syllables).toEqual(['โอ', 'เจ้า'])
    expect(after.arrangement[1].syllables).toEqual(['รัก', 'คง'])
  })
  it('withRestAt leaves a rest (0) in place — no ripple, words stay put', () => {
    const before = wordy()
    const after = withRestAt(before, { resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 0, syk: 1 })
    expect(after.stanzas[0].lines[0][0].note).toBe('1 0 3') // middle note → rest, length kept
    expect(after.arrangement).toBe(before.arrangement) // words untouched (=== , no ripple)
    expect(after.arrangement[0].syllables).toEqual(['โอ', 'พระ', 'เจ้า'])
    expect(after.arrangement[1].syllables).toEqual(['รัก', 'มั่น', 'คง'])
  })
  it('withRestAt is a no-op on a note that is already a rest', () => {
    const c = { version: 2, stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 0 3' }]] }], arrangement: [{ stanza: 'A', syllables: [] }] }
    expect(withRestAt(c, { resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 0, syk: 1 })).toBe(c)
  })
  it('emptying a segment removes the whole segment — its chord goes too', () => {
    const c = {
      version: 2,
      stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '5', chord: 'G' }, { type: 'bar' }, { type: 'segment', note: '1', chord: 'C' }]] }],
      arrangement: [{ stanza: 'A', syllables: ['a', 'b'] }],
    }
    const after = withDeletedNote(c, { resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 0, syk: 0 })
    // the first segment (note '5' + chord G) is gone entirely; bar + second segment remain
    expect(after.stanzas[0].lines[0].map((it) => it.type + (it.chord ? ':' + it.chord : ''))).toEqual(['bar', 'segment:C'])
    expect(after.arrangement[0].syllables).toEqual(['b'])
  })
  it('an unrelated stanza is left untouched (delete)', () => {
    const c = {
      version: 2,
      stanzas: [
        { id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] },
        { id: 'B', lines: [[{ type: 'segment', note: '5 6' }]] },
      ],
      arrangement: [
        { stanza: 'A', syllables: ['a', 'b'] },
        { stanza: 'B', syllables: ['x', 'y'] },
      ],
    }
    const after = withDeletedNote(c, { resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 0, syk: 0 })
    expect(after.arrangement[0].syllables).toEqual(['b'])
    expect(after.arrangement[1]).toBe(c.arrangement[1]) // B verse untouched (===)
  })
})

describe('withClearedSyllable — clears just the one word, only in this verse', () => {
  it('blanks the selected word, keeps notes + other verses', () => {
    const before = wordy() // stanza A · v1 ['โอ','พระ','เจ้า'] · v2 ['รัก','มั่น','คง']
    const after = withClearedSyllable(before, { resolvedLine: { _stanza: 'A', _stanzaLine: 0, _entryIndex: 0 }, si: 0, syk: 1 })
    expect(after.arrangement[0].syllables).toEqual(['โอ', '', 'เจ้า']) // only 'พระ' blanked (mid-slot kept)
    expect(after.arrangement[1]).toBe(before.arrangement[1]) // verse 2 untouched (===)
    expect(after.stanzas[0].lines[0][0].note).toBe('1 2 3') // notes untouched
  })
  it('is a no-op on an already-blank word', () => {
    const c = { version: 2, stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] }], arrangement: [{ stanza: 'A', syllables: ['a'] }] }
    expect(withClearedSyllable(c, { resolvedLine: { _stanza: 'A', _stanzaLine: 0, _entryIndex: 0 }, si: 0, syk: 1 })).toBe(c)
  })
})

describe('withSetSyllable — live lyric typing (this verse only)', () => {
  it('sets the word at the cursor, keeping other verses ===', () => {
    const before = wordy()
    const after = withSetSyllable(before, { resolvedLine: { _stanza: 'A', _stanzaLine: 0, _entryIndex: 0 }, si: 0, syk: 1 }, 'ใหม่')
    expect(after.arrangement[0].syllables).toEqual(['โอ', 'ใหม่', 'เจ้า'])
    expect(after.arrangement[1]).toBe(before.arrangement[1]) // verse 2 untouched
  })
  it('pads a short verse up to the slot', () => {
    const c = { version: 2, stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3' }]] }], arrangement: [{ stanza: 'A', syllables: ['a'] }] }
    const after = withSetSyllable(c, { resolvedLine: { _stanza: 'A', _stanzaLine: 0, _entryIndex: 0 }, si: 0, syk: 2 }, 'z')
    expect(after.arrangement[0].syllables).toEqual(['a', '', 'z'])
  })
})

describe('withChord — set / clear the segment chord', () => {
  const chordSong = () => ({ version: 2, stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] }], arrangement: [{ stanza: 'A', syllables: [] }] })
  const loc = { resolvedLine: { _stanza: 'A', _stanzaLine: 0 }, si: 0 }
  it('sets a chord', () => {
    expect(withChord(chordSong(), loc, 'G').stanzas[0].lines[0][0].chord).toBe('G')
  })
  it('clears the chord with "" (keeps the note)', () => {
    const after = withChord(chordSong(), loc, '')
    expect(after.stanzas[0].lines[0][0].chord).toBe('')
    expect(after.stanzas[0].lines[0][0].note).toBe('1 2')
  })
  it('no-op when unchanged', () => {
    const c = chordSong()
    expect(withChord(c, loc, 'C')).toBe(c)
  })
})

describe('withOctaveShift', () => {
  it('up = drop a low dot, else add a high apostrophe', () => {
    expect(noteOf(withOctaveShift(oneNote('.5 1'), loc0(0), 1))).toBe('5 1') // low → middle
    expect(noteOf(withOctaveShift(oneNote('5 1'), loc0(0), 1))).toBe("5' 1") // middle → high
  })
  it('down = drop a high apostrophe, else add a low dot', () => {
    expect(noteOf(withOctaveShift(oneNote("5' 1"), loc0(0), -1))).toBe('5 1')
    expect(noteOf(withOctaveShift(oneNote('5 1'), loc0(0), -1))).toBe('.5 1')
  })
  it('leaves a rest (0) or hold (-) untouched', () => {
    const c = oneNote('0 -')
    expect(withOctaveShift(c, loc0(0), 1)).toBe(c)
    expect(withOctaveShift(c, loc0(1), -1)).toBe(c)
  })
})

describe('withAccidental', () => {
  it('adds, and toggles off when pressed again', () => {
    expect(noteOf(withAccidental(oneNote('5 1'), loc0(0), '#'))).toBe('#5 1')
    expect(noteOf(withAccidental(oneNote('#5 1'), loc0(0), '#'))).toBe('5 1') // toggle off
    expect(noteOf(withAccidental(oneNote('#5 1'), loc0(0), 'b'))).toBe('b5 1') // swap # → b
  })
  it('keeps a tie-end (~) marker in front of the accidental', () => {
    expect(noteOf(withAccidental(oneNote('~5'), loc0(0), 'b'))).toBe('~b5')
  })
})
