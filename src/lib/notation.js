// Numbered-notation (โน้ตตัวเลข / jianpu) token parser.
//
// Note string syntax, tokens separated by spaces:
//   [#|b] [.]* digit [']* [_]{0,2} [.]?
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
    if (s[j] === '#' || s[j] === 'b') { accidental = s[j]; j++ }
    let low = 0
    while (s[j] === '.') { low++; j++ }
    if (s[j] >= '0' && s[j] <= '7') {
      const pitch = s[j]
      j++
      let high = 0
      while (s[j] === "'") { high++; j++ }
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
