// B087 — pure logic behind the new home "bookshelf" (เล่ม picker). Extracted from
// SongList.vue so the tally/order/sort are unit-testable without mounting the SFC
// (Supabase + router). No new data model.
//
// TAXONOMY (P'Aim, revised 11 ก.ค. — see docs/ds/home-redesign.md §Taxonomy REVISED):
// the home groups songs by their REAL book = the `category` column (3 books), NOT by
// `book_refs`. A song lives in exactly one category, so no song appears in two เล่ม.
// `book_refs` (ล/ย/ยอ/ม/ส/…) are demoted to reference TAGS shown on the song ("อยู่ใน
// เล่มเล็ก 282") — handled in the component via bookCodes.js, not here.

// The app's ONE song-ordering rule (B131) — this file used to carry its own comparator.
import { sortSongs } from './songSort.js'

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

// The approver's review queue: every song still waiting for a check, oldest catalog number
// first. Same predicate as showUnverifiedBadge (a song is "ยังไม่ตรวจ" when `verified` is
// falsy) — kept in ONE place so the chip's count, the queue list and the card badge can never
// disagree. Callers pass an already-gated list (visibleSongs), so this adds no visibility rule
// of its own.
//
// Sorting mirrors songsInBook — and since B131 that means delegating to sortSongs (songSort.js)
// rather than repeating a comparator. This queue carried the identical defect B131 fixed: its
// own `(a.number ?? Infinity) - (b.number ?? Infinity)` is `NaN` for two number-less songs, so
// the review queue could list the same pending songs in a different order on each visit — worst
// exactly where it matters most, เด็กเล็ก (52 of 53 songs have no number).
export function unverifiedSongs(songs) {
  return sortSongs((songs || []).filter((s) => s && !s.verified))
}

// "ยังทำไม่เสร็จ" over a song list → a plain count of rows whose `verified` is falsy.
//
// Same predicate as showUnverifiedBadge, so the number on the landing can never disagree with
// the badge on the row. This is the pile พี่เปา calls กองที่ 2 — เพลงของเขาเองที่ยังทำไม่เสร็จ —
// which he confirmed is a DIFFERENT pile from รอตรวจ (drafts other people sent him); see
// reviewQueue.js for that one. Wording lives in src/i18n/workWords.js, not here.
//
// ⛔ READ ONLY. Nothing in this file writes `verified`: that flag is the public-release gate
// (visibleSongs above), not a progress label, so counting must never touch it.
export function unfinishedCount(songs) {
  let n = 0
  for (const s of songs || []) if (s && !s.verified) n++
  return n
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
// none: n, unfinished: Map<code,n>, noneUnfinished: n }. Each song counts once (one category
// per song); no-category songs add to `none`.
//
// `unfinished` is the same tally narrowed to rows whose `verified` is falsy — so พี่เปา can see
// "how much is still unfinished IN THIS เล่ม" without opening it (มาตรฐาน ก-01: ทุกช่องต้องแสดง
// จำนวนเป็นเลข เห็นได้โดยไม่ต้องกดเข้าไปนับ). Counted in the SAME pass as the totals so the two
// numbers on a row are always read off one list and can never drift apart.
export function tallyCategories(songs) {
  const counts = new Map()
  const unfinished = new Map()
  let none = 0
  let noneUnfinished = 0
  for (const s of songs || []) {
    const c = songCategory(s)
    const undone = !!s && !s.verified
    if (!c) {
      none++
      if (undone) noneUnfinished++
      continue
    }
    counts.set(c, (counts.get(c) || 0) + 1)
    if (undone) unfinished.set(c, (unfinished.get(c) || 0) + 1)
  }
  return { counts, none, unfinished, noneUnfinished }
}

// The ordered shelf to render: known books first (CATEGORY_ORDER), then any unknown/new
// category present in the data, then the fallback bucket. Books with 0 songs are hidden
// (P'Aim: don't show empty เล่ม — e.g. เด็กเล็ก stays hidden until it has songs); the fallback
// shows only when non-empty. Each entry = { code, name, count, fallback }.
// `unfinished` rides on every entry (0 when the เล่ม is complete) so the landing row can print
// it without a second pass over the songs. Additive — nothing that already reads
// { code, name, count, fallback } changes.
export function orderedBooks(songs) {
  const { counts, none, unfinished, noneUnfinished } = tallyCategories(songs)
  const known = CATEGORY_ORDER.filter((c) => (counts.get(c) || 0) > 0)
  const extra = [...counts.keys()]
    .filter((c) => !CATEGORY_NAMES[c] && (counts.get(c) || 0) > 0)
    .sort((a, b) => a.localeCompare(b, 'th'))
  const shelf = [...known, ...extra].map((c) => ({
    code: c,
    name: categoryName(c),
    count: counts.get(c),
    unfinished: unfinished.get(c) || 0,
    fallback: false,
  }))
  if (none > 0) {
    shelf.push({
      code: FALLBACK_KEY,
      name: 'อื่นๆ / ยังไม่จัดเล่ม',
      count: none,
      unfinished: noneUnfinished,
      fallback: true,
    })
  }
  return shelf
}

// Songs in one book (category), in the app's standard song order (see songSort.js). The
// fallback bucket returns the unclassified songs in that same order.
//
// B131: the ordering used to live HERE as `(a.number ?? Infinity) - (b.number ?? Infinity)`,
// which is `NaN` for two number-less songs → `sort` called them equal → เด็กเล็ก (52 of 53
// songs have no number) had no defined order. Sorting now lives in exactly ONE place.
// ⛔ Do not put a comparator back in this file — extend songSort.js instead.
export function songsInBook(songs, code) {
  const match =
    code === FALLBACK_KEY ? (s) => !songCategory(s) : (s) => songCategory(s) === code
  return sortSongs((songs || []).filter(match))
}
