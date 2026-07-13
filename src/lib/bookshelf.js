// B087 — pure logic behind the new home "bookshelf" (เล่ม picker). Extracted from
// SongList.vue so the tally/order/sort are unit-testable without mounting the SFC
// (Supabase + router). No new data model.
//
// TAXONOMY (P'Aim, revised 11 ก.ค. — see docs/ds/home-redesign.md §Taxonomy REVISED):
// the home groups songs by their REAL book = the `category` column (3 books), NOT by
// `book_refs`. A song lives in exactly one category, so no song appears in two เล่ม.
// `book_refs` (ล/ย/ยอ/ม/ส/…) are demoted to reference TAGS shown on the song ("อยู่ใน
// เล่มเล็ก 282") — handled in the component via bookCodes.js, not here.

// The real books, in shelf order, with their display names. Data-driven: any category
// code the data actually carries appears even if it's not in this map (raw code shown),
// so a newly-imported book needs no code change here. THREE canonical books only (P'Aim
// 12 ก.ค. — see docs/ds/home-redesign.md §Taxonomy): the old `yuwachon` (0 songs, never
// used) was replaced by `dek-lek` (เด็กเล็ก). เด็กเล็ก songs are imported later with this
// code; the book stays hidden until it has songs (orderedBooks drops empty เล่ม).
export const CATEGORY_ORDER = ['lem-yai', 'anuchon', 'dek-lek']
export const CATEGORY_NAMES = {
  'lem-yai': 'เล่มใหญ่',
  anuchon: 'อนุชน',
  'dek-lek': 'เด็กเล็ก',
}

// Sentinel for the "อื่นๆ / ยังไม่จัดเล่ม" bucket (songs with no category). Not a real
// category code, so it can never collide with one.
export const FALLBACK_KEY = '__none__'

// PUBLIC VISIBILITY GATE (B087 · P'Aim quality gate) — kept a SEPARATE layer from the
// category grouping so it can ship independently. Anon (not logged in) sees ONLY verified
// songs: display/edit still has bugs, so unverified songs stay hidden from the public until
// the team reviews each one. Logged-in team sees everything (to review/fix). Applied at the
// source so counts, in-book lists AND search all agree — public never sees an unverified
// song anywhere, nor an inflated เล่ม count.
export function visibleSongs(songs, loggedIn) {
  const list = songs || []
  return loggedIn ? list : list.filter((s) => s && s.verified)
}

// The "✓ ตรวจแล้ว" badge is an internal QA marker → shown to logged-in editors only. Public
// already sees only verified songs, so the marker would be redundant clutter for them.
export function showVerifiedBadge(song, loggedIn) {
  return !!(song && song.verified) && !!loggedIn
}

// Its mirror: the "ยังไม่ตรวจ" marker. So the team can spot which songs still need review
// while browsing a book, both states are labelled (verified ✓ vs pending). Logged-in only —
// public never sees an unverified song at all, so the marker is meaningless for them.
export function showUnverifiedBadge(song, loggedIn) {
  return !!song && !song.verified && !!loggedIn
}

// Review progress over a song list → { verified, total }. Feeds the "ตรวจแล้ว X / ทั้งหมด Y"
// tally so พี่เปา sees how far the review has come. Pure + defensive (no throw on garbage).
export function verifiedProgress(songs) {
  const list = songs || []
  let verified = 0
  for (const s of list) if (s && s.verified) verified++
  return { verified, total: list.length }
}

// A song's category code, trimmed; null when blank/absent (→ fallback bucket). Kept
// defensive so a row missing the column doesn't throw.
function songCategory(song) {
  const c = (song && song.category != null ? String(song.category) : '').trim()
  return c || null
}

// Display name for a category code, falling back to the raw code so an unmapped/new book
// still shows something sensible instead of blank.
export function categoryName(code) {
  return CATEGORY_NAMES[code] || code || ''
}

// Tally songs per category + count the unclassified ones. Returns { counts: Map<code,n>,
// none: n }. Each song counts once (one category per song); no-category songs add to `none`.
export function tallyCategories(songs) {
  const counts = new Map()
  let none = 0
  for (const s of songs || []) {
    const c = songCategory(s)
    if (!c) {
      none++
      continue
    }
    counts.set(c, (counts.get(c) || 0) + 1)
  }
  return { counts, none }
}

// The ordered shelf to render: known books first (CATEGORY_ORDER), then any unknown/new
// category present in the data, then the fallback bucket. Books with 0 songs are hidden
// (P'Aim: don't show empty เล่ม — e.g. เด็กเล็ก stays hidden until it has songs); the fallback
// shows only when non-empty. Each entry = { code, name, count, fallback }.
export function orderedBooks(songs) {
  const { counts, none } = tallyCategories(songs)
  const known = CATEGORY_ORDER.filter((c) => (counts.get(c) || 0) > 0)
  const extra = [...counts.keys()]
    .filter((c) => !CATEGORY_NAMES[c] && (counts.get(c) || 0) > 0)
    .sort((a, b) => a.localeCompare(b, 'th'))
  const shelf = [...known, ...extra].map((c) => ({
    code: c,
    name: categoryName(c),
    count: counts.get(c),
    fallback: false,
  }))
  if (none > 0) {
    shelf.push({ code: FALLBACK_KEY, name: 'อื่นๆ / ยังไม่จัดเล่ม', count: none, fallback: true })
  }
  return shelf
}

// Songs in one book (category), ordered by catalog number ascending (the "ข้อ" number).
// The fallback bucket returns the unclassified songs, also by number. Songs without a
// number sort last (Infinity) but never throw.
export function songsInBook(songs, code) {
  const match =
    code === FALLBACK_KEY ? (s) => !songCategory(s) : (s) => songCategory(s) === code
  return (songs || [])
    .filter(match)
    .slice()
    .sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity))
}
