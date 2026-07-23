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
// R1 — a structural marker carries a permanent id so a verse's `flow` can reference it and
// survive melody edits (repeatStartId/repeatEndId share one id per ‖: … :‖ pair, minted in
// EditorMode). `repeatTimes` = the melody's default rounds (R2, null = the 2× default);
// `voltaRaw` preserves a loaded volta list (num:[2,3]) so the number-only UI doesn't collapse it.
export function barShell() {
  return { segments: [], repeatStart: false, repeatEnd: false, volta: 0, pickup: false,
    repeatStartId: '', repeatEndId: '', voltaId: '', repeatTimes: null, voltaRaw: null }
}
export function newBar() {
  return { ...barShell(), segments: [newSegment()] }
}
export function newLine() {
  return { marker: '', markerId: '', cont: false, label: '', section: '', end: false, bars: [newBar()] }
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
    markerId: line.markerId || '', // R1 — an assigned/changed marker id counts as an edit
    cont: !!line.cont,
    label: line.label || '',
    section: line.section || '',
    end: !!line.end,
    bars: (line.bars || []).map((b) => ({
      repeatStart: !!b.repeatStart,
      repeatEnd: !!b.repeatEnd,
      volta: b.volta || 0,
      pickup: !!b.pickup,
      // R1/R2 — marker ids + repeat rounds + volta-list are editable state, so an id mint or a
      // times change must count as a touch (otherwise the untouched-line passthrough would drop it)
      repeatStartId: b.repeatStartId || '',
      repeatEndId: b.repeatEndId || '',
      voltaId: b.voltaId || '',
      repeatTimes: b.repeatTimes ?? null,
      voltaRaw: Array.isArray(b.voltaRaw) ? b.voltaRaw : null,
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
      case 'marker': line.marker = it.label || '***'; line.markerId = it.id || ''; break
      case 'repeat-start': bar.repeatStart = true; bar.repeatStartId = it.id || ''; break
      case 'repeat-end': bar.repeatEnd = true; bar.repeatEndId = it.id || ''; bar.repeatTimes = it.times ?? null; break
      case 'pickup': bar.pickup = true; break
      case 'volta':
        // R2 — num may be a single number OR a list [2,3]. The UI works in single numbers, so show
        // the first, but keep the raw list to round-trip it faithfully when the UI hasn't touched it.
        bar.volta = Array.isArray(it.num) ? (Number(it.num[0]) || 0) : (Number(it.num) || 0)
        bar.voltaRaw = Array.isArray(it.num) ? it.num.slice() : null
        bar.voltaId = it.id || ''
        break
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
  if (line.marker) items.push({ type: 'marker', label: line.marker, ...(line.markerId ? { id: line.markerId } : {}) })
  line.bars.forEach((b, i) => {
    // R1 — the id rides on the repeat-start / repeat-end / volta item so a verse's flow keeps
    // referencing the same repeat after the melody is edited.
    if (b.repeatStart) items.push({ type: 'repeat-start', ...(b.repeatStartId ? { id: b.repeatStartId } : {}) })
    else if (i > 0) items.push({ type: 'bar' })
    if (b.pickup) items.push({ type: 'pickup' })
    if (b.volta) {
      // R2 — round-trip a loaded list exactly when the number-UI hasn't touched it (voltaRaw[0]
      // still equals b.volta); otherwise the user edited it → emit the plain number.
      const num = Array.isArray(b.voltaRaw) && Number(b.voltaRaw[0]) === Number(b.volta) ? b.voltaRaw : b.volta
      items.push({ type: 'volta', num, ...(b.voltaId ? { id: b.voltaId } : {}) })
    }
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
    if (b.repeatEnd) items.push({ type: 'repeat-end', ...(b.repeatEndId ? { id: b.repeatEndId } : {}), ...(b.repeatTimes != null ? { times: b.repeatTimes } : {}) })
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
export const ARRANGEMENT_KEYS = ['stanza', 'label', 'syllables', 'key', 'afterEachVerse', 'flow']

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
