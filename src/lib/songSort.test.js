// B131 — the point of songSort.js is that a list of songs has ONE defined order, no matter
// what order the database handed it over in. So most of these tests feed the SAME songs in
// several shuffled orders and assert the output is identical every time (determinism), on top
// of the plain "is it sorted right" checks.
import { describe, it, expect } from 'vitest'
import {
  SORT_OPTIONS,
  PICKABLE_SORTS,
  DEFAULT_SORT,
  sortSongs,
  sortOption,
  isSortId,
} from './songSort.js'

const ids = (list) => list.map((s) => s.id)

// Rotate a list into every possible starting position → several different input orders of the
// same set. If sorting is deterministic, all of them must produce the same output.
function rotations(list) {
  return list.map((_, i) => [...list.slice(i), ...list.slice(0, i)])
}
function allSortEqual(list, sortBy) {
  const outs = rotations(list).map((input) => ids(sortSongs(input, sortBy)))
  return { first: outs[0], every: outs.every((o) => String(o) === String(outs[0])) }
}

// เล่มเด็กเล็ก — พี่เปา's case: not one song has a number.
const DEK_LEK = [
  { id: 'c', number: null, title_th: 'พระเจ้ารักฉัน' },
  { id: 'a', number: null, title_th: 'กอดพระเยซู' },
  { id: 'd', number: null, title_th: 'สรรเสริญพระเจ้า' },
  { id: 'b', number: null, title_th: 'ขอบคุณพระเจ้า' },
]

describe('the number-less book (พี่เปา): ก-ฮ and the same every single time', () => {
  it('orders ก-ฮ by title', () => {
    expect(ids(sortSongs(DEK_LEK, 'number'))).toEqual(['a', 'b', 'c', 'd'])
  })
  it('same result from every input order — number sort', () => {
    const { first, every } = allSortEqual(DEK_LEK, 'number')
    expect(first).toEqual(['a', 'b', 'c', 'd'])
    expect(every).toBe(true)
  })
  it('same result from every input order — title sort', () => {
    const { first, every } = allSortEqual(DEK_LEK, 'title')
    expect(first).toEqual(['a', 'b', 'c', 'd'])
    expect(every).toBe(true)
  })
  it('repeating the same sort many times never drifts', () => {
    const runs = []
    for (let i = 0; i < 20; i++) runs.push(String(ids(sortSongs(DEK_LEK, 'number'))))
    expect(new Set(runs).size).toBe(1)
  })
})

describe('number sort', () => {
  // a mixed book: some numbered, some not, plus two rows sharing a number.
  const MIXED = [
    { id: 'n50', number: 50, title_th: 'ห้าสิบ' },
    { id: 'x2', number: null, title_th: 'ขอบคุณ' },
    { id: 'n5', number: 5, title_th: 'ห้า' },
    { id: 'x1', number: null, title_th: 'กราบ' },
    { id: 'n5b', number: 5, title_th: 'ห้าอีกเพลง' },
    { id: 'n200', number: 200, title_th: 'สองร้อย' },
  ]
  it('numbers ascending first, then every number-less song, ก-ฮ inside that group', () => {
    expect(ids(sortSongs(MIXED, 'number'))).toEqual(['n5', 'n5b', 'n50', 'n200', 'x1', 'x2'])
  })
  it('a numbered song NEVER lands after a number-less one, from any input order', () => {
    for (const input of rotations(MIXED)) {
      const out = ids(sortSongs(input, 'number'))
      const lastNumbered = Math.max(out.indexOf('n5'), out.indexOf('n5b'), out.indexOf('n50'), out.indexOf('n200'))
      const firstBlank = Math.min(out.indexOf('x1'), out.indexOf('x2'))
      expect(lastNumbered).toBeLessThan(firstBlank)
    }
  })
  it('is deterministic across input orders, incl. the tied number', () => {
    const { first, every } = allSortEqual(MIXED, 'number')
    expect(first).toEqual(['n5', 'n5b', 'n50', 'n200', 'x1', 'x2'])
    expect(every).toBe(true)
  })
  it('treats a numeric string like a number, and garbage like "no number"', () => {
    const rows = [
      { id: 'bad', number: 'ไม่ใช่เลข', title_th: 'ก' },
      { id: 'str', number: '7', title_th: 'ข' },
      { id: 'two', number: 2, title_th: 'ค' },
    ]
    expect(ids(sortSongs(rows, 'number'))).toEqual(['two', 'str', 'bad'])
  })
})

describe('title sort', () => {
  const ROWS = [
    { id: 'b', number: 1, title_th: 'ขอบคุณพระเจ้า' },
    { id: 'c', number: 2, title_th: 'สรรเสริญ' },
    { id: 'a', number: 99, title_th: 'กอดพระเยซู' },
  ]
  it('is ก-ฮ by title_th and ignores the number entirely', () => {
    expect(ids(sortSongs(ROWS, 'title'))).toEqual(['a', 'b', 'c'])
  })
  it('songs with no title go last', () => {
    const rows = [
      { id: 'blank', number: 1, title_th: '   ' },
      { id: 'none', number: 2 },
      { id: 'has', number: 3, title_th: 'สรรเสริญ' },
    ]
    const out = ids(sortSongs(rows, 'title'))
    expect(out[0]).toBe('has')
    expect(out.slice(1).sort()).toEqual(['blank', 'none'])
  })
  it('is deterministic across input orders', () => {
    expect(allSortEqual(ROWS, 'title').every).toBe(true)
  })
})

describe('manual / relevance / unknown keep the order untouched', () => {
  const ROWS = [
    { id: 'z', number: 99, title_th: 'สรรเสริญ' },
    { id: 'a', number: null, title_th: 'กอด' },
    { id: 'm', number: 5, title_th: 'ขอบคุณ' },
  ]
  it('manual returns exactly the incoming order', () => {
    expect(ids(sortSongs(ROWS, 'manual'))).toEqual(['z', 'a', 'm'])
  })
  it('relevance returns exactly the incoming order (the score order stands)', () => {
    expect(ids(sortSongs(ROWS, 'relevance'))).toEqual(['z', 'a', 'm'])
  })
  it('an unknown sort id behaves like manual and does not throw', () => {
    expect(ids(sortSongs(ROWS, 'ไม่มีวิธีนี้'))).toEqual(['z', 'a', 'm'])
    expect(ids(sortSongs(ROWS, undefined))).toEqual(['m', 'z', 'a']) // omitted → the default
    expect(ids(sortSongs(ROWS, null))).toEqual(['z', 'a', 'm'])
  })
})

describe('never mutates the caller’s array', () => {
  it('leaves the input list and its order alone', () => {
    const rows = [
      { id: 'b', number: 9, title_th: 'ข' },
      { id: 'a', number: 1, title_th: 'ก' },
    ]
    const snapshot = ids(rows)
    const out = sortSongs(rows, 'number')
    expect(ids(rows)).toEqual(snapshot)
    expect(out).not.toBe(rows)
    expect(ids(out)).toEqual(['a', 'b'])
  })
})

describe('bad data never throws', () => {
  it('missing / empty / non-array input → empty list', () => {
    expect(sortSongs([], 'number')).toEqual([])
    expect(sortSongs(undefined, 'number')).toEqual([])
    expect(sortSongs(null, 'title')).toEqual([])
    expect(sortSongs('ไม่ใช่รายการ', 'number')).toEqual([])
  })
  it('rows missing every field, and null rows, sort without throwing', () => {
    const rows = [{}, null, { id: 1 }, { title_th: 'ก' }, undefined]
    expect(() => sortSongs(rows, 'number')).not.toThrow()
    expect(() => sortSongs(rows, 'title')).not.toThrow()
    expect(sortSongs(rows, 'number')).toHaveLength(5)
  })
})

describe('the methods are data a screen can loop over', () => {
  it('every option has an id, an i18n label key and a compare slot', () => {
    for (const o of SORT_OPTIONS) {
      expect(typeof o.id).toBe('string')
      expect(o.labelKey).toMatch(/^list\./)
      expect(o.compare === null || typeof o.compare === 'function').toBe(true)
    }
    expect(SORT_OPTIONS.map((o) => o.id)).toEqual(['number', 'title', 'manual', 'relevance'])
  })
  it('the buttons a screen renders = the 2 P’Aim scoped (เลขข้อ · ชื่อเพลง)', () => {
    expect(PICKABLE_SORTS.map((o) => o.id)).toEqual(['number', 'title'])
  })
  it('the default is เลขข้อ, and lookups work', () => {
    expect(DEFAULT_SORT).toBe('number')
    expect(sortOption('title').labelKey).toBe('list.sortTitle')
    expect(sortOption('nope')).toBe(null)
    expect(isSortId('manual')).toBe(true)
    expect(isSortId('nope')).toBe(false)
  })
})
