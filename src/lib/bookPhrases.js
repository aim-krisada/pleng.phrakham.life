// ใบ v3/pleng#105 — where the printed songbook's phrasing lives at runtime.
//
// It is a data FILE in this repo (src/data/bookPhrases.<book>.json), not a column in the song
// library, for three reasons: the library's words were edited on purpose and must never be written
// over by a machine reading a PDF; the book is itself the source, so the file can be rebuilt from
// it at any time (tools/bookPhrases/) and reviewed like any other change; and the website and the
// test machine share one library, so anything written there would reach real readers.
//
// It is fetched only when a reader actually picks "ตามต้นฉบับ", so nobody else pays for it.
import { ref } from 'vue'
import { bookLineKey } from './lyricPhrase.js'

// Only เล่มอนุชน for now (ใบ#105: เล่มใหญ่ and เด็กเล็ก come later). Add a line per book.
const SOURCES = {
  anuchon: () => import('../data/bookPhrases.anuchon.json'),
}

const books = ref({}) // book name -> { song number -> { line words: [syllable number, …] } }
const pending = {}

function bookOf(song) {
  const c = song && song.category
  return typeof c === 'string' && SOURCES[c] ? c : ''
}
function numOf(song) {
  const n = song && song.number
  const s = String(n == null ? '' : n).trim()
  return /^\d+$/.test(s) ? String(Number(s)) : s
}

// Does a printed book exist for this song's category at all? (เล่มใหญ่ has none yet.)
export function bookPhrasesKnown(song) { return !!bookOf(song) }

// Start fetching this song's book, once. Safe to call on every render.
export function loadBookPhrases(song) {
  const b = bookOf(song)
  if (!b || books.value[b] || pending[b]) return
  pending[b] = SOURCES[b]()
    .then((m) => { const d = m && (m.default || m); books.value = { ...books.value, [b]: (d && d.songs) || {} } })
    .catch(() => { books.value = { ...books.value, [b]: {} } }) // offline: behave like "no book"
}

// This song's phrases, or null while the file is still coming / when the book has nothing for it.
export function bookPhraseMap(song) {
  const b = bookOf(song)
  const d = b ? books.value[b] : null
  const m = d ? d[numOf(song)] : null
  return m && Object.keys(m).length ? m : null
}

// How much of what is on screen the book actually covers, so the page can say so plainly.
// lines = resolveContent() output (each line an array of items; segments carry `syllables`).
// → { total, covered } counted in sheet lines that have words.
export function bookPhraseCoverage(lines, map) {
  let total = 0
  let covered = 0
  for (const line of lines || []) {
    const segs = (line || []).filter((it) => it && Array.isArray(it.syllables))
    const key = bookLineKey(segs)
    if (!key) continue
    total++
    if (map && Object.prototype.hasOwnProperty.call(map, key)) covered++
  }
  return { total, covered }
}

// The one sentence the reader sees under "ตามต้นฉบับ". '' = the book covers everything on screen.
export function bookPhraseNotice(song, map, lines) {
  if (!bookPhrasesKnown(song)) return 'เล่มนี้ยังไม่ได้ทำวรรคจากหนังสือ ตอนนี้จึงเว้นวรรคตามทำนองให้ก่อน'
  const { total, covered } = bookPhraseCoverage(lines, map)
  if (!total || !covered) return 'เพลงนี้ยังไม่มีวรรคจากหนังสือ ตอนนี้จึงเว้นวรรคตามทำนองให้ก่อน'
  if (covered < total) return `เพลงนี้มีวรรคจากหนังสือ ${covered} บรรทัดจาก ${total} บรรทัด ที่เหลือเว้นวรรคตามทำนองให้ก่อน`
  return ''
}

// test seam only: forget everything fetched so far
export function _resetBookPhrasesForTest() {
  books.value = {}
  for (const k of Object.keys(pending)) delete pending[k]
}
