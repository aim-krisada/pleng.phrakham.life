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
