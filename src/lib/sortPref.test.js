// m1.wpa.24.us01 — the per-BOOK sort memory and the two-state tap rule.
//
// Two things carry the acceptance criteria here:
//   · two books must sit on two DIFFERENT sorts at the same time (พี่เปา) — a test that only
//     ever touches one book would pass on a global setting too;
//   · tapping cycles between exactly TWO states, never a third "off" (พี่เอม).
import { describe, it, expect, beforeEach } from 'vitest'
import { sortByBook, bookSortState, bookSort, bookDir, chooseSort, setBookSort } from './sortPref.js'
import { DEFAULT_SORT, DEFAULT_DIR, PICKABLE_SORTS, ASC, DESC } from './songSort.js'

const KEY = 'pleng.sortByBook'

describe('sortPref — each book remembers its own sort', () => {
  beforeEach(() => {
    localStorage.clear()
    sortByBook.value = {}
  })

  it('a book never touched starts on เลขข้อ น้อยไปมาก', () => {
    expect(bookSortState('lem-yai')).toEqual({ by: DEFAULT_SORT, dir: DEFAULT_DIR })
    expect(DEFAULT_SORT).toBe('number')
    expect(DEFAULT_DIR).toBe(ASC)
  })

  // THE acceptance criterion: เล่มใหญ่ = ตามเลข · เด็กเล็ก = ตามชื่อ, at the same time.
  it('holds a different sort per book — one book does not overwrite another', () => {
    setBookSort('lem-yai', 'number')
    setBookSort('dek-lek', 'title')
    expect(bookSort('lem-yai')).toBe('number')
    expect(bookSort('dek-lek')).toBe('title')

    setBookSort('lem-yai', 'title')
    expect(bookSort('dek-lek')).toBe('title') // untouched
    setBookSort('dek-lek', 'number')
    expect(bookSort('lem-yai')).toBe('title') // still untouched
  })

  it('the direction is remembered per book too, not just the sort', () => {
    setBookSort('lem-yai', 'number', DESC)
    setBookSort('dek-lek', 'number', ASC)
    expect(bookDir('lem-yai')).toBe(DESC)
    expect(bookDir('dek-lek')).toBe(ASC)
  })

  it('a third, untouched book still gets the defaults while others are set', () => {
    setBookSort('lem-yai', 'title', DESC)
    expect(bookSortState('anuchon')).toEqual({ by: DEFAULT_SORT, dir: DEFAULT_DIR })
  })
})

describe('sortPref — tapping cycles two states and only two', () => {
  beforeEach(() => {
    localStorage.clear()
    sortByBook.value = {}
  })

  it('tapping the sort already in force flips its direction, back and forth forever', () => {
    chooseSort('lem-yai', 'number') // already the default sort → this is a flip
    expect(bookSortState('lem-yai')).toEqual({ by: 'number', dir: DESC })
    chooseSort('lem-yai', 'number')
    expect(bookSortState('lem-yai')).toEqual({ by: 'number', dir: ASC })
    chooseSort('lem-yai', 'number')
    expect(bookSortState('lem-yai')).toEqual({ by: 'number', dir: DESC })
  })

  // พี่เอม: "กดสลับแค่ 2 สถานะพอ" — no tap count may ever produce a third state.
  it('never reaches a third state — 12 taps only ever yield asc or desc of that sort', () => {
    const seen = new Set()
    for (let i = 0; i < 12; i++) {
      chooseSort('lem-yai', 'title')
      const s = bookSortState('lem-yai')
      expect(s.by).toBe('title')
      seen.add(s.dir)
    }
    expect([...seen].sort()).toEqual([ASC, DESC])
  })

  it('tapping the OTHER sort switches to it and starts at น้อยไปมาก', () => {
    chooseSort('lem-yai', 'number') // → number/desc
    expect(bookDir('lem-yai')).toBe(DESC)
    chooseSort('lem-yai', 'title') // different sort → fresh, ascending
    expect(bookSortState('lem-yai')).toEqual({ by: 'title', dir: ASC })
  })

  it('flipping one book does not touch another', () => {
    setBookSort('dek-lek', 'title', ASC)
    chooseSort('lem-yai', 'number')
    chooseSort('lem-yai', 'number')
    expect(bookSortState('dek-lek')).toEqual({ by: 'title', dir: ASC })
  })
})

describe('sortPref — storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sortByBook.value = {}
  })

  it('accepts every sort the screen shows a button for', () => {
    for (const o of PICKABLE_SORTS) {
      setBookSort('lem-yai', o.id)
      expect(bookSort('lem-yai')).toBe(o.id)
    }
  })

  it('ignores a sort that has no button (manual/relevance) and any junk', () => {
    setBookSort('lem-yai', 'title')
    setBookSort('lem-yai', 'manual')
    setBookSort('lem-yai', 'relevance')
    setBookSort('lem-yai', 'nonsense')
    setBookSort('lem-yai', null)
    chooseSort('lem-yai', 'manual')
    expect(bookSort('lem-yai')).toBe('title')
  })

  it('ignores a missing book code instead of storing it', () => {
    setBookSort(null, 'title')
    chooseSort('', 'title')
    expect(sortByBook.value).toEqual({})
    expect(bookSortState(null)).toEqual({ by: DEFAULT_SORT, dir: DEFAULT_DIR })
  })

  it('persists sort AND direction so the choices survive a reload', () => {
    setBookSort('lem-yai', 'number', DESC)
    setBookSort('dek-lek', 'title', ASC)
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({
      'lem-yai': { by: 'number', dir: DESC },
      'dek-lek': { by: 'title', dir: ASC },
    })
  })

  it('survives corrupt or hostile storage without stranding a book', () => {
    sortByBook.value = { 'lem-yai': { by: 'manual', dir: DESC }, 'dek-lek': { by: 'title', dir: 'sideways' } }
    expect(bookSortState('lem-yai')).toEqual({ by: DEFAULT_SORT, dir: DEFAULT_DIR })
    expect(bookSortState('dek-lek')).toEqual({ by: 'title', dir: ASC }) // bad dir → ascending
  })

  // an entry written by the first build of this feature, before directions existed
  it('reads the older plain-string form and treats it as ascending', () => {
    sortByBook.value = { 'dek-lek': 'title' }
    expect(bookSortState('dek-lek')).toEqual({ by: 'title', dir: ASC })
  })
})
