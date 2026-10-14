// ใบ v3/pleng#122 — typing in a note cell can add or remove note slots. noteSlotEdit() says WHERE
// in the cell's slots the change happened and how many slots came or went, so the editor can
// open empty word slots for new notes and drop the words of removed notes (the rest stay put).
import { describe, it, expect } from 'vitest'
import { noteSlotEdit } from './noteSlotEdit.js'

describe('noteSlotEdit', () => {
  it('no change in slot count → null (a note changed its pitch, a held box became a note …)', () => {
    expect(noteSlotEdit('1 2 3', '1 5 3')).toBe(null)
    expect(noteSlotEdit('1 - 3', '1 2 3')).toBe(null)
    expect(noteSlotEdit('1 2', '( 1 2 )')).toBe(null) // brackets carry no word
    expect(noteSlotEdit('', '')).toBe(null)
  })
  it('a note added after another → one empty slot right after it', () => {
    expect(noteSlotEdit('3 4', '3 5 4')).toEqual({ at: 1, del: 0, ins: 1 })
    expect(noteSlotEdit('3 4', '3 4 5')).toEqual({ at: 2, del: 0, ins: 1 })
    expect(noteSlotEdit('', '5')).toEqual({ at: 0, del: 0, ins: 1 })
  })
  it('one box split in two (Space) → the first keeps its slot, the new one is added after it', () => {
    expect(noteSlotEdit('1 345 6', '1 34 5 6')).toEqual({ at: 2, del: 0, ins: 1 })
  })
  it('a note removed → its slot goes', () => {
    expect(noteSlotEdit('3 4 5', '3 5')).toEqual({ at: 1, del: 1, ins: 0 })
    expect(noteSlotEdit('3', '')).toEqual({ at: 0, del: 1, ins: 0 })
  })
  it('two boxes merged (Backspace at the start of a box) → the later one’s slot goes', () => {
    expect(noteSlotEdit('3 4 5', '34 5', 0)).toEqual({ at: 1, del: 1, ins: 0 })
  })
  it('the same note repeated: the box that was edited decides which slot goes', () => {
    expect(noteSlotEdit('5 5 5', '5 5')).toEqual({ at: 2, del: 1, ins: 0 }) // no hint: the last
    expect(noteSlotEdit('5 5 5', '5 5', 1)).toEqual({ at: 1, del: 1, ins: 0 })
    expect(noteSlotEdit('5 5 5', '5 5', 0)).toEqual({ at: 0, del: 1, ins: 0 })
    expect(noteSlotEdit('5 5', '5 5 5', 0)).toEqual({ at: 0, del: 0, ins: 1 })
  })
  it('brackets and unreadable boxes take no slot', () => {
    expect(noteSlotEdit('( 2 2 ) 7', '( 2 ) 7')).toEqual({ at: 1, del: 1, ins: 0 })
    expect(noteSlotEdit('1 2', '1 # 2')).toBe(null) // "#" alone is not a note yet
    expect(noteSlotEdit('1 # 2', '1 #4 2')).toEqual({ at: 1, del: 0, ins: 1 })
  })
})
