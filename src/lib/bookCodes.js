// B053 — book-code → real collection name, in ONE place. DA's import stores each song's
// cross-references as `book_refs` jsonb ([{ book, no }], e.g. { book: 'ล', no: 282 }); the
// display names below are P'Aim-authoritative (docs/pm/book-codes.md — all 9 confirmed
// 10 ก.ค.). Change a name here and every card / label follows. `anuchon` (the current
// category) = the Thai-youth 120-song set; ล/ย/สอ/… point at the SAME song in other books.
export const BOOK_NAMES = {
  ล: 'เล่มเล็ก',
  ย: 'เล่มเยอรมัน',
  ยอ: 'เยอรมันอนุชน',
  ทอ: 'ไทยอนุชน 120',
  ม: 'เล่มมงคลสมรส',
  ส: 'เล่มสิงคโปร์',
  สอ: 'สิงคโปร์อนุชน',
  อ: 'อังกฤษ Hymn',
  ว: 'เล่มไว้อาลัย',
}

// Real name for a code, falling back to the raw code so an unmapped/new book still shows
// something sensible instead of blank.
export function bookName(code) {
  return BOOK_NAMES[code] || code || ''
}

// One book reference → a human label: { book: 'ล', no: 282 } -> "เล่มเล็ก 282".
export function bookRefLabel(ref) {
  if (!ref || !ref.book) return ''
  const name = bookName(ref.book)
  return ref.no != null ? `${name} ${ref.no}` : name
}

// A song's book references as labels, order preserved:
// [{book:'ล',no:282},{book:'ย',no:274}] -> ['เล่มเล็ก 282', 'เล่มเยอรมัน 274'].
export function bookRefLabels(book_refs) {
  return (Array.isArray(book_refs) ? book_refs : []).map(bookRefLabel).filter(Boolean)
}

// Reverse map (real name -> code) for parsing a "เล่มเล็ก 282" style query.
const NAME_TO_CODE = Object.fromEntries(Object.entries(BOOK_NAMES).map(([c, n]) => [n, c]))

// Parse a book-reference lookup into { book, no }, or null if the query isn't one. Accepts
// the code form ("ล.282", "ล 282", "ล282") and the real-name form ("เล่มเล็ก 282"). The
// book part must be a KNOWN code or name, so ordinary lyric / title / number queries (and
// note queries like "5 5 6 1") never parse as a book ref. Used to route these to an exact
// match on `book_refs` — a paper-book number should find that one song, not fuzzy neighbours.
export function parseBookRefQuery(q) {
  const s = (q || '').normalize('NFC').trim()
  const m = s.match(/^(.+?)[.\s]*(\d{1,4})$/)
  if (!m) return null
  const head = m[1].trim().replace(/[.\s]+$/, '')
  const no = parseInt(m[2], 10)
  if (BOOK_NAMES[head]) return { book: head, no }
  if (NAME_TO_CODE[head]) return { book: NAME_TO_CODE[head], no }
  return null
}
