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

import { noteBoxKinds } from './notation.js'

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
