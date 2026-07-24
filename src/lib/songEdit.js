// Shared edit engine for the v2 song model — the ONE place that mutates a song's notes.
// Pure functions over the stored v2 `content` (stanzas + arrangement), so both the
// reader-edit surface (SongViewer, editing inline on the ฝึกร้อง sheet) and the full
// editor (EditorMode) can reuse the SAME edit logic instead of each keeping its own copy.
//
// These operate on the STORED shape (what resolveContent consumes / the downloaded JSON):
//   stanza.lines[]  = a flat array of items { type:'segment'|'bar'|'section', note, chord }
//   a segment's `note` = space-separated jianpu box tokens ("1 2 3", "b.5_ - 0", "( 1 2 )")
// The note-box helpers below are string-level and shape-independent, so they work whether
// the caller holds a stored segment (SongViewer) or an editor segment (EditorMode).

import { noteBoxKinds, syllableSlots, canonicalizeNote, parseNotes } from './notation.js'
import { semitonesBetween, transposeChord, parseChord } from './chords.js'
import { mintMarkerIds } from './songFlow.js'

// Split a note string into its space-separated box tokens (one token per note box — the
// same convention noteBoxKinds / NoteBoxes use). '' → [''] so an empty segment still has
// one editable slot.
export function noteBoxes(noteStr) {
  const t = (noteStr || '').trim()
  return t ? t.split(/\s+/) : ['']
}

// Map a syllable-bearing SLOT index (syk — the index SongSheet's @seek and midi.js use:
// every box EXCEPT the ( ) { } structure brackets) to the raw box-token index. -1 if out
// of range. This is the bridge between "the note the reader tapped" and "the token to edit".
export function boxIndexForSlot(noteStr, syk) {
  const kinds = noteBoxKinds(noteStr)
  let slot = -1
  for (let i = 0; i < kinds.length; i++) {
    if (kinds[i] === 'struct') continue
    slot++
    if (slot === syk) return i
  }
  return -1
}

// Overwrite mode: set the PITCH of the syk-th note box to `digit` (1–7, or 0 = rest),
// KEEPING the note's other marks (accidental #/b, octave dots, underline, augmentation) so
// fixing a wrong pitch never drops its octave or duration. A box that carries no digit yet
// (a '-' hold) just becomes the plain digit. Returns the new note string (unchanged if the
// slot is out of range or the digit is invalid).
export function setNotePitch(noteStr, syk, digit) {
  const d = String(digit)
  if (!/^[0-7]$/.test(d)) return noteStr
  const boxes = noteBoxes(noteStr)
  const bi = boxIndexForSlot(noteStr, syk)
  if (bi < 0) return noteStr
  const tok = boxes[bi]
  // replace the first scale-digit in the token; if there is none (e.g. '-'), the whole
  // token becomes the digit.
  boxes[bi] = /[0-7]/.test(tok) ? tok.replace(/[0-7]/, d) : d
  return boxes.join(' ')
}

// Locate a source segment from a RESOLVED line's tags. resolveContent stamps each display
// line with `_stanza` (source stanza id) and `_stanzaLine` (line index within that stanza);
// `si` is the segment's position among the segments of that line (matching SongSheet's
// data-seg). Returns { stanzaIndex, lineIndex, segIndex } into content, or null.
export function locateSegment(content, resolvedLine, si) {
  if (!content || !Array.isArray(content.stanzas) || !resolvedLine) return null
  const stanzaId = resolvedLine._stanza
  const lineIndex = resolvedLine._stanzaLine
  const stanzaIndex = content.stanzas.findIndex((s) => s.id === stanzaId)
  if (stanzaIndex < 0) return null
  const line = content.stanzas[stanzaIndex].lines?.[lineIndex]
  if (!Array.isArray(line)) return null
  let seg = -1
  for (let i = 0; i < line.length; i++) {
    if (line[i]?.type === 'segment') {
      seg++
      if (seg === si) return { stanzaIndex, lineIndex, segIndex: i }
    }
  }
  return null
}

// Produce a NEW v2 content with one note box overwritten, SHARING every untouched part
// (only the affected stanza → line → segment are cloned — structural sharing, so this is
// cheap and never disturbs the rest of the song or other verses). `loc` is a resolved-line
// address: { resolvedLine, si, syk }. Returns the same content reference (===) when nothing
// changed, so the caller can skip a no-op emit.
export function withNotePitch(content, loc, digit) {
  const { resolvedLine, si, syk } = loc
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const line = content.stanzas[at.stanzaIndex].lines[at.lineIndex]
  const seg = line[at.segIndex]
  const newNote = setNotePitch(seg.note || '', syk, digit)
  if (newNote === (seg.note || '')) return content
  const newLine = line.slice()
  newLine[at.segIndex] = { ...seg, note: newNote }
  const stanza = content.stanzas[at.stanzaIndex]
  const newLines = stanza.lines.slice()
  newLines[at.lineIndex] = newLine
  const newStanzas = content.stanzas.slice()
  newStanzas[at.stanzaIndex] = { ...stanza, lines: newLines }
  return { ...content, stanzas: newStanzas }
}

// ---------- insert / delete a note box (with ripple) ----------
// These GROW or SHRINK a melody, so the words of every verse that shares this stanza must
// shift with it (AC-B1.4: "แทรก/ลบ ในทำนองที่ share → ripple ทุกข้อพร้อมกัน"). The syllable
// array of an arrangement entry aligns 1:1 with the stanza's syllable-bearing note boxes in
// reading order, so the insert/delete point in a segment maps to one GLOBAL slot index that
// we open/close in each linked verse.

// Insert `token` as a NEW box at slot syk (pushing the box at that slot right). At/after the
// last slot → append. An empty segment ('') just becomes the token. Returns the note string.
export function insertBoxAtSlot(noteStr, syk, token) {
  const boxes = noteBoxes(noteStr)
  if (boxes.length === 1 && boxes[0] === '') return token
  let bi = boxIndexForSlot(noteStr, syk)
  if (bi < 0) bi = boxes.length // append past the end
  boxes.splice(bi, 0, token)
  return boxes.join(' ')
}

// Remove the box at slot syk (following boxes pull left). '' when the segment empties.
export function removeBoxAtSlot(noteStr, syk) {
  const boxes = noteBoxes(noteStr)
  const bi = boxIndexForSlot(noteStr, syk)
  if (bi < 0) return noteStr
  boxes.splice(bi, 1)
  return boxes.length ? boxes.join(' ') : ''
}

// Global syllable-slot index of (segment #segOrdinal in line #lineIdx, slot syk) within a
// stanza — the running count of syllable-bearing boxes over every earlier segment, all
// lines, matching how resolveContent consumes an entry's `syllables` across the stanza.
function stanzaGlobalSlot(stanza, lineIdx, segOrdinal, syk) {
  let g = 0
  for (let li = 0; li < (stanza.lines || []).length; li++) {
    let seg = -1
    for (const item of stanza.lines[li]) {
      if (item?.type !== 'segment') continue
      seg++
      if (li === lineIdx && seg === segOrdinal) return g + syk
      g += syllableSlots(item.note || '')
    }
  }
  return g + syk
}

// open (insert) or close (delete) one syllable slot at global index g, in EVERY arrangement
// entry that links this stanza. Returns a new arrangement array (untouched entries kept ===).
function rippleVerses(content, stanzaId, g, mode) {
  return (content.arrangement || []).map((entry) => {
    if (entry.stanza !== stanzaId) return entry
    const syl = (entry.syllables || []).slice()
    if (mode === 'insert') {
      syl.splice(Math.min(g, syl.length), 0, '') // open a blank slot (JS clamps start)
    } else {
      if (g < syl.length) syl.splice(g, 1) // close the slot
      while (syl.length && syl[syl.length - 1] === '') syl.pop() // keep it tidy
    }
    return { ...entry, syllables: syl }
  })
}

// helper: rebuild content with one segment's note replaced + the arrangement rippled
function withSegmentNote(content, at, newNote, newArrangement) {
  const stanza = content.stanzas[at.stanzaIndex]
  const line = stanza.lines[at.lineIndex]
  const newLine = line.slice()
  newLine[at.segIndex] = { ...line[at.segIndex], note: newNote }
  const newLines = stanza.lines.slice()
  newLines[at.lineIndex] = newLine
  const newStanzas = content.stanzas.slice()
  newStanzas[at.stanzaIndex] = { ...stanza, lines: newLines }
  return { ...content, stanzas: newStanzas, arrangement: newArrangement }
}

// Insert a new note (pitch `digit`) AFTER the cursor's note (P'Aim: แทรกหลัง — clearer, builds
// left-to-right), rippling every linked verse. The new note lands at the next slot.
export function withInsertedNote(content, loc, digit) {
  const d = String(digit)
  if (!/^[0-7]$/.test(d)) return content
  return withInsertedBox(content, loc, d)
}

// Insert ANY box token next to the cursor's note — the generalisation of withInsertedNote so
// the inline editor can type the structural symbols too ('-' hold · '(' ')' slur · '{' '}'
// triplet). Two kinds of token, told apart by the SAME classifier the renderer uses
// (noteBoxKinds), never by a hand-written list:
//   • slot-bearing ('-' / a digit) — grows the melody, so every linked verse's syllables
//     ripple exactly like an inserted note.
//   • 'struct' (the four brackets) — carries no syllable slot, so NO ripple: adding a slur
//     bracket must not shift anybody's words.
// `before` puts the box on the LEFT of the cursor note (what an opening '(' / '{' means).
export function withInsertedBox(content, loc, token, before = false) {
  const { resolvedLine, si, syk } = loc
  const tok = String(token ?? '')
  if (!tok) return content
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const stanza = content.stanzas[at.stanzaIndex]
  const note = stanza.lines[at.lineIndex][at.segIndex].note || ''
  const slot = syk + (before ? 0 : 1)
  const newNote = insertBoxAtSlot(note, slot, tok)
  if (newNote === note) return content
  const bearsSlot = noteBoxKinds(tok)[0] !== 'struct'
  const arrangement = bearsSlot
    ? rippleVerses(content, stanza.id, stanzaGlobalSlot(stanza, at.lineIndex, si, syk) + (before ? 0 : 1), 'insert')
    : content.arrangement
  return withSegmentNote(content, at, newNote, arrangement)
}

// Toggle a box token next to the cursor: if the neighbour where this box would be inserted is
// ALREADY exactly this token, REMOVE it (with the same ripple an insert would open, reversed);
// otherwise INSERT it (delegates to withInsertedBox). This is what makes every structural symbol
// (`-` hold · `( ) { }` brackets) apply-AND-remove from one key (BI-003): pressing the same
// symbol twice puts the melody back exactly where it started, instead of stacking a second copy.
// `before` matches withInsertedBox: an opening bracket sits on the LEFT of the cursor note, so its
// twin lives at bi-1; everything else sits on the RIGHT, at bi+1.
export function withToggledBox(content, loc, token, before = false) {
  const { resolvedLine, si, syk } = loc
  const tok = String(token ?? '')
  if (!tok) return content
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const stanza = content.stanzas[at.stanzaIndex]
  const note = stanza.lines[at.lineIndex][at.segIndex].note || ''
  const boxes = noteBoxes(note)
  const bi = boxIndexForSlot(note, syk)
  if (bi >= 0) {
    const adj = before ? bi - 1 : bi + 1
    if (adj >= 0 && adj < boxes.length && boxes[adj] === tok) {
      // remove the neighbour we (or the user) added. A slot-bearing box ('-') closes its slot in
      // every linked verse, exactly reversing the insert's open; a bracket bears no slot → no ripple.
      const bearsSlot = noteBoxKinds(tok)[0] !== 'struct'
      boxes.splice(adj, 1)
      const newNote = boxes.length ? boxes.join(' ') : ''
      const arrangement = bearsSlot
        ? rippleVerses(content, stanza.id, stanzaGlobalSlot(stanza, at.lineIndex, si, syk) + (before ? 0 : 1), 'delete')
        : content.arrangement
      return withSegmentNote(content, at, newNote, arrangement)
    }
  }
  return withInsertedBox(content, loc, tok, before)
}

// ---------- slur (เอื้อน `( )`) : ONE phrase arc over 2+ notes, a single removable object -------
// A slur is authored as a `(` before its first note and a `)` after its last. Those brackets sit
// EITHER as their own boxes ("( 6 1 )") OR — the overwhelming form in imported data (a library
// scan found 556 fused vs 2 separate) — FUSED onto the note token ("(6 … 1)"), and the pair may
// span several segments / bar lines of one line. withToggledBox only ever recognised a SEPARATE
// "(" box sitting right beside the cursor, so on the fused form pressing `(` again did not remove
// the slur — it STACKED a second bracket (BI-011 claimed slur-removal but only ever proved the tie
// `~`; P'Aim caught that "กด ( ก็ไม่หาย"). This resolves the WHOLE line into slur pairs and, like
// MuseScore / Dorico (a slur is one relational object, not two characters — G consult 2026-07-24),
// removes the ENTIRE pair from ANY note it touches by EITHER slur key. A still-unmatched opener is
// dropped on its own (undo a half-authored slur); a note under no slur ADDS an endpoint — `(`
// before, `)` after — keeping the unchanged two-press authoring. Brackets bear no syllable slot, so
// nothing ever ripples the linked verses.
function hasOpenBracket(tok) { return String(tok)[0] === '(' }
function hasCloseBracket(tok) { const s = String(tok); return s[s.length - 1] === ')' }
function stripOneOpen(tok) { const s = String(tok); return s[0] === '(' ? s.slice(1) : s }
function stripOneClose(tok) { const s = String(tok); return s[s.length - 1] === ')' ? s.slice(0, -1) : s }

// Apply a set of box edits to ONE line and rebuild content. `edits` = [{ itemIdx, boxIdx, tok }];
// tok === '' (or null) deletes the box. Edits are grouped per segment and applied high-index-first
// so earlier deletions never shift a later box index. Structural sharing: only touched segments are
// cloned. No arrangement ripple — slur brackets carry no syllable slot.
function withLineBoxEdits(content, at, edits) {
  const stanza = content.stanzas[at.stanzaIndex]
  const line = stanza.lines[at.lineIndex]
  const byItem = new Map()
  for (const e of edits) {
    if (!byItem.has(e.itemIdx)) byItem.set(e.itemIdx, [])
    byItem.get(e.itemIdx).push(e)
  }
  const newLine = line.slice()
  for (const [itemIdx, list] of byItem) {
    const boxes = noteBoxes(line[itemIdx].note || '')
    list.sort((a, b) => b.boxIdx - a.boxIdx) // high index first
    for (const e of list) {
      const t = e.tok == null ? '' : String(e.tok)
      if (t === '') boxes.splice(e.boxIdx, 1)
      else boxes[e.boxIdx] = t
    }
    newLine[itemIdx] = { ...line[itemIdx], note: boxes.length ? boxes.join(' ') : '' }
  }
  const newLines = stanza.lines.slice()
  newLines[at.lineIndex] = newLine
  const newStanzas = content.stanzas.slice()
  newStanzas[at.stanzaIndex] = { ...stanza, lines: newLines }
  return { ...content, stanzas: newStanzas }
}

export function withToggledSlur(content, loc, ch) {
  const at = locateSegment(content, loc.resolvedLine, loc.si)
  if (!at) return content
  const line = content.stanzas[at.stanzaIndex].lines[at.lineIndex]

  // Flatten every SEGMENT item's boxes into one line-level sequence (remembering the box's home so
  // an edit can be written back), then match ( ) into pairs with a stack — innermost pops first.
  const flat = []
  line.forEach((item, itemIdx) => {
    if (item?.type !== 'segment') return
    noteBoxes(item.note || '').forEach((tok, boxIdx) => flat.push({ itemIdx, boxIdx, tok }))
  })
  const pairs = []
  const stack = []
  flat.forEach((f, i) => {
    if (hasOpenBracket(f.tok)) stack.push(i)
    if (hasCloseBracket(f.tok) && stack.length) pairs.push({ openFlat: stack.pop(), closeFlat: i })
  })

  // Where is the selected note in the flattened line?
  const selNote = line[at.segIndex].note || ''
  const selBox = boxIndexForSlot(selNote, loc.syk)
  if (selBox < 0) return content
  const selFlat = flat.findIndex((f) => f.itemIdx === at.segIndex && f.boxIdx === selBox)
  if (selFlat < 0) return content

  // 1) selected note lies within a matched pair (endpoint OR middle) → remove the WHOLE pair,
  //    innermost (smallest span) first so an outer phrase slur is never stripped by mistake.
  let target = null
  for (const p of pairs) {
    if (selFlat >= p.openFlat && selFlat <= p.closeFlat) {
      if (!target || p.closeFlat - p.openFlat < target.closeFlat - target.openFlat) target = p
    }
  }
  if (target) {
    const o = flat[target.openFlat]
    const c = flat[target.closeFlat]
    if (target.openFlat === target.closeFlat) {
      // both brackets fused on one box ("(6)") → strip both at once
      const t = stripOneClose(stripOneOpen(o.tok))
      return withLineBoxEdits(content, at, [{ itemIdx: o.itemIdx, boxIdx: o.boxIdx, tok: t }])
    }
    return withLineBoxEdits(content, at, [
      { itemIdx: o.itemIdx, boxIdx: o.boxIdx, tok: stripOneOpen(o.tok) },
      { itemIdx: c.itemIdx, boxIdx: c.boxIdx, tok: stripOneClose(c.tok) },
    ])
  }

  // 2) a dangling (unmatched) bracket the pressed key owns — fused on this note, or a SEPARATE box
  //    right beside it → remove just that one (undo a half-authored slur before its twin exists).
  const selTok = flat[selFlat].tok
  const prev = flat[selFlat - 1]
  const next = flat[selFlat + 1]
  if (ch === '(') {
    if (hasOpenBracket(selTok)) {
      return withLineBoxEdits(content, at, [{ itemIdx: at.segIndex, boxIdx: selBox, tok: stripOneOpen(selTok) }])
    }
    if (prev && prev.itemIdx === at.segIndex && prev.tok === '(') {
      return withLineBoxEdits(content, at, [{ itemIdx: prev.itemIdx, boxIdx: prev.boxIdx, tok: '' }])
    }
  } else if (ch === ')') {
    if (hasCloseBracket(selTok)) {
      return withLineBoxEdits(content, at, [{ itemIdx: at.segIndex, boxIdx: selBox, tok: stripOneClose(selTok) }])
    }
    if (next && next.itemIdx === at.segIndex && next.tok === ')') {
      return withLineBoxEdits(content, at, [{ itemIdx: next.itemIdx, boxIdx: next.boxIdx, tok: '' }])
    }
  }

  // 3) no slur here → ADD an endpoint (unchanged authoring): opener before, closer after.
  return withInsertedBox(content, loc, ch, ch === '(')
}

// ---------- tie (โยงเสียง `~`) : join TWO same-pitch notes into one sustained sound ----------
// A tie is a PAIR of marks, never one: the first note carries tie-start (`5~`), the second carries
// tie-end (`~5`), and both must be the SAME written pitch. Only then does playback (midi.mergeTies)
// fold them into one un-re-attacked sound and the sheet (NoteRow) draw the two half-arcs into one
// curve. The old `~` set tie-start on ONE note, so nothing ever connected (BI-009 §3) — a half-arc
// to nowhere, and a re-attack in playback. Pressing `~` on a note now ties it to the adjacent
// same-pitch note (the NEXT box first — "hold this on into the next" — else the PREVIOUS), and
// pressing `~` again UNTIES (clears both marks). A tie between DIFFERENT pitches is not a tie (that
// is a slur / เอื้อน — the `( )` group), so with no same-pitch neighbour it is a no-op: we never
// draw an arc that will not sound.
function boxNote(tok) {
  return parseNotes(tok).find((t) => t.type === 'note') || null
}
function samePitch(a, b) {
  return !!a && !!b && a.pitch !== '0' && a.pitch === b.pitch && a.high - a.low === b.high - b.low
}
// Rebuild a box token from a parsed note with tie flags patched — canonical order so it re-parses
// identically ( [~tieEnd] acc .low* digit '_high* _under* .aug* [~tieStart] [^] ). Any group bracket
// riding on the same box in legacy data ("(5", "5)") is preserved around the rebuilt core, so a tie
// never silently drops a slur/triplet wrapper.
function noteWithTie(origTok, t, { tieStart = t.tieStart, tieEnd = t.tieEnd } = {}) {
  const s = String(origTok ?? '')
  let a = 0
  let b = s.length
  while (a < b && (s[a] === '(' || s[a] === '{')) a++
  while (b > a && (s[b - 1] === ')' || s[b - 1] === '}')) b--
  let core = ''
  if (tieEnd) core += '~'
  if (t.accidental) core += t.accidental
  core += '.'.repeat(t.low)
  core += t.pitch
  core += "'".repeat(t.high)
  core += '_'.repeat(t.underlines)
  core += '.'.repeat(t.dots)
  if (tieStart) core += '~'
  if (t.fermata) core += '^'
  return s.slice(0, a) + core + s.slice(b)
}
export function withTie(content, loc) {
  const { resolvedLine, si, syk } = loc
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const seg = content.stanzas[at.stanzaIndex].lines[at.lineIndex][at.segIndex]
  const boxes = noteBoxes(seg.note || '')
  const bi = boxIndexForSlot(seg.note || '', syk)
  if (bi < 0) return content
  const cur = boxNote(boxes[bi])
  if (!cur || cur.pitch === '0') return content // only a real pitched note can be tied
  const nextIdx = bi + 1
  const prevIdx = bi - 1
  const next = nextIdx < boxes.length ? boxNote(boxes[nextIdx]) : null
  const prev = prevIdx >= 0 ? boxNote(boxes[prevIdx]) : null
  const commit = () => withSegmentNote(content, at, boxes.join(' '), content.arrangement)
  const curTok = boxes[bi]
  const nextTok = boxes[nextIdx]
  const prevTok = boxes[prevIdx]
  // already tied forward → untie
  if (cur.tieStart && next && next.tieEnd && samePitch(cur, next)) {
    boxes[bi] = noteWithTie(curTok, cur, { tieStart: false })
    boxes[nextIdx] = noteWithTie(nextTok, next, { tieEnd: false })
    return commit()
  }
  // already tied backward → untie
  if (cur.tieEnd && prev && prev.tieStart && samePitch(cur, prev)) {
    boxes[bi] = noteWithTie(curTok, cur, { tieEnd: false })
    boxes[prevIdx] = noteWithTie(prevTok, prev, { tieStart: false })
    return commit()
  }
  // tie forward to a same-pitch next note
  if (samePitch(cur, next)) {
    boxes[bi] = noteWithTie(curTok, cur, { tieStart: true })
    boxes[nextIdx] = noteWithTie(nextTok, next, { tieEnd: true })
    return commit()
  }
  // else tie backward to a same-pitch previous note
  if (samePitch(cur, prev)) {
    boxes[bi] = noteWithTie(curTok, cur, { tieEnd: true })
    boxes[prevIdx] = noteWithTie(prevTok, prev, { tieStart: true })
    return commit()
  }
  return content // nothing adjacent shares this pitch → not a tie
}

// Which symbol characters are ALREADY ON the note at `loc` — so the toolbar can light the
// matching key (an active/pressed state), the standard text-editor toggle affordance: a person
// who sees an arc over a note but does not know how to remove it now sees the `~` (or `(` / `)`)
// key already lit, telling them "press this again to take it off". The predicates MIRROR each
// symbol's toggle-OFF condition in this file (withTie / withToggledBox / withNoteMark /
// withAccidental) so a lit key and a working removal are the same fact seen twice — never two
// tables that can disagree (CP-0 discipline). Returns a plain array (a Set is not prop-friendly).
// `|` (bar) and octave (' ,) are intentionally omitted: a bar line and an octave dot are already
// plainly visible on the sheet, and octave has its own dedicated dock buttons, not a strip key.
export function activeSymbolsAt(content, loc) {
  const out = []
  if (!loc) return out
  const { resolvedLine, si, syk } = loc
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return out
  const seg = content.stanzas[at.stanzaIndex].lines[at.lineIndex][at.segIndex]
  const note = seg?.note || ''
  const boxes = noteBoxes(note)
  const bi = boxIndexForSlot(note, syk)
  if (bi < 0) return out
  const cur = boxNote(boxes[bi]) // parsed pitched note riding this box (null for a bare bracket)
  if (cur) {
    if (cur.tieStart || cur.tieEnd) out.push('~') // a tie half-arc rides this note
    if (cur.fermata) out.push('^')
    if (cur.underlines > 0) out.push('_')
    if (cur.dots > 0) out.push('.') // aug dot (octave-low `.` is `cur.low`, a different key)
    if (cur.accidental) out.push(cur.accidental) // '#' | 'b' | 'n'
  }
  // slur brackets light `(` on the opener note / `)` on the closer note — whether the bracket rides
  // FUSED on the note token ("(6", "1)"; the dominant imported form) or sits as its OWN box beside
  // it ("( 6", "6 )"). Mirrors withToggledSlur's toggle-OFF so a lit key and a working removal are
  // the same fact seen twice (CP-0). Fused test on the token; separate test on the neighbour box.
  const tok = boxes[bi]
  if (tok[0] === '(' || boxes[bi - 1] === '(') out.push('(')
  if (tok[tok.length - 1] === ')' || boxes[bi + 1] === ')') out.push(')')
  // structural brackets are their OWN boxes beside the note — same sides withToggledBox removes from
  if (boxes[bi - 1] === '{') out.push('{')
  if (boxes[bi + 1] === '}') out.push('}')
  if (boxes[bi + 1] === '-') out.push('-')
  return out
}

// Insert a BAR LINE ('|') after the cursor's note. A bar is not a note box — in v2 it is its
// own line item {type:'bar'} between two segments — so this SPLITS the segment at the cursor:
// the boxes up to the cursor stay in place (keeping the segment's chord), a bar item follows,
// and the remaining boxes become a new segment. The syllable slots are unchanged (same boxes,
// same order), so no verse ripples. Splitting at the segment's last note just drops a bar in
// after it (no empty segment left behind).
export function withBarAfter(content, loc) {
  const { resolvedLine, si, syk } = loc
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const stanza = content.stanzas[at.stanzaIndex]
  const line = stanza.lines[at.lineIndex]
  const seg = line[at.segIndex]
  const boxes = noteBoxes(seg.note || '')
  const bi = boxIndexForSlot(seg.note || '', syk)
  if (bi < 0) return content
  const head = boxes.slice(0, bi + 1)
  const tail = boxes.slice(bi + 1)
  const newLine = line.slice()
  const items = [{ ...seg, note: head.join(' ') }, { type: 'bar' }]
  if (tail.length) items.push({ type: 'segment', note: tail.join(' '), chord: '' })
  newLine.splice(at.segIndex, 1, ...items)
  return withSegmentLine(content, at, newLine, content.arrangement)
}

// Toggle a bar line: split after the cursor's note (withBarAfter), or — if the cursor is on the
// LAST note of its segment and a bar item follows — REMOVE that bar, merging the next segment back
// (its notes keep their order and slots, so no verse ripples). This gives `|` the same apply/remove
// symmetry as every other symbol (BI-003): drop a bar, press `|` again on the same note to undo it.
export function withToggledBar(content, loc) {
  const { resolvedLine, si, syk } = loc
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const line = content.stanzas[at.stanzaIndex].lines[at.lineIndex]
  const seg = line[at.segIndex]
  const boxes = noteBoxes(seg.note || '')
  const bi = boxIndexForSlot(seg.note || '', syk)
  if (bi < 0) return content
  const nextItem = line[at.segIndex + 1]
  if (bi === boxes.length - 1 && nextItem && nextItem.type === 'bar') {
    const newLine = line.slice()
    const afterSeg = newLine[at.segIndex + 2]
    if (afterSeg && afterSeg.type === 'segment') {
      const mergedNote = [seg.note, afterSeg.note].filter(Boolean).join(' ')
      newLine.splice(at.segIndex, 3, { ...seg, note: mergedNote, chord: seg.chord || afterSeg.chord || '' })
    } else {
      newLine.splice(at.segIndex + 1, 1) // trailing bar with nothing after → just drop it
    }
    return withSegmentLine(content, at, newLine, content.arrangement)
  }
  return withBarAfter(content, loc)
}

// ---------- the note MARKS that live on the box itself ----------
// _ (เขบ็ต / beam) · . (จุดเพิ่มความยาว / augmentation dot) · ~ (โยงเสียง / tie) · ^ (fermata).
// Each press CYCLES its own mark and touches nothing else, then the box is handed to the
// parser's own canonicaliser (G1) so a mark typed in any order still lands in the canonical
// spot — one grammar for the whole app, never a second parser here.
//   '_'  0 → 1 → 2 → 0 underlines (เขบ็ต 1 ชั้น · 2 ชั้น · ตัวดำ)
//   '.'  0 → 1 → 2 → 0 augmentation dots (×1.5 · ×1.75)
//   '~'  tie start on/off      '^'  fermata on/off
// Marks only make sense on a real note/rest box, so a '-' hold or a bracket is left alone.
const MARK_CHARS = "_.~^"
function cycleBoxMark(tok, ch) {
  if (!/[0-7]/.test(tok)) return tok
  const di = tok.search(/[0-7]/)
  const head = tok.slice(0, di + 1)
  const tail = tok.slice(di + 1) // everything AFTER the digit — where all four marks live
  if (ch === '_' || ch === '.') {
    const n = (tail.match(ch === '_' ? /_/g : /\./g) || []).length
    const rest = tail.replace(ch === '_' ? /_/g : /\./g, '')
    return head + rest + ch.repeat((n + 1) % 3)
  }
  // '~' / '^' — a plain on/off toggle
  return tail.includes(ch) ? head + tail.split(ch).join('') : head + tail + ch
}
// Apply one mark character to the selected note. Returns the same content on a no-op (an
// unsupported character, or a box that bears no note).
export function withNoteMark(content, loc, ch) {
  if (!MARK_CHARS.includes(ch)) return content
  return withBoxTransform(content, loc, (tok) => canonicalizeNote(cycleBoxMark(tok, ch)))
}

// Delete the note at the cursor slot (pull-tight), closing the slot in every linked verse.
// If that empties the segment, the WHOLE segment is dropped — its chord goes with it (no orphan
// chord left behind: "ลบโน้ตหมดแล้วคอร์ดหายเลย").
export function withDeletedNote(content, loc) {
  const { resolvedLine, si, syk } = loc
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const stanza = content.stanzas[at.stanzaIndex]
  const seg = stanza.lines[at.lineIndex][at.segIndex]
  if (boxIndexForSlot(seg.note || '', syk) < 0) return content
  const g = stanzaGlobalSlot(stanza, at.lineIndex, si, syk)
  const newNote = removeBoxAtSlot(seg.note || '', syk)
  const newArrangement = rippleVerses(content, stanza.id, g, 'delete')
  if (newNote !== '') return withSegmentNote(content, at, newNote, newArrangement)
  // segment emptied → remove the segment item entirely (drops its chord too)
  const line = stanza.lines[at.lineIndex]
  const newLine = line.slice()
  newLine.splice(at.segIndex, 1)
  const newLines = stanza.lines.slice()
  newLines[at.lineIndex] = newLine
  const newStanzas = content.stanzas.slice()
  newStanzas[at.stanzaIndex] = { ...stanza, lines: newLines }
  return { ...content, stanzas: newStanzas, arrangement: newArrangement }
}

// Set (or clear) the chord on the selected note's segment. chord='' = "ไม่มีคอร์ด" (clears it
// without touching the note). No ripple. Returns same content on a no-op.
export function withChord(content, loc, chord) {
  const { resolvedLine, si } = loc
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const line = content.stanzas[at.stanzaIndex].lines[at.lineIndex]
  const seg = line[at.segIndex]
  if ((seg.chord || '') === (chord || '')) return content
  const newLine = line.slice()
  newLine[at.segIndex] = { ...seg, chord: chord || '' }
  return withSegmentLine(content, at, newLine, content.arrangement)
}

// helper: rebuild content with one stanza line replaced + arrangement
function withSegmentLine(content, at, newLine, newArrangement) {
  const stanza = content.stanzas[at.stanzaIndex]
  const newLines = stanza.lines.slice()
  newLines[at.lineIndex] = newLine
  const newStanzas = content.stanzas.slice()
  newStanzas[at.stanzaIndex] = { ...stanza, lines: newLines }
  return { ...content, stanzas: newStanzas, arrangement: newArrangement }
}

// ---------- octave + accidental (same jianpu rules as EditorMode.octaveShift) ----------
// One box token, shifted one octave: up = drop a leading low dot else add a high ' ; down =
// drop a trailing high ' else add a low dot. Mirrors EditorMode so a note behaves the same
// in both editors. Only real notes 1–7 (a rest 0 / hold '-' is left alone).
function shiftBoxOctave(tok, dir) {
  if (!/[1-7]/.test(tok)) return tok
  if (dir > 0) return tok.startsWith('.') ? tok.slice(1) : tok + "'"
  return tok.endsWith("'") ? tok.slice(0, -1) : '.' + tok
}
// Toggle a sharp/flat at the FRONT of the token (jianpu puts the accidental before the digit,
// like NoteBoxes.fixAccidental). Pressing the same accidental again clears it.
function toggleBoxAccidental(tok, acc) {
  if (!/[1-7]/.test(tok)) return tok
  let tie = ''
  let v = tok
  if (v.startsWith('~')) { tie = '~'; v = v.slice(1) } // keep a tie-end marker in front
  const cur = v[0] === '#' || v[0] === 'b' || v[0] === 'n' ? v[0] : ''
  const rest = cur ? v.slice(1) : v
  return tie + (cur === acc ? '' : acc) + rest
}
function withBoxTransform(content, loc, fn) {
  const { resolvedLine, si, syk } = loc
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const seg = content.stanzas[at.stanzaIndex].lines[at.lineIndex][at.segIndex]
  const boxes = noteBoxes(seg.note || '')
  const bi = boxIndexForSlot(seg.note || '', syk)
  if (bi < 0) return content
  const next = fn(boxes[bi])
  if (next === boxes[bi]) return content
  boxes[bi] = next
  return withSegmentNote(content, at, boxes.join(' '), content.arrangement)
}
// Shift the selected note one octave (dir +1 up / −1 down). No ripple.
export function withOctaveShift(content, loc, dir) {
  return withBoxTransform(content, loc, (tok) => shiftBoxOctave(tok, dir))
}
// Toggle sharp ('#') or flat ('b') on the selected note. No ripple.
export function withAccidental(content, loc, acc) {
  return withBoxTransform(content, loc, (tok) => toggleBoxAccidental(tok, acc))
}

// "Leave-a-gap" delete: turn the note into a REST (0) but KEEP its slot, so the following
// notes and every verse's words stay exactly where they are (the MuseScore/Dorico "Delete →
// rest" behaviour). No ripple — the slot count is unchanged.
export function withRestAt(content, loc) {
  const { resolvedLine, si, syk } = loc
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const seg = content.stanzas[at.stanzaIndex].lines[at.lineIndex][at.segIndex]
  const boxes = noteBoxes(seg.note || '')
  const bi = boxIndexForSlot(seg.note || '', syk)
  if (bi < 0 || boxes[bi] === '0') return content // out of range or already a rest
  boxes[bi] = '0' // a clean rest — the whole token, so no stray octave/underline marks
  return withSegmentNote(content, at, boxes.join(' '), content.arrangement)
}

// Set the word under the cursor to `text` in THIS verse only (live lyric typing). Pads with
// blanks up to the slot if the verse is short, and trims trailing blanks. Only the one entry
// changes; other verses + the melody are untouched. Returns the same content on a no-op.
export function withSetSyllable(content, loc, text) {
  const { resolvedLine, si, syk } = loc
  if (!content || !Array.isArray(content.arrangement) || !resolvedLine) return content
  const ei = resolvedLine._entryIndex
  const entry = content.arrangement[ei]
  const stanza = (content.stanzas || []).find((s) => s.id === resolvedLine._stanza)
  if (!entry || !stanza) return content
  const g = stanzaGlobalSlot(stanza, resolvedLine._stanzaLine, si, syk)
  const val = text || ''
  const syl = (entry.syllables || []).slice()
  while (syl.length <= g) syl.push('')
  if (syl[g] === val) return content
  syl[g] = val
  while (syl.length && syl[syl.length - 1] === '') syl.pop()
  const newArr = content.arrangement.slice()
  newArr[ei] = { ...entry, syllables: syl }
  return { ...content, arrangement: newArr }
}

// Clear ONLY the word under the cursor — blank that one syllable in THIS verse (the resolved
// line's arrangement entry), leaving the note and every other verse untouched. "ลบอันไหน
// อันนั้นหาย": deleting on the word layer removes just the word. No ripple.
export function withClearedSyllable(content, loc) {
  const { resolvedLine, si, syk } = loc
  if (!content || !Array.isArray(content.arrangement) || !resolvedLine) return content
  const ei = resolvedLine._entryIndex
  const entry = content.arrangement[ei]
  const stanza = (content.stanzas || []).find((s) => s.id === resolvedLine._stanza)
  if (!entry || !stanza) return content
  const g = stanzaGlobalSlot(stanza, resolvedLine._stanzaLine, si, syk)
  const syl = entry.syllables || []
  if (g >= syl.length || syl[g] === '' || syl[g] == null) return content // already blank
  const next = syl.slice()
  next[g] = ''
  while (next.length && next[next.length - 1] === '') next.pop() // keep it tidy
  const newArr = content.arrangement.slice()
  newArr[ei] = { ...entry, syllables: next }
  return { ...content, arrangement: newArr }
}

// ---------- the song's KEY (B060 ตั้งค่าเพลง) ----------
// Changing a song's key TRANSPOSES it. The melody is stored as scale degrees (movable-do
// jianpu), so it follows the key by itself — but the chords are stored as ABSOLUTE letters
// ("C", "G/B"), so they must move by the same interval or the harmony stops matching the
// numbers. That is the whole edit: same music, new key.
//
// The interval + the spelling come from lib/chords.js (semitonesBetween/transposeChord) — the
// SAME pair displayChord uses to show the sheet at a transposed reading key, so a song stored
// AT key X reads exactly like the old song read when transposed TO X. No second key engine.
//
// Everything else is left alone: only `key` and the segments' `chord` strings differ, so a
// verse's flow, marker ids, holds and any field this editor does not model ride through
// untouched (structural sharing — untouched lines/stanzas keep their identity).
// One chord, moved by `semis` and spelled for the target key. transposeChord keeps the whole
// suffix verbatim — including a slash bass — which is a DISPLAY gap pinned in
// chords.standard.test.js ("G/B" up a tone shows "A/B", not "A/C#"). A wrong bass shown for a
// moment is one thing; writing it into the song is another, so here the bass is moved through
// the SAME transposeChord (a bare note is just a chord with no quality). No new key engine.
function moveChord(chord, semis, targetKey) {
  const p = parseChord(chord)
  if (!p || !p.bass) return transposeChord(chord, semis, targetKey)
  const cut = p.suffix.indexOf('/')
  const head = transposeChord(p.root + p.suffix.slice(0, cut), semis, targetKey)
  return head + '/' + transposeChord(p.bass, semis, targetKey)
}

export function withSongKey(content, newKey) {
  if (!content || !newKey || content.key === newKey) return content
  const semis = semitonesBetween(content.key || 'C', newKey)
  const mapLine = (line) => {
    if (!Array.isArray(line)) return line
    let touched = false
    const next = line.map((item) => {
      if (!item || item.type !== 'segment' || !item.chord) return item
      const moved = moveChord(item.chord, semis, newKey)
      if (moved === item.chord) return item
      touched = true
      return { ...item, chord: moved }
    })
    return touched ? next : line
  }
  const out = { ...content, key: newKey }
  if (Array.isArray(content.stanzas)) {
    out.stanzas = content.stanzas.map((s) => {
      if (!Array.isArray(s?.lines)) return s
      let touched = false
      const lines = s.lines.map((l) => { const n = mapLine(l); if (n !== l) touched = true; return n })
      return touched ? { ...s, lines } : s
    })
  }
  // a v1-shaped content (flat `lines`) transposes the same way — never leave a song's chords
  // behind just because it has not been migrated yet
  if (Array.isArray(content.lines)) {
    out.lines = mapLine(content.lines)
  }
  return out
}

// ---------- flow / navigation markers (D.C. / D.S. / Segno / Coda / To-Coda / Fine) ----------
// A jump marker is a LINE ITEM {type:'jump', kind, al?, id} inserted BETWEEN segments — the exact
// shape songModel.scanFlowMarkers / SongSheet.classifyJump read (canonical shape locked in
// docs/ds/repeat-jumps-midbar.md §7; entry UI spec docs/ds/marker-entry-ui.md §6). It never lives
// mid-segment: the parser keeps {}/()/~/- inside one segment, so a marker snaps to a segment
// boundary and can still land MID-BAR (between two segments of one bar). It carries no syllable
// slot, so it never ripples a verse. kind ∈ segno|coda|to-coda|dc|ds|fine; al (only on dc/ds) ∈
// fine|coda. `anchor` decides the side of the caret note the marker lands on — entry markers
// (segno, coda) go BEFORE the note, exit markers + jump commands (to-coda, fine, dc, ds) go AFTER
// — matching how scanFlowMarkers reads a marker's play position from its slot in the item stream.
const JUMP_ANCHOR = { segno: 'before', coda: 'before', 'to-coda': 'after', fine: 'after', dc: 'after', ds: 'after' }

// Normalise a loose kind string to the canonical set (mirrors songModel.jumpKindOf / songFlow), or
// null. So callers may pass 'D.C.'/'da capo'/'dal segno' etc. and still get one stored shape.
function normJumpKind(kind) {
  const s = String(kind || '').toLowerCase().replace(/[\s._-]/g, '')
  if (s === 'segno') return 'segno'
  if (s === 'coda') return 'coda'
  if (s === 'tocoda') return 'to-coda'
  if (s === 'dc' || s === 'dacapo') return 'dc'
  if (s === 'ds' || s === 'dalsegno') return 'ds'
  if (s === 'fine') return 'fine'
  return null
}

// Insert a jump marker at loc (a resolved-line address { resolvedLine, si }). Returns a NEW content
// with the marker spliced into the addressed stanza line, ids minted (songFlow.mintMarkerIds), and
// every untouched part shared. Returns `content` unchanged when the kind is unknown or loc does not
// resolve to a note — the caller can skip a no-op emit.
export function withJumpMarker(content, loc, { kind, al } = {}) {
  const k = normJumpKind(kind)
  if (!k) return content
  const { resolvedLine, si } = loc || {}
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const line = content.stanzas[at.stanzaIndex].lines[at.lineIndex]
  const insertAt = at.segIndex + (JUMP_ANCHOR[k] === 'before' ? 0 : 1)
  const item = { type: 'jump', kind: k }
  if ((k === 'dc' || k === 'ds') && (al === 'fine' || al === 'coda')) item.al = al
  const newLine = line.slice()
  newLine.splice(insertAt, 0, item)
  const stanza = content.stanzas[at.stanzaIndex]
  const newLines = stanza.lines.slice()
  newLines[at.lineIndex] = newLine
  const newStanzas = content.stanzas.slice()
  newStanzas[at.stanzaIndex] = { ...stanza, lines: newLines }
  return mintMarkerIds({ ...content, stanzas: newStanzas }).content // assign the permanent id
}

// Remove the jump marker with the given id. Returns a NEW content (untouched stanzas/lines kept
// ===), or `content` unchanged when no marker matches. Deleting a dc/ds command with its paired
// placeholder markers (cascade) is a UI concern — this removes exactly one item by id.
export function removeJumpMarker(content, id) {
  if (!content || !id || !Array.isArray(content.stanzas)) return content
  let changed = false
  const stanzas = content.stanzas.map((s) => {
    let sChanged = false
    const lines = (s.lines || []).map((line) => {
      if (!Array.isArray(line) || !line.some((it) => it && it.type === 'jump' && it.id === id)) return line
      sChanged = true; changed = true
      return line.filter((it) => !(it && it.type === 'jump' && it.id === id))
    })
    return sChanged ? { ...s, lines } : s
  })
  return changed ? { ...content, stanzas } : content
}

// Change a jump marker's kind and/or al in place (by id). Passing kind changes the symbol; passing
// al ('fine'|'coda') sets the exit on a dc/ds command, al=null/'' clears it. al is dropped whenever
// the (resulting) kind is not a dc/ds command. Returns a NEW content, or `content` unchanged on a
// no-match / unknown kind.
export function updateJumpMarker(content, id, { kind, al } = {}) {
  if (!content || !id || !Array.isArray(content.stanzas)) return content
  const k = kind == null ? undefined : normJumpKind(kind)
  if (kind != null && !k) return content // an explicit but unrecognised kind is a no-op, never a wipe
  let changed = false
  const stanzas = content.stanzas.map((s) => {
    let sChanged = false
    const lines = (s.lines || []).map((line) => {
      if (!Array.isArray(line) || !line.some((it) => it && it.type === 'jump' && it.id === id)) return line
      sChanged = true; changed = true
      return line.map((it) => {
        if (!(it && it.type === 'jump' && it.id === id)) return it
        const next = { ...it }
        if (k) next.kind = k
        const kk = k || it.kind
        if (kk === 'dc' || kk === 'ds') {
          if (al === 'fine' || al === 'coda') next.al = al
          else if (al === null || al === '') delete next.al
        } else {
          delete next.al // a non-command marker never carries an exit target
        }
        return next
      })
    })
    return sChanged ? { ...s, lines } : s
  })
  return changed ? { ...content, stanzas } : content
}
