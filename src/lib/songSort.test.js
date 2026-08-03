// B131 — songSort.js is the ONE place that orders a song list. The point of these tests is
// DETERMINISM: the bug was that number-less songs had no defined order, so the same เล่ม could
// list the same songs differently on two loads. Anything that only checks "is it sorted" would
// have passed on the buggy code too — so the core cases feed the SAME songs in many different
// arrival orders and assert one single result.
import { describe, it, expect } from 'vitest'
import {
  sortSongs,
  SORT_OPTIONS,
  PICKABLE_SORTS,
  DEFAULT_SORT,
  ASC,
  DESC,
  isDir,
  flipDir,
  dirLabel,
  sortOption,
  isSortId,
} from './songSort.js'

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

// พี่เอม 3 ส.ค. 2569 — เพลงไม่มีเลขนับเป็น 0 จึงนำหน้าเวลาเรียงน้อยไปมาก ⛔ ไม่ถูกดันไปท้ายอีก
// เหตุผล: "ถ้าไม่มีเลขแล้วท้ายเสมอ โอกาสหลุดสูง" — ท้ายรายการ 242 แถวคือที่ที่ไม่มีใครเลื่อนไปเห็น
// กฎเดิม (numbered มาก่อน number-less เสมอ) เลิกใช้แล้ว
describe('sortSongs — เพลงไม่มีเลขนับเป็น 0 จึงมาก่อนเพลงที่มีเลข', () => {
  const mixed = [
    s('a', null, 'ขอบพระคุณ'),
    s('b', 200, 'ฮาเลลูยา'),
    s('c', null, 'กราบพระบาท'),
    s('d', 5, 'สรรเสริญ'),
  ]

  it('กลุ่มไม่มีเลข (=0) มาก่อน เรียง ก-ฮ ในกลุ่ม แล้วค่อยไล่เลขขึ้น', () => {
    expect(ids(sortSongs(mixed))).toEqual(['c', 'a', 'd', 'b'])
  })

  it('เพลงไม่มีเลขอยู่หัวรายการทุกลำดับที่ข้อมูลไหลเข้ามา', () => {
    for (const arrival of rotations(mixed)) {
      const out = sortSongs(arrival)
      expect(ids(out)).toEqual(['c', 'a', 'd', 'b'])
      const lastBlank = out.reduce((acc, x, i) => (x.number == null ? i : acc), -1)
      const firstNumbered = out.findIndex((x) => x.number != null)
      expect(lastBlank).toBeLessThan(firstNumbered)
    }
  })

  it('เลขที่เป็นสายอักขระว่าง นับเป็น 0', () => {
    const out = sortSongs([s('x', '', 'ฮาเลลูยา'), s('y', 5, 'สรรเสริญ')])
    expect(ids(out)).toEqual(['x', 'y'])
  })

  // เกณฑ์ "⛔ ห้ามหาย" ของเรื่องผู้ใช้ — ตรวจตรง ๆ ที่จำนวนกับการมีอยู่ ไม่ใช่ที่ตำแหน่ง
  it('ไม่มีเพลงไหนหายไป ไม่ว่าเรียงทิศไหน', () => {
    for (const dir of [ASC, DESC]) {
      const out = sortSongs(mixed, 'number', dir)
      expect(out).toHaveLength(4)
      expect(ids(out).sort()).toEqual(['a', 'b', 'c', 'd'])
    }
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

  // หลักเดียวกับเลขที่ไม่มี: ชื่อว่างคือค่าต่ำสุด ไม่ใช่เหตุให้ถูกผลักไปพ้นสายตา
  it('ชื่อว่างเป็นค่าต่ำสุด จึงมาก่อน และไม่ทำให้พัง', () => {
    const out = sortSongs([s('a', null, ''), s('b', null, 'ฮาเลลูยา')])
    expect(ids(out)).toEqual(['a', 'b'])
    expect(ids(sortSongs([s('b', null, 'ฮาเลลูยา'), s('a', null, '')]))).toEqual(['a', 'b'])
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
    // แถวขยะ (null · {} · เลขไม่ใช่ตัวเลข) ไม่มีเลข ⇒ นับเป็น 0 ⇒ เพลงจริงที่มีเลข 5 ไปอยู่ท้าย
    // ⚠️ ยกเว้นช่อง `undefined` — ภาษา JS ดันมันไปท้ายสุดเสมอและ "ไม่เรียก" ตัวเปรียบเทียบเลย
    //    (ข้อกำหนดของ Array.prototype.sort) จึงไปอยู่หลังสุดแม้เราไม่ได้สั่ง
    expect(out[4]).toBeUndefined()
    expect(out[3]).toEqual(s('a', 5, 'สรรเสริญ'))
  })

  it('เลขที่ไม่ใช่ตัวเลข นับเป็น 0 ⛔ ไม่ใช่ NaN ที่ทำให้เท่ากันหมด', () => {
    const out = sortSongs([
      { id: 'a', number: 'ไม่ใช่เลข', title_th: 'ฮาเลลูยา' },
      { id: 'b', number: 'ไม่ใช่เลข', title_th: 'กราบพระบาท' },
      { id: 'c', number: 3, title_th: 'สรรเสริญ' },
    ])
    expect(ids(out)).toEqual(['b', 'a', 'c'])
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

// ---- m1.wpa.24.us01 — วิธีเรียงตามชื่อ + ทิศทาง 2 สถานะ (พี่เอม 3 ส.ค. 2569) ----

describe('sortSongs — วิธีเรียงตามชื่อเพลง', () => {
  const rows = [s('a', 99, 'ฮาเลลูยา'), s('b', 1, 'กราบพระบาท'), s('c', 50, 'สรรเสริญ')]

  it('เรียง ก-ฮ ตามชื่อ ⛔ ไม่สนเลขข้อ', () => {
    expect(ids(sortSongs(rows, 'title'))).toEqual(['b', 'c', 'a'])
  })

  it('ให้ผลเดิมทุกลำดับที่ข้อมูลไหลเข้ามา', () => {
    for (const arrival of rotations(rows)) {
      expect(ids(sortSongs(arrival, 'title'))).toEqual(['b', 'c', 'a'])
    }
  })
})

describe('sortSongs — สลับทิศทาง มีแค่ 2 สถานะ', () => {
  const rows = [s('a', 3, 'ขอบพระคุณ'), s('b', 1, 'ฮาเลลูยา'), s('c', 2, 'กราบพระบาท')]

  it('เลขข้อ กลับหัวกลับหางได้', () => {
    expect(ids(sortSongs(rows, 'number', ASC))).toEqual(['b', 'c', 'a'])
    expect(ids(sortSongs(rows, 'number', DESC))).toEqual(['a', 'c', 'b'])
  })

  it('ชื่อเพลง กลับหัวกลับหางได้ และเป็นภาพกลับกันพอดี', () => {
    const up = ids(sortSongs(rows, 'title', ASC))
    expect(ids(sortSongs(rows, 'title', DESC))).toEqual([...up].reverse())
  })

  it('ไม่ใส่ทิศ หรือใส่ค่าเพี้ยน = น้อยไปมาก ⛔ ไม่พัง', () => {
    const up = ids(sortSongs(rows, 'number', ASC))
    expect(ids(sortSongs(rows, 'number'))).toEqual(up)
    expect(ids(sortSongs(rows, 'number', 'ตะแคง'))).toEqual(up)
    expect(ids(sortSongs(rows, 'number', null))).toEqual(up)
  })

  it('เพลงไม่มีเลขไปกับการกลับทิศด้วย (=0) หัวตอน ▲ ท้ายตอน ▼', () => {
    const mixed = [s('n1', 2, 'ข'), s('x1', null, 'ก'), s('n2', 5, 'ค'), s('x2', '', 'ฮ')]
    expect(ids(sortSongs(mixed, 'number', ASC))).toEqual(['x1', 'x2', 'n1', 'n2'])
    expect(ids(sortSongs(mixed, 'number', DESC))).toEqual(['n2', 'n1', 'x1', 'x2'])
  })

  it('มากไปน้อยก็ยังเป็นลำดับที่แน่นอน — ป้อนสลับลำดับก็ได้ผลเดิม', () => {
    const dup = [s('p', 4, 'เท่ากัน'), s('q', 4, 'เท่ากัน'), s('r', 9, 'อื่น')]
    const once = ids(sortSongs(dup, 'number', DESC))
    expect(ids(sortSongs([dup[2], dup[0], dup[1]], 'number', DESC))).toEqual(once)
    expect(ids(sortSongs([...dup].reverse(), 'number', DESC))).toEqual(once)
  })

  it('flipDir เด้งไปมาระหว่าง 2 ค่า ⛔ ไม่มีค่าที่ 3', () => {
    expect(flipDir(ASC)).toBe(DESC)
    expect(flipDir(DESC)).toBe(ASC)
    expect(flipDir('ปิด')).toBe(ASC)
    expect(isDir(ASC) && isDir(DESC)).toBe(true)
    expect(isDir('ปิด')).toBe(false)
  })
})

describe('วิธีเรียงเป็นข้อมูลให้หน้าจอวนสร้างปุ่ม', () => {
  it('ปุ่มที่หน้าจอจะสร้าง = 2 อันที่พี่เปาขอ (เลขข้อ · ชื่อเพลง)', () => {
    expect(PICKABLE_SORTS.map((o) => o.id)).toEqual(['number', 'title'])
    expect(DEFAULT_SORT).toBe('number')
  })

  it('ทุกวิธีมี id · คำบนปุ่ม · คำบอกทิศ 2 คำ · และตัวเปรียบเทียบ', () => {
    for (const o of SORT_OPTIONS) {
      expect(typeof o.id).toBe('string')
      expect(o.label.length).toBeGreaterThan(0)
      expect(typeof o.compare).toBe('function')
      expect(dirLabel(o.id, ASC)).toBe(o.ascLabel)
      expect(dirLabel(o.id, DESC)).toBe(o.descLabel)
      expect(o.ascLabel).not.toBe(o.descLabel)
    }
    // คำบอกทิศต้องเข้ากับสิ่งที่เรียง ⛔ ไม่ใช่คำกลางคำเดียวใช้ทุกวิธี
    expect(dirLabel('number', ASC)).not.toBe(dirLabel('title', ASC))
  })

  it('ค้นหาวิธีเรียงและตรวจรหัสได้ · รหัสที่ไม่มีคืนค่าเปล่า ⛔ ไม่พัง', () => {
    expect(sortOption('title').label).toBe('ชื่อเพลง')
    expect(sortOption('ไม่มีวิธีนี้')).toBe(null)
    expect(isSortId('number')).toBe(true)
    expect(isSortId('ไม่มีวิธีนี้')).toBe(false)
    expect(dirLabel('ไม่มีวิธีนี้', ASC)).toBe('')
  })
})
