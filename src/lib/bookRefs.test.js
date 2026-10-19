// อ้างอิง (P'Pao 19 ต.ค. 2569) — the editor's free-text reference box. These cover the parse
// (what the author may type) and where a song's references are read from.
import { describe, it, expect } from 'vitest'
import {
  parseBookRef,
  parseBookRefs,
  bookRefCode,
  bookRefsCodeText,
  songBookRefs,
  songRefLabels,
} from './bookCodes.js'

describe('parseBookRef — one typed reference', () => {
  it('reads the form P’Pao wrote, brackets and all: "(ล.305)"', () => {
    expect(parseBookRef('(ล.305)')).toEqual({ book: 'ล', no: 305 })
  })

  it('a space instead of a dot is the same reference', () => {
    expect(parseBookRef('ล 305')).toEqual({ book: 'ล', no: 305 })
    expect(parseBookRef('ล305')).toEqual({ book: 'ล', no: 305 })
  })

  it('a full book NAME is stored as its code, so it matches the imported refs', () => {
    expect(parseBookRef('เล่มเล็ก 305')).toEqual({ book: 'ล', no: 305 })
  })

  it('an abbreviation nobody has mapped yet is kept as typed (the box is free text)', () => {
    expect(parseBookRef('ฮม.12')).toEqual({ book: 'ฮม', no: 12 })
  })

  it('a reference with no number is allowed', () => {
    expect(parseBookRef('ว')).toEqual({ book: 'ว' })
  })

  it('blank input is not a reference', () => {
    expect(parseBookRef('')).toBeNull()
    expect(parseBookRef('   ')).toBeNull()
  })
})

describe('parseBookRefs — a whole line ("บางเพลงอ้างอิงหลายอัน")', () => {
  it('splits on the separators people actually type', () => {
    const want = [
      { book: 'ล', no: 305 },
      { book: 'ย', no: 274 },
      { book: 'สอ', no: 12 },
    ]
    expect(parseBookRefs('ล.305 · ย.274 · สอ.12')).toEqual(want)
    expect(parseBookRefs('ล.305, ย.274; สอ.12')).toEqual(want)
    expect(parseBookRefs('ล.305 ย.274 สอ.12')).toEqual(want)
    expect(parseBookRefs('ล.305\nย.274\nสอ.12')).toEqual(want)
  })

  it('a code that legitimately contains a space is NOT split apart', () => {
    expect(parseBookRefs('เล่มเล็ก 305')).toEqual([{ book: 'ล', no: 305 }])
  })

  it('an empty line is an empty list, not a blank reference', () => {
    expect(parseBookRefs('')).toEqual([])
    expect(parseBookRefs('  ,  · ')).toEqual([])
  })

  it('round-trips: what the box shows, re-parsed, is the same list', () => {
    const refs = parseBookRefs('(ล.305), ย 274, ฮม.9, ว')
    expect(bookRefsCodeText(refs)).toBe('ล.305 · ย.274 · ฮม.9 · ว')
    expect(parseBookRefs(bookRefsCodeText(refs))).toEqual(refs)
  })
})

describe('bookRefCode', () => {
  it('is the short form the author types, not the long reading form', () => {
    expect(bookRefCode({ book: 'ล', no: 305 })).toBe('ล.305')
    expect(bookRefCode({ book: 'ว' })).toBe('ว')
    expect(bookRefCode(null)).toBe('')
  })
})

describe('songBookRefs — where a song’s references live', () => {
  const imported = [{ book: 'ล', no: 282 }]
  const typed = [{ book: 'ล', no: 305 }]

  it('falls back to the imported songs.book_refs column', () => {
    expect(songBookRefs({ book_refs: imported, content: {} })).toEqual(imported)
  })

  it('what an author typed (content.bookRefs) wins over the import', () => {
    expect(songBookRefs({ book_refs: imported, content: { bookRefs: typed } })).toEqual(typed)
  })

  it('an EMPTY typed list wins too — clearing the box really clears the refs', () => {
    expect(songBookRefs({ book_refs: imported, content: { bookRefs: [] } })).toEqual([])
  })

  it('a song with neither has none', () => {
    expect(songBookRefs({})).toEqual([])
    expect(songBookRefs(null)).toEqual([])
  })

  it('songRefLabels shows the long reading form', () => {
    expect(songRefLabels({ content: { bookRefs: [{ book: 'ล', no: 305 }] } })).toEqual(['เล่มเล็ก 305'])
  })
})
