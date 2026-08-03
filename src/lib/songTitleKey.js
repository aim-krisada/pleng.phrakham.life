// B-DUP — "เพลงนี้มีในคลังแล้วหรือยัง?" in ONE place.
//
// WHY: the same song has been entered into the library more than once (typed fresh ·
// renamed onto an existing title · imported in bulk from an AI-converted songbook) with
// nothing warning anybody. Two cards for one song = the team edits different copies and
// the words drift apart, and พี่เปา has to delete one afterwards (there is no trash yet,
// so a wrong delete is gone for good). This module is the single comparison core every
// surface uses, so the app, the audit script and the database guard all agree on what
// "same title" means.
//
// THE RULE (P'Aim, 27 ก.ค. — do not soften without him):
//   same title + same เล่ม   → BLOCK the save (rename, or go edit the existing song).
//                              An approver may force past it with an explicit confirm.
//   similar title (spacing / vowel / tone drift) → WARN, but let them confirm and pass:
//                              it may genuinely be a different song, and a hard block
//                              would stand in the way of real work.
//   same title, other เล่ม   → PASS silently-but-say-so: one song legitimately lives in
//                              several books.
//
// "เล่ม" = the `songs.category` column (เล่มใหญ่ / อนุชน / เด็กเล็ก today). NEVER hard-code
// that list — more books are coming; every function here takes the book off the data.
// `songs.book_refs` is a DIFFERENT thing (cross-reference tags to paper books, e.g.
// { book:'ล', no:282 }) and is deliberately NOT used for duplicate detection: a song has
// exactly one real เล่ม (see lib/bookshelf.js taxonomy) and duplicates are per เล่ม.

// Characters that carry no sound: zero-width + the Thai/Latin punctuation an
// AI-converted book sprinkles around a title.
const INVISIBLE = /[​-‍﻿­]/g
const PUNCT = /[.,;:!?"'`’‘“”()[\]{}<>«»\-–—_/\\|*#~^=+]/g

// A leading catalog number the typist pasted into the title field: "12. ชื่อ", "๑๒ ชื่อ",
// "032 - ชื่อ". The number lives in its own column, so it is never part of the name.
const LEADING_NUMBER = /^[\s\d๐-๙]+[.．·)\]\-–—:]*\s*/

// Thai tone marks + thanthakhat + mai taikhu + yamakkan — the marks an AI transcription
// most often adds, drops or swaps. Removed only for the LOOSE (warn) key.
const THAI_MARKS = /[็-๎]/g

// Vowel-length pairs that read as near-neighbours and are constantly mixed up by OCR.
// Folded only in the LOOSE key: ี→ิ, ู→ุ, ื→ึ.
const VOWEL_FOLD = { 'ี': 'ิ', 'ู': 'ุ', 'ื': 'ึ' }

// Shared first pass: NFC, drop invisibles, fix the sara-am encoding variant
// (นิคหิต + สระอา  ->  ำ), strip a leading catalog number, collapse whitespace.
function base(title) {
  return String(title ?? '')
    .normalize('NFC')
    .replace(INVISIBLE, '')
    .replace(/ํา/g, 'ำ')
    .replace(LEADING_NUMBER, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// STRICT key — "the same name, typed differently". Everything a reader would call the
// identical title: leading/trailing space, doubled spaces, spaces inside the phrase
// (Thai does not space words, so spacing is formatting, not meaning), a pasted catalog
// number, an encoding variant, letter case in a Latin title. Tone marks and vowels are
// KEPT — a different tone is a different word, and this key is what BLOCKS a save.
export function titleKeyExact(title) {
  return base(title).replace(/\s+/g, '').toLowerCase()
}

// LOOSE key — "reads about the same". Strict key, minus tone marks/thanthakhat, minus
// punctuation, with vowel-length folded and runs of one repeated character collapsed
// (a stuck key / doubled mark). Only ever used to WARN.
export function titleKeyLoose(title) {
  const s = titleKeyExact(title).replace(PUNCT, '').replace(THAI_MARKS, '')
  let out = ''
  for (const ch of s) {
    const c = VOWEL_FOLD[ch] || ch
    if (out[out.length - 1] !== c) out += c
  }
  return out
}

// Edit distance, capped at `max` so a long title costs nothing when it is obviously
// different. Returns max+1 when it is further than that.
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = [...Array(b.length + 1).keys()]
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      if (cur[j] < best) best = cur[j]
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

// Do two titles read close enough to be worth a warning? Same loose key, or one
// character apart on it (a swapped vowel/typo). Short names are compared strictly —
// on a 3-character title one character is a different word, not a typo.
export function isSimilarTitle(a, b) {
  const ka = titleKeyLoose(a)
  const kb = titleKeyLoose(b)
  if (!ka || !kb) return false
  // Short names are compared strictly, INCLUDING the loose-key match: on a 3-character title
  // a swapped vowel is a different word, not drift ("สิบ" vs "สืบ"), and a warning nobody
  // believes is a warning everybody clicks through (G, 27 ก.ค. — alert fatigue).
  if (Math.min(ka.length, kb.length) < 4) return false
  if (ka === kb) return true
  return editDistance(ka, kb, 1) <= 1
}

// The book a row belongs to, as a comparison key. Null/blank category is its OWN bucket
// ("ยังไม่จัดเล่ม") rather than a wildcard: those songs are compared with each other but
// never against a filed song, because we cannot know which เล่ม they were meant for —
// guessing would either block a legitimate save or hide a real duplicate.
export function bookKey(song) {
  const c = song && song.category != null ? String(song.category).trim() : ''
  return c || '__none__'
}

// THE ONE CALL every surface makes.
//   candidate — { id?, title_th, category }  the song about to be saved
//   songs     — the library rows to compare against ({ id, number, title_th, category })
// Returns { level, blocking[], warning[], info[] } where level is:
//   'block' — same title, same เล่ม            (save must not go through)
//   'warn'  — similar title, same เล่ม         (confirm and pass)
//   'info'  — same/similar title, other เล่ม   (say so, pass)
//   'ok'    — nothing like it in the library
// The song's own row (same id) is always skipped, so re-saving a song never fights itself.
export function findTitleConflicts(candidate, songs) {
  const title = candidate ? candidate.title_th : ''
  const out = { level: 'ok', blocking: [], warning: [], info: [] }
  if (!titleKeyExact(title)) return out // no name yet — nothing to compare
  const myBook = bookKey(candidate)
  const myExact = titleKeyExact(title)
  for (const s of songs || []) {
    if (!s || (candidate.id && s.id === candidate.id)) continue
    const sameBook = bookKey(s) === myBook
    const exact = titleKeyExact(s.title_th) === myExact
    const similar = exact || isSimilarTitle(title, s.title_th)
    if (!similar) continue
    if (!sameBook) out.info.push(s)
    else if (exact) out.blocking.push(s)
    else out.warning.push(s)
  }
  out.level = out.blocking.length ? 'block' : out.warning.length ? 'warn' : out.info.length ? 'info' : 'ok'
  return out
}

// ---------- B128 — the EARLY hint, while the name is still being typed ----------
// findTitleConflicts above compares WHOLE titles, so it stays silent until the last
// character is in — by which time the whole song has often been typed already. This pair
// answers the earlier question: "does the library already have a song whose name STARTS
// like this?" It never blocks and never overrides the verdict above; it only fills the
// silence before it (see the wiring in EditorMode / Studio).

// Fewer typed characters than this and the hint stays quiet. Measured on the real library
// (221 titles): at 3 characters a prefix query returns avg 6.6 / max 31 songs and 29% of
// queries return more than 5 — noise. At 5 it is avg 1.25 / max 10 whole-library, and
// avg 0.54 / max 6 within the same เล่ม. 5 is where the signal wins.
export const MIN_EARLY_CHARS = 5

// At most this many songs are listed; the rest are counted. THREE, not five: the warning box
// gives every listed song its own full-width "เปิดเพลง …" link, so five entries turn a hint
// into a wall taller than the form it is helping (the library's noisiest 5-char prefix,
// "พระอง", has 8 songs). It costs almost nothing: a cap of 3 truncates 11% of queries vs 9%
// for a cap of 5. Apple HIG and Material both sanction 3-5; Hick's law says take the low end
// when the list is not the task.
export const MAX_EARLY_LISTED = 3

// PREFIX on the LOOSE key — not substring, not edit-distance inside the typed part: both were
// measured on the real library and roughly TRIPLE the result count without catching a single
// extra real duplicate (substring 3.67 avg vs 1.25 at 5 chars; +1 edit 2.39 vs 1.25). The
// loose key already absorbs exactly the drift that matters in Thai: tone marks, long/short
// vowel pairs, and the spaces Thai does not put between words.
// Returns { q, level: 'ok'|'early', sameBook[], otherBook[], truncated }.
export function findEarlyTitleMatches(candidate, songs, { minChars = MIN_EARLY_CHARS } = {}) {
  const typed = String((candidate && candidate.title_th) || '')
  const q = titleKeyLoose(typed)
  const out = { q, level: 'ok', sameBook: [], otherBook: [], truncated: 0 }
  // Counted on the characters the user actually TYPED, not on the normalized key: the key
  // drops tone marks and spaces, so gating on it would silently demand 7-8 keystrokes on a
  // tone-heavy name ("หากใกล้" = 7 typed -> 5 key characters) — more than the 5 asked for,
  // and not what the noise measurement above was taken at.
  if ([...typed.trim()].length < minChars || !q) return out
  const myBook = bookKey(candidate)
  for (const s of songs || []) {
    if (!s || (candidate.id && s.id === candidate.id)) continue
    const k = titleKeyLoose(s.title_th)
    if (!k || !k.startsWith(q)) continue
    ;(bookKey(s) === myBook ? out.sameBook : out.otherBook).push(s)
  }
  // Closest first = shortest title first: the song whose name is nearly what was typed is the
  // likeliest duplicate; a long title that merely starts the same is the likeliest false alarm.
  const byCloseness = (a, b) => titleKeyLoose(a.title_th).length - titleKeyLoose(b.title_th).length
  out.sameBook.sort(byCloseness)
  out.otherBook.sort(byCloseness)
  const total = out.sameBook.length + out.otherBook.length
  out.truncated = Math.max(0, total - MAX_EARLY_LISTED)
  out.level = total ? 'early' : 'ok'
  return out
}

// The note the existing warning box renders: { level:'info', message, links[] }, or null when
// there is nothing to say. Worded as a question, not a verdict: at 5 characters we know the
// name STARTS the same and nothing more.
export function earlyDupNote(candidate, songs, categoryName = (c) => c) {
  const r = findEarlyTitleMatches(candidate, songs)
  if (r.level === 'ok') return null
  const list = [...r.sameBook, ...r.otherBook].slice(0, MAX_EARLY_LISTED)
  const label = (x) =>
    (x.number != null ? x.number + '. ' : '') + (x.title_th || '') +
    (x.category ? ` (${categoryName(x.category)})` : '')
  const n = r.sameBook.length + r.otherBook.length
  // Say the TOTAL and say that the list is cut, so somebody who does not see their own song in
  // these 3 lines knows there are more rather than concluding it is not in the library.
  const head = r.truncated
    ? `มีเพลงชื่อขึ้นต้นแบบนี้แล้ว ${n} เพลง (แสดง ${MAX_EARLY_LISTED} แรก)`
    : `มีเพลงชื่อขึ้นต้นแบบนี้แล้ว ${n} เพลง`
  return {
    level: 'info',
    message: `${head}: ${list.map(label).join(' · ')} — ถ้าเป็นเพลงเดียวกัน ไปแก้เพลงเดิมได้เลย`,
    links: list,
  }
}
