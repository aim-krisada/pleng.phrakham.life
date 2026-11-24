// สร้างเพลงใหม่จากทำนองนี้ (ใบ v3/pleng#183)
//
// WHY: พี่เปา — "เพลงมีว่าใช้ทำนองเดียวกัน แต่เนื้อคนละเนื้อ อยากจะ copy ทำนองทั้งหมด แล้วไปสร้างเป็นเพลงใหม่".
// The editor's ทำซ้ำเนื้อ makes another verse on the same tune INSIDE one song; this makes a SEPARATE song.
//
// melodyOnly(content) → the v2 content of a new song that keeps everything about the tune and nothing
// about the words:
//   kept    key · timeSignature · bpm · every melody (stanzas: notes, chords, bars, marks, meters) ·
//           the play order (arrangement: which melody, its label such as ร้อง 1 / รับ, a key change,
//           ร้องรับทุกข้อ) — so the new song starts with the same shape, ready for its own words
//   emptied every word box (syllables → "" one per box, so the boxes still line up under the notes)
//   dropped other languages' words · word notes (*) · the footnote · other-book numbers (bookRefs) ·
//           per-language ตรวจแล้ว · extra lyric sets (only the first set's rows are kept, plus the
//           rows every set shares) · any key this file does not know (it belonged to the old song)
//
// Pure: never touches the input.
import { inLyricSet } from './songModel.js'

const clone = (v) => JSON.parse(JSON.stringify(v))

// A melody segment carries no words in v2; a `lyric` left on one (old data) is still words.
function stripSegmentWords(item) {
  if (!item || typeof item !== 'object') return item
  const { lyric, lyrics, ...rest } = item
  return rest
}

export function melodyOnly(content) {
  const c = content || {}
  const stanzas = (Array.isArray(c.stanzas) ? c.stanzas : []).map((s) => {
    const out = clone(s)
    if (Array.isArray(out.lines)) out.lines = out.lines.map((line) => (Array.isArray(line) ? line.map(stripSegmentWords) : line))
    return out
  })
  const hasSets = Array.isArray(c.lyricSets) && c.lyricSets.length > 1
  const arrangement = (Array.isArray(c.arrangement) ? c.arrangement : [])
    .filter((r) => !hasSets || inLyricSet(r, 0))
    .map((r) => ({
      stanza: r.stanza,
      label: r.label || '',
      syllables: (Array.isArray(r.syllables) ? r.syllables : []).map(() => ''),
      ...(r.key ? { key: r.key } : {}),
      ...(r.afterEachVerse ? { afterEachVerse: r.afterEachVerse } : {}),
    }))
  return {
    version: 2,
    key: c.key || 'C',
    timeSignature: c.timeSignature || '4/4',
    ...(c.bpm ? { bpm: c.bpm } : {}),
    stanzas,
    arrangement,
  }
}

// The song row the editor opens: a NEW song (no id, no number, no title) in the same book and
// theme, unchecked, with the melody only.
export function songFromMelody(song) {
  const s = song || {}
  return {
    id: null,
    number: null,
    title_th: '',
    title_en: '',
    category: s.category || null,
    theme: s.theme || null,
    verified: false,
    content: melodyOnly(s.content),
  }
}
