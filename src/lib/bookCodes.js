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

// --- ใบเพลงอ้างอิงที่พิมพ์เอง (P'Pao: "ช่องอ้างอิงเพลง เช่น (ล.305) … เขียนได้เองเลย") ------
//
// WHERE THEY LIVE. The DA import wrote a song's cross-references to the `songs.book_refs`
// COLUMN. What an author types in the editor goes into `content.bookRefs` instead: content is
// jsonb the editor already round-trips end to end (draft row → approve_and_publish → songs), so
// the field works today with no migration and no RPC change. A song an author has edited
// therefore carries the content list, and that list is the newer intent — it wins, including
// when it is empty (clearing the field really clears the refs).
export function songBookRefs(song) {
  const typed = song?.content?.bookRefs
  if (Array.isArray(typed)) return typed
  return Array.isArray(song?.book_refs) ? song.book_refs : []
}

// A song's references as display labels — the form every reading surface shows.
export function songRefLabels(song) {
  return bookRefLabels(songBookRefs(song))
}

// One reference back to the short form the author types: { book: 'ล', no: 305 } -> "ล.305".
// (bookRefLabel gives the long reading form, "เล่มเล็ก 305" — that one is for display.)
export function bookRefCode(ref) {
  if (!ref || !ref.book) return ''
  return ref.no != null && ref.no !== '' ? `${ref.book}.${ref.no}` : String(ref.book)
}

// The whole list as one line of text for the editor's อ้างอิง box: "ล.305 · ย.274".
export function bookRefsCodeText(refs) {
  return (Array.isArray(refs) ? refs : []).map(bookRefCode).filter(Boolean).join(' · ')
}

// One typed token -> a reference. The code part is FREE TEXT on purpose: พี่เปา has more
// abbreviations than the 9 in BOOK_NAMES, and bookName() already falls back to the raw code,
// so an unknown one still displays and still searches. Brackets are stripped, so pasting
// "(ล.305)" straight off a songbook page works.
export function parseBookRef(token) {
  const s = String(token ?? '')
    .normalize('NFC')
    .trim()
    .replace(/^[([{（［【]+/, '')
    .replace(/[)\]}）］】]+$/, '')
    .trim()
  if (!s) return null
  // a full book NAME is stored as its code, so "เล่มเล็ก 305" and "ล.305" are the same reference
  const code = (head) => NAME_TO_CODE[head] || head
  const m = s.match(/^(.*?)[.\s]*(\d{1,5})$/)
  if (m && m[1].trim()) {
    return { book: code(m[1].trim().replace(/[.\s]+$/, '')), no: parseInt(m[2], 10) }
  }
  return { book: code(s) } // a reference with no number ("เล่มไว้อาลัย") — bookRefLabel handles it
}

// A whole อ้างอิง line -> the stored list. Separators first (comma · semicolon · "·" · newline),
// because a code may legitimately carry a space ("เล่มเล็ก 305"); only a chunk that is clearly
// more than one reference is split on spaces as well ("ล.305 ย.274").
export function parseBookRefs(text) {
  const out = []
  for (const chunk of String(text ?? '').split(/[,;·|•\n\r]+/)) {
    const c = chunk.trim()
    if (!c) continue
    const parts = /^\D+[.\s]*\d*$/.test(c) ? [c] : c.split(/\s+/)
    for (const p of parts) {
      const ref = parseBookRef(p)
      if (ref) out.push(ref)
    }
  }
  return out
}
