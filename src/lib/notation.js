// Numbered-notation (โน้ตตัวเลข / jianpu) token parser.
//
// Note string syntax, tokens separated by spaces:
//   [#|b|n] [.]* digit [']* [_]{0,2} [.]?   (n = natural ♮ — no pitch shift)
//   .5   = low octave (one dot below per leading .)
//   5'   = high octave (one dot above per ')
//   5_   = eighth note (1 underline) · 5__ = sixteenth (2 underlines)
//   5.   = dotted note (augmentation dot, ×1.5) · 5.. = double-dotted (×1.75)
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
      // Augmentation dots: `.` = ×1.5, `..` = ×1.75 (jianpu "two dots = +¾").
      // A run of dots is ambiguous — a dot LEADING the next digit is that digit's
      // low-octave mark, not this note's augmentation. Rule: at the token end take up
      // to two augmentation dots; before a digit keep the legacy split (one aug dot,
      // the rest low-octave) so old data like "5..5" (dotted-5 then low .5) is unchanged.
      let dots = 0
      if (s[j] === '.') {
        let k = j
        while (s[k] === '.') k++
        const run = k - j
        const beforeDigit = s[k] >= '0' && s[k] <= '7'
        if (!beforeDigit) { dots = Math.min(run, 2); j += dots } // 5. →1 · 5.. →2 (extra → raw)
        else if (run >= 2) { dots = 1; j += 1 } // 5..5 → dotted 5 then low-octave .5
        // run === 1 before a digit → 0 aug dots; that dot is the next note's low octave
      }
      const dotted = dots > 0
      let tieStart = false
      let fermata = false
      while (s[j] === '~' || s[j] === '^') {
        if (s[j] === '~') tieStart = true
        else fermata = true
        j++
      }
      tokens.push({ type: 'note', accidental, low, pitch, high, underlines, dots, dotted, tieStart, tieEnd, fermata })
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

// Augmentation-dot duration multiplier, indexed by dot count: 0 → ×1, 1 → ×1.5,
// 2 → ×1.75 (each added dot adds half the previous — jianpu "two dots = +¾").
// Single source of truth shared by beatCount (bar math) and midi's tokenBeats (playback).
export const DOT_FACTOR = [1, 1.5, 1.75]

// Duration of a token list in quarter-note beats.
// Plain digit = 1 beat · underline halves · dot ×1.5 · double-dot ×1.75 · '-' = +1 beat · triplet group = 2/3.
export function beatCount(tokens) {
  let total = 0
  for (const g of groupNotes(tokens)) {
    let sub = 0
    for (const t of g.tokens) {
      if (t.type === 'note') {
        let d = 1 / 2 ** t.underlines
        d *= DOT_FACTOR[t.dots] ?? 1
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

// --- issue8: beam runs follow SYLLABLES, not beats ------------------------------------
// The reference songbook (traditional vocal / jianpu beaming) connects the underlines of
// consecutive eighth/sixteenth notes ONLY while the later notes are เอื้อน — a continuation
// of the SAME sung syllable. A note that starts a NEW word breaks the beam even mid-beat.
// (This is deliberate: modern instrumental beaming (Gould, *Behind Bars*) beams by beat and
// ignores syllables — we do NOT follow that; pleng targets sung Thai numbered notation.)
//
// The "does this note carry its own word" signal already lives in the v2 model as
// `seg.syllables` (one slot per syllable-bearing box, blank = เอื้อน) — the same array
// resolveContent aligns to each segment. So this is zero-migration: we thread that array in.
//
// `beamGroups(noteString, syllables)` returns { groups, beams }:
//   groups — groupNotes(parseNotes(noteString)) with each token stamped `.idx` (the running
//            slot NoteRow uses for data-idx) and `.beamed=true` on notes that join a beam.
//   beams  — [{ start, end, u2 }] one entry per beam run (start/end = token idx, u2 = the
//            run has a sixteenth → double beam). NoteRow draws one continuous underline each.
//
// A beam breaks at every OLD boundary (integer beat edge · non-underlined token · rest 0 ·
// '-' extension · triplet) AND, new for issue8, before any note that STARTS a new syllable.
// syllables == null (v1 / not supplied) → no note is ever an attack → identical to the prior
// beat-only behaviour (the graceful fallback).
export function beamGroups(noteString, syllables = null) {
  const gs = groupNotes(parseNotes(noteString))
  let idx = -1
  for (const g of gs) for (const t of g.tokens) t.idx = ++idx

  // Mark the token idx of every NOTE that begins a new sung syllable. Syllable slots align
  // with note + extension tokens in order (brackets & unreadable tokens bear no slot — the
  // same set syllableSlots()/noteBoxKinds() counts), so we walk with a running slot counter.
  const attacks = new Set()
  if (Array.isArray(syllables)) {
    let slot = -1
    for (const g of gs) {
      for (const t of g.tokens) {
        if (t.type === 'note' || t.type === 'ext') {
          slot++
          if (t.type === 'note') {
            const s = syllables[slot]
            const has = typeof s === 'string' ? s.trim() !== '' : s != null && s !== ''
            if (has) attacks.add(t.idx)
          }
        }
      }
    }
  }

  let beat = 0
  let run = []
  let runBeat = -1
  const beams = []
  const flush = () => {
    if (run.length >= 2) {
      run.forEach((t) => { t.beamed = true })
      beams.push({
        start: run[0].idx,
        end: run[run.length - 1].idx,
        u2: run.some((t) => t.underlines >= 2),
      })
    }
    run = []
  }
  for (const g of gs) {
    const isTrip = g.group === 'triplet'
    for (const t of g.tokens) {
      if (t.type === 'note') {
        let dur = (1 / 2 ** t.underlines) * (DOT_FACTOR[t.dots] ?? 1)
        if (isTrip) dur = (dur * 2) / 3
        const startBeat = Math.floor(beat + 1e-9)
        const beamable = !isTrip && t.underlines > 0 && t.pitch !== '0'
        // continue the current beam only for a เอื้อน note (no new word) that stays in the
        // same beat; a new-word note (or a beat/kind boundary) flushes and starts fresh.
        if (beamable && run.length > 0 && startBeat === runBeat && !attacks.has(t.idx)) {
          run.push(t)
        } else {
          flush()
          if (beamable) {
            run = [t]
            runBeat = startBeat
          }
        }
        beat += dur
      } else if (t.type === 'ext') {
        flush()
        beat += 1
      } else {
        flush()
      }
    }
  }
  flush()
  return { groups: gs, beams }
}

// --- issues5: slur pairs at LINE level (so a slur can cross a bar / segment) ------------
// A slur written `( … )` may open at the end of one segment and close at the start of the
// next (or several later), so the `(` and `)` land in DIFFERENT note strings. groupNotes
// only pairs them WITHIN one string, so a cross-segment slur has a dangling open (a stray
// one-note arc) in one box and a bare close in another. This resolves the pairing across
// the whole LINE — the same structure the cross-bar TIE overlay (B069/B099) already uses.
//
// input  — the segments' note strings for one line, left→right (index = si, matching the
//          `data-seg="{li}-{si}"` NoteRow carries).
// output — one entry per slur:
//   { open:{si, idx}, close:{si, idx}, sameSegment }
//   idx = the NoteRow token idx (per-segment, brackets dropped) of the anchor note: the
//         FIRST note after `(` for open, the LAST note before `)` for close.
// A `sameSegment:false` pair is what SongSheet must redraw as a line-level overlay arc;
// `sameSegment:true` pairs are left to NoteRow's own arc (unchanged — no regression).
// Nesting / consecutive slurs are handled with a stack (depth-1 is the common case).
export function slurSpans(noteStrings) {
  const spans = []
  const stack = []
  ;(noteStrings || []).forEach((str, si) => {
    let idx = -1 // running NoteRow token idx within THIS segment (brackets bear none)
    let lastNoteIdx = -1
    for (const t of parseNotes(str)) {
      if (t.type === 'open' && t.group === 'slur') {
        stack.push({ si, idx: null }) // anchor captured by the next note seen
      } else if (t.type === 'close' && t.group === 'slur') {
        const open = stack.pop()
        if (open && open.idx != null && lastNoteIdx >= 0) {
          spans.push({
            open: { si: open.si, idx: open.idx },
            close: { si, idx: lastNoteIdx },
            sameSegment: open.si === si,
          })
        }
      } else if (t.type === 'note' || t.type === 'ext' || t.type === 'raw') {
        idx++
        if (t.type === 'note') {
          lastNoteIdx = idx
          for (const o of stack) if (o.idx === null) { o.idx = idx; o.si = si }
        }
      }
      // triplet { } brackets advance nothing — they bear no note idx (dropped by groupNotes)
    }
  })
  return spans
}

// Decide how a cross-segment slur is drawn once its two anchor notes are MEASURED: a single
// continuous arc when both notes sit on the same visual row (crossing a bar line within one
// line), or a split arc (two halves, tail-of-row + head-of-next-row) when a line wrap fell
// between them. Pure so it is unit-testable (Tier A) with mocked rects; the pixel geometry
// itself stays in SongSheet (Tier B, real browser). rowH = a note's height (band tolerance).
export function arcPlan(openRect, closeRect, rowH) {
  const h = rowH || Math.max(openRect.height || 0, closeRect.height || 0) || 1
  return Math.abs(openRect.top - closeRect.top) <= h * 0.6 ? 'single' : 'split'
}
