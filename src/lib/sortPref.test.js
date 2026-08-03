// m1.wpa.24.us01 — the per-BOOK sort memory. The point of these cases is the one thing
// พี่เปา corrected the team on: two books must be able to sit on two different sorts at the
// same time. A test that only ever touches one book would pass on a global setting too.
import { describe, it, expect, beforeEach } from 'vitest'
import { sortByBook, bookSort, setBookSort } from './sortPref.js'
import { DEFAULT_SORT, PICKABLE_SORTS } from './songSort.js'

const KEY = 'pleng.sortByBook'

describe('sortPref — each book remembers its own sort', () => {
  beforeEach(() => {
    localStorage.clear()
    sortByBook.value = {}
  })

  it('a book never touched falls back to the default sort', () => {
    expect(bookSort('lem-yai')).toBe(DEFAULT_SORT)
    expect(DEFAULT_SORT).toBe('number') // first visit lists by number
  })

  // THE acceptance criterion: เล่มใหญ่ = ตามเลข · เด็กเล็ก = ตามชื่อ, at the same time.
  it('holds a different sort per book — one book does not overwrite another', () => {
    setBookSort('lem-yai', 'number')
    setBookSort('dek-lek', 'title')
    expect(bookSort('lem-yai')).toBe('number')
    expect(bookSort('dek-lek')).toBe('title')

    // changing one leaves the other exactly as it was
    setBookSort('lem-yai', 'title')
    expect(bookSort('lem-yai')).toBe('title')
    expect(bookSort('dek-lek')).toBe('title')
    setBookSort('dek-lek', 'number')
    expect(bookSort('lem-yai')).toBe('title')
    expect(bookSort('dek-lek')).toBe('number')
  })

  it('a third, untouched book still gets the default while others are set', () => {
    setBookSort('lem-yai', 'title')
    expect(bookSort('anuchon')).toBe(DEFAULT_SORT)
  })

  it('accepts every sort the screen shows a button for', () => {
    for (const o of PICKABLE_SORTS) {
      setBookSort('lem-yai', o.id)
      expect(bookSort('lem-yai')).toBe(o.id)
    }
  })

  it('ignores a sort that has no button (manual/relevance) and any junk', () => {
    setBookSort('lem-yai', 'title')
    setBookSort('lem-yai', 'manual') // real id, but not pickable → no button could undo it
    setBookSort('lem-yai', 'relevance')
    setBookSort('lem-yai', 'nonsense')
    setBookSort('lem-yai', null)
    expect(bookSort('lem-yai')).toBe('title')
  })

  it('ignores a missing book code instead of storing it', () => {
    setBookSort(null, 'title')
    setBookSort('', 'title')
    expect(sortByBook.value).toEqual({})
    expect(bookSort(null)).toBe(DEFAULT_SORT)
  })

  it('persists the whole map so the choices survive a reload', () => {
    setBookSort('lem-yai', 'number')
    setBookSort('dek-lek', 'title')
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({
      'lem-yai': 'number',
      'dek-lek': 'title',
    })
  })

  it('survives corrupt or hostile storage without stranding a book', () => {
    // a stale/hand-edited value must not leave a book on a sort with no button to leave it
    sortByBook.value = { 'lem-yai': 'manual', 'dek-lek': 'title' }
    expect(bookSort('lem-yai')).toBe(DEFAULT_SORT)
    expect(bookSort('dek-lek')).toBe('title')
  })
})
