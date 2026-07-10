// B053 — book-code → real name map + label helpers.
import { describe, it, expect } from 'vitest'
import { BOOK_NAMES, bookName, bookRefLabel, bookRefLabels, parseBookRefQuery } from './bookCodes.js'

describe('bookName', () => {
  it('maps every authoritative code to its real name', () => {
    expect(bookName('ล')).toBe('เล่มเล็ก')
    expect(bookName('ย')).toBe('เล่มเยอรมัน')
    expect(bookName('สอ')).toBe('สิงคโปร์อนุชน')
    expect(Object.keys(BOOK_NAMES)).toHaveLength(9)
  })

  it('falls back to the raw code for an unknown/new book', () => {
    expect(bookName('zz')).toBe('zz')
    expect(bookName('')).toBe('')
    expect(bookName(undefined)).toBe('')
  })
})

describe('bookRefLabel / bookRefLabels', () => {
  it('renders one reference as "name number"', () => {
    expect(bookRefLabel({ book: 'ล', no: 282 })).toBe('เล่มเล็ก 282')
  })

  it('renders name only when there is no number', () => {
    expect(bookRefLabel({ book: 'ว' })).toBe('เล่มไว้อาลัย')
  })

  it('drops empty / malformed refs', () => {
    expect(bookRefLabel(null)).toBe('')
    expect(bookRefLabel({ no: 3 })).toBe('')
  })

  it('maps a whole book_refs array, order preserved', () => {
    expect(bookRefLabels([{ book: 'ล', no: 282 }, { book: 'ย', no: 274 }])).toEqual([
      'เล่มเล็ก 282',
      'เล่มเยอรมัน 274',
    ])
    expect(bookRefLabels([])).toEqual([])
    expect(bookRefLabels(undefined)).toEqual([])
  })
})

describe('parseBookRefQuery', () => {
  it('parses the code form with dot / space / joined', () => {
    expect(parseBookRefQuery('ล.282')).toEqual({ book: 'ล', no: 282 })
    expect(parseBookRefQuery('ล 282')).toEqual({ book: 'ล', no: 282 })
    expect(parseBookRefQuery('ล282')).toEqual({ book: 'ล', no: 282 })
    expect(parseBookRefQuery('  ย.274 ')).toEqual({ book: 'ย', no: 274 })
  })

  it('parses the real-name form back to a code', () => {
    expect(parseBookRefQuery('เล่มเล็ก 282')).toEqual({ book: 'ล', no: 282 })
    expect(parseBookRefQuery('สิงคโปร์อนุชน 41')).toEqual({ book: 'สอ', no: 41 })
  })

  it('is null for non-book queries (lyrics, bare numbers, notes, scripture)', () => {
    expect(parseBookRefQuery('พระเจ้า')).toBe(null)
    expect(parseBookRefQuery('282')).toBe(null) // bare number = song-number lookup
    expect(parseBookRefQuery('42')).toBe(null)
    expect(parseBookRefQuery('5 5 6 1')).toBe(null)
    expect(parseBookRefQuery('ยฮ.3:16')).toBe(null) // scripture, not a book code
    expect(parseBookRefQuery('zz 9')).toBe(null) // unknown book
  })
})
