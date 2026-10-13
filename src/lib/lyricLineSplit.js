// ใบ v3/pleng#116 — เนื้อล้วน: a sheet line that is clearly LONGER than this song's normal line is written as
// two (or more) lyric lines, cut where the tune breathes on a bar line.
//
// Why: a hymnal prints one poetic line — one musical phrase — per line, so the singer reads and breathes one
// phrase at a time. เนื้อล้วน starts a new line only where the SHEET line ends, and a sheet line is whatever
// the person who typed the song put on it. In เพลง 627 the second sheet line holds 8 bars (two 4-bar phrases)
// while the others hold 4, so every verse showed 3 lines with a double-length one in the middle
// (พี่เอม 13 ต.ค. 2569: "เนื้อควรมี 4 บรรทัด ทำไมบรรทัดยาว").
//
// The rule (thresholds chosen by reading every line of the 653-song library — tools/line-split-audit/):
//   * a line's length = its written beats ÷ the beats of one bar (so a pickup counts as part of a bar);
//   * the song's normal line = the median length of its lines that carry words;
//   * a line is LONG when it is at least LONG_RATIO × the normal line in bars AND its melody carries at least
//     LONG_TEXT_RATIO × the song's normal line in letters. Bars alone are not enough: a few words held for many
//     bars ("เยซู เยซู เยซู เยซู", อนุชน 26) read as a short line, and cutting them would leave two stubs.
//     Letters are counted per MELODY (the median over every verse sung on that sheet line), so all the verses
//     of one tune are cut alike — a verse with a few letters fewer is not left as the one long line.
//     Both thresholds come from the audit (tools/line-split-audit/): of the lines ≥ 1.75 × the normal bars,
//     the letter ratios fall in 0.67–1.41 or 1.78–2.12, with nothing in between;
//   * it is cut into round(length ÷ normal) pieces, each cut at the candidate nearest an even share, and only
//     if one lies within CUT_TOLERANCE × normal of it. A candidate is a bar line where
//       - the last syllable before the bar line ends a วรรค in the way the reader is reading (the tune's
//         breaths — lyricPhrase.phraseBreaks — or, in ตามต้นฉบับ, the book's own phrasing), and
//       - the bar starts with a new syllable or a rest (a note held over the bar line is not a breath there).
//     A วรรค end is never inside a word (phraseBreaks guarantees it), so a cut never splits a word.
// Lines that are not long are never touched, and a long line with no candidate stays as it is.
import { slotTimes } from './lyricPhrase.js'
import { parseNotes, beatCount, expectedBeats } from './notation.js'

export const LONG_RATIO = 1.75 // bars: ≥ 1.75 × the song's normal line
export const LONG_TEXT_RATIO = 1.6 // letters: ≥ 1.6 × the song's normal line
export const CUT_TOLERANCE = 0.25 // a cut may sit at most this share of a normal line away from the even split

// the marks after which SongSheet's renderLines starts a new bar box (a segment that follows one opens a bar)
const CLOSES_BAR = new Set(['bar', 'section', 'end', 'repeat-start', 'repeat-end', 'volta', 'marker', 'label'])

function letters(ln) {
  let n = 0
  for (const s of ln.segs) for (const w of Array.isArray(s.syllables) ? s.syllables : []) if (typeof w === 'string') n += w.trim().length
  return n
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

// One sheet line (the items of content.lines[li], as SongSheet gets them) → { segs, barBeats, beats }:
//   segs      its segments, numbered si as SongSheet numbers them; barStart = the segment opens a bar (it follows
//             a bar line or any other mark — the same places SongSheet starts a new bar box)
//   barBeats  beats in one bar of this line's meter; beats = the line's written beats
export function lineShape(items, timeSignature) {
  const segs = []
  let si = -1
  let open = false
  let beats = 0
  for (const it of items || []) {
    if (it && it.type === 'segment') {
      si++
      segs.push({ si, note: it.note, syllables: it.syllables, barStart: !open })
      open = true
      beats += beatCount(parseNotes(it.note || ''))
    } else if (it && CLOSES_BAR.has(it.type)) open = false // anything else (the editor's `pickup` flag) does not
  }
  return { segs, barBeats: expectedBeats((items && items._ts) || timeSignature) || 0, beats }
}

// The two measures of every sheet line against the song's normal line. contentLines = the sheet's lines
// (content.lines, resolved); timeSignature = the song's meter.
// → per line: null (no words, or no meter to count bars by) | { shape, bars, normalBars, letters, normalLetters,
//   barRatio, letterRatio, long } — letters = the median over the verses sung on this line's melody.
export function lineMeasures(contentLines, timeSignature) {
  const shapes = (contentLines || []).map((items) => lineShape(items, timeSignature))
  const worded = shapes.filter((sh) => sh.barBeats && letters(sh) > 0)
  if (!worded.length) return shapes.map(() => null)
  const tune = (sh) => sh.segs.map((x) => x.note || '').join('|')
  const byTune = {}
  for (const sh of worded) (byTune[tune(sh)] ||= []).push(letters(sh))
  const normalBars = median(worded.map((sh) => sh.beats / sh.barBeats))
  const normalLetters = median(worded.map(letters))
  return shapes.map((sh) => {
    if (!worded.includes(sh)) return null
    const bars = sh.beats / sh.barBeats
    const lt = median(byTune[tune(sh)])
    const barRatio = bars / normalBars
    const letterRatio = lt / normalLetters
    const long = barRatio >= LONG_RATIO - 1e-9 && letterRatio >= LONG_TEXT_RATIO - 1e-9
    return { shape: sh, bars, normalBars, letters: lt, normalLetters, barRatio, letterRatio, long }
  })
}

// contentLines = the sheet's lines (content.lines, resolved). opts.timeSignature = the song's meter;
// opts.breaks[li] = the Set of `${si}-${k}` keys after which line li has a วรรค end (what the reader sees).
// → { [li]: Set of si } — start a new lyric line at segment si. Lines that are not cut have no entry.
export function lyricLineSplits(contentLines, opts = {}) {
  const out = {}
  lineMeasures(contentLines, opts.timeSignature).forEach((m, li) => {
    if (!m || !m.long) return
    const ln = m.shape
    const L = m.bars
    const normal = m.normalBars
    const breaks = (opts.breaks && opts.breaks[li]) || new Set()
    // walk the line: where each bar starts (in bars from the line start) and whether a cut may go there
    const cands = []
    let beats = 0
    let lastKey = null // the last syllable sung so far
    ln.segs.forEach((s, idx) => {
      const slots = slotTimes(s.note)
      const syl = Array.isArray(s.syllables) ? s.syllables : []
      if (s.barStart && idx > 0 && lastKey && breaks.has(lastKey) && slots.length) {
        const first = slots[0]
        const fresh = first.kind === 'rest' || (first.kind === 'note' && typeof syl[0] === 'string' && syl[0].trim())
        if (fresh) cands.push({ si: s.si, at: beats / ln.barBeats })
      }
      slots.forEach((slot, k) => {
        if (slot.kind !== 'rest' && typeof syl[k] === 'string' && syl[k].trim()) lastKey = `${s.si}-${k}`
      })
      beats += beatCount(parseNotes(s.note || ''))
    })
    const pieces = Math.round(L / normal)
    const picked = []
    let after = 0
    for (let j = 1; j < pieces; j++) {
      const target = (j * L) / pieces
      let best = null
      for (const c of cands) {
        if (c.at <= after + 1e-9) continue
        const d = Math.abs(c.at - target)
        if (d <= CUT_TOLERANCE * normal + 1e-9 && (!best || d < best.d)) best = { ...c, d }
      }
      if (best) { picked.push(best.si); after = best.at }
    }
    if (picked.length) out[li] = new Set(picked)
  })
  return out
}
