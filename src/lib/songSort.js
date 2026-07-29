// B131 — the ONE place that decides the order of a song list. Sits at the same level as
// songSearch.js: search filters/ranks, sort orders. Nothing else in the app sorts songs.
//
// WHY IT EXISTS — a bug, not a missing button. Songs whose `number` is blank had NO defined
// order at all:
//   (1) the `.order('number', …)` queries push the blank-number rows to the end but give that
//       group no secondary key, so Postgres may return them in any order;
//   (2) the old bookshelf.js comparator did `(a.number ?? Infinity) - (b.number ?? Infinity)`,
//       which is `NaN` for two number-less songs → `sort` treats them as equal → whatever
//       order the DB happened to return survives (V8 `sort` is stable since ES2019).
// เล่มเด็กเล็ก is 52-of-53 songs with no number, so พี่เปา could not find the same song twice.
// The comparator here therefore ends in a TOTAL order (number → title ก-ฮ → id): the same set
// of songs always comes out the same way, whatever order it arrived in. Determinism IS the fix.
//
// SCOPE (P'Aim 29 ก.ค.: "เอาแค่เรียงก่อนได้ ไม่ต้องสลับ กฮ ฮก ไม่ต้องมีปุ่ม") — ONE criterion,
// no user-facing choice. Do NOT add a table of sort options, direction flags, or i18n label
// keys here "for later": that scope was explicitly cut. Add them when a ticket asks for them.

// ---------- field readers (defensive: a row missing a column must never throw) ----------

// A song's catalog number as a finite number; null when blank/absent/garbage → sorts last.
function numberOf(song) {
  const raw = song == null ? null : song.number
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

// Thai title, trimmed; '' when absent → sorts last inside its group.
function titleOf(song) {
  const s = song && song.title_th != null ? String(song.title_th) : ''
  return s.trim()
}

// Last-resort tiebreak, so the order is total: same number AND same title still resolves the
// same way every time instead of inheriting the DB's arbitrary order.
function idOf(song) {
  return song && song.id != null ? String(song.id) : ''
}

// ก-ฮ by Thai collation — the same `localeCompare(a, b, 'th')` already used for the shelf
// (bookshelf.js orderedBooks). Blank titles go last.
function compareTitle(a, b) {
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

// "เลขข้อ": number ascending · every song with NO number goes after every song that has one,
// and inside that group they are ordered ก-ฮ by title (← the fix พี่เปา asked for) · equal
// number+title falls back to id so no two songs are ever "equal".
function compareNumber(a, b) {
  const na = numberOf(a)
  const nb = numberOf(b)
  if (na !== null && nb !== null) {
    if (na !== nb) return na - nb
  } else if (na !== null || nb !== null) {
    return na !== null ? -1 : 1 // has a number → before the number-less group
  }
  return compareTitle(a, b) || compareId(a, b)
}

// The one entry point. Returns a NEW array (never mutates the caller's list) whose order is
// fully determined by the songs themselves.
//
// `sortBy` exists so a caller can name the order it wants instead of re-deriving the rules;
// 'number' is the only order implemented today. An unknown or missing value KEEPS the incoming
// order rather than throwing — a bad argument must never blank a page. Callers that must keep
// their own order (a playlist the user arranged for a service; the relevance order that
// searchSongs() produced) simply do not call this.
export function sortSongs(songs, sortBy = 'number') {
  const list = Array.isArray(songs) ? songs.slice() : []
  if (sortBy !== 'number') return list
  return list.sort(compareNumber)
}
