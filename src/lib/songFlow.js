// ---------- Repeat-flow override (R1–R5) — the "per-verse repeat" mechanism ----------
// A single melody (stanza) can be sung by several arrangement rows (ข้อ 1, 2, 3 …). By
// default every row repeats the melody identically; `arrangement[i].flow` lets ONE row
// diverge (skip a repeat, loop it a different number of times, take a different ending,
// or drop a section) WITHOUT copying the melody. See docs/ds/repeat-flow-override.md.
//
// This module is the pure, framework-free core: id minting (R1), volta-number reading
// (R2), the per-row flow "plan" the play engine consults (R3), and orphan detection (R4).
// The play wiring lives in midi.js (bar-level: skip/times/ending) and songModel.js
// (section-level: skipSections); the UI in EditorMode.vue. Everything here is deterministic
// so load → save → reload is byte-stable for the ids (the #1 risk of this feature).

// The structural marker types that carry a permanent id. repeat-start/repeat-end are one
// logical repeat (they share an id — stack-paired); volta/marker are standalone. segno/coda
// are listed for forward-compat with the D.S./Coda lane (base has none yet) — harmless here.
export const MARK_ID_PREFIX = {
  repeat: 'r',
  volta: 'v',
  marker: 'm',
  segno: 's',
  coda: 'c',
}

// Read a volta's ending number(s) as a de-duplicated list. R2: `num` may be a single
// number (old data) OR a list [2,3] (a round-3 ending that reuses round 2's bars). Always
// returns numbers; [] when there is none. The engine matches "does this ending apply to
// pass N" with .includes(N), so single and list forms behave identically.
export function voltaNums(item) {
  if (!item) return []
  const raw = item.num
  const arr = Array.isArray(raw) ? raw : raw == null ? [] : [raw]
  const out = []
  for (const n of arr) {
    const v = Number(n)
    if (Number.isFinite(v) && v > 0 && !out.includes(v)) out.push(v)
  }
  return out
}

// True when an arrangement carries at least one non-empty flow directive → the engine must
// consult flow. A row with `flow: {}` (or absent) is the ~80% common case (sing as written).
export function hasFlow(content) {
  return !!(content && Array.isArray(content.arrangement) &&
    content.arrangement.some((e) => isNonEmptyFlow(e && e.flow)))
}

export function isNonEmptyFlow(flow) {
  if (!flow || typeof flow !== 'object') return false
  const { skip, times, ending, jump, skipSections, path } = flow
  if (Array.isArray(skip) && skip.length) return true
  if (times && typeof times === 'object' && Object.keys(times).length) return true
  if (ending != null) return true
  if (jump != null && jump !== '') return true
  if (Array.isArray(skipSections) && skipSections.length) return true
  if (Array.isArray(path) && path.length) return true
  return false
}

// Walk a stanza's serialized items in order, collecting the ids of every structural marker,
// pairing repeat-start↔repeat-end by a stack (flat, non-nested — matches notationLint's
// repeatBalance). Returns { markerIds:Set, pairs:[{start,end}] } — used by mint + orphan.
function scanMarks(lines) {
  const markerIds = new Set()
  for (const line of lines || []) {
    for (const it of line || []) {
      if (!it || !it.type) continue
      if (it.type === 'repeat-start' || it.type === 'repeat-end' || it.type === 'volta' ||
          it.type === 'marker' || it.type === 'segno' || it.type === 'coda') {
        if (it.id) markerIds.add(it.id)
      }
    }
  }
  return markerIds
}

// All marker ids present anywhere in the song's stanzas (the id namespace flow references).
export function allMarkerIds(content) {
  const ids = new Set()
  for (const s of content?.stanzas || []) for (const id of scanMarks(s.lines)) ids.add(id)
  return ids
}

// The next unused numeric id for a prefix, given the set of ids already taken. Deterministic:
// smallest positive integer whose `${prefix}${n}` is free. So filling gaps is stable and a
// re-run never reassigns an id that already exists (the round-trip-stability guarantee).
function nextFreeId(prefix, taken) {
  let n = 1
  while (taken.has(`${prefix}${n}`)) n++
  const id = `${prefix}${n}`
  taken.add(id)
  return id
}

// R1 — return a NEW content whose every structural marker has a permanent `id`, minting one
// only where it is MISSING (existing ids are preserved verbatim → load→save→reload stable).
// repeat-start/repeat-end are stack-paired and share one `r` id; an unmatched repeat keeps
// its own id. volta→`v`, marker→`m`, segno→`s`, coda→`c`. Idempotent: minting twice is a
// no-op after the first pass. `changed` reports whether anything was assigned (so the editor
// can mark the song dirty only when it actually grew ids). Never mutates the input.
export function mintMarkerIds(content) {
  if (!content || !Array.isArray(content.stanzas)) return { content, changed: false }
  const taken = allMarkerIds(content)
  let changed = false
  const stanzas = content.stanzas.map((s) => {
    // stack of open repeat-start items (references into the cloned output) awaiting their :‖
    const openRepeats = []
    const lines = (s.lines || []).map((line) =>
      (line || []).map((it) => {
        if (!it || !it.type) return it
        const t = it.type
        if (t === 'repeat-start') {
          const copy = { ...it }
          if (!copy.id) { copy.id = nextFreeId('r', taken); changed = true }
          openRepeats.push(copy)
          return copy
        }
        if (t === 'repeat-end') {
          const copy = { ...it }
          const open = openRepeats.pop()
          if (!copy.id) {
            // share the matching start's id; if the start already had none it was just minted
            copy.id = open ? open.id : nextFreeId('r', taken)
            changed = true
          } else if (open && !open.id) {
            // a start with no id closing on an end that has one → back-fill the start
            open.id = copy.id
            changed = true
          }
          return copy
        }
        if (t === 'volta' || t === 'marker' || t === 'segno' || t === 'coda') {
          if (it.id) return it
          changed = true
          return { ...it, id: nextFreeId(MARK_ID_PREFIX[t] || 'x', taken) }
        }
        return it
      }),
    )
    return { ...s, lines }
  })
  return { content: { ...content, stanzas }, changed }
}

// R1 rule 2 — strip marker ids from a cloned fragment (bar / line) so a paste re-mints fresh
// ones instead of duplicating an id (two markers with one id → ambiguous flow). Operates on
// the EDITOR bar/line model (repeatStartId / repeatEndId / voltaId / markerId fields), in
// place, returning the same object for convenience. Segments/notes are untouched.
export function stripEditorMarkerIds(node) {
  if (!node || typeof node !== 'object') return node
  if ('markerId' in node) node.markerId = ''
  if ('repeatStartId' in node) node.repeatStartId = ''
  if ('repeatEndId' in node) node.repeatEndId = ''
  if ('voltaId' in node) node.voltaId = ''
  for (const b of node.bars || []) stripEditorMarkerIds(b)
  return node
}

// R3 — the per-repeat play plan the bar engine consults. Given a row's flow and a repeat's
// id (+ the melody's default `times`), decide how many passes to play:
//   • flow.skip includes the id (or "*") → 1 pass (do not loop this repeat for this row)
//   • flow.times[id] set               → that many passes (min 1)
//   • otherwise                         → the melody default (repeat-end.times, default 2)
// `knownIds` (optional) = the set of ids that actually exist; a skip/times key not in it is
// ORPHAN and ignored (R4: never guess — fall back to the melody), so a deleted marker cannot
// silently change playback.
export function repeatPasses(flow, id, defaultTimes = 2, knownIds = null) {
  const base = Math.max(1, Math.floor(Number(defaultTimes) || 2))
  if (!isNonEmptyFlow(flow)) return base
  const skip = Array.isArray(flow.skip) ? flow.skip : []
  const skipAll = skip.includes('*')
  if (skipAll || (skip.includes(id) && idKnown(id, knownIds))) return 1
  if (flow.times && idKnown(id, knownIds) && flow.times[id] != null) {
    return Math.max(1, Math.floor(Number(flow.times[id]) || base))
  }
  return base
}

function idKnown(id, knownIds) {
  return !knownIds || knownIds.has(id)
}

// R3 — the ending (volta pass) this row forces, or null to follow the melody's natural
// passes. flow.ending picks WHICH alternate ending to land on (pattern 3: >2 endings).
export function forcedEnding(flow) {
  if (!isNonEmptyFlow(flow) || flow.ending == null) return null
  const v = Number(flow.ending)
  return Number.isFinite(v) && v > 0 ? v : null
}

// R4 — every flow directive that references an id (or section) which no longer exists.
// Returns [{ entryIndex, kind, ref }] so the lint can name the offender ("ข้อ 2 สั่งข้าม
// เครื่องหมายซ้ำที่ถูกลบไปแล้ว") and offer to drop it. Section refs (skipSections) are checked
// against the stanza ids. "*" is never orphan (it means "all", not a specific id).
export function findOrphanFlows(content) {
  if (!content || !Array.isArray(content.arrangement)) return []
  const ids = allMarkerIds(content)
  const stanzaIds = new Set((content.stanzas || []).map((s) => s.id))
  const out = []
  content.arrangement.forEach((entry, entryIndex) => {
    const flow = entry && entry.flow
    if (!isNonEmptyFlow(flow)) return
    for (const ref of flow.skip || []) {
      if (ref !== '*' && !ids.has(ref)) out.push({ entryIndex, kind: 'skip', ref })
    }
    for (const ref of Object.keys(flow.times || {})) {
      if (!ids.has(ref)) out.push({ entryIndex, kind: 'times', ref })
    }
    for (const ref of flow.skipSections || []) {
      if (!stanzaIds.has(ref)) out.push({ entryIndex, kind: 'skipSections', ref })
    }
    for (const ref of flow.path || []) {
      if (!ids.has(ref) && !stanzaIds.has(ref)) out.push({ entryIndex, kind: 'path', ref })
    }
  })
  return out
}
