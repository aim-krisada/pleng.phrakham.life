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

// A song's catalog number as a finite number; null when blank/absent/garbage → sorts last.
function numberOf(song) {
  const raw = song == null ? null : song.number
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

// Thai title, trimmed; '' when absent → sorts last.
function titleOf(song) {
  const s = song && song.title_th != null ? String(song.title_th) : ''
  return s.trim()
}

// Last-resort tiebreak so the order is total (same number AND same title → still stable).
function idOf(song) {
  return song && song.id != null ? String(song.id) : ''
}

// ---------- comparators ----------

// ก-ฮ by Thai collation — the same `localeCompare(a, b, 'th')` already used for the shelf
// (bookshelf.js orderedBooks) and the theme list (SongList.vue). Blank titles go last.
function compareTitleOnly(a, b) {
  const ta = titleOf(a)
  const tb = titleOf(b)
  if (!ta || !tb) return ta ? -1 : tb ? 1 : 0
  return ta.localeCompare(tb, 'th')
}

function compareId(a, b) {
  const x = idOf(a)
  const y = idOf(b)
  return x < y ? -1 : x > y ? 1 : 0
}

// "เลขข้อ": number ascending · songs with NO number all go to the end, and inside that group
// they are ordered ก-ฮ by title (← this is the fix พี่เปา asked for) · equal number+title falls
// back to id so nothing is ever "equal".
function compareNumber(a, b) {
  const na = numberOf(a)
  const nb = numberOf(b)
  if (na !== null && nb !== null) {
    if (na !== nb) return na - nb
  } else if (na !== null || nb !== null) {
    return na !== null ? -1 : 1 // has a number → before the number-less group
  }
  return compareTitleOnly(a, b) || compareId(a, b)
}

// "ชื่อเพลง": pure ก-ฮ, no number involved.
function compareTitle(a, b) {
  return compareTitleOnly(a, b) || compareId(a, b)
}

// ---------- the methods, as data ----------

// `compare: null` = keep the incoming order exactly (do not touch it):
//   manual    — a playlist the user arranged for a service; re-sorting destroys the intent.
//   relevance — the score order searchSongs() (songSearch.js) already produced; re-sorting
//               breaks search.
// `pickable` = offer it as a button. P'Aim scoped the user-facing choice to TWO (เลขข้อ ·
// ชื่อเพลง); manual/relevance are starting states a screen sets, not buttons.
export const SORT_OPTIONS = [
  { id: 'number', labelKey: 'list.sortNumber', pickable: true, compare: compareNumber },
  { id: 'title', labelKey: 'list.sortTitle', pickable: true, compare: compareTitle },
  { id: 'manual', labelKey: 'list.sortManual', pickable: false, compare: null },
  { id: 'relevance', labelKey: 'list.sortRelevance', pickable: false, compare: null },
]

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
export function sortSongs(songs, sortBy = DEFAULT_SORT) {
  const list = Array.isArray(songs) ? songs.slice() : []
  const opt = sortOption(sortBy)
  if (!opt || !opt.compare) return list
  return list.sort(opt.compare)
}
