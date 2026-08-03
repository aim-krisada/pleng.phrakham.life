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
// SCOPE — this used to read: "(P'Aim 29 ก.ค.: เอาแค่เรียงก่อนได้ ไม่ต้องสลับ กฮ ฮก ไม่ต้องมีปุ่ม)
// ONE criterion, no user-facing choice. Do NOT add a table of sort options, direction flags or
// label keys here for later: that scope was explicitly cut. Add them when a ticket asks for them."
// ⇒ 3 ส.ค. 2569 the ticket arrived (m1.wpa.24.us01), so the options table and the direction ARE
// here now. Kept as a record of when the scope opened, not erased.
//
// TWO STATES, NEVER A THIRD (พี่เอม 3 ส.ค.: "เหลือแค่ มากไปน้อย น้อยไปมาก แล้วคงไว้ กดสลับแค่
// 2 สถานะพอ") — there is deliberately no "off". An unordered list is the bug at the top of this
// file, so it must not be reachable by tapping a button.
//
// NO NUMBER COUNTS AS 0 (พี่เอม 3 ส.ค.: "ผมว่าเพลงไม่มีเลข น่าจะถือเป็น 0 ให้ sort ได้ด้วย ถ้าไม่มี
// เลขแล้วท้ายเสมอ โอกาสหลุดสูง") — they used to be pushed behind every numbered song. That honoured
// "ห้ามหาย" on paper while parking them at the bottom of a 242-row list, where nobody scrolls. As 0
// they lead น้อยไปมาก and trail มากไปน้อย: always at an end the reader is looking at.
//
// This file carries plain Thai labels because this version of the app has no translation layer
// (src/i18n/ holds only workWords.js, the work-status wordlist owned by พี่เปา — sort labels are
// not work statuses, so they do not belong there).

// ---------- field readers (defensive: a row missing a column must never throw) ----------

// A song's catalog number. Blank/absent/garbage = 0, a real position in the order.
const NO_NUMBER = 0
function numberOf(song) {
  const raw = song == null ? null : song.number
  if (raw === null || raw === undefined || raw === '') return NO_NUMBER
  const n = Number(raw)
  return Number.isFinite(n) ? n : NO_NUMBER
}

// Thai title, trimmed; '' when absent — the lowest value, so it simply sorts first.
function titleOf(song) {
  const s = song && song.title_th != null ? String(song.title_th) : ''
  return s.trim()
}

// Last-resort tiebreak, so the order is total: same number AND same title still resolves the
// same way every time instead of inheriting the DB's arbitrary order.
function idOf(song) {
  return song && song.id != null ? String(song.id) : ''
}

// ---------- direction ----------

export const ASC = 'asc'
export const DESC = 'desc'
export const DEFAULT_DIR = ASC

export function isDir(dir) {
  return dir === ASC || dir === DESC
}

// Tapping the sort already in force flips it. Anything unrecognised lands on ASC rather than
// throwing, so a stale stored value can never wedge the control.
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
//      ''), so every song takes part in the order and flips with it.
//   2. The tiebreak chain stays ascending, so the order is still TOTAL and a reload cannot
//      reshuffle equals. Determinism is the point of this file.
// Only the primary key is mirrored by the direction.

// ก-ฮ by Thai collation — the same `localeCompare(a, b, 'th')` already used for the shelf
// (bookshelf.js orderedBooks).
function compareTitleOnly(a, b) {
  return titleOf(a).localeCompare(titleOf(b), 'th')
}

function compareId(a, b) {
  const x = idOf(a)
  const y = idOf(b)
  return x < y ? -1 : x > y ? 1 : 0
}

// "เลขข้อ": by number, a missing number being 0. Songs sharing a number (all the 0s, for one)
// are ordered ก-ฮ by title, then by id, so no two songs are ever "equal".
function compareNumber(a, b, dir) {
  const d = numberOf(a) - numberOf(b)
  if (d !== 0) return d * sign(dir)
  return compareTitleOnly(a, b) || compareId(a, b)
}

// "ชื่อเพลง": by title, no number involved.
function compareTitle(a, b, dir) {
  return compareTitleOnly(a, b) * sign(dir) || compareId(a, b)
}

// ---------- the methods, as data ----------
//
// The screen LOOPS over PICKABLE_SORTS to build its buttons — it must never hard-code the list of
// sort methods. `ascLabel`/`descLabel` word the two directions for the field being sorted:
// "น้อยไปมาก" suits numbers and says nothing about titles, where the reader expects "ก ไป ฮ".
export const SORT_OPTIONS = [
  {
    id: 'number',
    label: 'เลขข้อ',
    ascLabel: 'น้อยไปมาก',
    descLabel: 'มากไปน้อย',
    pickable: true,
    compare: compareNumber,
  },
  {
    id: 'title',
    label: 'ชื่อเพลง',
    ascLabel: 'ก ไป ฮ',
    descLabel: 'ฮ ไป ก',
    pickable: true,
    compare: compareTitle,
  },
]

// What a screen loops over to render its sort buttons.
export const PICKABLE_SORTS = SORT_OPTIONS.filter((o) => o.pickable)

export const DEFAULT_SORT = 'number'

export function sortOption(sortBy) {
  return SORT_OPTIONS.find((o) => o.id === sortBy) || null
}

export function isSortId(sortBy) {
  return !!sortOption(sortBy)
}

// The Thai words for a direction of one sort — so a screen never hard-codes "น้อยไปมาก".
export function dirLabel(sortBy, dir) {
  const o = sortOption(sortBy)
  if (!o) return ''
  return dir === DESC ? o.descLabel : o.ascLabel
}

// The one entry point. Returns a NEW array (never mutates the caller's list) whose order is
// fully determined by the songs themselves.
//
// An unknown or missing `sortBy` KEEPS the incoming order rather than throwing — a bad argument
// must never blank a page. Callers that must keep their own order (a playlist the user arranged
// for a service; the relevance order searchSongs() produced) simply do not call this.
// `dir` is optional and defaults to ascending, so callers that only want the plain order need
// not know directions exist.
export function sortSongs(songs, sortBy = DEFAULT_SORT, dir = DEFAULT_DIR) {
  const list = Array.isArray(songs) ? songs.slice() : []
  const opt = sortOption(sortBy)
  if (!opt) return list
  const d = isDir(dir) ? dir : DEFAULT_DIR
  return list.sort((a, b) => opt.compare(a, b, d))
}
