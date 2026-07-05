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

const NOTE_RE = /^(#|b)?(\.*)([0-7])('*)(_{0,2})(\.)?$/

export function parseNotes(str) {
  if (!str) return []
  const parts = str
    .replace(/([({])/g, ' $1 ')
    .replace(/([)}])/g, ' $1 ')
    .trim()
    .split(/\s+/)
  const tokens = []
  for (const p of parts) {
    if (p === '-') { tokens.push({ type: 'ext' }); continue }
    if (p === '(') { tokens.push({ type: 'open', group: 'slur' }); continue }
    if (p === ')') { tokens.push({ type: 'close', group: 'slur' }); continue }
    if (p === '{') { tokens.push({ type: 'open', group: 'triplet' }); continue }
    if (p === '}') { tokens.push({ type: 'close', group: 'triplet' }); continue }
    const m = NOTE_RE.exec(p)
    if (m) {
      tokens.push({
        type: 'note',
        accidental: m[1] || '',
        low: m[2].length,
        pitch: m[3],
        high: m[4].length,
        underlines: m[5].length,
        dotted: !!m[6],
      })
    } else {
      tokens.push({ type: 'raw', text: p })
    }
  }
  return tokens
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
