// The SINGLE source of truth for the inline editor's note symbols (DS command-palette.md §3.1,
// note-symbol-set.md §4.1). Before CP-0 this knowledge lived in FOUR independent places and
// drifted: adding a symbol meant editing 2+ of them or it typed-but-the-button-failed (or the
// reverse). Now everything READS from the list below:
//
//   - NoteInputBar.vue    the toolbar buttons        (was a local SYMBOL_GROUPS const)
//   - SongViewer.vue      the keyHints learn-set     (was a local SYMBOL_CHARS const)
//   - SongViewer.vue      the keydown classification (was an inline if/else table — SET 1)
//   - SongViewer.vue      applySymbol classification (a SECOND inline if/else table — SET 2)
//
// The keyboard path and the toolbar path now call ONE dispatch (`applySymbolToContent`) whose
// classification comes from this list — never two tables that can disagree. Adding a symbol is
// one entry here and it works on BOTH the keyboard and the button with no other change; the
// `editorCommands.test.js` drift-killer test proves that for every entry.
//
// ⛔ This is the ONLY module allowed to hard-code the symbol characters / classification. Every
// other file must import from here (AC-0.1: `grep "'_.~^'|'-(){}'|SYMBOL_CHARS|SYMBOL_GROUPS"
// over src/` must find these literals here and nowhere else).

import { withNoteMark, withToggledBox, withAccidental, withOctaveShift, withToggledBar, withTie, withJumpMarker } from './songEdit.js'

// `behavior` — the classification the two if/else tables used to each own a copy of. Each value
// names the engine action the character triggers on the selected note (see `effectFor` below):
//
//   'mark'        markSel        _ . ^     a mark that rides on the note (each press cycles it)
//   'tie'         tieSel         ~         join this note to the adjacent same-pitch note (a PAIR)
//   'box'         toggleBoxSel   - ( ) { } a structural box — insert, or remove if pressed again
//   'accidental'  accidentalSel  # b n     sharp / flat / natural (one group — same mode)
//   'octaveUp'    octaveSel(1)   '         raise the note one octave (dot moves ABOVE)
//   'octaveDown'  octaveSel(-1)  ,         lower the note one octave (dot moves BELOW)
//   'bar'         toggleBarSel   |         split the segment with a bar line, or remove it again
//
// Every behavior is symmetric — pressing the same key again undoes it (BI-003): marks cycle back to
// 0, `~` unties, a box removes its twin, `|` merges the bar, `'`/`,` reverse each other. The engine
// canonicalises placement, so a mark always lands in its ONE correct spot above/below the digit
// automatically (BI-009 §2 auto-position) — the user never nudges a character before/after.
//
// `onBar`  — appears on the toolbar's symbol strip (and so is a key we learn a position for).
//            `' ,` are `onBar:false`: octave has its own dedicated สูง↑ / ต่ำ↓ dock buttons, so the
//            strip button would be a redundant third door (BI-009 §1) — but both stay TYPEABLE, and
//            the keyboard/applySymbol still classify them from HERE, not a separate table.
// `aliasKeys` — extra `e.key` values that route to the same command. The apostrophe key on some
//            keyboards emits the curly quote ’ (U+2019); it must raise the octave exactly like '.
export const SYMBOLS = [
  // ── group ความยาว (length) ────────────────────────────────────────────────
  { id: 'sym-eighth',  ch: '_', group: 'ความยาว', th: 'เขบ็ต',    behavior: 'mark', onBar: true },
  { id: 'sym-dot',     ch: '.', group: 'ความยาว', th: 'จุดเพิ่ม',  behavior: 'mark', onBar: true },
  { id: 'sym-hold',    ch: '-', group: 'ความยาว', th: 'ลากเสียง', behavior: 'box',  onBar: true },
  { id: 'sym-tie',     ch: '~', group: 'ความยาว', th: 'โยงเสียง', behavior: 'tie',  onBar: true },
  { id: 'sym-fermata', ch: '^', group: 'ความยาว', th: 'ยืดเสียง', behavior: 'mark', onBar: true },
  // ── group เสียง (pitch) — accidentals are ONE group (#/b/n, same mode: BI-009 §5) ─────────
  { id: 'sym-sharp',   ch: '#', group: 'เสียง', th: 'ชาร์ป',    behavior: 'accidental', onBar: true },
  { id: 'sym-flat',    ch: 'b', group: 'เสียง', th: 'แฟลต',     behavior: 'accidental', onBar: true },
  { id: 'sym-natural', ch: 'n', group: 'เสียง', th: 'เนเชอรัล', behavior: 'accidental', onBar: true },
  // ── group กลุ่ม/ห้อง (grouping / bar) ─────────────────────────────────────
  { id: 'sym-slur-open',  ch: '(', group: 'กลุ่ม/ห้อง', th: 'เอื้อน เปิด',    behavior: 'box', onBar: true },
  { id: 'sym-slur-close', ch: ')', group: 'กลุ่ม/ห้อง', th: 'เอื้อน ปิด',     behavior: 'box', onBar: true },
  { id: 'sym-trip-open',  ch: '{', group: 'กลุ่ม/ห้อง', th: 'สามพยางค์ เปิด', behavior: 'box', onBar: true },
  { id: 'sym-trip-close', ch: '}', group: 'กลุ่ม/ห้อง', th: 'สามพยางค์ ปิด',  behavior: 'box', onBar: true },
  { id: 'sym-bar',        ch: '|', group: 'กลุ่ม/ห้อง', th: 'กั้นห้อง',       behavior: 'bar', onBar: true },
  // ── octave — typeable only; the dock's สูง↑ / ต่ำ↓ buttons are the discoverable control ──
  { id: 'sym-octaveup',   ch: "'", group: 'เสียง', th: 'สูงหนึ่งช่วง', behavior: 'octaveUp',   onBar: false, aliasKeys: ['’'] },
  { id: 'sym-octavedown', ch: ',', group: 'เสียง', th: 'ต่ำหนึ่งช่วง', behavior: 'octaveDown', onBar: false },
]

// ---- derivations (functions of the list, so a test can pass a modified list) ----------------

// the character strip the toolbar shows and the keyboard learns positions for = the on-bar set
// (was SongViewer's `SYMBOL_CHARS = "_.-~^(){}|n'"` — same 12 characters, order-independent set).
export function symbolCharsOf(symbols = SYMBOLS) {
  return symbols.filter((s) => s.onBar).map((s) => s.ch).join('')
}

// the toolbar's grouped buttons (was NoteInputBar's `SYMBOL_GROUPS`). Group order + membership
// follow the list order, so the rendered strip is byte-for-byte what the hard-coded const gave.
export function buildSymbolGroups(symbols = SYMBOLS) {
  const groups = []
  for (const s of symbols) {
    if (!s.onBar) continue
    let g = groups.find((x) => x.name === s.group)
    if (!g) { g = { name: s.group, keys: [] }; groups.push(g) }
    g.keys.push({ ch: s.ch, th: s.th })
  }
  return groups
}

// the classification index: key (an `e.key` OR a button char) → canonical char, and char →
// behavior. Both the keyboard gate and the button dispatch read the SAME index, so a character
// can never be routable through one door and dead through the other.
export function symbolIndex(symbols = SYMBOLS) {
  const byKey = new Map()
  const behavior = new Map()
  for (const s of symbols) {
    byKey.set(s.ch, s.ch)
    behavior.set(s.ch, s.behavior)
    for (const a of s.aliasKeys || []) byKey.set(a, s.ch)
  }
  return { byKey, behavior }
}

// the pure classification→engine dispatch. This is the ONE table that used to be duplicated in
// the keydown handler and applySymbol; both now go through here. Content-only (cursor movement
// is the caller's concern) so it is trivially unit-testable for path equivalence.
export function effectFor(behavior, content, loc, ch) {
  switch (behavior) {
    case 'mark':       return withNoteMark(content, loc, ch)
    case 'tie':        return withTie(content, loc)
    case 'box':        return withToggledBox(content, loc, ch, ch === '(' || ch === '{')
    case 'accidental': return withAccidental(content, loc, ch)
    case 'octaveUp':   return withOctaveShift(content, loc, 1)
    case 'octaveDown': return withOctaveShift(content, loc, -1)
    case 'bar':        return withToggledBar(content, loc)
    default:           return content // unknown char = no-op (parser gives it no meaning)
  }
}

// resolve `key` (typed `e.key` or a tapped button char) → next content. Returns `content`
// unchanged when the key is not a registered symbol or there is no selection. `idx` is injectable
// so a test can add a synthetic symbol and prove BOTH doors pick it up from one entry.
export function applySymbolToContent(content, loc, key, idx = _idx) {
  const ch = idx.byKey.get(key)
  if (!ch || !loc) return content
  return effectFor(idx.behavior.get(ch), content, loc, ch)
}

// ---- default instances used by the app (tests may build their own via the *Of/build* fns) ----
const _idx = symbolIndex()

export const SYMBOL_CHARS = symbolCharsOf()
export const SYMBOL_GROUPS = buildSymbolGroups()

// key → canonical symbol char (resolving aliases such as ’ → '), or null. The keyboard handler
// uses this to decide whether a keypress is a symbol at all.
export function symbolForKey(key) { return _idx.byKey.get(key) ?? null }

// canonical char → behavior string, or null. Exposed mainly for the drift-killer test.
export function symbolBehavior(ch) { return _idx.behavior.get(ch) ?? null }

// ---- flow / navigation commands (repeat/jump markers) — a PARALLEL registry to SYMBOLS[] -------
// jump markers differ from note keys in three ways (docs/ds/marker-entry-ui.md §0), so they are a
// SEPARATE list rather than more SYMBOLS entries: (1) RARE → they live behind Ctrl+K / the ⋮ menu,
// NOT on the note-key strip, so they never steal a key the everyday typist uses; (2) they INSERT a
// new line item {type:'jump'} instead of marking the selected note (behavior 'jump' → withJumpMarker,
// a structured {kind,al} payload, not a single char); (3) presets place a SET of them at once. The
// CP-0 discipline still holds — this is the ONE list the keyboard palette AND the ⋮ menu read, so
// the two doors can never drift (the drift-killer test proves it).
//
// kind ∈ segno|coda|to-coda|dc|ds|fine. `anchor` (before|after) = which side of the caret note the
// marker lands on; it mirrors songEdit.JUMP_ANCHOR and is exposed here for the UI's "where will it
// go" hint. `al` (fine|coda) only ever rides a dc/ds command (the explicit exit target).
export const JUMP_COMMANDS = [
  { id: 'jm-segno',  kind: 'segno',   th: 'เครื่องหมายวน 𝄋 (จุดที่ D.S. ย้อนมา)', anchor: 'before' },
  { id: 'jm-coda',   kind: 'coda',    th: 'โคดา 𝄌 (ท่อนปิดท้ายที่กระโดดไป)',      anchor: 'before' },
  { id: 'jm-tocoda', kind: 'to-coda', th: 'ไปโคดา (จุดออกกลางเพลงตอนย้อน)',        anchor: 'after'  },
  { id: 'jm-fine',   kind: 'fine',    th: 'Fine (จุดจบตอนย้อนกลับมา)',            anchor: 'after'  },
  { id: 'jm-dc',     kind: 'dc',      th: 'D.C. (ย้อนต้นเพลง)',                    anchor: 'after'  },
  { id: 'jm-ds',     kind: 'ds',      th: 'D.S. (ย้อนไปเครื่องหมายวน)',            anchor: 'after'  },
]

// preset = a ready-made routing in plain Thai (docs/ds/marker-entry-ui.md §2). `place` lists the
// markers the preset drops; `drop:true` = a placeholder the user still has to position (the entry
// UI grows a chip for each and auto-links ids on drop). The first entry (no drop) is placed at the
// caret immediately; the command carries `al` so the exit is chosen, never inferred.
export const JUMP_PRESETS = [
  { id: 'p-dc',      th: 'ย้อนต้นเพลง (D.C.)',                    place: [{ kind: 'dc' }] },
  { id: 'p-dc-fine', th: 'ย้อนต้น แล้วจบที่ Fine (D.C. al Fine)', place: [{ kind: 'dc', al: 'fine' }, { kind: 'fine', drop: true }] },
  { id: 'p-dc-coda', th: 'ย้อนต้น แล้วข้ามไปโคดา (D.C. al Coda)', place: [{ kind: 'dc', al: 'coda' }, { kind: 'to-coda', drop: true }, { kind: 'coda', drop: true }] },
  { id: 'p-ds',      th: 'ย้อนไปเครื่องหมายวน (D.S.)',            place: [{ kind: 'ds' }, { kind: 'segno', drop: true }] },
  { id: 'p-ds-fine', th: 'ย้อน 𝄋 แล้วจบที่ Fine (D.S. al Fine)', place: [{ kind: 'ds', al: 'fine' }, { kind: 'segno', drop: true }, { kind: 'fine', drop: true }] },
  { id: 'p-ds-coda', th: 'ย้อน 𝄋 แล้วข้ามไปโคดา (D.S. al Coda)', place: [{ kind: 'ds', al: 'coda' }, { kind: 'segno', drop: true }, { kind: 'to-coda', drop: true }, { kind: 'coda', drop: true }] },
]

// the set of kinds the registry knows — a preset/command kind not here is rejected (never guessed).
const JUMP_KINDS = new Set(JUMP_COMMANDS.map((c) => c.kind))

// dispatch ONE jump command onto content at loc — the ⋮-menu / Ctrl+K equivalent of
// applySymbolToContent, kept here so keyboard + menu share this single entry point. `kind` must be
// a JUMP_COMMANDS kind; `al` only rides dc/ds. Content-only (caret movement is the caller's job),
// so it is trivially unit-testable. Returns content unchanged for an unknown kind / no loc.
export function applyJumpCommand(content, loc, { kind, al } = {}) {
  if (!JUMP_KINDS.has(kind) || !loc) return content
  return withJumpMarker(content, loc, { kind, al })
}
