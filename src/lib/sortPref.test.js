// m1.wpa.24.us01 — ค่าที่จำแยกทีละเล่ม และกฎกดสลับ 2 สถานะ
//
// สองอย่างที่แบกเกณฑ์ยอมรับไว้ตรงนี้:
//   · สองเล่มต้องอยู่บนวิธีเรียง "ต่างกันได้พร้อมกัน" (พี่เปา) — เทสที่แตะเล่มเดียว จะผ่านแม้โค้ด
//     เก็บค่าเดียวใช้ทุกเล่ม ⇒ ต้องเทียบสองเล่มพร้อมกันเท่านั้นถึงจะจับได้
//   · กดแล้ววนแค่ 2 สถานะ ⛔ ไม่มีที่ 3 (พี่เอม)
import { describe, it, expect, beforeEach } from 'vitest'
import { sortByBook, bookSortState, bookSort, bookDir, chooseSort, setBookSort } from './sortPref.js'
import { DEFAULT_SORT, DEFAULT_DIR, PICKABLE_SORTS, ASC, DESC } from './songSort.js'

const KEY = 'pleng.sortByBook'

describe('sortPref — แต่ละเล่มจำของตัวเองแยกกัน', () => {
  beforeEach(() => {
    localStorage.clear()
    sortByBook.value = {}
  })

  it('เล่มที่ยังไม่เคยแตะ เริ่มที่ เลขข้อ น้อยไปมาก', () => {
    expect(bookSortState('lem-yai')).toEqual({ by: DEFAULT_SORT, dir: DEFAULT_DIR })
    expect(DEFAULT_SORT).toBe('number')
    expect(DEFAULT_DIR).toBe(ASC)
  })

  // เกณฑ์ตัวเป็น ๆ: เล่มใหญ่ = ตามเลข · เด็กเล็ก = ตามชื่อ พร้อมกัน
  it('ถือวิธีเรียงต่างกันได้ทีละเล่ม เล่มหนึ่งไม่ทับอีกเล่ม', () => {
    setBookSort('lem-yai', 'number')
    setBookSort('dek-lek', 'title')
    expect(bookSort('lem-yai')).toBe('number')
    expect(bookSort('dek-lek')).toBe('title')

    setBookSort('lem-yai', 'title')
    expect(bookSort('dek-lek')).toBe('title') // ไม่ถูกแตะ
    setBookSort('dek-lek', 'number')
    expect(bookSort('lem-yai')).toBe('title') // ยังไม่ถูกแตะ
  })

  it('ทิศทางก็จำแยกเล่ม ไม่ใช่แค่วิธีเรียง', () => {
    setBookSort('lem-yai', 'number', DESC)
    setBookSort('dek-lek', 'number', ASC)
    expect(bookDir('lem-yai')).toBe(DESC)
    expect(bookDir('dek-lek')).toBe(ASC)
  })

  it('เล่มที่สามที่ไม่เคยแตะ ยังเป็นค่าเริ่มต้น ขณะที่เล่มอื่นถูกตั้งไว้แล้ว', () => {
    setBookSort('lem-yai', 'title', DESC)
    expect(bookSortState('anuchon')).toEqual({ by: DEFAULT_SORT, dir: DEFAULT_DIR })
  })
})

describe('sortPref — กดแล้ววนแค่ 2 สถานะ', () => {
  beforeEach(() => {
    localStorage.clear()
    sortByBook.value = {}
  })

  it('กดวิธีที่ใช้อยู่ = กลับทิศ กดกลับไปกลับมาได้ไม่จำกัด', () => {
    chooseSort('lem-yai', 'number') // เป็นค่าเริ่มต้นอยู่แล้ว ⇒ นับเป็นการกลับทิศ
    expect(bookSortState('lem-yai')).toEqual({ by: 'number', dir: DESC })
    chooseSort('lem-yai', 'number')
    expect(bookSortState('lem-yai')).toEqual({ by: 'number', dir: ASC })
    chooseSort('lem-yai', 'number')
    expect(bookSortState('lem-yai')).toEqual({ by: 'number', dir: DESC })
  })

  // พี่เอม: "กดสลับแค่ 2 สถานะพอ" — กดกี่ทีก็ต้องไม่เกิดสถานะที่ 3
  it('ไม่มีสถานะที่ 3 — กด 12 ครั้งได้แค่ ▲ กับ ▼ ของวิธีนั้น', () => {
    const seen = new Set()
    for (let i = 0; i < 12; i++) {
      chooseSort('lem-yai', 'title')
      const st = bookSortState('lem-yai')
      expect(st.by).toBe('title')
      seen.add(st.dir)
    }
    expect([...seen].sort()).toEqual([ASC, DESC])
  })

  it('กดวิธี "อีกอัน" = ย้ายไปวิธีนั้น เริ่มที่น้อยไปมาก', () => {
    chooseSort('lem-yai', 'number') // → number/desc
    expect(bookDir('lem-yai')).toBe(DESC)
    chooseSort('lem-yai', 'title') // คนละวิธี ⇒ เริ่มใหม่ น้อยไปมาก
    expect(bookSortState('lem-yai')).toEqual({ by: 'title', dir: ASC })
  })

  it('กลับทิศเล่มหนึ่ง ไม่แตะอีกเล่ม', () => {
    setBookSort('dek-lek', 'title', ASC)
    chooseSort('lem-yai', 'number')
    chooseSort('lem-yai', 'number')
    expect(bookSortState('dek-lek')).toEqual({ by: 'title', dir: ASC })
  })
})

describe('sortPref — การเก็บค่า', () => {
  beforeEach(() => {
    localStorage.clear()
    sortByBook.value = {}
  })

  it('รับได้ทุกวิธีที่หน้าจอมีปุ่มให้กด', () => {
    for (const o of PICKABLE_SORTS) {
      setBookSort('lem-yai', o.id)
      expect(bookSort('lem-yai')).toBe(o.id)
    }
  })

  it('ไม่รับวิธีที่ไม่มีปุ่ม และไม่รับค่าขยะ', () => {
    setBookSort('lem-yai', 'title')
    setBookSort('lem-yai', 'manual')
    setBookSort('lem-yai', 'ไม่มีวิธีนี้')
    setBookSort('lem-yai', null)
    chooseSort('lem-yai', 'manual')
    expect(bookSort('lem-yai')).toBe('title')
  })

  it('ไม่มีรหัสเล่ม = ไม่เก็บ', () => {
    setBookSort(null, 'title')
    chooseSort('', 'title')
    expect(sortByBook.value).toEqual({})
    expect(bookSortState(null)).toEqual({ by: DEFAULT_SORT, dir: DEFAULT_DIR })
  })

  it('เก็บทั้งวิธีและทิศ ⇒ เปิดใหม่ยังเป็นแบบเดิม', () => {
    setBookSort('lem-yai', 'number', DESC)
    setBookSort('dek-lek', 'title', ASC)
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({
      'lem-yai': { by: 'number', dir: DESC },
      'dek-lek': { by: 'title', dir: ASC },
    })
  })

  it('ค่าเสียหรือค่าที่คนไปแก้เอง ไม่ทำให้เล่มค้าง', () => {
    sortByBook.value = { 'lem-yai': { by: 'manual', dir: DESC }, 'dek-lek': { by: 'title', dir: 'ตะแคง' } }
    expect(bookSortState('lem-yai')).toEqual({ by: DEFAULT_SORT, dir: DEFAULT_DIR })
    expect(bookSortState('dek-lek')).toEqual({ by: 'title', dir: ASC })
  })

  it('อ่านรูปแบบเก่าที่เป็นสายอักขระเดี่ยวได้ และถือเป็นน้อยไปมาก', () => {
    sortByBook.value = { 'dek-lek': 'title' }
    expect(bookSortState('dek-lek')).toEqual({ by: 'title', dir: ASC })
  })
})
