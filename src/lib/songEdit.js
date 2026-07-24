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

import { noteBoxKinds, syllableSlots, canonicalizeNote } from './notation.js'
import { semitonesBetween, transposeChord, parseChord } from './chords.js'

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
