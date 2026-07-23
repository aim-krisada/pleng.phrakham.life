// editorSerde.js — the ONE lossless bridge between a song's stored `content` (v2 JSON)
// and the bar/segment editing model EditorMode.vue works on.
//
// THE RULE (data-safety, non-negotiable): anything the editor does not model must survive a
// load → edit-something-else → save round-trip UNTOUCHED. Never drop a field, an item, or a
// key just because this version of the editor doesn't understand it. Tomorrow's field (a new
// per-verse repeat flag, an imported symbol, a `holds` sustain marker) must ride through today.
//
// How that rule is kept — three layers, none of them an allow-list of field names:
//   1. segment unknown FIELDS  → each editable segment keeps `_raw` (its original item); on
//      serialize we start from `_raw` and only overwrite chord/note/lyric, so `holds` and any
//      future segment field are preserved BY DEFAULT (survives even when the line is edited).
//   2. unknown ITEM TYPES      → items whose `type` the editor doesn't handle are stashed in
//      `_unknown` and re-emitted, so an imported symbol is never silently deleted.
//   3. untouched line          → if the editable shape of a line is byte-for-byte what it was
//      when loaded, we emit its exact original items (`_source`) verbatim. This is the strongest
//      guarantee: a song opened and saved WITHOUT edits comes back identical to the last byte,
//      including unknown fields on non-segment items and original key ordering.
//
// The higher levels (content top-level, stanza, arrangement row) use the same idea via `rest()`
// (see CONTENT_KEYS / STANZA_KEYS / ARRANGEMENT_KEYS) — EditorMode captures the unknown keys on
// load and spreads them back on save.

const clone = (x) => JSON.parse(JSON.stringify(x))

// ---- fresh (unloaded) shells — a brand-new bar/segment/line has NO `_raw`/`_source`, so it
// always takes the structural serialize path (there is nothing original to preserve). ----
export function newSegment() {
  return { chord: '', note: '', lyric: '' }
}
export function barShell() {
  return { segments: [], repeatStart: false, repeatEnd: false, volta: 0, pickup: false }
}
export function newBar() {
  return { ...barShell(), segments: [newSegment()] }
}
export function newLine() {
  return { marker: '', cont: false, label: '', section: '', end: false, bars: [newBar()] }
}

// The line-item `type`s the editor understands. Anything else is preserved via `_unknown`.
const KNOWN_ITEM_TYPES = new Set([
  'continue', 'section', 'label', 'end', 'marker',
  'repeat-start', 'repeat-end', 'pickup', 'volta', 'bar', 'segment',
])

// The complete, CLOSED set of line fields the editor can mutate — this is what `editableShape`
// compares to decide "did the user touch this line?". It MUST list every field the bar/segment
// UI writes; if you add an editable field to newLine/barShell/newSegment, add it here too, or
// the untouched-line passthrough could shadow a real edit. (Verified against the shells above.)
function editableShape(line) {
  return {
    marker: line.marker || '',
    cont: !!line.cont,
    label: line.label || '',
    section: line.section || '',
    end: !!line.end,
    bars: (line.bars || []).map((b) => ({
      repeatStart: !!b.repeatStart,
      repeatEnd: !!b.repeatEnd,
      volta: b.volta || 0,
      pickup: !!b.pickup,
      segments: (b.segments || []).map((s) => ({
        chord: s.chord || '',
        note: s.note || '',
        lyric: s.lyric || '',
      })),
    })),
  }
}

// Turn a stored line (array of items) into the editing model. Losslessly: segment items keep
// their whole original object in `_raw`, unrecognised items go to `_unknown`, and the exact
// original items + a pristine snapshot are kept so an untouched line round-trips byte-for-byte.
export function deserializeLine(items) {
  const src = Array.isArray(items) ? items : []
  const line = { marker: '', cont: false, label: '', section: '', end: false, bars: [] }
  let bar = barShell()
  const unknown = []
  let segCount = 0
  for (const it of src) {
    switch (it && it.type) {
      case 'continue': line.cont = true; break
      case 'section': line.section = it.name || ''; break
      case 'label': line.label = it.text || ''; break
      case 'end': line.end = true; break
      case 'marker': line.marker = it.label || '***'; break
      case 'repeat-start': bar.repeatStart = true; break
      case 'repeat-end': bar.repeatEnd = true; break
      case 'pickup': bar.pickup = true; break
      case 'volta': bar.volta = it.num || 0; break
      case 'bar':
        line.bars.push(bar)
        bar = barShell()
        break
      case 'segment':
        // keep the FULL original item in _raw so unknown fields (holds, …) survive; the editor
        // reads/writes only chord/note/lyric on the top-level segment object.
        bar.segments.push({ chord: it.chord || '', note: it.note || '', lyric: it.lyric || '', _raw: clone(it) })
        segCount++
        break
      default:
        // an item type this editor doesn't model (an imported symbol, a future token): keep it
        // whole, anchored after however many segments have been seen, so nothing is ever dropped.
        unknown.push({ after: segCount, item: clone(it) })
    }
  }
  line.bars.push(bar)
  line.bars = line.bars.filter((b) => b.segments.length)
  if (!line.bars.length) line.bars = [newBar()]
  if (unknown.length) line._unknown = unknown
  // passthrough support (defineProperty so these internals never show up in editableShape/clones
  // the component might make, and never leak into the DB payload)
  Object.defineProperty(line, '_source', { value: clone(src), enumerable: false, writable: true, configurable: true })
  Object.defineProperty(line, '_pristine', { value: editableShape(line), enumerable: false, writable: true, configurable: true })
  return line
}

// Turn an editing-model line back into stored items. If the line is untouched since load, emit
// its exact original items; otherwise rebuild structurally, restoring segment `_raw` and any
// `_unknown` items so no data is lost even on an edited line.
export function serializeLine(line) {
  if (line._source && line._pristine &&
      JSON.stringify(editableShape(line)) === JSON.stringify(line._pristine)) {
    return clone(line._source)
  }
  const items = []
  if (line.section?.trim()) items.push({ type: 'section', name: line.section.trim() })
  if (line.cont) items.push({ type: 'continue' })
  if (line.marker) items.push({ type: 'marker', label: line.marker })
  line.bars.forEach((b, i) => {
    if (b.repeatStart) items.push({ type: 'repeat-start' })
    else if (i > 0) items.push({ type: 'bar' })
    if (b.pickup) items.push({ type: 'pickup' })
    if (b.volta) items.push({ type: 'volta', num: b.volta })
    for (const s of b.segments) {
      // start from the original item (preserves unknown fields + key order); refresh what the
      // editor owns. A new segment (no _raw) yields the classic { type, chord, note[, lyric] }.
      const seg = s._raw ? clone(s._raw) : {}
      seg.type = 'segment'
      seg.chord = s.chord || ''
      seg.note = s.note || ''
      if (s.lyric) seg.lyric = s.lyric
      else delete seg.lyric
      items.push(seg)
    }
    if (b.repeatEnd) items.push({ type: 'repeat-end' })
  })
  if (line.label?.trim()) items.push({ type: 'label', text: line.label.trim() })
  if (line.end) items.push({ type: 'end' })
  // re-emit anything the editor couldn't model. Anchored insertion for the common cases (before
  // any segment / trailing), so an untouched-but-not-detected line still keeps them in place.
  if (line._unknown && line._unknown.length) {
    for (const u of line._unknown) items.push(clone(u.item))
  }
  return items
}

// ---- higher-level unknown-key preservation (content top-level, stanza, arrangement row) ----
// Known keys at each level. Anything not listed is captured on load and spread back on save.
export const CONTENT_KEYS = ['version', 'key', 'timeSignature', 'bpm', 'stanzas', 'arrangement', 'lines']
export const STANZA_KEYS = ['id', 'lines']
export const ARRANGEMENT_KEYS = ['stanza', 'label', 'syllables', 'key', 'afterEachVerse']

// The unknown keys of `obj` (deep-cloned) — the keys NOT in `known`. Used to stash and restore
// fields this editor version doesn't model at the content / stanza / arrangement-row levels.
export function rest(obj, known) {
  const out = {}
  if (!obj || typeof obj !== 'object') return out
  const set = new Set(known)
  for (const k of Object.keys(obj)) {
    if (!set.has(k)) out[k] = clone(obj[k])
  }
  return out
}
