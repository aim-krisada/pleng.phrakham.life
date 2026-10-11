// ใบ v3/pleng#100 — เนื้อล้วน "ติดกันเป็นวรรค": the syllables of one sheet line are written together the way the
// songbook prints them ("ข้าเชื่อพระองค์ ข้าเชื่อพระองค์"), with a space only where the tune BREATHES, and never
// inside a word ("ภาระแม้หนักใหญ่", not "ภา ระแม้หนักใหญ่"). Pure: the sheet passes a line's segments, this
// returns which syllable slots get a space after them.
//
// Where the tune breathes, after a syllable (measured on the 617 published songs, 4 ต.ค. 2569):
//   * a rest (0) comes before the next syllable, or
//   * its note carries a fermata (𝄐), or
//   * a bracketed aside starts or ends there — "ฉัน (อยู่ไหน) อยู่ในใจฉัน" (เด็กเล็ก 18), or
//   * the syllable is held LONG FOR THIS SONG (its note + '-' boxes + the เอื้อน notes sung on it): at least twice
//     the song's usual (median) syllable, and never less than BREATH_BEATS. A fixed length did not fit every
//     song: 1.5 beats breaks เพลง 519 in the right places, but in a slow song whose every syllable is a dotted
//     note (729: "พระ เยซู คนรัก ของข้า") it broke after nearly every word, and 2 beats left 519 with no break.
//
// Mid-word guard: a held note often sits on the FIRST syllable of a word ("พระเมต—ตา", "กินอา—หาร"); spacing by
// length alone put 2,447 spaces inside words in 348 songs. So a space goes only where the browser's own Thai
// word breaker (Intl.Segmenter — built in, no dictionary of ours) sees a word boundary. Without it (a very old
// browser) only rests and fermatas break — they almost never fall inside a word (7 places in the whole library).
import { parseNotes, DOT_FACTOR } from './notation.js'

export const BREATH_BEATS = 1.5 // the floor: a syllable shorter than a dotted quarter is never a breath

// one segment's note string → its syllable slots, in order: { kind: 'note'|'held'|'rest', beats, fermata }
// (the same boxes noteBoxKinds counts as slots: every box but a bracket)
export function slotTimes(noteString) {
  const t = (noteString || '').trim()
  const boxes = t ? t.split(/\s+/) : []
  const out = []
  let triplet = false
  for (const b of boxes) {
    if (b === '(' || b === ')') continue
    if (b === '{') { triplet = true; continue }
    if (b === '}') { triplet = false; continue }
    if (b === '-' || b === '–') { out.push({ kind: 'held', beats: 1, fermata: false }); continue }
    const tokens = parseNotes(b)
    if (tokens.some((x) => x.type === 'open' && x.group === 'triplet')) triplet = true // `{2` written on the digit
    const note = tokens.find((x) => x.type === 'note')
    if (note) {
      let beats = (1 / 2 ** note.underlines) * (DOT_FACTOR[note.dots] ?? 1)
      if (triplet) beats = (beats * 2) / 3
      out.push({ kind: note.pitch === '0' ? 'rest' : 'note', beats, fermata: !!note.fermata })
    } // a box with no note is unreadable: no slot (noteBoxKinds calls it a spacer)
    if (tokens.some((x) => x.type === 'close' && x.group === 'triplet')) triplet = false // `4}`
  }
  return out
}

let wordSeg // cached Intl.Segmenter('th'), or null when the browser has none
function segmenter() {
  if (wordSeg === undefined) {
    try { wordSeg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null } catch { wordSeg = null }
  }
  return wordSeg
}

// one line's sung syllables in order: { key, text, beats (held), rest (a rest follows), fermata }
function lineUnits(segments) {
  const units = []
  for (const s of segments || []) {
    const syl = Array.isArray(s.syllables) ? s.syllables : []
    slotTimes(s.note).forEach((slot, k) => {
      const last = units[units.length - 1]
      if (slot.kind === 'rest') { if (last) last.rest = true; return }
      const w = typeof syl[k] === 'string' ? syl[k].trim() : ''
      if (w) units.push({ key: `${s.si}-${k}`, text: w, beats: slot.beats, rest: false, fermata: slot.fermata })
      else if (last && !last.rest) { last.beats += slot.beats; if (slot.fermata) last.fermata = true } // sung on
    })
  }
  return units
}

// How long a syllable must be held to count as a breath in THIS song: twice its median held syllable, never
// below BREATH_BEATS. lines = every sheet line's segments (as phraseBreaks takes one line).
export function songBreathBeats(lines) {
  const held = []
  for (const segs of lines || []) for (const u of lineUnits(segs)) held.push(u.beats)
  if (!held.length) return BREATH_BEATS
  held.sort((a, b) => a - b)
  return Math.max(BREATH_BEATS, 2 * held[Math.floor(held.length / 2)])
}

// ---- ใบ v3/pleng#105 — the THIRD way: the breaks the printed songbook itself drew ----------------
// The two ways above are read off the TUNE. A reader may instead want the book's own phrasing, which
// sometimes differs ("แม้เล็กน้อย | แต่เป็นสิ่งที่ข้ามี" in the book, "แม้เล็กน้อยแต่ | เป็นสิ่งที่ข้ามี" by the tune).
// The book cannot be read in the browser, so tools/bookPhrases/ reads it once and leaves a small data
// file: for each line, WHICH syllable a space follows — the words themselves always stay the
// library's. A line the book has nothing for returns null, and the caller falls back to the tune.

// A sheet line's own words, with nothing between them — the key the data file is written under.
export function bookLineKey(segments) {
  let s = ''
  for (const seg of segments || []) for (const w of seg.syllables || []) { const t = (w || '').trim(); if (t) s += t }
  return s
}

// map = one song's entry from the data file ({ line words: [syllable number, …] }).
// → the same Set of `${si}-${k}` keys phraseBreaks returns, or null when the book has no such line.
export function bookPhraseBreaks(segments, map) {
  const key = bookLineKey(segments)
  if (!key || !map || !Object.prototype.hasOwnProperty.call(map, key)) return null
  const keys = []
  for (const seg of segments || []) (seg.syllables || []).forEach((w, k) => { if ((w || '').trim()) keys.push(`${seg.si}-${k}`) })
  const out = new Set()
  for (const i of map[key] || []) if (i >= 0 && i < keys.length - 1) out.add(keys[i])
  return out
}

// ---- ใบ v3/pleng#110 — where a วรรค too long for the line may wrap ----------------------------------
// A วรรค is kept on one row (ใบ#104), but a วรรค wider than the whole row must still wrap somewhere — and that
// somewhere must be between two WORDS, never inside one ("ประจัก|ษ์", "ทั้งม|วล" on a phone, เพลง 141).
// segments = one sheet line's segments (as phraseBreaks takes them). → Set of `${si}-${k}` keys: syllable k of
// segment si ends a word (the browser's own Thai word breaker says so, read on the whole line's words). The
// line's last syllable is never in it. null = this browser has no word breaker, so nothing can be said.
export function wordEnds(segments, opts = {}) {
  const seg = opts.segmenter === undefined ? segmenter() : opts.segmenter
  if (!seg) return null
  const syls = []
  for (const s of segments || []) {
    (Array.isArray(s.syllables) ? s.syllables : []).forEach((w, k) => {
      const t = typeof w === 'string' ? w.trim() : ''
      if (t) syls.push({ key: `${s.si}-${k}`, text: t })
    })
  }
  const out = new Set()
  if (syls.length < 2) return out
  const bounds = new Set()
  for (const part of seg.segment(syls.map((u) => u.text).join(''))) bounds.add(part.index)
  let off = 0
  syls.forEach((u, i) => {
    off += u.text.length
    if (i < syls.length - 1 && bounds.has(off)) out.add(u.key)
  })
  return out
}

// segments = one sheet line's segments in order: [{ si, note, syllables }] (syllables = v2 slot array).
// → Set of `${si}-${k}` keys: put a space after syllable k of segment si. The line's last syllable is never in
// it (a new line is already a break). opts.breathBeats = songBreathBeats(…) of the song (default the floor);
// opts.segmenter (null = no word guard) for tests; opts.book = this song's book phrases (ใบ#105), which win
// over the tune wherever the book has the line.
export function phraseBreaks(segments, opts = {}) {
  if (opts.book) { const fromBook = bookPhraseBreaks(segments, opts.book); if (fromBook) return fromBook }
  const breathBeats = opts.breathBeats ?? BREATH_BEATS
  const seg = opts.segmenter === undefined ? segmenter() : opts.segmenter
  const units = lineUnits(segments)
  const out = new Set()
  if (units.length < 2) return out
  let bounds = null
  if (seg) {
    bounds = new Set()
    for (const part of seg.segment(units.map((u) => u.text).join(''))) bounds.add(part.index)
  }
  let off = 0
  units.forEach((u, i) => {
    off += u.text.length
    if (i === units.length - 1) return
    const aside = /[)\]]$/.test(u.text) || /^[([]/.test(units[i + 1].text) // keep "(…)" set apart
    if (aside) { out.add(u.key); return }
    const breath = u.rest || u.fermata || (bounds && u.beats >= breathBeats - 1e-9)
    if (!breath) return
    if (bounds && !bounds.has(off)) return // inside a word — never split it
    out.add(u.key)
  })
  return out
}
