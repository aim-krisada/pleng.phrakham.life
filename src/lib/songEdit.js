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

import { noteBoxKinds, syllableSlots } from './notation.js'

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

// Insert a new note (pitch `digit`) at the cursor slot, rippling every linked verse.
export function withInsertedNote(content, loc, digit) {
  const { resolvedLine, si, syk } = loc
  const d = String(digit)
  if (!/^[0-7]$/.test(d)) return content
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const stanza = content.stanzas[at.stanzaIndex]
  const g = stanzaGlobalSlot(stanza, at.lineIndex, si, syk)
  const newNote = insertBoxAtSlot(stanza.lines[at.lineIndex][at.segIndex].note || '', syk, d)
  return withSegmentNote(content, at, newNote, rippleVerses(content, stanza.id, g, 'insert'))
}

// Delete the note at the cursor slot (pull-tight), closing the slot in every linked verse.
export function withDeletedNote(content, loc) {
  const { resolvedLine, si, syk } = loc
  const at = locateSegment(content, resolvedLine, si)
  if (!at) return content
  const stanza = content.stanzas[at.stanzaIndex]
  const seg = stanza.lines[at.lineIndex][at.segIndex]
  if (boxIndexForSlot(seg.note || '', syk) < 0) return content
  const g = stanzaGlobalSlot(stanza, at.lineIndex, si, syk)
  const newNote = removeBoxAtSlot(seg.note || '', syk)
  return withSegmentNote(content, at, newNote, rippleVerses(content, stanza.id, g, 'delete'))
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
