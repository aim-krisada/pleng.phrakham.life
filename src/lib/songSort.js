// B131 — the ONE place that decides the order of a song list (P'Aim 29 ก.ค.: make it a
// shared standard, don't patch one screen). Sits at the same level as songSearch.js: search
// filters/ranks, sort orders. Nothing else in the app is allowed to sort songs.
//
// WHY IT EXISTS (the bug, not just a missing button): songs whose `number` is blank had NO
// defined order at all — (1) the FOUR `.order('number', …)` queries (SongList.vue · SharedList.vue
// · Studio.vue · EditorMode.vue) leave that group unordered,
// (2) the old bookshelf.js comparator did `(a.number ?? Infinity) - (b.number ?? Infinity)`,
// so two number-less songs compared as `NaN` → "equal" → whatever order the DB happened to
// return survived. เล่มเด็กเล็ก has no numbers, so พี่เปา could not find a song twice in a row.
// Every comparator here therefore ends in a TOTAL order (…→ title → id): the same input set
// always comes out in the same order, whatever order it arrived in. Determinism IS the fix.
//
// The methods are DATA so a screen can loop over them to build its buttons — a screen must
// never hard-code the list of sort options (that is how 3 copies of a bug happen).

// ---------- field readers (defensive: a row missing a column must never throw) ----------

// A song's catalog number. NO NUMBER COUNTS AS 0 (พี่เอม 3 ส.ค.) — it is a real position in
// the order, not an exile. The three number-less songs in the library today ("เสริม 1",
// "เสริม 2" in เล่มใหญ่, one in อนุชน) used to be pinned to the bottom of a 242-row list,
// which is where a reader never scrolls: *"ถ้าไม่มีเลขแล้วท้ายเสมอ โอกาสหลุดสูง"*. As 0 they
// lead the list going น้อยไปมาก — seen, not lost — and trail it going มากไปน้อย.
const NO_NUMBER = 0
function numberOf(song) {
  const raw = song == null ? null : song.number
  if (raw === null || raw === undefined || raw === '') return NO_NUMBER
  const n = Number(raw)
  return Number.isFinite(n) ? n : NO_NUMBER
}

// Thai title, trimmed; '' when absent — which simply sorts first, same principle as a
// missing number: a blank field is a value in the order, never a reason to be hidden away.
function titleOf(song) {
  const s = song && song.title_th != null ? String(song.title_th) : ''
  return s.trim()
}

// Last-resort tiebreak so the order is total (same number AND same title → still stable).
function idOf(song) {
  return song && song.id != null ? String(song.id) : ''
}

// ---------- direction ----------

// A sort runs one of two ways and NEVER a third: พี่เอม 3 ส.ค. — "เหลือแค่ มากไปน้อย
// น้อยไปมาก แล้วคงไว้ กดสลับแค่ 2 สถานะพอ". There is deliberately no "off": a list with no
// order is the very bug this file exists to kill (see the header).
export const ASC = 'asc'
export const DESC = 'desc'
export const DEFAULT_DIR = ASC

export function isDir(dir) {
  return dir === ASC || dir === DESC
}

// Tapping the sort you are already on flips it. Anything unrecognised lands on ASC rather
// than throwing, so a stale stored value can never wedge the control.
export function flipDir(dir) {
  return dir === ASC ? DESC : ASC
}

function sign(dir) {
  return dir === DESC ? -1 : 1
}

// ---------- comparators ----------
//
// Two rules the direction does NOT get to break:
//   1. NOTHING is pinned. A missing field is just its lowest value (no number = 0, no title =
//      ''), so every song takes part in the order and flips with it. This replaced an earlier
//      "missing goes last, always" rule: it satisfied the user story's "⛔ ห้ามหาย" on paper
//      while burying those songs at the bottom of a 242-row list in practice (พี่เอม 3 ส.ค.).
//   2. The tiebreak chain stays ascending, so the order is still TOTAL and a reload cannot
//      reshuffle equals. Determinism is the point of this file.
// Only the primary key is mirrored by the direction.

// ก-ฮ by Thai collation — the same `localeCompare(a, b, 'th')` already used for the shelf
// (bookshelf.js orderedBooks) and the theme list (SongList.vue).
function compareTitleOnly(a, b) {
  return titleOf(a).localeCompare(titleOf(b), 'th')
}

function compareId(a, b) {
  const x = idOf(a)
  const y = idOf(b)
  return x < y ? -1 : x > y ? 1 : 0
}

// "เลขข้อ": by number, where a missing number is 0 — so the number-less songs sit at the head
// of น้อยไปมาก and the tail of มากไปน้อย, always visible at one end rather than parked at the
// bottom forever. Songs sharing a number (all the 0s, for one) are ordered ก-ฮ by title, then
// by id, so nothing is ever "equal" and two loads cannot disagree.
function compareNumber(a, b, dir) {
  const d = numberOf(a) - numberOf(b)
  if (d !== 0) return d * sign(dir)
  return compareTitleOnly(a, b) || compareId(a, b)
}

// "ชื่อเพลง": by title, no number involved. A blank title is '' — the lowest value, first
// going ก ไป ฮ — not a reason to be pushed out of sight.
function compareTitle(a, b, dir) {
  return compareTitleOnly(a, b) * sign(dir) || compareId(a, b)
}

// ---------- the methods, as data ----------

// `compare: null` = keep the incoming order exactly (do not touch it):
//   manual    — a playlist the user arranged for a service; re-sorting destroys the intent.
//   relevance — the score order searchSongs() (songSearch.js) already produced; re-sorting
//               breaks search.
// `pickable` = offer it as a button. P'Aim scoped the user-facing choice to TWO (เลขข้อ ·
// ชื่อเพลง); manual/relevance are starting states a screen sets, not buttons.
//
// `ascKey`/`descKey` name the two directions IN THE WORDS OF THAT FIELD — "น้อยไปมาก" is right
// for numbers and meaningless for titles, where the reader expects "ก ไป ฮ". They live here,
// beside the comparator, so a screen can label its buttons by looping instead of knowing which
// sort it is drawing.
export const SORT_OPTIONS = [
  {
    id: 'number',
    labelKey: 'list.sortNumber',
    ascKey: 'list.dirNumberAsc',
    descKey: 'list.dirNumberDesc',
    pickable: true,
    compare: compareNumber,
  },
  {
    id: 'title',
    labelKey: 'list.sortTitle',
    ascKey: 'list.dirTitleAsc',
    descKey: 'list.dirTitleDesc',
    pickable: true,
    compare: compareTitle,
  },
  { id: 'manual', labelKey: 'list.sortManual', pickable: false, compare: null },
  { id: 'relevance', labelKey: 'list.sortRelevance', pickable: false, compare: null },
]

// The i18n key naming a direction for one sort — so a screen never hard-codes "น้อยไปมาก".
export function dirLabelKey(sortBy, dir) {
  const o = sortOption(sortBy)
  if (!o || !o.ascKey) return ''
  return dir === DESC ? o.descKey : o.ascKey
}

// What a screen loops over to render its sort buttons.
export const PICKABLE_SORTS = SORT_OPTIONS.filter((o) => o.pickable)

// Starting sort per context (a screen states its default by name, never by re-deriving rules).
export const DEFAULT_SORT = 'number'
export const PLAYLIST_SORT = 'manual'
export const SEARCH_SORT = 'relevance'

export function sortOption(sortBy) {
  return SORT_OPTIONS.find((o) => o.id === sortBy) || null
}

export function isSortId(sortBy) {
  return !!sortOption(sortBy)
}

// The one entry point. Returns a NEW array (never mutates the caller's list) whose order is
// fully determined by the songs themselves. An unknown/missing `sortBy` is treated as
// 'manual' (keep the order) rather than throwing — a bad prop must not blank the page.
// `dir` is optional and defaults to ascending, so the callers that only ever want the plain
// order (bookshelf pickers, shared lists, Studio) need not know directions exist.
export function sortSongs(songs, sortBy = DEFAULT_SORT, dir = DEFAULT_DIR) {
  const list = Array.isArray(songs) ? songs.slice() : []
  const opt = sortOption(sortBy)
  if (!opt || !opt.compare) return list
  const d = isDir(dir) ? dir : DEFAULT_DIR
  return list.sort((a, b) => opt.compare(a, b, d))
}
