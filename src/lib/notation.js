// Numbered-notation (โน้ตตัวเลข / jianpu) token parser.
//
// Note string syntax, tokens separated by spaces:
//   [#|b|n] [.]* digit [']* [_]{0,2} [.]?   (n = natural ♮ — no pitch shift)
//   .5   = low octave (one dot below per leading .)
//   5'   = high octave (one dot above per ')
//   5_   = eighth note (1 underline) · 5__ = sixteenth (2 underlines)
//   5.   = dotted note (augmentation dot)
//   -    = extend previous note one beat
//   0    = rest
//   ( )  = slur/tie around a group  ·  { } = triplet around a group
// Old data like "5. .5 2 1 3" parses unchanged.

// Character-level lexer — spaces between notes are OPTIONAL ("123" = "1 2 3").
// A '.' directly before a digit is that digit's low-octave dot; a '.' at the
// end of a note (not followed by a digit) is an augmentation dot.
export function parseNotes(str) {
  if (!str) return []
  const s = str
  const tokens = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === ' ' || c === '\t' || c === '|') { i++; continue }
    if (c === '-' || c === '–') { tokens.push({ type: 'ext' }); i++; continue }
    if (c === '(') { tokens.push({ type: 'open', group: 'slur' }); i++; continue }
    if (c === ')') { tokens.push({ type: 'close', group: 'slur' }); i++; continue }
    if (c === '{') { tokens.push({ type: 'open', group: 'triplet' }); i++; continue }
    if (c === '}') { tokens.push({ type: 'close', group: 'triplet' }); i++; continue }
    // try to read one note: [~tie-end] [#b] [.]* digit [']* [_]{0,2} [.aug]? [~tie-start]
    let j = i
    let tieEnd = false
    if (s[j] === '~') { tieEnd = true; j++ }
    let accidental = ''
    if (s[j] === '#' || s[j] === 'b' || s[j] === 'n') { accidental = s[j]; j++ }
    let low = 0
    while (s[j] === '.') { low++; j++ }
    if (s[j] >= '0' && s[j] <= '7') {
      const pitch = s[j]
      j++
      // accept straight ' plus the curly apostrophes iOS "smart punctuation"
      // substitutes (‘ ’) and the prime ′ — all mean "up one octave"
      let high = 0
      while (s[j] === "'" || s[j] === '‘' || s[j] === '’' || s[j] === '′') { high++; j++ }
      let underlines = 0
      while (s[j] === '_' && underlines < 2) { underlines++; j++ }
      let dotted = false
      if (s[j] === '.') {
        // dots followed by a digit belong to the NEXT note (low-octave dots)
        let k = j
        while (s[k] === '.') k++
        const beforeDigit = s[k] >= '0' && s[k] <= '7'
        if (!beforeDigit || k - j >= 2) { dotted = true; j++ }
      }
      let tieStart = false
      let fermata = false
      while (s[j] === '~' || s[j] === '^') {
        if (s[j] === '~') tieStart = true
        else fermata = true
        j++
      }
      tokens.push({ type: 'note', accidental, low, pitch, high, underlines, dotted, tieStart, tieEnd, fermata })
      i = j
    } else {
      // consumed prefix without a digit, or an unknown character → unreadable
      const end = Math.max(j + 1, i + 1)
      tokens.push({ type: 'raw', text: s.slice(i, end) })
      i = end
    }
  }
  return tokens
}

// Duration of a token list in quarter-note beats.
// Plain digit = 1 beat · underline halves · dot ×1.5 · '-' = +1 beat · triplet group = 2/3.
export function beatCount(tokens) {
  let total = 0
  for (const g of groupNotes(tokens)) {
    let sub = 0
    for (const t of g.tokens) {
      if (t.type === 'note') {
        let d = 1 / 2 ** t.underlines
        if (t.dotted) d *= 1.5
        sub += d
      } else if (t.type === 'ext') {
        sub += 1
      }
    }
    if (g.group === 'triplet') sub = (sub * 2) / 3
    total += sub
  }
  return total
}

// Expected quarter-note beats per bar for a "n/d" time signature (e.g. 6/8 -> 3).
export function expectedBeats(timeSignature) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(timeSignature || '')
  if (!m) return null
  return (Number(m[1]) * 4) / Number(m[2])
}

// Group slur/triplet spans: returns [{ group: null|'slur'|'triplet', tokens: [...] }]
export function groupNotes(tokens) {
  const out = []
  let current = null
  for (const t of tokens) {
    if (t.type === 'open') {
      current = { group: t.group, tokens: [] }
      out.push(current)
    } else if (t.type === 'close') {
      current = null
    } else if (current) {
      current.tokens.push(t)
    } else {
      out.push({ group: null, tokens: [t] })
    }
  }
  return out
}

// Per note-BOX (whitespace token, as the Studio editor shows them) classification —
// this is what the lyric editor uses to put a box under EVERY note. Each box is:
//   'attack' — a note that starts a new syllable (needs a word)
//   'held'   — a held continuation that carries no NEW word but still gets its own
//              lyric box (optional/blank): a '-' extension, a rest (0), an explicit
//              tie (~) of the same pitch, or a same-pitch note under a slur (เอื้อน)
//   'struct' — a ( ) { } bracket: pure structure, no lyric box (an aligned spacer)
// Assumes the editor convention of one note per box; a box with several notes is
// classified by its first note.
export function noteBoxKinds(noteString) {
  const t = (noteString || '').trim()
  const boxes = t ? t.split(/\s+/) : ['']
  const out = []
  let prevKey = null
  let slur = false
  for (const b of boxes) {
    if (b === '(') { slur = true; prevKey = null; out.push('struct'); continue }
    if (b === ')') { slur = false; prevKey = null; out.push('struct'); continue }
    if (b === '{' || b === '}') { prevKey = null; out.push('struct'); continue }
    if (b === '-' || b === '–') { out.push('held'); continue } // extension, holds prev
    const note = parseNotes(b).find((x) => x.type === 'note')
    if (!note) { out.push('struct'); prevKey = null; continue } // unreadable → spacer
    if (note.pitch === '0') { out.push('held'); prevKey = null; continue } // rest: box, no word
    const key = (note.accidental || '') + note.pitch + (note.high - note.low)
    const held = (note.tieEnd && prevKey === key) || (slur && prevKey === key)
    out.push(held ? 'held' : 'attack')
    prevKey = key
  }
  return out
}

// Lyric SLOTS a melody bears = every box that shows a lyric box (attack + held). This
// is the length of the syllable array (song model v2 alignment) — one entry per note
// box, so held notes get their own (usually blank) slot and words stay under notes.
export function syllableSlots(noteString) {
  return noteBoxKinds(noteString).filter((k) => k !== 'struct').length
}

// Words a melody REQUIRES = attack notes only (held/rest boxes may stay blank). Used
// for the "enough words?" check so blank held boxes are never flagged as missing.
export function attackSlots(noteString) {
  return noteBoxKinds(noteString).filter((k) => k === 'attack').length
}
