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
  if (ka === kb) return true
  if (Math.min(ka.length, kb.length) < 4) return false
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
