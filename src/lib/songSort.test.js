// B131 — songSort.js is the ONE place that orders a song list. The point of these tests is
// DETERMINISM: the bug was that number-less songs had no defined order, so the same เล่ม could
// list the same songs differently on two loads. Anything that only checks "is it sorted" would
// have passed on the buggy code too — so the core cases feed the SAME songs in many different
// arrival orders and assert one single result.
import { describe, it, expect } from 'vitest'
import { sortSongs } from './songSort.js'

// Minimal fixtures — only the fields songSort reads.
const s = (id, number, title_th) => ({ id, number, title_th })

// Every rotation of a list = the same set of songs arriving in a different order (which is
// exactly what an unordered DB group hands us).
function rotations(list) {
  return list.map((_, i) => [...list.slice(i), ...list.slice(0, i)])
}

const titles = (list) => list.map((x) => x.title_th)
const ids = (list) => list.map((x) => x.id)

describe('sortSongs — a book with NO numbers at all (the เด็กเล็ก case)', () => {
  // 52 of เด็กเล็ก's 53 songs have no number, so this is nearly the whole book.
  const book = [
    s(1, null, 'ขอบพระคุณ'),
    s(2, null, 'กราบพระบาท'),
    s(3, null, 'ฮาเลลูยา'),
    s(4, null, 'สรรเสริญ'),
  ]
  const expected = ['กราบพระบาท', 'ขอบพระคุณ', 'สรรเสริญ', 'ฮาเลลูยา']

  it('orders them ก-ฮ instead of leaving them unordered', () => {
    expect(titles(sortSongs(book))).toEqual(expected)
  })

  it('gives the SAME order for every arrival order (deterministic)', () => {
    for (const arrival of rotations(book)) {
      expect(titles(sortSongs(arrival))).toEqual(expected)
    }
    // reversed input too — not just rotations
    expect(titles(sortSongs([...book].reverse()))).toEqual(expected)
  })
})

describe('sortSongs — songs with a number always come before songs without', () => {
  const mixed = [
    s('a', null, 'ขอบพระคุณ'),
    s('b', 200, 'ฮาเลลูยา'),
    s('c', null, 'กราบพระบาท'),
    s('d', 5, 'สรรเสริญ'),
  ]

  it('numbers ascending first, then the number-less group ก-ฮ', () => {
    expect(ids(sortSongs(mixed))).toEqual(['d', 'b', 'c', 'a'])
  })

  it('a numbered song never falls behind a number-less one, in any arrival order', () => {
    for (const arrival of rotations(mixed)) {
      const out = sortSongs(arrival)
      expect(ids(out)).toEqual(['d', 'b', 'c', 'a'])
      const firstBlank = out.findIndex((x) => x.number == null)
      const lastNumbered = out.reduce((acc, x, i) => (x.number != null ? i : acc), -1)
      expect(lastNumbered).toBeLessThan(firstBlank)
    }
  })

  it('a blank-string number counts as "no number", not as 0', () => {
    const out = sortSongs([s('x', '', 'ฮาเลลูยา'), s('y', 5, 'สรรเสริญ')])
    expect(ids(out)).toEqual(['y', 'x'])
  })
})

describe('sortSongs — equal keys still resolve the same way every time', () => {
  it('same number → decided by title, not by arrival order', () => {
    const dup = [s('a', 7, 'ฮาเลลูยา'), s('b', 7, 'กราบพระบาท')]
    expect(ids(sortSongs(dup))).toEqual(['b', 'a'])
    expect(ids(sortSongs([...dup].reverse()))).toEqual(['b', 'a'])
  })

  it('same number AND same title → decided by id (total order, never "equal")', () => {
    const twin = [s('b2', 7, 'สรรเสริญ'), s('a1', 7, 'สรรเสริญ')]
    expect(ids(sortSongs(twin))).toEqual(['a1', 'b2'])
    expect(ids(sortSongs([...twin].reverse()))).toEqual(['a1', 'b2'])
  })

  it('a missing title sorts last inside its group but does not throw', () => {
    const out = sortSongs([s('a', null, ''), s('b', null, 'ฮาเลลูยา')])
    expect(ids(out)).toEqual(['b', 'a'])
  })
})

describe('sortSongs — does not mutate the caller’s array', () => {
  it('returns a new array and leaves the input untouched', () => {
    const input = [s(1, null, 'ฮาเลลูยา'), s(2, null, 'กราบพระบาท')]
    const before = ids(input)
    const out = sortSongs(input)
    expect(out).not.toBe(input)
    expect(ids(input)).toEqual(before)
    expect(ids(out)).toEqual([2, 1])
  })
})

describe('sortSongs — bad data must never throw', () => {
  it('survives null/undefined/empty input', () => {
    expect(sortSongs(null)).toEqual([])
    expect(sortSongs(undefined)).toEqual([])
    expect(sortSongs([])).toEqual([])
    expect(sortSongs('not an array')).toEqual([])
  })

  it('survives rows that are null or missing every field', () => {
    const junk = [null, {}, s('a', 5, 'สรรเสริญ'), undefined, { number: 'ไม่ใช่เลข' }]
    expect(() => sortSongs(junk)).not.toThrow()
    const out = sortSongs(junk)
    expect(out).toHaveLength(5)
    expect(out[0]).toEqual(s('a', 5, 'สรรเสริญ')) // the only real numbered song leads
  })

  it('a non-numeric number is treated as "no number", not as NaN-equal', () => {
    const out = sortSongs([
      { id: 'a', number: 'ไม่ใช่เลข', title_th: 'ฮาเลลูยา' },
      { id: 'b', number: 'ไม่ใช่เลข', title_th: 'กราบพระบาท' },
      { id: 'c', number: 3, title_th: 'สรรเสริญ' },
    ])
    expect(ids(out)).toEqual(['c', 'b', 'a'])
  })
})

describe('sortSongs — an unrecognised sortBy keeps the incoming order', () => {
  const list = [s(1, null, 'ฮาเลลูยา'), s(2, null, 'กราบพระบาท')]

  it('does not throw and does not reorder', () => {
    expect(ids(sortSongs(list, 'no-such-order'))).toEqual([1, 2])
    expect(ids(sortSongs(list, null))).toEqual([1, 2])
    expect(ids(sortSongs(list, ''))).toEqual([1, 2])
  })

  it('still returns a copy, not the caller’s array', () => {
    expect(sortSongs(list, 'no-such-order')).not.toBe(list)
  })

  it("'number' is the implemented order", () => {
    expect(ids(sortSongs(list, 'number'))).toEqual([2, 1])
  })
})
