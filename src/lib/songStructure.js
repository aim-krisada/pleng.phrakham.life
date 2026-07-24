// songStructure.js — content-model (v2) STRUCTURE + COPY/PASTE engine for the INLINE editor.
//
// The inline editor (SongViewer) is a reader that never mutates props.song: every edit is a
// pure `withXxx(content, …) → newContent` it emits as `update-content` (see lib/songEdit.js).
// That file covers note/word/chord edits; THIS file covers the two things that only lived in
// the old boxed EditorMode.vue:
//   1. STRUCTURE — the section list (ข้อ1 · รับ · ข้อ2 …) and the melody list (ทำนอง A/B):
//      add / delete / reorder / duplicate a section, its melody tag (♫A/♫B), แยกทำนอง
//      (make-unique), and add/remove a melody.
//   2. COPY / PASTE / MOVE — bars, lines, and verses.
//
// v2 shape these operate on (the stored JSON resolveContent consumes):
//   content.stanzas[i]     = { id:'A', lines:[ [items…] ] }   // a MELODY, entered once, no words
//   content.arrangement[i] = { stanza:'A', label, syllables:[…], key?, afterEachVerse?, flow? }
//   a stanza line = a flat array of items { type:'segment'|'bar'|'repeat-start'|… }
//
// TWO non-negotiable data-safety rules, both delegated to code the team already trusts:
//   • MARKER IDS RE-MINT on any structural COPY (paste / duplicate-bar/line / make-unique). Two
//     markers must never share an id, or a verse's `flow` points ambiguously = silent wrong
//     playback. We strip ids on the cloned fragment (stripEditorMarkerIds) then re-mint the whole
//     song (mintMarkerIds) — the exact pair songFlow.js documents. See remintMarkers().
//   • LOSSLESS line rebuild — bar/line ops route through editorSerde's deserializeLine /
//     serializeLine (the same lossless bridge EditorMode uses), so unknown segment fields and
//     unknown item types ride through untouched, and the fiddly bar↔marker placement (a
//     repeat-start opens a bar without a `|`, pickup/volta ordering) is never re-derived here.
//
// Words follow their melody: growing/shrinking or reordering a stanza's LINES reslices the
// `syllables` of every arrangement row on that stanza (parity with EditorMode's copyLine/moveLine).

import { deserializeLine, serializeLine, newLine } from './editorSerde.js'
import { stripEditorMarkerIds, mintMarkerIds } from './songFlow.js'
import { syllableSlots } from './notation.js'

const clone = (x) => JSON.parse(JSON.stringify(x))

// Re-mint every marker id so the returned content is id-stable and any id-less marker (a freshly
// pasted / cloned one) gets a NEW id — never a duplicate of an existing one. The single exit
// point for every mutating op below, so nothing can forget it.
function remintMarkers(content) {
  return mintMarkerIds(content).content
}

// ---------- small content helpers ----------
const stanzasOf = (c) => (Array.isArray(c?.stanzas) ? c.stanzas : [])
const arrangementOf = (c) => (Array.isArray(c?.arrangement) ? c.arrangement : [])
function stanzaIndexById(content, id) {
  return stanzasOf(content).findIndex((s) => s.id === id)
}
// smallest free single-letter melody id (A…Z), then A<n> — matches EditorMode.nextStanzaId so
// ids stay human ("ทำนอง A/B/C") and never collide with an existing one.
function nextStanzaId(content) {
  const used = new Set(stanzasOf(content).map((s) => s.id))
  for (let c = 65; c <= 90; c++) {
    const l = String.fromCharCode(c)
    if (!used.has(l)) return l
  }
  return 'A' + stanzasOf(content).length
}

// syllable slots a stored line bears = Σ syllableSlots over its segment items (bars/markers bear
// none). Mirrors EditorMode.lineSlotLen, on the content shape.
export function lineSlotLen(line) {
  let n = 0
  for (const it of line || []) if (it && it.type === 'segment') n += syllableSlots(it.note || '')
  return n
}
// flat-slot index where line `li` starts within its stanza (Σ earlier lines' lengths).
export function lineSlotStart(lines, li) {
  let start = 0
  for (let k = 0; k < li && k < lines.length; k++) start += lineSlotLen(lines[k])
  return start
}
// A stored stanza line ↔ the editor bar/segment model, for line-internal bar work + fragments.
const toModel = (line) => deserializeLine(Array.isArray(line) ? line : [])
const fromModel = (model) => serializeLine(model)

// Rebuild content with stanza `si`'s lines replaced (structural sharing elsewhere).
function withStanzaLines(content, si, newLines) {
  const stanza = content.stanzas[si]
  const newStanzas = content.stanzas.slice()
  newStanzas[si] = { ...stanza, lines: newLines }
  return { ...content, stanzas: newStanzas }
}
// Mutate every arrangement row on `stanzaId` via `mutate(syllablesCopy)`, trimming trailing
// blanks (parity with EditorMode.resliceRows). Returns a new arrangement array.
function resliceVerses(content, stanzaId, mutate) {
  return arrangementOf(content).map((row) => {
    if (row.stanza !== stanzaId) return row
    const p = (row.syllables || []).slice()
    mutate(p)
    while (p.length && !((p[p.length - 1] || '').trim())) p.pop()
    return { ...row, syllables: p }
  })
}

// ======================================================================================
// SECTION (arrangement row) operations — the drawer's card list
// ======================================================================================

// Add a new section after `afterIndex` (or at the end). It inherits the neighbour's melody
// (ท่อน 2 มักทำนองเดียวกับท่อน 1) with EMPTY words — the "+ เพิ่มท่อน" / share-a-melody default.
export function addVerse(content, afterIndex = null) {
  const arr = arrangementOf(content)
  const stanzas = stanzasOf(content)
  if (!stanzas.length) return content
  const at = afterIndex == null || afterIndex < 0 || afterIndex >= arr.length ? arr.length - 1 : afterIndex
  const seed = arr[at]
  const stanza = seed?.stanza || stanzas[0].id
  const row = { stanza, label: '', syllables: [], key: '' }
  const next = arr.slice()
  next.splice(at + 1, 0, row)
  return { ...content, arrangement: next }
}

// Delete section `index`. Never leaves the song with zero sections (adds a default row on the
// first melody), so the editor always has something to show.
export function deleteVerse(content, index) {
  const arr = arrangementOf(content)
  if (index < 0 || index >= arr.length) return content
  const next = arr.slice()
  next.splice(index, 1)
  if (!next.length) {
    const first = stanzasOf(content)[0]
    if (first) next.push({ stanza: first.id, label: '', syllables: [], key: '' })
  }
  return { ...content, arrangement: next }
}

// Reorder a section from → to (shared by drag + ▲▼).
export function moveVerse(content, from, to) {
  const arr = arrangementOf(content)
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length || from === to) return content
  const next = arr.slice()
  const [r] = next.splice(from, 1)
  next.splice(to, 0, r)
  return { ...content, arrangement: next }
}
export function moveVerseBy(content, index, dir) {
  return moveVerse(content, index, index + dir)
}

// Duplicate section `index` — a TRUE copy (same melody + same words + flow), inserted right
// after. The copy shares the melody (G's "Default Share": duplicate = another verse on the same
// tune) and drops `afterEachVerse` so a song never ends up with two refrains.
export function duplicateVerse(content, index) {
  const arr = arrangementOf(content)
  if (index < 0 || index >= arr.length) return content
  const src = arr[index]
  const copy = clone(src)
  delete copy.afterEachVerse
  const next = arr.slice()
  next.splice(index + 1, 0, copy)
  return { ...content, arrangement: next }
}

// Rename section `index` (the ข้อ/รับ label shown on the card + the sheet heading).
export function setVerseLabel(content, index, label) {
  const arr = arrangementOf(content)
  if (index < 0 || index >= arr.length) return content
  const val = (label || '').replace(/\s+$/, '')
  if ((arr[index].label || '') === val) return content
  const next = arr.slice()
  next[index] = { ...arr[index], label: val }
  return { ...content, arrangement: next }
}

// Mark section `index` as the refrain sung after every verse (ร้องรับทุกข้อ), or clear it. One
// refrain per song, so turning it on clears it on the others (parity with EditorMode).
export function setAfterEachVerse(content, index, on) {
  const arr = arrangementOf(content)
  if (index < 0 || index >= arr.length) return content
  const next = arr.map((r, i) => {
    const want = on && i === index
    if (!!r.afterEachVerse === want) return r // already in the desired state
    const copy = { ...r }
    if (want) copy.afterEachVerse = true
    else delete copy.afterEachVerse
    return copy
  })
  return { ...content, arrangement: next }
}

// Melody tag (♫A/♫B) — point section `index` at melody `stanzaId`. The words stay as they are
// (a mismatch vs the new melody's slot count is a soft warning in the UI, never a block).
export function setVerseStanza(content, index, stanzaId) {
  const arr = arrangementOf(content)
  if (index < 0 || index >= arr.length) return content
  if (stanzaIndexById(content, stanzaId) < 0) return content
  if (arr[index].stanza === stanzaId) return content
  const next = arr.slice()
  next[index] = { ...arr[index], stanza: stanzaId }
  return { ...content, arrangement: next }
}

// แยกทำนอง (Make Unique / Unlink) — give section `index` its OWN independent copy of its melody
// so editing it no longer touches the sisters that shared it. Clones the stanza to a fresh id,
// RE-MINTS its markers (the clone must not duplicate the original's ids — same silent-flow bug as
// paste), and repoints the section. A no-op-safe if the section can't be found.
export function makeVerseUnique(content, index) {
  const arr = arrangementOf(content)
  if (index < 0 || index >= arr.length) return content
  const row = arr[index]
  const si = stanzaIndexById(content, row.stanza)
  if (si < 0) return content
  const src = content.stanzas[si]
  const newId = nextStanzaId(content)
  // clone the melody's lines with marker ids stripped, so mint gives the copy brand-new ids
  const lines = (src.lines || []).map((line) => {
    const model = stripEditorMarkerIds(toModel(clone(line)))
    return fromModel(model)
  })
  const newStanza = { ...clone(src), id: newId, lines }
  const newStanzas = content.stanzas.slice()
  newStanzas.splice(si + 1, 0, newStanza)
  const newArr = arr.slice()
  newArr[index] = { ...row, stanza: newId }
  return remintMarkers({ ...content, stanzas: newStanzas, arrangement: newArr })
}

// ======================================================================================
// MELODY (stanza) list operations
// ======================================================================================

// Add a fresh empty melody (one empty line). It joins the melody list; a section can then tag it.
export function addStanza(content) {
  const id = nextStanzaId(content)
  const stanza = { id, lines: [fromModel(newLine())] }
  return { ...content, stanzas: stanzasOf(content).concat([stanza]) }
}

// Remove a melody and every section that used it. Never leaves zero melodies or zero sections.
export function removeStanza(content, stanzaId) {
  const stanzas = stanzasOf(content)
  if (stanzas.length <= 1) return content
  const si = stanzaIndexById(content, stanzaId)
  if (si < 0) return content
  const newStanzas = stanzas.slice()
  newStanzas.splice(si, 1)
  let newArr = arrangementOf(content).filter((r) => r.stanza !== stanzaId)
  if (!newArr.length) newArr = [{ stanza: newStanzas[0].id, label: '', syllables: [], key: '' }]
  return { ...content, stanzas: newStanzas, arrangement: newArr }
}

// ======================================================================================
// COPY / PASTE / MOVE — bars & lines
// A "fragment" is an in-memory clip: { kind:'bar'|'line', data:<editor-model obj, ids stripped>, from }.
// It carries MELODY only (notes + chords + a bar's repeat/volta/pickup flags, a line's structure);
// words live per-section and never follow across melodies — exactly like EditorMode's B101 clip.
// ======================================================================================

// address a source line: { stanzaId, lineIndex }; a source bar adds { barOrdinal } (0-based bar
// within that line). SongViewer maps its cursor (resolvedLine._stanza/_stanzaLine + curUnit.bi).

function lineAt(content, stanzaId, lineIndex) {
  const si = stanzaIndexById(content, stanzaId)
  if (si < 0) return null
  const lines = content.stanzas[si].lines || []
  if (lineIndex < 0 || lineIndex >= lines.length) return null
  return { si, lines, line: lines[lineIndex] }
}

// ---- copy (produce a fragment; does not change content) ----
export function copyBar(content, addr) {
  const at = lineAt(content, addr.stanzaId, addr.lineIndex)
  if (!at) return null
  const model = toModel(clone(at.line))
  const bar = model.bars[addr.barOrdinal]
  if (!bar) return null
  return { kind: 'bar', data: stripEditorMarkerIds(clone(bar)), from: addr.from || '' }
}
export function copyLine(content, addr) {
  const at = lineAt(content, addr.stanzaId, addr.lineIndex)
  if (!at) return null
  const model = stripEditorMarkerIds(clone(toModel(clone(at.line))))
  // drop the non-enumerable passthroughs a clone already dropped; keep only the editable shape
  return { kind: 'line', data: model, from: addr.from || '' }
}

// ---- paste (consume a fragment → new content) ----
// paste a copied BAR at the END of the target line (melody only). fresh ids via mint.
export function pasteBarInLine(content, stanzaId, lineIndex, fragment) {
  if (fragment?.kind !== 'bar') return content
  const at = lineAt(content, stanzaId, lineIndex)
  if (!at) return content
  const model = toModel(clone(at.line))
  model.bars.push(stripEditorMarkerIds(clone(fragment.data)))
  const newLines = at.lines.slice()
  newLines[lineIndex] = fromModel(model)
  return remintMarkers(withStanzaLines(content, at.si, newLines))
}
// paste a copied LINE at the END of a melody (melody only — no words carried).
export function pasteLineInStanza(content, stanzaId, fragment) {
  if (fragment?.kind !== 'line') return content
  const si = stanzaIndexById(content, stanzaId)
  if (si < 0) return content
  const newLines = (content.stanzas[si].lines || []).slice()
  newLines.push(fromModel(stripEditorMarkerIds(clone(fragment.data))))
  return remintMarkers(withStanzaLines(content, si, newLines))
}
// paste a copied LINE as a brand-new melody (its only line is the copy). Mirrors addStanza's shape.
export function pasteLineAsStanza(content, fragment) {
  if (fragment?.kind !== 'line') return content
  const id = nextStanzaId(content)
  const stanza = { id, lines: [fromModel(stripEditorMarkerIds(clone(fragment.data)))] }
  return remintMarkers({ ...content, stanzas: stanzasOf(content).concat([stanza]) })
}

// slots a single editor-model bar bears (Σ syllableSlots over its segments).
function barSlotLen(bar) {
  let n = 0
  for (const s of bar?.segments || []) n += syllableSlots(s.note || '')
  return n
}

// ---- duplicate in place ----
// Duplicate bar `barOrdinal` right after itself (fresh ids), and OPEN that many blank word-slots
// at the copy's position in every verse on this melody — so a duplicated bar in a worded song
// leaves the following notes' words correctly aligned (stricter than EditorMode.duplicateBar,
// which skips the ripple; the extra blanks are trimmed if trailing).
export function duplicateBar(content, stanzaId, lineIndex, barOrdinal) {
  const at = lineAt(content, stanzaId, lineIndex)
  if (!at) return content
  const model = toModel(clone(at.line))
  const bar = model.bars[barOrdinal]
  if (!bar) return content
  // global slot index just AFTER the source bar = line start + slots of bars up to & incl. it
  let g = lineSlotStart(at.lines, lineIndex)
  for (let k = 0; k <= barOrdinal; k++) g += barSlotLen(model.bars[k])
  const added = barSlotLen(bar)
  model.bars.splice(barOrdinal + 1, 0, stripEditorMarkerIds(clone(bar)))
  const newLines = at.lines.slice()
  newLines[lineIndex] = fromModel(model)
  let out = withStanzaLines(content, at.si, newLines)
  if (added > 0) {
    const newArr = resliceVerses(out, stanzaId, (p) => {
      while (p.length < g) p.push('')
      p.splice(g, 0, ...Array(added).fill('')) // open blank slots for the new bar's notes
    })
    out = { ...out, arrangement: newArr }
  }
  return remintMarkers(out)
}
// Duplicate line `lineIndex` right after itself AND carry every verse's words for that line
// (parity with EditorMode.copyLine — B088). Fresh marker ids on the copy.
export function duplicateLine(content, stanzaId, lineIndex) {
  const at = lineAt(content, stanzaId, lineIndex)
  if (!at) return content
  const start = lineSlotStart(at.lines, lineIndex)
  const len = lineSlotLen(at.line)
  const copy = fromModel(stripEditorMarkerIds(clone(toModel(clone(at.line)))))
  const newLines = at.lines.slice()
  newLines.splice(lineIndex + 1, 0, copy)
  let out = withStanzaLines(content, at.si, newLines)
  if (len > 0) {
    const newArr = resliceVerses(out, stanzaId, (p) => {
      while (p.length < start + len) p.push('')
      p.splice(start + len, 0, ...p.slice(start, start + len)) // duplicate this line's word slice
    })
    out = { ...out, arrangement: newArr }
  }
  return remintMarkers(out)
}

// ---- move ----
// Move bar `barOrdinal` left/right within its line; at a line edge, HOP to the adjacent line
// (parity with EditorMode.moveBar — B063). No word ripple (bars keep their slot order).
export function moveBar(content, stanzaId, lineIndex, barOrdinal, dir) {
  const at = lineAt(content, stanzaId, lineIndex)
  if (!at) return content
  const model = toModel(clone(at.line))
  const bars = model.bars
  const to = barOrdinal + dir
  if (to >= 0 && to < bars.length) {
    const [b] = bars.splice(barOrdinal, 1)
    bars.splice(to, 0, b)
    const newLines = at.lines.slice()
    newLines[lineIndex] = fromModel(model)
    return remintMarkers(withStanzaLines(content, at.si, newLines))
  }
  // past the edge → hop to the neighbouring line (keep every line ≥1 bar, like removeBar)
  const neighbourIdx = dir > 0 && barOrdinal === bars.length - 1 ? lineIndex + 1
    : dir < 0 && barOrdinal === 0 ? lineIndex - 1 : null
  if (neighbourIdx == null) return content
  const nAt = lineAt(content, stanzaId, neighbourIdx)
  if (!nAt) return content
  const nModel = toModel(clone(nAt.line))
  const [b] = bars.splice(barOrdinal, 1)
  if (dir > 0) nModel.bars.unshift(b)
  else nModel.bars.push(b)
  const newLines = at.lines.slice()
  newLines[lineIndex] = fromModel(model)
  newLines[neighbourIdx] = fromModel(nModel)
  return remintMarkers(withStanzaLines(content, at.si, newLines))
}

// Move line `lineIndex` up/down within its melody AND carry every verse's words (parity with
// EditorMode.moveLine — B086). Adjacent-line swap of both melody and the matching word slice.
export function moveLine(content, stanzaId, lineIndex, dir) {
  const at = lineAt(content, stanzaId, lineIndex)
  if (!at) return content
  const lj = lineIndex + dir
  if (lj < 0 || lj >= at.lines.length) return content
  const i = Math.min(lineIndex, lj) // the two adjacent lines are i and i+1
  const start = lineSlotStart(at.lines, i)
  const lenI = lineSlotLen(at.lines[i])
  const lenJ = lineSlotLen(at.lines[i + 1])
  const end = start + lenI + lenJ
  const newLines = at.lines.slice()
  ;[newLines[i], newLines[i + 1]] = [newLines[i + 1], newLines[i]]
  let out = withStanzaLines(content, at.si, newLines)
  const newArr = arrangementOf(out).map((row) => {
    if (row.stanza !== stanzaId) return row
    const p = (row.syllables || []).slice()
    while (p.length < end) p.push('')
    const next = [
      ...p.slice(0, start),
      ...p.slice(start + lenI, end), // line j's words move up
      ...p.slice(start, start + lenI), // line i's words move down
      ...p.slice(end),
    ]
    while (next.length && !((next[next.length - 1] || '').trim())) next.pop()
    return { ...row, syllables: next }
  })
  out = { ...out, arrangement: newArr }
  return remintMarkers(out)
}
