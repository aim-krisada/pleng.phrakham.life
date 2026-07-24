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

import { withNoteMark, withInsertedBox, withAccidental, withOctaveShift, withBarAfter } from './songEdit.js'

// `behavior` — the classification the two if/else tables used to each own a copy of. Each value
// names the engine action the character triggers on the selected note (see `effectFor` below):
//
//   'mark'        markSel        _ . ~ ^   a mark that rides on the note (each press cycles it)
//   'box'         insertBoxSel   - ( ) { } a structural box inserted next to the cursor
//   'accidental'  accidentalSel  # b n     sharp / flat / natural
//   'octaveUp'    octaveSel(1)   '         raise the note one octave
//   'bar'         barSel         |         split the segment with a bar line
//
// `onBar`  — appears on the toolbar's symbol strip (and so is a key we learn a position for).
//            `# b` are `onBar:false`: they get their own dedicated ♯ ♭ buttons (emitted via
//            @accidental, not @symbol) and are standard physical keys with no hint — but the
//            keyboard and applySymbol still classify them from HERE, not a separate table.
// `aliasKeys` — extra `e.key` values that route to the same command. The apostrophe key on some
//            keyboards emits the curly quote ’ (U+2019); it must raise the octave exactly like '.
export const SYMBOLS = [
  // ── group ความยาว (length) ────────────────────────────────────────────────
  { id: 'sym-eighth',  ch: '_', group: 'ความยาว', th: 'เขบ็ต',    behavior: 'mark', onBar: true },
  { id: 'sym-dot',     ch: '.', group: 'ความยาว', th: 'จุดเพิ่ม',  behavior: 'mark', onBar: true },
  { id: 'sym-hold',    ch: '-', group: 'ความยาว', th: 'ลากเสียง', behavior: 'box',  onBar: true },
  { id: 'sym-tie',     ch: '~', group: 'ความยาว', th: 'โยงเสียง', behavior: 'mark', onBar: true },
  { id: 'sym-fermata', ch: '^', group: 'ความยาว', th: 'ยืดเสียง', behavior: 'mark', onBar: true },
  // ── group เสียง (pitch) ───────────────────────────────────────────────────
  { id: 'sym-natural',  ch: 'n', group: 'เสียง', th: 'เนเชอรัล',    behavior: 'accidental', onBar: true },
  { id: 'sym-octaveup', ch: "'", group: 'เสียง', th: 'สูงหนึ่งช่วง', behavior: 'octaveUp',   onBar: true, aliasKeys: ['’'] },
  // ── group กลุ่ม/ห้อง (grouping / bar) ─────────────────────────────────────
  { id: 'sym-slur-open',  ch: '(', group: 'กลุ่ม/ห้อง', th: 'เอื้อน เปิด',    behavior: 'box', onBar: true },
  { id: 'sym-slur-close', ch: ')', group: 'กลุ่ม/ห้อง', th: 'เอื้อน ปิด',     behavior: 'box', onBar: true },
  { id: 'sym-trip-open',  ch: '{', group: 'กลุ่ม/ห้อง', th: 'สามพยางค์ เปิด', behavior: 'box', onBar: true },
  { id: 'sym-trip-close', ch: '}', group: 'กลุ่ม/ห้อง', th: 'สามพยางค์ ปิด',  behavior: 'box', onBar: true },
  { id: 'sym-bar',        ch: '|', group: 'กลุ่ม/ห้อง', th: 'กั้นห้อง',       behavior: 'bar', onBar: true },
  // ── accidentals with their own physical keys — classified here, not on the strip ──
  { id: 'sym-sharp', ch: '#', group: 'เสียง', th: 'ชาร์ป', behavior: 'accidental', onBar: false },
  { id: 'sym-flat',  ch: 'b', group: 'เสียง', th: 'แฟลต',  behavior: 'accidental', onBar: false },
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
    case 'box':        return withInsertedBox(content, loc, ch, ch === '(' || ch === '{')
    case 'accidental': return withAccidental(content, loc, ch)
    case 'octaveUp':   return withOctaveShift(content, loc, 1)
    case 'bar':        return withBarAfter(content, loc)
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
