<script setup>
// The read/listen surface for one song — same engine as the old SongView (play,
// transpose, tempo, loop, font size, display layers, play-by-section + follow-along
// highlight = the karaoke feel). The controls are a bottom "music player" built on the
// DockKey core engine: this page owns the song state and hands <SingTransport> the data;
// SingTransport turns it into the DockKey descriptor list (ITEMS_SING) and the engine draws
// the 2-row dock (ไทม์ไลน์ · คีย์ · เลือกท่อน · transport · Aa · ⚙ + pin). Mounted directly
// here; แผ่นเพลง and แก้ไข mount their own DockKey the same way.
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { KEYS, chordOptions } from '../lib/chords.js'
import {
  playSong, playEnsemble, stopPlayback, setTranspose, keyTranspose, songToNotes, TEMPO_MARKS,
  effectiveOrder, buildPlayNotes,
} from '../lib/midi.js'
import { isSampledInstrument } from '../lib/sampler.js'
import { resolveContent, resolvePlayOrder } from '../lib/songModel.js'
import { withNotePitch, withInsertedNote, withInsertedBox, withBarAfter, withNoteMark, withDeletedNote, withRestAt, withClearedSyllable, withSetSyllable, withOctaveShift, withAccidental, withChord } from '../lib/songEdit.js'
import { downloadSong } from '../lib/jsonIO.js'
import { currentSong, readingFontScale, soundMode, setSoundMode, playStyle, setPlayStyle, styleAuto,
  sparkleLevel, setSparkleLevel, arrangeOverrides, setArrangeOverride, resetArrangeOverrides,
  ensembleMode, setEnsembleMode, leadInstrument, setLeadInstrument } from '../store.js'
import { presetCfg, recommendRecipe, songFeatures } from '../lib/arranger/presets.js'
import { buildArrangeCfg, readTechniques } from '../lib/arranger/techniques.js'
import { SOUND_OPTS, ENSEMBLE_OPTS, INSTRUMENT_OPTS, STYLE_OPTS } from '../lib/soundOptions.js'
import { bookRefLabels } from '../lib/bookCodes.js'
import { noteBoxKinds } from '../lib/notation.js'
import SongSheet from './SongSheet.vue'
import SingTransport from './SingTransport.vue'
import NoteInputBar from './NoteInputBar.vue'
import Icon from './Icon.vue'

// `tier` is part of the WT-0 mode contract ({ song, tier }). The reading surface is
// view-only for everyone, so it is accepted but not used to gate anything — there are
// no save/edit affordances here regardless of tier (US-A01 AC3).
const props = defineProps({
  song: { type: Object, required: true },
  tier: { type: String, default: 'guest' },
})
// The reading surface stays a READER: it never mutates props.song. When the pencil is on
// and a note is retyped, it hands the OWNER (Studio → liveSong, the live v2 SSOT) a new
// content via `update-content`; that flows back down as props.song and the sheet re-renders.
const emit = defineEmits(['update-content'])

// ---------- display layers (B024 "แสดงผล" menu) ----------
const DISPLAY_OPTS = [
  { value: 'all', label: 'ครบ (เนื้อ+คอร์ด+โน้ต)', short: 'ครบ', chord: true, note: true, lyric: true },
  { value: 'chord', label: 'เนื้อ+คอร์ด', short: 'คอร์ด', chord: true, note: false, lyric: true },
  { value: 'note', label: 'เนื้อ+โน้ต', short: 'โน้ต', chord: false, note: true, lyric: true },
  { value: 'lyric', label: 'เนื้อล้วน', short: 'เนื้อ', chord: false, note: false, lyric: true },
  { value: 'noteonly', label: 'โน้ตล้วน', short: 'โน้ตล้วน', chord: false, note: true, lyric: false },
]
const display = ref('all')
const displayDef = computed(() => DISPLAY_OPTS.find((o) => o.value === display.value) || DISPLAY_OPTS[0])
const CHORD_OPTS = [
  { value: 'letter', label: 'คอร์ดตัวอักษร (A B C)' },
  { value: 'roman', label: 'คอร์ดโรมัน (I IV V)' },
  { value: 'hidden', label: 'ซ่อนคอร์ด' },
]
const chordSystem = ref('letter')
// ---------- the four sound axes (B104 + B107) — shared option lists (soundOptions.js SSOT) ----------
// เสียงที่เล่น (what voices) · การบรรเลง (solo/ensemble) · เครื่องดนตรี (the 5 solo voices) ·
// อารมณ์/สไตล์ (how it performs). Step 9 collapsed their four dock menus into ONE "เสียงดนตรี"
// button + popover (SoundControl); the option lists are shared with the แก้เพลง editor.
const soundDef = computed(() => SOUND_OPTS.find((o) => o.value === soundMode.value) || SOUND_OPTS[0])
const ensembleDef = computed(() => ENSEMBLE_OPTS.find((o) => o.value === ensembleMode.value) || ENSEMBLE_OPTS[0])
const instrumentDef = computed(() => INSTRUMENT_OPTS.find((o) => o.value === leadInstrument.value) || INSTRUMENT_OPTS[0])
// the loading pill's label — the whole band in ensemble mode, else the chosen solo instrument
const loadingLabel = computed(() => (ensembleMode.value === 'ensemble' ? 'วงดนตรี' : instrumentDef.value.short))
// ข้อ 1 (BPM auto · P'Aim 13 ก.ค.): on first open (styleAuto = no explicit pick yet) choose the
// left-hand style by the song's tempo — slow → บรรเลง (arpeggio, flowing), fast → สงบ (held,
// uncluttered) — and highlight that button. The instant the listener taps a style, setPlayStyle
// turns auto off and their pick wins from then on. Auto never selects 'plain'.
const recommendedStyle = computed(() =>
  recommendRecipe(songFeatures(props.song?.content)) === 'piano-calm' ? 'calm' : 'arrangement',
)
const effectiveStyle = computed(() => (styleAuto.value ? recommendedStyle.value : playStyle.value))
const styleDef = computed(() => STYLE_OPTS.find((o) => o.value === effectiveStyle.value) || STYLE_OPTS[0])
// Map the effective style → what playSong needs: 'plain' turns the arranger OFF (notes as printed);
// the others hand it the matching preset recipe (§6), with the live sparkle level injected (ข้อ 3).
const styleArrange = computed(() => {
  if (effectiveStyle.value === 'plain') return { arranger: false, arrangeCfg: {} }
  // preset recipe → overlay the listener's "ปรับละเอียด" on/off choices → inject the live sparkle level
  const base = presetCfg(effectiveStyle.value === 'calm' ? 'piano-calm' : 'piano-arrangement')
  const merged = buildArrangeCfg(base, arrangeOverrides.value)
  return { arranger: true, arrangeCfg: { ...merged, sparkleLevel: sparkleLevel.value } }
})
// ข้อ 3 slider shows ONLY in บรรเลง (the only preset with sparkle) — spec §4 / P'Aim 13 ก.ค.
const showSparkle = computed(() => effectiveStyle.value === 'arrangement')
// "ปรับละเอียด" technique rows (ROUND 2 diagnostic menu) — effective value of each technique given the
// current preset + overrides. Only meaningful when the arranger is on (style ≠ plain).
const techniqueRows = computed(() => {
  if (effectiveStyle.value === 'plain') return []
  const base = presetCfg(effectiveStyle.value === 'calm' ? 'piano-calm' : 'piano-arrangement')
  return readTechniques(base, arrangeOverrides.value)
})
const hasOverrides = computed(() => Object.keys(arrangeOverrides.value).length > 0)
// "ปรับละเอียด" is piano-specific (ลีลา/เบสมือซ้าย ฯลฯ are keyboard-hand ideas) → show it only for the
// piano family (P'Aim 14 ก.ค.: กีตาร์ไม่ต้องมีปรับละเอียด). Guitar keeps just the simple preset chips.
const showAdvanced = computed(() => techniqueRows.value.length > 0 && (leadInstrument.value === 'grand' || leadInstrument.value === 'felt'))
const showChord = computed(() => displayDef.value.chord && chordSystem.value !== 'hidden')
const showNote = computed(() => displayDef.value.note)
const showLyric = computed(() => displayDef.value.lyric)
const sheetChordSystem = computed(() => (chordSystem.value === 'roman' ? 'roman' : 'letter'))
const sheetMode = computed(() => (showLyric.value && !showNote.value && !showChord.value ? 'lyrics' : 'full'))

const displayKey = ref(props.song?.content?.key || 'C')
const playing = ref(false)
// B107: which instrument the playback sounds on = the chosen lead (step 9: grand/felt/nylon/
// violin/cello, all self-hosted). On first play its samples download while a progress pill shows
// (like the MP3 export), THEN playback starts — the synth is only a fallback if the download
// fails. `instrumentProgress` = 0..1 for the pill. The instrument's short label names the pill.
const instrumentLoading = ref(false)
const instrumentProgress = ref(0)
const loop = ref(false)
const tempo = ref(props.song?.content?.bpm || 92)
const playingSeg = ref(null)
const playingSyl = ref(null) // { li, si, syk } — the syllable+note sounding now (B006)
const sheetWrap = ref(null)
// pause/resume (US-A01 "เล่นต่อ"): playedIndex = note index currently sounding;
// pausedIndex = where the last stop happened, so the next play continues from there.
// posIndex = the playhead the dot/markers read (moves on play, seek, jump, ⏮/⏭).
const playedIndex = ref(0)
const pausedIndex = ref(0)
const posIndex = ref(0)
// B043 §3a — which ท่อน (by label) are selected. Local, temporary state like key/tempo
// (decision C = ไม่จำ · reset when the song changes). B105: the default is EVERY ท่อน ticked
// (= whole song) rather than none, so the selector reads honestly — when the whole song
// plays, all sections show as selected; the singer unticks the ones to drop. Empty (via
// "ไม่เลือก") still falls back to the whole song, unchanged.
const selectedSecs = ref(new Set())

const resolved = computed(() =>
  props.song ? { ...props.song.content, lines: resolveContent(props.song.content) } : null,
)
const printTitle = computed(() => {
  const s = props.song
  if (!s) return ''
  return (s.number != null ? s.number + '. ' : '') + (s.title_th || 'เพลง')
})

// ---- edit ON this sheet (P'Aim 21 ก.ค.) — the pencil lives HERE in ฝึกร้อง, not a separate
// mode. The display is already correct, so we edit right on it. NOTE: this reverses the old
// "no edit affordances in the reading surface regardless of tier" AC (US-A01 AC3) — P'Aim now
// wants ฝึกร้อง to be the one surface: enter → sing → ✏️ edit by right. This step = select +
// navigate (typing/ripple + chord-symbol popups + save come next).
// Editing is OPEN TO EVERYONE — the 3-tier model (mission.md) lets even Tier 0 (ไม่ล็อกอิน /
// คนทำเพลงภายนอก) แก้ · พิมพ์ · upload/download JSON. Only SAVING TO THE SERVER (draft/publish)
// needs login; an anon keeps work via Download/Upload JSON. So the ✏️ shows for all; the save
// step (D) is where the tier gate lives (logged-in → server · anon → download JSON).
const canEdit = computed(() => true)
const editMode = ref(false)
// every selectable NOTE across the WHOLE song, in reading order, keyed by the {li, si, syk}
// that SongSheet's @seek emits — syk = the note-box slot (same index midi.js/NoteRow's data-idx
// use), so a melody with no words yet is still fully selectable.
const inlineCells = computed(() => {
  const cells = []
  ;(resolved.value?.lines || []).forEach((line, li) => {
    const ei = line._entryIndex ?? 0 // which ท่อน (verse) this display line belongs to
    let si = -1
    let bi = 0 // ห้อง (bar) ordinal within the line — bumped at each bar marker
    let col = 0 // note COLUMN within the line (the word sits in the same column, below)
    for (const item of line) {
      if (item.type === 'bar') { bi++; continue }
      if (item.type !== 'segment') continue
      si++
      let slot = 0
      for (const kind of noteBoxKinds(item.note || '')) {
        if (kind === 'struct') continue // slur/triplet brackets aren't their own note
        cells.push({ li, si, syk: slot, bi, ei, col })
        slot++
        col++
      }
    }
  })
  return cells
})
// ONE cursor over BOTH layers — each note contributes two stops: the NOTE, then its LYRIC.
// So ← → alone walks note → its word → next note → its word … and the keyboard never needs the
// mouse to pick which layer to edit (world-standard inline editor). Note units sit at even
// indices, word units at odd.
const editUnits = computed(() =>
  inlineCells.value.flatMap((c) => [{ ...c, layer: 'note' }, { ...c, layer: 'word' }]),
)
const curIdx = ref(-1)
const curUnit = computed(() => (curIdx.value >= 0 ? editUnits.value[curIdx.value] || null : null))
const selCell = computed(() =>
  curUnit.value ? { li: curUnit.value.li, si: curUnit.value.si, syk: curUnit.value.syk } : null,
)
const selLayer = computed(() => curUnit.value?.layer ?? 'note') // derived — no separate ref
// the selection handed to SongSheet — {li,si,syk,layer}. null when not editing / nothing selected.
const editSel = computed(() => curUnit.value)
// select an exact unit (cell + layer) — clicks/taps use this
function selectUnit(li, si, syk, layer) {
  const i = editUnits.value.findIndex((u) => u.li === li && u.si === si && u.syk === syk && u.layer === layer)
  if (i >= 0) curIdx.value = i
}
// point the cursor at a whole cell's NOTE unit (coarse jumps + typing land on the note)
function gotoCellNote(cell) { if (cell) selectUnit(cell.li, cell.si, cell.syk, 'note') }
// Arrows move in the ACTUAL on-screen direction (notes = top row, that note's word = the row
// just below it, lines stacked downward). Never gate on hover/pointer — plain geometry.
// interleaved single step (note→word→note…) — used by the mobile ◀ ▶ and Space (no ↑↓ there)
function moveUnit(step) {
  const n = editUnits.value.length
  if (!n) return
  if (curIdx.value < 0) { curIdx.value = step > 0 ? 0 : n - 1; return }
  curIdx.value = Math.max(0, Math.min(curIdx.value + step, n - 1))
}
// land on the nearest unit of (targetLi, layer) to the given column
function gotoLineLayer(targetLi, col, layer) {
  let bestI = -1, bestD = Infinity
  editUnits.value.forEach((u, i) => {
    if (u.li !== targetLi || u.layer !== layer) return
    const d = Math.abs(u.col - col)
    if (d < bestD) { bestD = d; bestI = i }
  })
  if (bestI >= 0) curIdx.value = bestI
}
// ← → : one step LEFT/RIGHT within the SAME row (note→note or word→word = same parity, ±2)
function moveHoriz(step) {
  const t = curIdx.value + step * 2
  if (t >= 0 && t < editUnits.value.length) curIdx.value = t
}
// ↓ ↑ : one step DOWN/UP as drawn. down: note→its word, word→next line's note.
// up: word→its note, note→previous line's word.
function moveVert(dir) {
  const u = curUnit.value
  if (!u) { moveUnit(dir > 0 ? 1 : -1); return }
  if (dir > 0) {
    if (u.layer === 'note') curIdx.value = curIdx.value + 1 // down to its word
    else gotoLineLayer(u.li + 1, u.col, 'note') // word → note of the line below
  } else {
    if (u.layer === 'word') curIdx.value = curIdx.value - 1 // up to its note
    else gotoLineLayer(u.li - 1, u.col, 'word') // note → word of the line above
  }
}
// Ctrl+← → : skip a whole ห้อง (bar). Next = first note of the next bar; Prev = first note of
// this bar, else the previous bar (text-editor word-jump feel).
function moveBar(dir) {
  const cells = inlineCells.value
  const cur = selCell.value
  if (!cur) { moveUnit(dir > 0 ? 1 : -1); return }
  const ci = cells.findIndex((c) => c.li === cur.li && c.si === cur.si && c.syk === cur.syk)
  const key = (c) => `${c.li}-${c.bi}`
  if (dir > 0) {
    gotoCellNote(cells.slice(ci + 1).find((c) => key(c) !== key(cells[ci])))
  } else {
    const barStart = cells.slice(0, ci).reverse().find((c) => key(c) !== key(cells[ci]))
    if (!barStart) { gotoCellNote(cells[0]); return }
    gotoCellNote(cells.find((c) => key(c) === key(barStart)) || barStart)
  }
}
// Ctrl+↑ ↓ : skip a whole บรรทัด (line) — nearest note of the line above/below
function moveLineJump(dir) {
  const u = curUnit.value
  if (!u) { moveUnit(dir > 0 ? 1 : -1); return }
  gotoLineLayer(u.li + dir, u.col, 'note')
}
// how a typed digit behaves — DEFAULT 'overwrite' (a number lands right ON the current note,
// predictable "กด 1 = ใส่ 1 ตรงที่อยู่"). 'insert' (push the rest right) is the toggle for adding
// notes. The Insert key flips it.
const typeMode = ref('overwrite')
function toggleTypeMode() { typeMode.value = typeMode.value === 'insert' ? 'overwrite' : 'insert' }
// All keys arrive at the hidden capture <input> (focused on selection so the device keyboard
// opens: numeric for a note, Thai text for a word). NOTE layer: digits/arrows/delete are
// commands. WORD layer: text flows into the input (→ withSetSyllable), and ← → only leave the
// word when the caret is at its edge; ↑ ↓ / space / Enter navigate.
function onCaptureKey(e) {
  if (!editMode.value) return
  const ctrl = e.ctrlKey || e.metaKey
  const word = selLayer.value === 'word'
  const el = e.target
  const atStart = word && (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0
  const atEnd = word && (el.selectionStart ?? 0) >= el.value.length && (el.selectionEnd ?? 0) >= el.value.length
  if (e.key === 'ArrowRight') { if (ctrl) { e.preventDefault(); moveBar(1) } else if (!word || atEnd) { e.preventDefault(); moveHoriz(1) } }
  else if (e.key === 'ArrowLeft') { if (ctrl) { e.preventDefault(); moveBar(-1) } else if (!word || atStart) { e.preventDefault(); moveHoriz(-1) } }
  else if (e.key === 'ArrowDown') { e.preventDefault(); ctrl ? moveLineJump(1) : moveVert(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); ctrl ? moveLineJump(-1) : moveVert(-1) }
  else if (e.key === 'Insert') { e.preventDefault(); toggleTypeMode() }
  else if (e.key === 'Enter') { e.preventDefault(); moveHoriz(1) }
  else if (e.key === ' ') { e.preventDefault(); word ? moveHoriz(1) : moveUnit(1) } // space = next syllable/unit
  else if (!word && e.key === 'Home') { e.preventDefault(); curIdx.value = 0 }
  else if (!word && e.key === 'End') { e.preventDefault(); curIdx.value = editUnits.value.length - 1 }
  // NOTE layer: digit = set the note; Delete = ลบอยู่กับที่ (rest); Backspace = เอาออกทั้งช่อง.
  // Overwrite STAYS on the note (so you can add octave / ♯♭ to it before moving — P'Aim); use
  // ← → / space to move on. Insert still advances so a new melody flows left-to-right.
  else if (!word && /^[0-7]$/.test(e.key)) {
    e.preventDefault()
    if (typeMode.value === 'insert') insertDigit(e.key)
    else overwriteDigit(e.key)
  }
  // desktop keyboard shortcuts for the note marks that ARE on a physical keyboard (so they need
  // no button): # = sharp, b = flat, n = natural (jianpu convention, same as the old note boxes).
  else if (!word && (e.key === '#' || e.key === 'b' || e.key === 'n')) { e.preventDefault(); accidentalSel(e.key) }
  // the rest of the jianpu symbol set, typed straight onto the sheet (B-fix 23 ก.ค.: these
  // were silently dead, so a rhythm could not be fixed from the reading surface at all).
  // MARKS ride on the selected note (each press cycles its own mark, order-free via G1):
  //   _ เขบ็ต · . จุดเพิ่มความยาว · ~ โยงเสียง · ^ ยืดเสียง (fermata)
  else if (!word && '_.~^'.includes(e.key)) { e.preventDefault(); markSel(e.key) }
  // ' = ขึ้นหนึ่งช่วงเสียง — the parser's own high-octave character, so it does exactly what the
  // สูง↑ button does. (',' and '!' are NOT wired: today's parser gives them no meaning and this
  // fix invents none — see docs/reports/editor-gap-audit.md.)
  else if (!word && (e.key === "'" || e.key === '’')) { e.preventDefault(); octaveSel(1) }
  // STRUCTURE inserts a box of its own next to the cursor: '-' holds the note one more beat,
  // ( ) wrap a slur/tie group, { } a triplet. An opening bracket lands BEFORE the note.
  else if (!word && '-(){}'.includes(e.key)) { e.preventDefault(); insertBoxSel(e.key) }
  // | = เส้นกั้นห้อง — not a note box: it splits the segment in two (see withBarAfter).
  else if (!word && e.key === '|') { e.preventDefault(); barSel() }
  else if (!word && e.key === 'Delete') { e.preventDefault(); deleteSel() }
  else if (!word && e.key === 'Backspace') { e.preventDefault(); removeCell() }
  // WORD layer: an empty word + Backspace removes the whole cell; otherwise let the text edit
  // (native) — onCaptureInput writes it back to the syllable.
  else if (word && e.key === 'Backspace' && el.value === '') { e.preventDefault(); removeCell() }
}
// WORD layer: mirror the input's text into the current verse's syllable, live.
function onCaptureInput(e) {
  if (selLayer.value !== 'word') { e.target.value = ''; return } // note layer stays empty
  const loc = cellLoc()
  if (!loc) return
  markTyping()
  const next = withSetSyllable(props.song.content, loc, e.target.value)
  if (next !== props.song.content) emit('update-content', next)
}
// resolve the selected NOTE's source address, or null (note ops only)
function selLoc() {
  const cell = selCell.value
  if (!cell || selLayer.value !== 'note') return null
  const rline = resolved.value?.lines?.[cell.li]
  if (!rline || !rline._stanza) return null
  return { resolvedLine: rline, si: cell.si, syk: cell.syk }
}
// resolve the current cell (any layer) — for the word ops that need _entryIndex
function cellLoc() {
  const cell = selCell.value
  if (!cell) return null
  const rline = resolved.value?.lines?.[cell.li]
  if (!rline || rline._entryIndex == null) return null
  return { resolvedLine: rline, si: cell.si, syk: cell.syk }
}

// ---- input surface: popup (desktop) vs bottom bar (mobile) ----
// Choose by VIEWPORT WIDTH, never hover/pointer (Surface = touch+mouse reports coarse).
const WIDE_MIN = 768
const isWide = ref(typeof window !== 'undefined' ? window.innerWidth >= WIDE_MIN : true)
function onResizeWidth() { isWide.value = window.innerWidth >= WIDE_MIN; updateNoteRect() }
// When to show the toolbar (NoteInputBar):
//  • Desktop (popup): only for a NOTE (the octave/mode buttons a keyboard lacks) — words edit
//    inline with no popup. Needs an anchor rect.
//  • Mobile (bar): whenever a cell is selected (it carries the arrows the on-screen keyboard
//    lacks; note ops appear only on the note layer).
const showToolbar = computed(() => {
  if (!editMode.value || !selCell.value) return false
  return isWide.value ? (selLayer.value === 'note' && !!noteRect.value) : true
})
// the selected note's on-screen rect — the desktop popup anchors to it (floats above/below,
// never covering it). Re-read after any selection change and while scrolling.
const noteRect = ref(null)
function updateNoteRect() {
  if (!editMode.value || !sheetWrap.value) { noteRect.value = null; return }
  // anchor to the element of the CURRENT layer — the word span for word edits, the note glyph
  // for notes (a note+word column stacks the note ABOVE the word, so mixing them mis-places the
  // inline field ~30px high).
  const sel = selLayer.value === 'word' ? '.syl-sel-active, .syl-sel' : '.nt-sel-active, .nt-sel'
  const el = sheetWrap.value.querySelector(sel)
  if (!el) { noteRect.value = null; return }
  const r = el.getBoundingClientRect()
  noteRect.value = { top: r.top, bottom: r.bottom, left: r.left, width: r.width }
}
// fade-on-type: while typing/editing quickly the popup dims + goes click-through; a >1s pause
// (or clicking a note) brings it back — G's "quiet assistant". Bar variant ignores this.
const dimPopup = ref(false)
let typingTimer = null
function markTyping() {
  dimPopup.value = true
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(() => { dimPopup.value = false }, 1000)
}
// re-anchor + un-dim whenever the selection moves (a click/tap = "show me the tools")
watch(selCell, () => { dimPopup.value = false; nextTick(updateNoteRect) })
watch(editMode, (on) => { if (on) nextTick(updateNoteRect); else noteRect.value = null })

// ---- capture input: brings up the device keyboard + carries lyric text (batch B) ----
// A single <input> focused whenever a cell is selected. Focusing it opens the phone keyboard
// (numeric for a note, Thai text for a word); on desktop the physical keyboard just works.
const captureInput = ref(null)
// the word under the cursor, read from THIS verse (resolved line's per-segment syllables)
const currentWord = computed(() => {
  const c = selCell.value
  if (!c) return ''
  const line = resolved.value?.lines?.[c.li]
  if (!line) return ''
  let si = -1
  for (const it of line) {
    if (it.type !== 'segment') continue
    si++
    if (si === c.si) return it.syllables?.[c.syk] ?? ''
  }
  return ''
})
// position the (mostly invisible) input right over the selected cell so the caret/keyboard
// context sits there; a word shows its text, a note stays transparent (just holds focus).
const captureStyle = computed(() => {
  const r = noteRect.value
  // no rect yet (just entered edit) — keep it off-screen but FOCUSABLE (display:none can't be
  // focused, which is why pressing the pencil used to need a second click to start typing)
  if (!r) return { position: 'fixed', left: '-9999px', top: '0', width: '1px', height: '1px', opacity: 0 }
  const h = Math.max(16, r.bottom - r.top)
  const base = { position: 'fixed', left: r.left + 'px', top: r.top + 'px', height: h + 'px' }
  // WORD: an explicit width that hugs the word (a text input would otherwise default to ~20
  // chars ≈ 216px and float over its neighbours) — grows a little so a few characters fit.
  return selLayer.value === 'word'
    ? { ...base, width: Math.max(r.width + 10, 32) + 'px' }
    : { ...base, width: Math.max(r.width, 12) + 'px', opacity: 0, pointerEvents: 'none' }
})
async function focusCapture() {
  await nextTick()
  // Find the field via the DOM, not the template ref — on the FIRST mount (pressing the pencil)
  // the ref can lag a tick, which is why focus used to need a second click.
  const el = captureInput.value || sheetWrap.value?.querySelector('.sv-capture')
  updateNoteRect()
  if (!el || !editMode.value || !selCell.value) return
  if (selLayer.value === 'word') {
    if (el.value !== currentWord.value) el.value = currentWord.value
    el.focus({ preventScroll: true })
    const n = el.value.length
    el.setSelectionRange?.(n, n)
  } else {
    el.value = ''
    el.focus({ preventScroll: true })
  }
}
// refocus + reload the field only when the SELECTION moves (curIdx), not on every content edit,
// so live lyric typing isn't interrupted (same cell → same curIdx → no refocus).
watch(curIdx, () => focusCapture())
watch(editMode, (on) => { if (on) focusCapture() })
// overwrite the selected note's pitch and tell the owner (Studio) — never touch props.song.
function overwriteDigit(digit) {
  const loc = selLoc()
  if (!loc) return
  markTyping()
  const next = withNotePitch(props.song.content, loc, digit)
  if (next !== props.song.content) emit('update-content', next)
}
// insert a new note at the cursor (ripple right); the cursor moves onto the note that got
// pushed, so the next digit lands after this one (left-to-right entry). curIdx jumps +2 (to
// the next NOTE unit) because the unit list is two longer after the emitted re-render.
function insertDigit(digit) {
  const loc = selLoc()
  if (!loc) return
  markTyping()
  const next = withInsertedNote(props.song.content, loc, digit)
  if (next !== props.song.content) { emit('update-content', next); curIdx.value = curIdx.value + 2 }
}
// Delete = ลบเฉพาะสิ่งที่เลือก (P'Aim Q1): on the NOTE layer the note becomes a rest (its word
// + timing stay); on the WORD layer only that word is cleared (the note stays). Nothing else
// shifts, and other verses are untouched — "ลบอันไหนอันนั้นหาย".
function deleteSel() {
  if (selLayer.value === 'word') clearWord()
  else restNote()
}
// note layer → turn the note into a rest (0), keeping its slot + word; cursor stays on it.
function restNote() {
  const loc = selLoc()
  if (!loc) return
  markTyping()
  const next = withRestAt(props.song.content, loc)
  if (next !== props.song.content) emit('update-content', next)
}
// word layer → blank just this word in this verse; the note stays.
function clearWord() {
  const loc = cellLoc()
  if (!loc) return
  markTyping()
  const next = withClearedSyllable(props.song.content, loc)
  if (next !== props.song.content) emit('update-content', next)
}
// Backspace = remove the WHOLE cell (note box + its word slot in every verse) so the line
// actually gets shorter. Works from either layer. Cursor steps back to the previous note.
function removeCell() {
  const loc = cellLoc()
  if (!loc) return
  markTyping()
  const ci = Math.floor(curIdx.value / 2)
  const wasLast = inlineCells.value.length <= 1
  const next = withDeletedNote(props.song.content, loc)
  if (next !== props.song.content) {
    emit('update-content', next)
    curIdx.value = wasLast ? -1 : Math.max(0, ci - 1) * 2
  }
}
// octave ± and sharp/flat on the selected note (no ripple — the slot count is unchanged).
function octaveSel(dir) {
  const loc = selLoc()
  if (!loc) return
  markTyping()
  const next = withOctaveShift(props.song.content, loc, dir)
  if (next !== props.song.content) emit('update-content', next)
}
function accidentalSel(acc) {
  const loc = selLoc()
  if (!loc) return
  markTyping()
  const next = withAccidental(props.song.content, loc, acc)
  if (next !== props.song.content) emit('update-content', next)
}
// one of the four note marks (_ . ~ ^) on the selected note — cycles that mark only
function markSel(ch) {
  const loc = selLoc()
  if (!loc) return
  markTyping()
  const next = withNoteMark(props.song.content, loc, ch)
  if (next !== props.song.content) emit('update-content', next)
}
// a structural box next to the cursor: '-' / '(' / ')' / '{' / '}'. An OPENING bracket goes
// before the note; everything else after it. '-' grows the melody, so the cursor steps onto
// the new box (like typing a note in แทรก mode); a bracket bears no slot, so the cursor stays.
function insertBoxSel(ch) {
  const loc = selLoc()
  if (!loc) return
  markTyping()
  const before = ch === '(' || ch === '{'
  const next = withInsertedBox(props.song.content, loc, ch, before)
  if (next !== props.song.content) {
    emit('update-content', next)
    if (ch === '-') curIdx.value = curIdx.value + 2
  }
}
// | = split the segment here with a bar line
function barSel() {
  const loc = selLoc()
  if (!loc) return
  markTyping()
  const next = withBarAfter(props.song.content, loc)
  if (next !== props.song.content) emit('update-content', next)
}
// the chord picker's options for the song's key ("— ไม่มีคอร์ด —" first = clear)
const chordOpts = computed(() => chordOptions(props.song?.content?.key || 'C'))
// set / clear the chord on the selected note's segment (chord '' = remove, keep the note)
function setChord(chord) {
  const loc = cellLoc()
  if (!loc) return
  markTyping()
  const next = withChord(props.song.content, loc, chord)
  if (next !== props.song.content) emit('update-content', next)
  focusCapture()
}
// ---- toolbar taps (special buttons only — digits/text come from the device keyboard) ----
// Every button uses @mousedown.prevent (in NoteInputBar) so the capture input keeps focus and
// the phone keyboard stays open. After each we re-focus the input to be safe.
function barNav(dir) {
  if (dir === 'left') moveHoriz(-1)
  else if (dir === 'right') moveHoriz(1)
  else if (dir === 'up') moveVert(-1)
  else if (dir === 'down') moveVert(1)
  focusCapture()
}
function barOctave(dir) { if (curIdx.value >= 0) { gotoCellNote(selCell.value); octaveSel(dir); focusCapture() } }
function barAccidental(acc) { if (curIdx.value >= 0) { gotoCellNote(selCell.value); accidentalSel(acc); focusCapture() } }
// a note click bubbles to the wrapper — read the exact note from .nt[data-idx] in its
// .segment[data-seg] (a word .syl is @click.stop, so it comes back through onSeek instead)
function onInlinePick(e) {
  if (!editMode.value) return
  const nt = e.target.closest?.('.nt[data-idx]')
  if (!nt) return
  const seg = nt.closest('.segment[data-seg]')
  if (!seg) return
  const [li, si] = seg.dataset.seg.split('-').map(Number)
  selectUnit(li, si, Number(nt.dataset.idx), 'note') // tapped the note glyph → edit the NOTE
}
function toggleEdit() {
  editMode.value = !editMode.value
  if (editMode.value && curIdx.value < 0 && editUnits.value.length) curIdx.value = 0
}
// B053 — source book(s) + scripture caption, same data + label helper as the catalog card
// (SongList). Shown once at the top of the reading surface so a singer sees where the song
// comes from without leaving ฝึกร้อง. book_refs → human labels via lib/bookCodes.
const refLabels = computed(() => bookRefLabels(props.song?.book_refs))
// section OCCURRENCES (one per {type:'section'} marker) → the timeline markers
const sections = computed(() => {
  const lines = resolved.value?.lines || []
  const secs = []
  lines.forEach((line, li) => {
    const s = Array.isArray(line) ? line.find((it) => it.type === 'section') : null
    if (s) secs.push({ name: s.name, fromLi: li, toLi: lines.length - 1 })
  })
  for (let i = 0; i < secs.length - 1; i++) secs[i].toLi = secs[i + 1].fromLi - 1
  return secs
})
// labels that appear more than once = a hook/รับ (drives the "ฮุก" tag + dot style)
const hookNames = computed(() => {
  const count = {}
  for (const s of sections.value) count[s.name] = (count[s.name] || 0) + 1
  return new Set(Object.keys(count).filter((n) => count[n] > 1))
})
// distinct labels for the selector list, first-seen order
const tags = computed(() => {
  const seen = new Set()
  const out = []
  for (const s of sections.value) {
    if (!seen.has(s.name)) { seen.add(s.name); out.push({ name: s.name, isHook: hookNames.value.has(s.name) }) }
  }
  return out
})
const keyOptions = computed(() =>
  KEYS.map((k) => ({ value: k, label: k + (k === props.song?.content?.key ? ' (ต้นฉบับ)' : '') })),
)
const tempoOptions = computed(() => {
  const base = props.song?.content?.bpm
    ? [{ value: props.song.content.bpm, label: `ตามเพลง ♩=${props.song.content.bpm}` }]
    : []
  return [...base, ...TEMPO_MARKS]
})

// ---------- what PLAYS: the selection order (SSOT shared with the audio engine) ----------
// order = the selected ท่อน as ranges (undefined = whole song). playNotes = exactly what
// playSong schedules; posIndex is an index into it.
// B105: every distinct ท่อน selected = the whole song, so short-circuit to `undefined`. This
// keeps playback, the timeline and ⏮/⏭ byte-identical to an unselected whole-song play —
// effectiveOrder would otherwise collapse a shared open/close label or drop any notes that
// sit before the first section marker. With all ท่อน ticked by default (below), "play the
// whole song" therefore stays exactly that, just with every dot shown as picked.
const allSelected = computed(() => tags.value.length > 0 && selectedSecs.value.size === tags.value.length)
// B102 — the strophic play order (refrain repeated after each verse), or undefined when the
// song carries no directive. This is the DEFAULT "whole song" play order; a partial ท่อน
// selection (below) overrides it. resolvePlayOrder reads the same content the sheet resolves,
// so its display-line ranges line up 1:1 with resolved.value.lines.
const strophicOrder = computed(() => resolvePlayOrder(props.song?.content) ?? undefined)
// a partial ท่อน selection → ranges (undefined when every ท่อน is picked = whole song)
const selectionOrder = computed(() => (allSelected.value ? undefined : effectiveOrder(sections.value, selectedSecs.value)))
// what actually PLAYS: an explicit selection wins; otherwise the strophic default (or, with no
// directive, undefined = whole song in display order — byte-identical to before B102).
const order = computed(() => selectionOrder.value ?? strophicOrder.value)
// true ONLY when a strict subset is selected — then play/full indices differ and must be
// mapped. A strophic whole-song play has playNotes === fullNotes, so mapping stays identity.
const isSelectionSubset = computed(() => !!selectionOrder.value)
const playNotes = computed(() => (resolved.value ? buildPlayNotes(resolved.value, { order: order.value }) : []))
const totalNotes = computed(() => playNotes.value.length)

// ---------- the TIMELINE axis = the WHOLE song (P'Aim real-use r3) ----------
// The progress bar + section dots ALWAYS show every occurrence of the whole song; selecting
// a ท่อน only tints the chosen dots green (picked) — it never collapses the timeline. The
// playhead is mapped onto this full-song axis so it moves through the selected block(s) in
// place even though playback only schedules the selection.
// The timeline axis = the whole song in its DEFAULT play order (strophic-expanded when a
// directive is present → the refrain appears as a dot after each verse). With no directive
// this is the plain whole song (strophicOrder = undefined), unchanged from before B102.
const fullNotes = computed(() => (resolved.value ? buildPlayNotes(resolved.value, { order: strophicOrder.value }) : []))
const fullTotal = computed(() => fullNotes.value.length)
// selection-play index → full-song index (drives the dot + snaps scrub/tap into the selection)
const playFullIdx = computed(() => {
  const fn = fullNotes.value
  return playNotes.value.map((n) => {
    let i = fn.findIndex((m) => m.li === n.li && m.si === n.si && m.syk === n.syk)
    if (i < 0) i = fn.findIndex((m) => m.li === n.li && m.si === n.si)
    return i < 0 ? 0 : i
  })
})
// during full playback posIndex IS the full index; during a selection, map it (findIndex
// would collapse repeats, so only map when a selection is active).
const posFullIndex = computed(() => (isSelectionSubset.value ? (playFullIdx.value[posIndex.value] ?? 0) : posIndex.value))
const totalSec = computed(() => {
  const beats = fullNotes.value.reduce((a, n) => a + (n.beats || 0), 0)
  return (beats * 60) / (Number(tempo.value) || 92)
})
const frac = computed(() =>
  fullTotal.value > 1 ? Math.max(0, Math.min(1, posFullIndex.value / (fullTotal.value - 1))) : 0,
)
// one dot per section occurrence of the WHOLE song · selected = green (picked)
const markers = computed(() => {
  const notes = fullNotes.value
  const total = notes.length || 1
  const secs = sections.value
  const out = []
  let prev = null
  notes.forEach((n, i) => {
    const s = secs.find((x) => n.li >= x.fromLi && n.li <= x.toLi)
    const name = s ? s.name : null
    if (name && name !== prev) {
      out.push({ name, frac: i / total, startIndex: i, isHook: hookNames.value.has(name), active: false, picked: selectedSecs.value.has(name) })
    }
    prev = name
  })
  out.forEach((m, k) => {
    const end = k + 1 < out.length ? out[k + 1].startIndex : total
    m.active = playing.value && posFullIndex.value >= m.startIndex && posFullIndex.value < end
  })
  return out
})
// B102 — "รอบ N" indicator: which ท่อน is sounding now and, when it repeats (a refrain), which
// pass. Reads the SAME markers the timeline draws, so it advances exactly with the playhead —
// if the last refrain plays, the badge reaches "รับ • รอบ 4/4"; if a pass were dropped it would
// visibly stop short. round = this occurrence's position among same-named markers.
const nowPlaying = computed(() => {
  if (!playing.value) return null
  const ms = markers.value
  const active = ms.find((m) => m.active)
  if (!active) return null
  const same = ms.filter((m) => m.name === active.name)
  const round = same.findIndex((m) => m.startIndex === active.startIndex) + 1
  return { name: active.name, round, total: same.length }
})
// a full-song index → the nearest reachable note in the current play order (identity when
// nothing is selected; snaps into the selection otherwise, so scrub/tap stay inside it)
function fullToPlayIndex(fullIdx) {
  if (!isSelectionSubset.value) return fullIdx
  const pfi = playFullIdx.value
  let best = 0, bd = Infinity
  for (let k = 0; k < pfi.length; k++) {
    const d = Math.abs(pfi[k] - fullIdx)
    if (d < bd) { bd = d; best = k }
  }
  return best
}
function seekFull(fullIdx) { seekToIndex(fullToPlayIndex(fullIdx)) }

// Re-sync ONLY when the song IDENTITY changes (a different song loads) — keeping the
// listener's chosen key/tempo across edits of the same song (DS-A04). Also clears the
// section selection (decision C = ไม่จำ · each song starts fresh).
watch(
  () => props.song?.number,
  () => {
    const c = props.song?.content
    if (!c) return
    stopPlay()
    displayKey.value = c.key || 'C'
    tempo.value = c.bpm || 92
    pausedIndex.value = 0
    posIndex.value = 0
    selectAllSecs() // B105: a fresh song starts with every ท่อน ticked (= whole song)
  },
)
// B064: the SAME song's stored tempo/key can change via an edit+publish (แก้ไข → ฝึกร้อง).
// Those local snapshots (tempo/displayKey) only re-synced on a song-identity change, so an
// edited bpm/key never reached ฝึกร้อง. Re-sync when the STORED value itself changes —
// editing bpm/key is an explicit intent to change them. DS-A04 still holds: a lyric-only
// edit leaves content.bpm/key untouched, so these don't fire and the listener's pick sticks.
watch(
  () => props.song?.content?.bpm,
  (b) => { if (b) tempo.value = b },
)
watch(
  () => props.song?.content?.key,
  (k) => { if (k) displayKey.value = k },
)

// ---------- follow-along scroll (B016 + B038) ----------
// Keep the sounding SYLLABLE in view (B038: aim at the exact [data-syl], not the whole
// segment). When the user scrolls by hand, auto-scroll steps aside ~3.5s.
const SCROLL_PAUSE_MS = 3500
let pausedScrollUntil = 0
function onUserScroll() {
  if (playing.value) pausedScrollUntil = Date.now() + SCROLL_PAUSE_MS
  if (editMode.value) updateNoteRect() // keep the desktop popup glued to the scrolling note
}
// any scroll at all (incl. keyboard / scrollbar / auto-scroll) re-anchors the popup; unlike
// onUserScroll this must NOT pause the follow-along, since the auto-scroll itself fires it.
function onPageScroll() {
  if (editMode.value) updateNoteRect()
}
async function scrollToPlaying() {
  if (!sheetWrap.value) return
  if (Date.now() < pausedScrollUntil) return // singer is reading elsewhere — don't snap back
  await nextTick()
  const syl = playingSyl.value
  const seg = playingSeg.value
  // B038: prefer the exact syllable span; fall back to the segment (lyrics-only / v1)
  const sel = syl
    ? `[data-syl="${syl.li}-${syl.si}-${syl.syk}"]`
    : seg
      ? `[data-seg="${seg.li}-${seg.si}"]`
      : null
  if (!sel) return
  const el = sheetWrap.value.querySelector(sel)
  if (!el) return
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: smooth ? 'smooth' : 'auto' })
}
watch(playingSyl, scrollToPlaying)
watch(playingSeg, (seg) => { if (!playingSyl.value) scrollToPlaying(seg) })

let playGen = 0
function stopPlay() {
  playGen++
  stopPlayback()
  playing.value = false
  playingSeg.value = null
  playingSyl.value = null
  instrumentLoading.value = false // hide the "loading piano" pill if we cancel mid-download
}
// Play the current order (selection, or the whole song) from a note index. All playback
// paths route through here so `order` stays the single source of what plays.
async function startPlay(startIndex = 0) {
  stopPlayback()
  const gen = ++playGen
  playing.value = true
  posIndex.value = startIndex
  const songId = props.song?.id ?? props.song?.slug ?? props.song?.title
  const onInstrumentPending = ({ loading, progress }) => {
    instrumentLoading.value = loading
    instrumentProgress.value = progress ?? 0
  }
  const onNote = (n, idx) => {
    playingSeg.value = { li: n.li, si: n.si }
    if (n.syk != null) playingSyl.value = { li: n.li, si: n.si, syk: n.syk }
    playedIndex.value = idx
    posIndex.value = idx
  }
  const common = {
    bpm: Number(tempo.value) || resolved.value.bpm || 92,
    loop: loop.value,
    order: order.value,
    transpose: keyTranspose(props.song.content.key, displayKey.value || props.song.content.key),
    songId, startIndex, onInstrumentPending, onNote,
  }
  if (ensembleMode.value === 'ensemble') {
    // B107 step 9 §6b — รวมวง lead-driven: the CHOSEN instrument leads the melody, the band fills
    // in around it (เปียโนนำ / กีตาร์นำ). grand → piano-lead, nylon → guitar-lead.
    const lead = leadInstrument.value === 'nylon' ? 'guitar' : leadInstrument.value === 'violin' ? 'violin' : 'piano'
    await playEnsemble(resolved.value, { ...common, lead })
  } else {
    await playSong(resolved.value, {
      ...common,
      voices: soundMode.value, // B104: melody / chords / both — remembered per browser
      instrument: leadInstrument.value, // B107 step 9: the chosen solo lead
      arranger: styleArrange.value.arranger, // B107 P2: 'plain' = notes as printed; else humanize+preset
      arrangeCfg: styleArrange.value.arrangeCfg, // B107 P2: the chosen preset recipe (§6)
    })
  }
  if (gen === playGen) {
    // reached the natural end (not a pause) → next play starts from the top
    playing.value = false
    playingSeg.value = null
    playingSyl.value = null
    pausedIndex.value = 0
    posIndex.value = 0
  }
}
function togglePlay() {
  if (playing.value) {
    pausedIndex.value = playedIndex.value // remember position so the next play continues
    stopPlay()
  } else {
    startPlay(pausedIndex.value) // resume from where we stopped (0 = fresh)
  }
}
// move the playhead to a note index: while playing → jump the audio there; paused → just
// park the dot so ▶ resumes from it.
function seekToIndex(idx) {
  const clamped = Math.max(0, Math.min(Math.max(0, totalNotes.value - 1), Math.round(idx)))
  pausedIndex.value = clamped
  posIndex.value = clamped
  if (playing.value) startPlay(clamped)
}
// ⏮/⏭ walk the section dots. When a selection is active they step through the SELECTED
// (green) dots (decision H = เดินใน selection); otherwise through every dot. ⏮ from the
// first lands on its start (= กลับต้น, B042).
function reachableMarkers() { return markers.value.filter((m) => !isSelectionSubset.value || m.picked) }
function markerAtPos() {
  const ms = reachableMarkers()
  let cur = 0
  for (let i = 0; i < ms.length; i++) { if (ms[i].startIndex <= posFullIndex.value) cur = i; else break }
  return { ms, cur }
}
function prevSection() {
  const { ms, cur } = markerAtPos()
  seekFull(cur > 0 ? ms[cur - 1].startIndex : (ms[0]?.startIndex ?? 0))
}
function nextSection() {
  const { ms, cur } = markerAtPos()
  const nx = ms[cur + 1]
  if (nx) seekFull(nx.startIndex)
}
// scrub + tap-marker seek on the full-song axis (§H); seekFull snaps into the selection
function onSeekBar(f) { seekFull(Math.round(f * Math.max(1, fullTotal.value - 1))) }
function onJump(startIndex) { seekFull(startIndex) }
// selection changed → the play set is different; stop so the next ▶ plays the new set
// from its start (avoids the dot/audio drifting out of sync mid-play).
function afterSelectionChange() {
  if (playing.value) stopPlay()
  pausedIndex.value = 0
  posIndex.value = 0
}
function toggleSection(name) {
  const next = new Set(selectedSecs.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  selectedSecs.value = next
  afterSelectionChange()
}
function setAll(on) {
  selectedSecs.value = on ? new Set(tags.value.map((t) => t.name)) : new Set()
  afterSelectionChange()
}
// B105: tick every ท่อน (= whole song). Used as the default on load / song change — sets the
// selection directly (no afterSelectionChange stop/reset, since nothing is playing yet).
function selectAllSecs() { selectedSecs.value = new Set(tags.value.map((t) => t.name)) }
// live key change. On the synth the notes still ahead just re-tune (seamless detune). A
// sampler (B107) can't re-tune already-scheduled sample voices, so — like a tempo change —
// we re-schedule the notes ahead in the new key, continuing from the current note.
watch(displayKey, (k) => {
  if (!playing.value) return
  // ensemble + any real sampler can't re-tune scheduled voices → reschedule; only the synth detunes live.
  if (ensembleMode.value === 'ensemble' || isSampledInstrument(leadInstrument.value)) startPlay(playedIndex.value)
  else setTranspose(keyTranspose(props.song.content.key, k || props.song.content.key))
})
// live tempo change: re-schedule the notes ahead at the new bpm, continuing from here
watch(tempo, () => {
  if (playing.value) startPlay(playedIndex.value)
})
// B105 — live sound-mode change (ทำนอง / คอร์ด / รวม): takes effect immediately, no manual
// stop+restart. A live KEY change only re-tunes the oscillators already scheduled (detune),
// but switching voices ADDS or REMOVES whole oscillator sets (melody vs chord pad), so — like
// a live tempo change — we re-schedule the notes ahead with the new voices, continuing from
// the current note.
watch(soundMode, () => {
  if (playing.value) startPlay(playedIndex.value)
})
// B107 P2 — live play-style change (บรรเลง / สงบ / ตรงโน้ต · incl. the BPM-auto pick, ข้อ 1):
// re-schedule ahead with the new arranger recipe from the current note. Watch effectiveStyle so
// both an explicit pick AND an auto change take effect live.
watch(effectiveStyle, () => {
  if (playing.value) startPlay(playedIndex.value)
})
// ข้อ 3 — live ประกายเสียงสูง slider: re-schedule ahead so the new sparkle level is heard at once.
watch(sparkleLevel, () => {
  if (playing.value) startPlay(playedIndex.value)
})
// ROUND 2 — live "ปรับละเอียด" technique toggles: re-schedule ahead so a flip is heard immediately
// (this is exactly the A/B loop P'Aim wants to find what's the problem). Deep-watch the overrides map.
watch(arrangeOverrides, () => {
  if (playing.value) startPlay(playedIndex.value)
}, { deep: true })
// B107 step 9 — live instrument change (เปียโน/ไวโอลิน/…): the sampler can't swap the instrument
// on already-scheduled voices, so re-schedule ahead with the new instrument, continuing from here
// (its samples download first if not yet loaded — the pill shows the wait).
watch(leadInstrument, () => {
  if (playing.value) startPlay(playedIndex.value)
})
// B107 step 9 §6b.2 — live เดี่ยว⇄เต็มวง switch: swaps between playSong and playEnsemble (different
// instrument sets), so re-schedule ahead from the current note, same as an instrument change.
watch(ensembleMode, () => {
  if (playing.value) startPlay(playedIndex.value)
})
function downloadJson() { if (currentSong.value) downloadSong(currentSong.value) }

// MP3 export moved to the dock's unified ExportTool (PDF/JSON/MP3). SongViewer just hands it
// the content + the chosen key/tempo so the MP3 renders exactly like "ฟัง" (see the template).
const mp3Transpose = computed(() => keyTranspose(props.song?.content?.key, displayKey.value || props.song?.content?.key))

// ---------- the ⚙ settings panel controls (§4c) — every control, inline ----------
// icons = Lucide names (rendered via <Icon>), badge = the current value shown on the bar
const CHORD_BADGE = { letter: 'ABC', roman: 'I·V', hidden: '—' }
const settingDescs = computed(() => [
  {
    id: 'display', icon: 'layers', label: 'แสดงผล', kind: 'menu', value: display.value, badge: displayDef.value.short,
    options: DISPLAY_OPTS.map((o) => ({ value: o.value, label: o.label })), onPick: (v) => (display.value = v),
  },
  {
    id: 'sound', icon: 'volume-2', label: 'เสียงที่เล่น', kind: 'menu', value: soundMode.value, badge: soundDef.value.short,
    options: SOUND_OPTS.map((o) => ({ value: o.value, label: o.label, short: o.short })), onPick: (v) => setSoundMode(v),
  },
  {
    id: 'ensemble', icon: 'blend', label: 'การบรรเลง', kind: 'menu', value: ensembleMode.value, badge: ensembleDef.value.short,
    options: ENSEMBLE_OPTS.map((o) => ({ value: o.value, label: o.label, short: o.short, disabled: o.disabled })), onPick: (v) => setEnsembleMode(v),
  },
  {
    id: 'instrument', icon: 'music', label: 'เครื่องดนตรี', kind: 'menu', value: leadInstrument.value, badge: instrumentDef.value.short,
    options: INSTRUMENT_OPTS.map((o) => ({ value: o.value, label: o.label, short: o.short, disabled: o.disabled })), onPick: (v) => setLeadInstrument(v),
  },
  {
    id: 'style', icon: 'sliders-horizontal', label: 'อารมณ์ / สไตล์', kind: 'menu', value: effectiveStyle.value, badge: styleDef.value.short,
    options: STYLE_OPTS.map((o) => ({ value: o.value, label: o.label, short: o.short })), onPick: (v) => setPlayStyle(v),
  },
  // (วาทยกร · golden-piano: the referee is now INTRINSIC — always on, no user toggle — P'Aim 15 ก.ค.
  // "ซ่อนวาทยกร เป็นเปิดตลอด". It's a discipline rule, not a taste, so it isn't a menu item.)
  // (ประกายเสียงสูง used to be a top-level slider here; removed as a duplicate/มิสลีดดิ้ง — sparkle is
  // OFF by default now and lives as a toggle inside "ปรับละเอียด" · P'Aim 14 ก.ค. "เยอะไป / ซ้ำ".)
  // ROUND 2 — "ปรับละเอียด": the collapsible technique panel (toggle/slider/choice per technique) so
  // the listener switches each on/off and finds what's the problem (P'Aim 14 ก.ค.). Only when arranger on.
  ...(showAdvanced.value ? [{
    id: 'advanced', icon: 'sliders-horizontal', label: 'ปรับละเอียด', kind: 'advanced',
    rows: techniqueRows.value,
    onSet: (key, value) => setArrangeOverride(key, value),
    onReset: () => resetArrangeOverrides(),
    canReset: hasOverrides.value,
  }] : []),
  {
    id: 'chord', icon: 'guitar', label: 'คอร์ด', kind: 'menu', value: chordSystem.value, badge: CHORD_BADGE[chordSystem.value],
    options: CHORD_OPTS, onPick: (v) => (chordSystem.value = v),
  },
  {
    id: 'key', icon: 'key-round', label: 'คีย์', kind: 'menu', value: displayKey.value, badge: displayKey.value,
    options: keyOptions.value, onPick: (v) => (displayKey.value = v),
  },
  {
    id: 'tempo', icon: 'gauge', label: 'ความเร็ว', kind: 'menu', value: tempo.value, badge: String(tempo.value),
    options: tempoOptions.value, onPick: (v) => (tempo.value = Number(v)),
  },
  // ขนาดตัวอักษร (font) = top-nav Aa · download/พิมพ์/MP3 = the dock ExportTool (below).
])

// ---------- the sing dock = the DockKey engine, fed by <SingTransport> (ITEMS_SING) ----------
// Mounted directly by this page (below); SingTransport builds the descriptor list and the
// engine owns layout / collapse / drag / Setting+pin / clamp.
const hasSections = computed(() => sections.value.length > 0)

onMounted(() => {
  selectAllSecs() // B105: first-load default = every ท่อน ticked (the identity watcher isn't immediate)
  window.addEventListener('wheel', onUserScroll, { passive: true })
  window.addEventListener('touchmove', onUserScroll, { passive: true })
  // wheel/touchmove only cover a hand-scroll GESTURE. Keyboard scrolling (PageDown/space),
  // dragging the scrollbar and the follow-along auto-scroll all move the page WITHOUT one, and
  // the popup then kept its old viewport spot while the note slid away — that is how it ended up
  // sitting in the header band (P'Aim 23 ก.ค.). A plain scroll listener catches every case.
  window.addEventListener('scroll', onPageScroll, { capture: true, passive: true })
  window.addEventListener('resize', onResizeWidth)
  nextTick(() => { isWide.value = window.innerWidth >= WIDE_MIN }) // re-read once layout has a real width
})
onUnmounted(() => {
  window.removeEventListener('wheel', onUserScroll)
  window.removeEventListener('touchmove', onUserScroll)
  window.removeEventListener('scroll', onPageScroll, { capture: true })
  window.removeEventListener('resize', onResizeWidth)
  if (typingTimer) clearTimeout(typingTimer)
  stopPlayback()
})

// tap a syllable/note in the sheet → jump playback there (US H1). Find the note's index
// in the CURRENT play order and start from it, in the current key.
function onSeek({ li, si, syk }) {
  // ✏️ on: a tap SELECTS the note/word for editing instead of jumping playback. A word (.syl)
  // is @click.stop so it only reaches here → edit the WORD; a note-area tap also fires this
  // (syk 0) but onInlinePick runs after and overrides to the exact note + layer 'note'.
  if (editMode.value) { selectUnit(li, si, syk, 'word'); return } // tapped a word → edit the WORD
  const notes = playNotes.value
  let idx = notes.findIndex((n) => n.li === li && n.si === si && n.syk === syk)
  if (idx < 0) idx = notes.findIndex((n) => n.li === li && n.si === si) // rest/blank slot
  if (idx < 0) return
  pausedIndex.value = idx
  posIndex.value = idx
  startPlay(idx)
}
</script>

<template>
  <div>
    <!-- B053: แหล่งเพลง (source books) + scripture reference — small captions above the
         sheet, mirroring the catalog card. Only render when the song actually has them. -->
    <div v-if="refLabels.length || song.scripture" class="song-refs">
      <div v-if="refLabels.length" class="src-tag muted">แหล่งเพลง: {{ refLabels.join(' · ') }}</div>
      <div v-if="song.scripture" class="scripture-tag muted">📖 {{ song.scripture }}</div>
    </div>

    <!-- while editing: a small hint + autosave note ride above the sheet -->
    <div v-if="editMode" class="sv-edit-hint no-print" role="status">
แตะโน้ตแล้วพิมพ์เลข · แตะคำแล้วพิมพ์เนื้อ (คีย์บอร์ดขึ้นเอง) · <b>← → ↑ ↓</b> เลื่อน · ปุ่มพิเศษ (สูง/ต่ำ · ♯♭ · แทรก/ทับ) อยู่ในแถบ · <b>Delete</b> ลบอยู่กับที่ · <b>Backspace</b> เอาออกทั้งช่อง<br />
สัญลักษณ์: <b>#</b> ♯ · <b>b</b> ♭ · <b>n</b> ♮ · <b>'</b> สูงหนึ่งช่วง · <b>_</b> เขบ็ต · <b>.</b> จุดเพิ่มความยาว · <b>~</b> โยงเสียง · <b>^</b> ยืดเสียง · <b>-</b> ลากเสียง · <b>( )</b> เอื้อน · <b>{ }</b> สามพยางค์ · <b>|</b> เส้นกั้นห้อง
    </div>

    <div
      ref="sheetWrap"
      class="sheet-scale"
      :class="{ 'sv-editing': editMode }"
      :style="{ fontSize: readingFontScale + 'rem' }"
      @click="onInlinePick"
    >
      <!-- the focused capture field — opens the device keyboard on a phone (numeric for a note,
           Thai text for a word) and carries the typed lyric. Sits over the selected cell. -->
      <input
        v-if="editMode && selCell"
        ref="captureInput"
        class="sv-capture no-print"
        :class="{ 'on-word': selLayer === 'word' }"
        :inputmode="selLayer === 'word' ? 'text' : 'numeric'"
        :style="captureStyle"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        aria-label="ช่องพิมพ์แก้โน้ต/คำ"
        @keydown="onCaptureKey"
        @input="onCaptureInput"
      />
      <SongSheet
        :content="resolved"
        :mode="sheetMode"
        :chord-system="sheetChordSystem"
        :show-chord="showChord"
        :show-note="showNote"
        :show-lyric="showLyric"
        :display-key="displayKey"
        :playing-seg="playingSeg"
        :playing-syl="playingSyl"
        :edit-sel="editMode ? editSel : null"
        interactive
        :song-title="printTitle"
        @seek="onSeek"
      />
    </div>

    <!-- ✏️ edit — a floating round action button (Google-Docs pattern), bottom-right above the
         play dock, shown only by right. Tap = enter edit; while editing it becomes ✓ เสร็จ.
         The play dock stays put so you can listen while you edit. -->
    <button
      v-if="canEdit"
      class="sv-fab no-print"
      :class="{ editing: editMode }"
      :aria-pressed="editMode"
      :title="editMode ? 'เสร็จ — กลับไปฝึกร้อง' : 'แก้ไขเพลงนี้'"
      :aria-label="editMode ? 'เสร็จการแก้ไข' : 'แก้ไขเพลงนี้'"
      @click="toggleEdit"
    ><Icon :name="editMode ? 'check' : 'pencil'" :size="24" /></button>

    <!-- B107: on first play the chosen instrument's samples download (~2–3 MB, cached after);
         this pill shows the progress, like the MP3 export. Playback starts once it's ready.
         Pressing พัก during the wait cancels (the pill hides via stopPlay). -->
    <div v-if="instrumentLoading" class="inst-loading" role="status" aria-live="polite">
      🎵 กำลังโหลดเสียง{{ loadingLabel }}… {{ Math.round(instrumentProgress * 100) }}%
      <progress class="inst-bar" :value="Math.round(instrumentProgress * 100)" max="100"
                :aria-label="`โหลดเสียง${loadingLabel} ${Math.round(instrumentProgress * 100)}%`"></progress>
    </div>

    <!-- the sing dock — DockKey core engine, fed the ITEMS_SING descriptor list by
         <SingTransport>. Fixed at the bottom; the engine owns collapse/drag/Setting/clamp.
         While editing, it steps aside for the note-input bar (locked wireframe context B). -->
    <SingTransport
      v-show="!editMode"
      :playing="playing"
      :loop="loop"
      :frac="frac"
      :total-sec="totalSec"
      :markers="markers"
      :now-playing="nowPlaying"
      :tags="tags"
      :selected="selectedSecs"
      :has-sections="hasSections"
      :settings="settingDescs"
      :content="song && song.content"
      :filename-base="printTitle"
      :on-json="downloadJson"
      :mp3-bpm="Number(tempo) || 0"
      :mp3-transpose="mp3Transpose"
      :mp3-voices="soundMode"
      :mp3-arranger="styleArrange.arranger"
      :mp3-arrange-cfg="styleArrange.arrangeCfg"
      :mp3-instrument="leadInstrument"
      :mp3-song-id="song && (song.id ?? song.slug ?? song.title)"
      @toggle-play="togglePlay"
      @prev="prevSection"
      @next="nextSection"
      @toggle-loop="loop = !loop"
      @seek="onSeekBar"
      @jump="onJump"
      @toggle-section="toggleSection"
      @set-all="setAll"
    />

    <!-- EPIC C — the note-input surface (number pad + jianpu symbols + แทรก/ทับ). While editing:
         a floating popup glued to the selected note on a WIDE screen (fades while you type), or a
         bottom keyboard-accessory bar on a phone (the only way to enter notes without a hardware
         keyboard). Chosen by width, never hover/pointer. Same edit engine via bar* handlers. -->
    <NoteInputBar
      v-if="showToolbar"
      :variant="isWide ? 'popup' : 'bar'"
      :layer="selLayer"
      :anchor="isWide ? noteRect : null"
      :dimmed="dimPopup"
      :mode="typeMode"
      :chords="chordOpts"
      @nav="barNav"
      @octave="barOctave"
      @accidental="barAccidental"
      @chord="setChord"
      @toggle-mode="typeMode = typeMode === 'insert' ? 'overwrite' : 'insert'"
    />
  </div>
</template>

<style scoped>
/* ✏️ edit — a floating action button (Material/Google-Docs pattern), shown only to editors.
   Bottom-right, in the thumb zone, riding ABOVE the play dock so listening keeps working. */
.sv-fab {
  position: fixed;
  right: 24px;
  /* desktop/tablet: the play dock is a CENTERED pill (bottom:8px, ≤700px wide), so the FAB
     drops to the same baseline in the bottom-right CORNER — it reads as a companion control on
     the dock's line, balanced against the centered dock + page margin. On a phone the dock goes
     nearly full-width, so the FAB lifts ABOVE it (media query below) to avoid overlap. */
  bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-dock);
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--brand, #8b4513);
  color: #fff;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.28);
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
}
.sv-fab:hover { box-shadow: 0 5px 16px rgba(0, 0, 0, 0.34); transform: translateY(-1px); }
.sv-fab:active { transform: translateY(0); }
.sv-fab:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
/* editing → a green "done" (✓), the Google-Docs affordance to leave edit mode. While
   editing, the play dock is hidden and the ~60px note-input bar sits at the bottom, so the
   FAB drops to just above THAT bar (same on desktop + phone). */
.sv-fab.editing {
  background: #16a34a;
  bottom: calc(74px + env(safe-area-inset-bottom, 0px));
}
/* phone: the dock is ~full-width at the bottom, so lift the FAB clear of it */
@media (max-width: 640px) {
  .sv-fab { right: 16px; bottom: calc(210px + env(safe-area-inset-bottom, 0px)); }
}

/* while editing, a slim hint bar above the sheet */
.sv-edit-hint {
  color: var(--muted, #64748b);
  font-size: 13px;
  margin: 2px 0 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.sv-edit-hint b { color: var(--text, #0f172a); }

/* the sheet is the edit surface — a soft focus ring shows it is "live" */
.sheet-scale.sv-editing {
  cursor: text;
  outline: none;
  border-radius: 10px;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}
/* the capture input — positioned over the selected cell (inline styles set top/left/size).
   A note keeps it invisible (opacity:0 inline) just to hold keyboard focus; a WORD shows the
   text being typed, styled to read as editing on the sheet. */
.sv-capture {
  z-index: var(--z-inline-edit);
  margin: 0;
  border: none;
  background: transparent;
  font: inherit;
  padding: 0;
  min-height: 0; /* beat the global input min-height so it hugs the word's line height */
  min-width: 0;
  box-sizing: border-box;
  line-height: 1.1;
}
/* WORD edit = INLINE, seamless: sit exactly over the word, same font, opaque sheet background
   (covers the underlying word cleanly), no box — just a thin brand underline as the "editing"
   cue + the caret. Reads as typing on the sheet, not a floating dialog. */
.sv-capture.on-word {
  color: var(--ink, #0f172a);
  background: var(--surface, #fff);
  border: none;
  border-bottom: 2px solid var(--brand, #8b4513);
  border-radius: 0;
  padding: 0;
  text-align: center;
  outline: none;
  caret-color: var(--brand, #8b4513);
}

/* Leave room so the fixed transport dock (S4 <StudioDock>/<SingTransport>) never covers
   the last line while singing. The dock is ~147px on wider screens but grows to ~191px
   once its controls wrap at ≤480px; add the iOS home-indicator inset on top so the last
   line clears on notched phones too. (Clearance tracks the dock height, which S4 owns.) */
.sheet-scale { padding-bottom: calc(160px + env(safe-area-inset-bottom, 0px)); }
@media (max-width: 480px) {
  .sheet-scale { padding-bottom: calc(210px + env(safe-area-inset-bottom, 0px)); }
}
/* Reading-view tidy ("ง่าย" · P'Aim 21 ก.ค.) — the notation size is LOCKED at the standard
   (like MuseScore/Soundslice: fixed staff size + a separate Aa zoom, never per-song rescaling).
   To stop it sitting cramped on the left of a wide screen, center the sheet block as a page:
   width shrinks to its content and centers, so wide screens get even margins instead of dead
   right space. Screen only — the A4 print sheet (แผ่นเพลง mode) is untouched. Justifying each
   line to the right margin ("เต็มสูตร") is the next step. */
.sheet-scale :deep(.sheet-root) {
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
}

/* B107 — "loading real piano" hint, a small pill sitting just above the fixed dock. Purely
   informational (the synth is already playing); fades in, never blocks interaction. */
.inst-loading {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(170px + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-sticky);
  pointer-events: none;
  background: var(--surface-2, #222);
  color: var(--text-1, #eee);
  border: 1px solid var(--border-1, #4444);
  border-radius: 999px;
  padding: var(--sp-1, 4px) var(--sp-3, 12px);
  font-size: 0.82rem;
  box-shadow: 0 2px 10px #0003;
  display: flex;
  align-items: center;
  gap: var(--sp-2, 8px);
  max-width: min(88vw, 340px);
}
/* native <progress> so it reads the same as the MP3 export bar + gets built-in a11y */
.inst-bar {
  flex: 1;
  min-width: 60px;
  height: 5px;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  -webkit-appearance: none;
  appearance: none;
}
.inst-bar::-webkit-progress-bar { background: var(--border-1, #4444); border-radius: 999px; }
.inst-bar::-webkit-progress-value { background: var(--accent, #22c55e); border-radius: 999px; }
.inst-bar::-moz-progress-bar { background: var(--accent, #22c55e); border-radius: 999px; }
@media (max-width: 480px) {
  .inst-loading { bottom: calc(220px + env(safe-area-inset-bottom, 0px)); }
}

/* B053 — source/scripture captions: muted small text (matches SongList's caption weight),
   each on its own line so long ref lists wrap cleanly on a phone. Uses S0 tokens only. */
.song-refs {
  margin-bottom: var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}
.song-refs .src-tag,
.song-refs .scripture-tag {
  font-size: var(--fs-sm);
}
</style>
