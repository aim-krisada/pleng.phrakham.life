// B087 — pure logic behind the new home bookshelf (เล่ม picker).
// Taxonomy REVISED (P'Aim 11 ก.ค.): group by the `category` column (real books), NOT
// book_refs. book_refs are reference tags only (tested in bookCodes.test.js).
import { describe, it, expect } from 'vitest'
import {
  CATEGORY_ORDER,
  CATEGORY_NAMES,
  FALLBACK_KEY,
  categoryName,
  tallyCategories,
  orderedBooks,
  songsInBook,
  visibleSongs,
  showVerifiedBadge,
  showUnverifiedBadge,
  verifiedProgress,
  unverifiedSongs,
} from './bookshelf.js'

// Minimal song fixtures — only the fields the bookshelf reads (number + category).
const s = (id, number, category) => ({ id, number, title_th: 'เพลง ' + id, category })

const SONGS = [
  s(1, 200, 'anuchon'),
  s(2, 5, 'anuchon'),
  s(3, 50, 'anuchon'),
  s(4, 3, 'lem-yai'),
  s(5, 1, 'lem-yai'),
  s(6, 9, null), // no category → fallback
  s(7, 8, ''), //   blank category → fallback
  s(8, 7, 'saraphi'), // unknown/new category code
]

describe('CATEGORY_ORDER / names', () => {
  it('is the 3 real books in shelf order', () => {
    expect(CATEGORY_ORDER).toEqual(['lem-yai', 'anuchon', 'dek-lek'])
    expect(CATEGORY_NAMES['lem-yai']).toBe('เล่มใหญ่')
    expect(CATEGORY_NAMES.anuchon).toBe('อนุชน')
    expect(CATEGORY_NAMES['dek-lek']).toBe('เด็กเล็ก')
  })
  it('categoryName falls back to the raw code for an unknown category', () => {
    expect(categoryName('saraphi')).toBe('saraphi')
    expect(categoryName('')).toBe('')
    expect(categoryName(undefined)).toBe('')
  })
})

describe('tallyCategories', () => {
  it('counts each song once in its category', () => {
    const { counts } = tallyCategories(SONGS)
    expect(counts.get('anuchon')).toBe(3)
    expect(counts.get('lem-yai')).toBe(2)
    expect(counts.get('saraphi')).toBe(1)
  })
  it('sends songs with no/blank category to the fallback count only', () => {
    const { counts, none } = tallyCategories(SONGS)
    expect(none).toBe(2) // songs 6 (null), 7 ('')
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(3 + 2 + 1)
  })
  it('no-throw on empty/garbage input', () => {
    expect(tallyCategories([]).none).toBe(0)
    expect(tallyCategories(undefined).none).toBe(0)
  })
})

describe('orderedBooks', () => {
  it('lists known books in CATEGORY_ORDER, unknown after, fallback last', () => {
    const codes = orderedBooks(SONGS).map((b) => b.code)
    // lem-yai before anuchon (per order), then unknown saraphi, then fallback
    expect(codes).toEqual(['lem-yai', 'anuchon', 'saraphi', FALLBACK_KEY])
  })
  it('hides books with 0 songs (e.g. เด็กเล็ก when empty)', () => {
    const shelf = orderedBooks(SONGS)
    expect(shelf.find((b) => b.code === 'dek-lek')).toBeUndefined()
    expect(shelf.every((b) => b.count > 0)).toBe(true)
  })
  it('gives real names + fallback label; omits fallback when empty', () => {
    const shelf = orderedBooks(SONGS)
    expect(shelf.find((b) => b.code === 'anuchon').name).toBe('อนุชน')
    expect(shelf.find((b) => b.code === 'saraphi').name).toBe('saraphi') // unknown → raw
    expect(shelf.find((b) => b.fallback).name).toBe('อื่นๆ / ยังไม่จัดเล่ม')

    const noFallback = orderedBooks([s(1, 1, 'anuchon')])
    expect(noFallback.some((b) => b.fallback)).toBe(false)
  })
})

describe('songsInBook', () => {
  it('returns a category’s songs ordered by catalog number ascending', () => {
    const list = songsInBook(SONGS, 'anuchon')
    expect(list.map((x) => x.number)).toEqual([5, 50, 200])
    expect(list.map((x) => x.id)).toEqual([2, 3, 1])
  })
  it('fallback bucket returns the unclassified songs by number', () => {
    const list = songsInBook(SONGS, FALLBACK_KEY)
    expect(list.map((x) => x.id)).toEqual([7, 6]) // number 8 before 9
  })
  it('empty for a book with no songs; no throw', () => {
    expect(songsInBook(SONGS, 'dek-lek')).toEqual([])
    expect(songsInBook([], 'anuchon')).toEqual([])
  })

  // B131 — the in-book list is the screen พี่เปา uses (SongList.vue reads songsInBook). Ordering
  // now comes from songSort.js; these cases prove the number-less bug is fixed THROUGH this
  // entry point, not just in the sort module. เด็กเล็ก = 52 of 53 songs with no number.
  describe('a book whose songs have no catalog number (เด็กเล็ก)', () => {
    const t = (id, number, title_th) => ({ id, number, title_th, category: 'dek-lek' })
    const BOOK = [
      t('a', null, 'ขอบพระคุณ'),
      t('b', null, 'กราบพระบาท'),
      t('c', null, 'ฮาเลลูยา'),
      t('d', 1, 'สรรเสริญ'), // the one song that does have a number
    ]
    // พี่เอม 3 ส.ค. 2569 — เพลงไม่มีเลขนับเป็น 0 จึงมาก่อน (เดิมถูกดันไปท้าย)
    // "ถ้าไม่มีเลขแล้วท้ายเสมอ โอกาสหลุดสูง"
    const expected = ['b', 'a', 'c', 'd'] // กลุ่มไม่มีเลข (=0) เรียง ก-ฮ ก่อน แล้วค่อยเลข 1

    it('เรียงกลุ่มไม่มีเลข ก-ฮ ไว้ก่อนเพลงที่มีเลข', () => {
      expect(songsInBook(BOOK, 'dek-lek').map((x) => x.id)).toEqual(expected)
    })

    it('เพลงไม่หายและจำนวนคงเดิม ไม่ว่าเรียงทิศไหน', () => {
      for (const dir of ['asc', 'desc']) {
        const out = songsInBook(BOOK, 'dek-lek', 'number', dir)
        expect(out).toHaveLength(4)
        expect(out.map((x) => x.id).sort()).toEqual(['a', 'b', 'c', 'd'])
      }
    })

    it('เรียงตามชื่อเพลงได้ด้วย (วิธีที่สองที่หน้าจอมีปุ่มให้กด)', () => {
      expect(songsInBook(BOOK, 'dek-lek', 'title').map((x) => x.id)).toEqual(['b', 'a', 'd', 'c'])
    })

    it('gives the same order whatever order the DB returned them in', () => {
      for (let i = 0; i < BOOK.length; i++) {
        const arrival = [...BOOK.slice(i), ...BOOK.slice(0, i)]
        expect(songsInBook(arrival, 'dek-lek').map((x) => x.id)).toEqual(expected)
      }
      expect(songsInBook([...BOOK].reverse(), 'dek-lek').map((x) => x.id)).toEqual(expected)
    })

    it('does not mutate the songs array it was given', () => {
      const input = [...BOOK]
      songsInBook(input, 'dek-lek')
      expect(input.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
    })
  })
})

describe('visibleSongs (public verified-only gate)', () => {
  const mixed = [
    { id: 1, verified: true, category: 'anuchon' },
    { id: 2, verified: false, category: 'anuchon' },
    { id: 3, category: 'anuchon' }, // verified undefined → treated unverified
    { id: 4, verified: true, category: 'lem-yai' },
  ]
  it('anon (logged out) sees only verified songs', () => {
    expect(visibleSongs(mixed, false).map((s) => s.id)).toEqual([1, 4])
  })
  it('logged-in team sees every song', () => {
    expect(visibleSongs(mixed, true).map((s) => s.id)).toEqual([1, 2, 3, 4])
  })
  it('flows through the grouping: anon counts exclude unverified', () => {
    // anon: anuchon has 1 verified (id1), lem-yai has 1 (id4)
    const anon = orderedBooks(visibleSongs(mixed, false))
    expect(anon.find((b) => b.code === 'anuchon').count).toBe(1)
    // team: anuchon has 3
    const team = orderedBooks(visibleSongs(mixed, true))
    expect(team.find((b) => b.code === 'anuchon').count).toBe(3)
  })
  it('no throw on empty/undefined', () => {
    expect(visibleSongs([], false)).toEqual([])
    expect(visibleSongs(undefined, false)).toEqual([])
  })
})

describe('showVerifiedBadge (QA marker = logged-in only)', () => {
  it('shows only for a verified song AND a logged-in viewer', () => {
    expect(showVerifiedBadge({ verified: true }, true)).toBe(true)
    expect(showVerifiedBadge({ verified: true }, false)).toBe(false) // public: no marker
    expect(showVerifiedBadge({ verified: false }, true)).toBe(false)
    expect(showVerifiedBadge({}, true)).toBe(false)
    expect(showVerifiedBadge(null, true)).toBe(false)
  })
})

describe('showUnverifiedBadge (pending marker = logged-in only)', () => {
  it('shows only for an unverified song AND a logged-in viewer', () => {
    expect(showUnverifiedBadge({ verified: false }, true)).toBe(true)
    expect(showUnverifiedBadge({}, true)).toBe(true) // verified undefined → pending
    expect(showUnverifiedBadge({ verified: true }, true)).toBe(false)
    expect(showUnverifiedBadge({ verified: false }, false)).toBe(false) // public: no marker
    expect(showUnverifiedBadge(null, true)).toBe(false)
  })
  it('is the exact complement of showVerifiedBadge for a logged-in viewer', () => {
    for (const song of [{ verified: true }, { verified: false }, {}]) {
      expect(showVerifiedBadge(song, true)).toBe(!showUnverifiedBadge(song, true))
    }
  })
})

describe('verifiedProgress', () => {
  it('counts verified vs total over a list', () => {
    const list = [{ verified: true }, { verified: false }, {}, { verified: true }]
    expect(verifiedProgress(list)).toEqual({ verified: 2, total: 4 })
  })
  it('no throw on empty/undefined/garbage', () => {
    expect(verifiedProgress([])).toEqual({ verified: 0, total: 0 })
    expect(verifiedProgress(undefined)).toEqual({ verified: 0, total: 0 })
    expect(verifiedProgress([null, undefined])).toEqual({ verified: 0, total: 2 })
  })
})

describe('unverifiedSongs (approver review queue)', () => {
  it('keeps only the songs still waiting for a check, by catalog number', () => {
    const list = [
      { id: 'c', number: 30, verified: false },
      { id: 'a', number: 10, verified: true },
      { id: 'b', number: 20 }, // verified undefined -> still pending
    ]
    expect(unverifiedSongs(list).map((x) => x.id)).toEqual(['b', 'c'])
  })
  it('agrees with showUnverifiedBadge on every song (one predicate, one truth)', () => {
    const list = [{ verified: true }, { verified: false }, {}]
    expect(unverifiedSongs(list).length).toBe(
      list.filter((x) => showUnverifiedBadge(x, true)).length,
    )
  })
  // เพลงไม่มีเลขนับเป็น 0 (พี่เอม 3 ส.ค.) ⇒ ในคิวรอตรวจก็มาก่อนเช่นกัน — เจตนาเดียวกัน คือ
  // ของที่ยังไม่มีเลขต้องอยู่ตรงที่มองเห็น ไม่ใช่ก้นรายการ
  it('เพลงไม่มีเลขมาก่อน (=0) และข้อมูลขยะไม่ทำให้พัง', () => {
    expect(unverifiedSongs([{ id: 'x' }, { id: 'y', number: 5 }]).map((s2) => s2.id)).toEqual(['x', 'y'])
    expect(unverifiedSongs(undefined)).toEqual([])
    expect(unverifiedSongs([null, undefined])).toEqual([])
  })
  it('does not mutate or reorder the caller list', () => {
    const list = [{ id: 'b', number: 2 }, { id: 'a', number: 1 }]
    unverifiedSongs(list)
    expect(list.map((x) => x.id)).toEqual(['b', 'a'])
  })
  // B131 integration: the queue used to carry its own `(a.number ?? Infinity) - (b.number ??
  // Infinity)`, which is NaN for two number-less songs, so the approver could open the chip
  // twice and see two different orders. Same rotation proof songSort.test.js uses: whatever
  // order the rows arrive in, ONE order comes out — the เด็กเล็ก case (no numbers at all).
  it('is deterministic for number-less songs whatever order they arrive in', () => {
    const rows = [
      { id: 'i3', title_th: 'ขอบพระคุณ' },
      { id: 'i1', title_th: 'กราบพระบาท' },
      { id: 'i2', title_th: 'ครูของเรา' },
    ]
    // ก-ฮ by title_th: กราบพระบาท (ก) → ขอบพระคุณ (ข) → ครูของเรา (ค). Ids deliberately do
    // NOT follow that order, so the assertion can only pass on the title collation.
    const expected = ['i1', 'i3', 'i2']
    for (let r = 0; r < rows.length; r++) {
      const rotated = [...rows.slice(r), ...rows.slice(0, r)]
      expect(unverifiedSongs(rotated).map((x) => x.id)).toEqual(expected)
      expect(unverifiedSongs([...rotated].reverse()).map((x) => x.id)).toEqual(expected)
    }
  })
})
