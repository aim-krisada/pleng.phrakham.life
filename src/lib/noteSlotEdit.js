// ใบ v3/pleng#122 — words are a flat list per ท่อน, one entry per note slot of its melody (see
// syllableSlots). When a note cell's text changes so that it bears MORE or FEWER slots (a note
// typed in, a box cleared, two boxes merged, one split in two …), the words of every OTHER note
// must stay where they are: the new notes get empty word slots, the removed notes take their
// words with them (MuseScore/Sibelius/Dorico: lyrics belong to their note).
//
// noteSlotEdit(oldNote, newNote, fromBox?) → null when the slot count did not change, else
//   { at, del, ins } — at slot `at` of this cell (0 = its first slot), remove `del` word slots
//   or insert `ins` empty ones (one of the two is 0).
// It compares the cells box by box (a box = one space-separated token): the boxes that are the
// same at the start and at the end are kept with their words, the changed middle keeps as many
// words as it still has notes (left to right) and grows or shrinks at its end.
// `fromBox` (optional) = the first box the edit touched, counted among the non-empty boxes. When
// the same note repeats ("5 5 5"), text alone cannot tell which one went; the box being typed in
// can, so the kept start never reaches past it.
import { syllableSlots } from './notation.js'

const boxesOf = (s) => {
  const t = (s || '').trim()
  return t ? t.split(/\s+/) : []
}
const slotsOf = (boxes) => boxes.reduce((n, b) => n + syllableSlots(b), 0)

export function noteSlotEdit(oldNote, newNote, fromBox) {
  const a = boxesOf(oldNote)
  const b = boxesOf(newNote)
  if (slotsOf(a) === slotsOf(b)) return null
  let p = 0
  const pMax = Math.min(a.length, b.length, Number.isInteger(fromBox) && fromBox >= 0 ? fromBox : Infinity)
  while (p < pMax && a[p] === b[p]) p++
  let s = 0
  const sMax = Math.min(a.length, b.length) - p
  while (s < sMax && a[a.length - 1 - s] === b[b.length - 1 - s]) s++
  const before = slotsOf(a.slice(0, p))
  const oldMid = slotsOf(a.slice(p, a.length - s))
  const newMid = slotsOf(b.slice(p, b.length - s))
  if (newMid > oldMid) return { at: before + oldMid, del: 0, ins: newMid - oldMid }
  return { at: before + newMid, del: oldMid - newMid, ins: 0 }
}
