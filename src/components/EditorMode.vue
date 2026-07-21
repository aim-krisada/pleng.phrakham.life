<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { supabase } from '../supabase.js'
import { KEYS, TIME_SIGNATURES, chordOptions } from '../lib/chords.js'
import { parseNotes, beatCount, expectedBeats, syllableSlots, noteBoxKinds } from '../lib/notation.js'
import { lintBar, SEVERITY } from '../lib/notationLint.js'
import { migrateToV2, splitSyllables, joinSyllables, resolveContent } from '../lib/songModel.js'
import { songHaystack } from '../lib/songSearch.js'
import { visibleSongs } from '../lib/bookshelf.js'
import { playSong, playEnsemble, stopPlayback } from '../lib/midi.js'
import { presetCfg } from '../lib/arranger/presets.js'
import { SOUND_OPTS, ENSEMBLE_OPTS, INSTRUMENT_OPTS, STYLE_OPTS } from '../lib/soundOptions.js'
import SongSheet from './SongSheet.vue'
import NoteBoxes from './NoteBoxes.vue'
import ComboSelect from './ComboSelect.vue'
import Icon from './Icon.vue'
import RevisionHistory from './RevisionHistory.vue'
import DockKey from './DockKey.vue'
import ExportTool from './ExportTool.vue'
import SoundControl from './SoundControl.vue'

// ---------- mode contract (DS-04) ----------
// EditorMode is the "แก้ไข" surface, extracted whole from Studio.vue. The shell owns
// which mode is shown and the canonical song; this mode only edits.
//   props.song   : the current song (v2 row: { id, number, title_th, title_en, content })
//   props.tier   : 'anon' | 'editor' | 'approver' (from the store — single gating source)
//   props.active : true while this mode is the visible one (guards the teleported chrome,
//                  which lives OUTSIDE this component's root so v-show can't hide it)
// emits:
//   change(song) : the song was edited — the shell keeps it as central state so switching
//                  modes never loses in-progress work
//   save(kind)   : a save button was pressed · kind ∈ 'json' | 'draft' | 'pending' | 'publish'
const props = defineProps({
  song: { type: Object, default: null },
  tier: { type: String, default: 'anon' },
  active: { type: Boolean, default: false },
})
const emit = defineEmits(['change', 'save', 'dock'])

// help-in-context (notation-standard · ทางเสริม ข): the song-maker's standard opens in a NEW
// tab so in-progress keying is never lost (Tier 0 has no autosave). BASE_URL keeps the hash
// route resolving on both hosts.
const notationHelpUrl = import.meta.env.BASE_URL + '#/notation'

// ---------- auth + role (gating comes from the store via props.tier · DS-02) ----------
import { session, legacy, shellMenu, saveDraftRow, readingFontScale,
  editorSound, editorEnsemble, editorInstrument, editorStyle,
  setEditorSound, setEditorEnsemble, setEditorInstrument, setEditorStyle } from '../store.js'

// derive the two flags the editor already reads from the single tier source, so the rest
// of the editor body is untouched (isApprover / loggedIn keep their meaning)
const isApprover = computed(() => props.tier === 'approver')
const loggedIn = computed(() => props.tier !== 'anon')
// the teleported chrome (title input + เพลง/จัดการ menus) renders only while this mode is on
const editing = computed(() => props.active)

onMounted(() => {
  loadSongList()
  loadDrafts()
  loadProfilesMap()
})
onUnmounted(stopPlayback)

// login/logout happen in the navbar — refresh drafts/profiles when auth changes
watch(session, () => {
  loadDrafts()
  loadProfilesMap()
})
// NOTE: the props.song ↔ change/save wiring lives at the END of this script, after the
// editing state (editingId / meta / previewContent / applyRow …) it depends on is defined
// — otherwise the immediate watchers would touch those consts inside their TDZ.

// ---------- editing model (song model v2) ----------
// A song is a set of MELODIES (stanzas, entered once, no lyrics) plus an
// ARRANGEMENT (play order — each row links a stanza and supplies only its words).
// The bar/segment editor below is unchanged: it edits the ACTIVE stanza's lines via
// the `lines` computed, so all the existing line/bar/segment code keeps working.
function newSegment() {
  return { chord: '', note: '', lyric: '' }
}
// A bar can carry repeat marks: repeatStart '‖:' (loop back to here), repeatEnd ':‖'
// (jump back to the last repeatStart), and volta 1/2 (this bar is the 1st / 2nd ending).
// `pickup` (ห้องยก / anacrusis) marks a bar that is intentionally short because its
// beats are completed by another partial bar — a stanza-opening pickup paired with the
// short final bar, or a bar split across a line. Flagged bars are validated as a GROUP
// (their beats must sum to a whole number of bars), never red individually (B055).
function barShell() {
  return { segments: [], repeatStart: false, repeatEnd: false, volta: 0, pickup: false }
}
function newBar() {
  return { ...barShell(), segments: [newSegment()] }
}
function newLine() {
  return { marker: '', cont: false, label: '', section: '', end: false, bars: [newBar()] }
}

function deserializeLine(items) {
  const line = { marker: '', cont: false, label: '', section: '', end: false, bars: [] }
  let bar = barShell()
  for (const it of items) {
    if (it.type === 'continue') line.cont = true
    else if (it.type === 'section') line.section = it.name || ''
    else if (it.type === 'label') line.label = it.text || ''
    else if (it.type === 'end') line.end = true
    else if (it.type === 'marker') line.marker = it.label || '***'
    else if (it.type === 'repeat-start') bar.repeatStart = true
    else if (it.type === 'repeat-end') bar.repeatEnd = true
    else if (it.type === 'pickup') bar.pickup = true
    else if (it.type === 'volta') bar.volta = it.num || 0
    else if (it.type === 'bar') {
      line.bars.push(bar)
      bar = barShell()
    } else if (it.type === 'segment') {
      bar.segments.push({ chord: it.chord || '', note: it.note || '', lyric: it.lyric || '' })
    }
  }
  line.bars.push(bar)
  line.bars = line.bars.filter((b) => b.segments.length)
  if (!line.bars.length) line.bars = [newBar()]
  return line
}

// A stanza is a melody — segments carry no lyric (the arrangement supplies words),
// so an empty lyric is dropped from the serialized item to keep the v2 JSON clean.
function serializeLine(line) {
  const items = []
  if (line.section?.trim()) items.push({ type: 'section', name: line.section.trim() })
  if (line.cont) items.push({ type: 'continue' })
  if (line.marker) items.push({ type: 'marker', label: line.marker })
  line.bars.forEach((b, i) => {
    // a repeat-start IS the left barline; otherwise a plain barline between bars
    if (b.repeatStart) items.push({ type: 'repeat-start' })
    else if (i > 0) items.push({ type: 'bar' })
    if (b.pickup) items.push({ type: 'pickup' })
    if (b.volta) items.push({ type: 'volta', num: b.volta })
    for (const s of b.segments) {
      const seg = { type: 'segment', chord: s.chord, note: s.note }
      if (s.lyric) seg.lyric = s.lyric
      items.push(seg)
    }
    if (b.repeatEnd) items.push({ type: 'repeat-end' })
  })
  if (line.label?.trim()) items.push({ type: 'label', text: line.label.trim() })
  if (line.end) items.push({ type: 'end' })
  return items
}

const editingId = ref(null)
const currentDraftId = ref(null)
// The draft row actually open in the editor (null = editing the published song). This is
// the only navigation-set part of the identity; everything else about "whose version is
// this" is derived from it + the loaded drafts (see openPendingDraft / reviewingDraft).
const openDraft = ref(null)
const reviewComment = ref('')
const pickerId = ref('')
const meta = reactive({ number: null, title_th: '', title_en: '', category: 'anuchon', theme: '' })
const opts = reactive({ key: 'C', timeSignature: '4/4', bpm: null })

// verified flag of the loaded song (songs.verified) — surfaced as the "✓ ตรวจแล้ว" toggle
const verified = ref(false)

// B060: song settings live inline now (no "เพลง ▾" menu needed). ธีม = the 8 themes the
// library uses (from the songs.theme column); หมวด = the book/collection code (anuchon =
// ไทยอนุชน 120 · docs/pm/book-codes.md). Both are set-and-forget dropdowns so พี่เปา can
// fill them without fear of leaving the page.
const THEMES = [
  'กิตติคุณ',
  'ความสุขแห่งความรอด',
  'คริสตจักร',
  'ประสบการณ์',
  'พระคัมภีร์',
  'มอบถวาย',
  'รักปรารถนา',
  'อาณาจักร',
]
const themeOptions = [{ value: '', label: '— ไม่ระบุธีม —' }, ...THEMES.map((t) => ({ value: t, label: t }))]
// The 3 canonical books (P'Aim 12 ก.ค. — see docs/ds/home-redesign.md §Taxonomy) are the ONLY
// choices in the "หมวด" ComboSelect. Hard lock: no allow-custom — a value not in this list must
// not stick, so an editor can only pick one of the 3 books. Extending the taxonomy (rename or a
// 4th book) is an admin job (B096, deferred), not a free-text field. 1 song = 1 book (single-select).
const CATEGORY_OPTIONS = [
  { value: 'lem-yai', label: 'เล่มใหญ่' },
  { value: 'anuchon', label: 'อนุชน' },
  { value: 'dek-lek', label: 'เด็กเล็ก' },
]

// melodies + play order (v2). An arrangement row stores its words as a `syllables`
// array (one token per syllable-bearing note) so the per-note lyric boxes under the
// melody can bind slot-by-slot; the bulk textarea joins/splits the same array.
const stanzas = ref([{ id: 'A', lines: [newLine()] }])
const activeStanza = ref(0)
const arrangement = ref([{ stanza: 'A', label: '', syllables: [], key: '' }])
const migrateWarnings = ref([]) // set when a v1 song is auto-split on load (author reviews)

// verse lens: which arrangement row's words to show under the active stanza's notes
// (-1 = hidden). Lets the author type each syllable right under its note — the old
// "words with the melody" feel, now per syllable (a blank box marks a missing word).
const lensChoice = ref(-1)
const paraOpen = ref(false) // paragraph (free-text) editor for the selected ข้อ

// ---- editor-section-ux: rail "โครงเพลง" shell (inline rename · drag/▲▼ reorder) ----
// This layer only reshapes how ท่อน (arrangement rows) are managed — the v2 model and the
// note/word/beat editor below are untouched (SX7 regression gate).
const editingLabelId = ref(-1) // arrangement index whose label is being renamed (-1 = none)
const editingLabelWhere = ref('') // 'rail' | 'canvas' — which surface opened the input
const labelSnapshot = ref('') // pre-edit label, restored on Esc
const melodyOpen = ref(false) // "ทำนอง (โน้ต)" secondary group — collapsed by default
const dragFromRow = ref(-1) // drag reorder: source index (mouse DnD + touch pointer)
const dragOverRow = ref(-1) // current drop-target index (drop indicator)
const reorderMsg = ref('') // aria-live text announcing the new order (WCAG 2.5.7 fallback)
const vFocus = { mounted: (el) => { el.focus(); el.select?.() } } // autofocus an inline input

const saveMsg = ref('')
const playing = ref(false)
// B093: review_flags loaded with the song (so publish keeps DA/other flags and only
// refreshes the lint ones) + the last publish's lint issue count (for the warn message).
const loadedFlags = ref([])
const lastLintCount = ref(0)

// the bar/segment editor operates on the ACTIVE stanza's lines through this computed
const lines = computed({
  get: () => stanzas.value[activeStanza.value]?.lines ?? [],
  set: (v) => {
    const s = stanzas.value[activeStanza.value]
    if (s) s.lines = v
  },
})
const activeStanzaId = computed(() => stanzas.value[activeStanza.value]?.id ?? '')

const previewContent = computed(() => ({
  version: 2,
  key: opts.key,
  timeSignature: opts.timeSignature,
  bpm: opts.bpm || undefined,
  stanzas: stanzas.value.map((s) => ({ id: s.id, lines: s.lines.map(serializeLine) })),
  arrangement: arrangement.value.map((r) => ({
    stanza: r.stanza,
    label: r.label?.trim() || '',
    syllables: r.syllables.map((t) => (t || '').trim()),
    ...(r.key ? { key: r.key } : {}),
    // B102 — "ร้องรับทุกข้อ": the refrain is sung after every verse. Stored on the entry
    // (SSOT, visible in the downloaded JSON); playback (resolvePlayOrder) expands it.
    ...(r.afterEachVerse ? { afterEachVerse: true } : {}),
  })),
}))

// The sheet + playback read v1-shaped `lines`, so resolve the arrangement first.
const resolvedPreview = computed(() => ({
  ...previewContent.value,
  lines: resolveContent(previewContent.value),
}))

// valid chords only, diatonic chords of the current key listed first. chordOptions
// already leads with a "— ไม่มีคอร์ด —" entry (value ''), so the picker reuses it —
// picking that clears/merges a chord at a note (no duplicate "no chord" row).
const chordOpts = computed(() => chordOptions(opts.key))
const chordPickOpts = chordOpts

// ---------- verse lens (words under the notes) ----------
// arrangement rows that link the stanza currently being edited
const lensRowsForActiveStanza = computed(() =>
  arrangement.value.map((r, i) => ({ i, r })).filter((x) => x.r.stanza === activeStanzaId.value),
)
const lensOptions = computed(() => [
  { value: -1, label: '— ซ่อนเนื้อ —' },
  ...lensRowsForActiveStanza.value.map((x) => ({
    value: x.i,
    label: 'ข้อ ' + (x.i + 1) + (x.r.label ? ' (' + x.r.label + ')' : ''),
  })),
])
const lensRow = computed(() => (lensChoice.value >= 0 ? arrangement.value[lensChoice.value] : null))
const lensActive = computed(() => !!lensRow.value && lensRow.value.stanza === activeStanzaId.value)
// global syllable-slot index where each segment of the active stanza starts, so a
// per-note box binds to lensRow.syllables[start + k]. Keyed "li-bi-si".
const slotStarts = computed(() => {
  const map = {}
  const s = stanzas.value[activeStanza.value]
  if (!s) return map
  let idx = 0
  s.lines.forEach((line, li) =>
    line.bars.forEach((bar, bi) =>
      bar.segments.forEach((seg, si) => {
        map[`${li}-${bi}-${si}`] = idx
        idx += syllableSlots(seg.note || '')
      }),
    ),
  )
  return map
})
function segSlotCount(note) {
  return syllableSlots(note || '')
}
// One lyric cell per note box of a segment. EVERY note gets its own box: an attack
// note bears a word (red when empty = missing word); a held '-' / rest box gets an
// optional box too (blank is fine — it just holds the sustain). Only ( ) { } brackets
// are spacers (slot: null), so each word still lines up under its note.
function sylCells(li, bi, si, note) {
  let slot = slotStarts.value[`${li}-${bi}-${si}`] ?? 0
  return noteBoxKinds(note).map((kind) =>
    kind === 'struct' ? { slot: null } : { slot: slot++, held: kind === 'held' },
  )
}
// total notes the active stanza bears, and any syllables typed BEYOND that — shown as
// note-less boxes so an overflow (more words than notes) is visible, never dropped.
const activeSlotTotal = computed(() => stanzaSlots(activeStanzaId.value))
const overflowSlots = computed(() => {
  if (!lensActive.value) return []
  const out = []
  for (let i = activeSlotTotal.value; i < lensRow.value.syllables.length; i++) out.push(i)
  return out
})
function sylAt(row, i) {
  return row?.syllables[i] || ''
}
// write one syllable slot; pad gaps with '' and trim trailing blanks to stay tidy
function setSyl(row, i, val) {
  const arr = row.syllables
  while (arr.length <= i) arr.push('')
  arr[i] = val.trim()
  while (arr.length && arr[arr.length - 1] === '') arr.pop()
}

// ---------- align helpers (shift the whole verse to re-align with the notes) ----------
// A missing/extra syllable in the middle shifts every later word off its note. These
// insert/remove one slot and RIPPLE the rest across the whole ข้อ (past bars & lines).
const focusedSlot = ref(-1) // global slot index whose ◀ ▶ tools are shown
// dock-space joint-pass: the NOTE ("li-bi-si") whose contextual toolbox is open. Set on any
// focus inside its .seg-col (note box OR syllable box — focusin bubbles), so the ONE merged
// toolbox shows in every mode. SA §7 continuity: this is STICKY — it is NOT cleared on blur, so
// folding/rotating/closing the keyboard (which blurs the input) keeps the toolbox + selection.
// It is replaced when another note is focused, and cleared by an explicit pointer-down outside.
const focusedSeg = ref('')
// The STICKY syllable selection for the toolbox's ◀▶ (SA §7 continuity). Unlike `focusedSlot`
// (live · blur-cleared · still drives the overflow strip), `selSlot` is NOT cleared on blur, so
// folding/rotating/closing the keyboard keeps the ◀▶ on the selected syllable. -1 = a note box
// (not a syllable) is the selection → the toolbox shows octave ▼▲ instead of ◀▶. No refocus is
// ever forced, so this can't loop with the keyboard-aware hide (the loop PM flagged).
const selSlot = ref(-1)
// dock-space anchoring (tester GATE2 concern A): center the toolbox on the FOCUSED note/syllable's
// x, not the whole segment (a wide melody segment put it up to 335px off). `tbxLeft` = the focused
// element's centre x relative to its .seg-col (the toolbox's offset parent); `tbxShift` nudges it
// back on-screen so it never runs off the edge. UX owns the vertical anchor + button CSS; this is
// only the horizontal x + clamp (inline style overrides just left/transform, not `bottom`).
const tbxLeft = ref(null)
const tbxShift = ref(0)
const tbxStyle = computed(() =>
  tbxLeft.value == null ? null : { left: `${tbxLeft.value}px`, transform: `translateX(calc(-50% + ${tbxShift.value}px))` },
)
function anchorToolbox(el) {
  const seg = el?.closest?.('.seg-col')
  if (!el || !seg) return
  const er = el.getBoundingClientRect(), sr = seg.getBoundingClientRect()
  tbxLeft.value = er.left + er.width / 2 - sr.left // centre x within the seg-col
  tbxShift.value = 0
  nextTick(clampTbx)
}
function clampTbx() {
  const tb = document.querySelector('.slot-tools')
  if (!tb || tbxLeft.value == null) return
  const r = tb.getBoundingClientRect(), m = 8
  let dx = 0
  if (r.left < m) dx = m - r.left
  else if (r.right > window.innerWidth - m) dx = window.innerWidth - m - r.right
  tbxShift.value = Math.round(dx)
}
function onSegFocus(e, li, bi, si) {
  focusedSeg.value = `${li}-${bi}-${si}`
  // focus landed on a note box (not a syllable) → note-entry selection, no ◀▶
  if (e.target.classList?.contains('note-box')) selSlot.value = -1
  anchorToolbox(e.target) // centre the toolbox on the actually-focused element
}
function onSegOutside(e) {
  // keep the toolbar open while interacting with it (or the note/syllable it edits)
  if (!e.target.closest?.('.seg-col') && !e.target.closest?.('.slot-tools') && !e.target.closest?.('.ed-toolbar')) {
    focusedSeg.value = ''
    selSlot.value = -1
  }
}

// ===== unified contextual toolbar — step 1 (P'Aim 21 ก.ค.) =====
// The per-bar action buttons used to repeat under EVERY ห้อง (เปลืองที่). Show them only on the
// ห้อง the user clicked into — i.e. the bar that holds the focused note. barToolsOn(li,bi) is the
// gate; every other bar keeps only its ✓/❌ beat status. (Next steps fold note/บรรทัด/ข้อ tools
// into this same one-place toolbar.)
const toolCtx = computed(() => {
  if (!focusedSeg.value) return null
  const [li, bi, si] = focusedSeg.value.split('-').map(Number)
  return { li, bi, si }
})
function barToolsOn(li, bi) {
  const c = toolCtx.value
  return !!c && c.li === li && c.bi === bi
}
watch(focusedSeg, (v) => {
  if (v) setTimeout(() => document.addEventListener('mousedown', onSegOutside), 0)
  else document.removeEventListener('mousedown', onSegOutside)
})
// keep the open toolbox on-screen across rotate/resize (relative x is stable; re-clamp to viewport)
onMounted(() => window.addEventListener('resize', clampTbx))
onUnmounted(() => {
  document.removeEventListener('mousedown', onSegOutside)
  window.removeEventListener('resize', clampTbx)
})
function slotIdx(li, bi, si, k) {
  return (slotStarts.value[`${li}-${bi}-${si}`] ?? 0) + k - 1
}
// ▶ push: open a blank at slot i, everything from i shifts right
function pushSlot(i) {
  if (!lensRow.value) return
  const arr = lensRow.value.syllables
  while (arr.length < i) arr.push('')
  arr.splice(i, 0, '')
}
// ◀ pull: drop slot i, everything after it shifts left
function pullSlot(i) {
  if (!lensRow.value) return
  const arr = lensRow.value.syllables
  if (i < arr.length) arr.splice(i, 1)
}
// Space/Enter inside a syllable box: split a multi-syllable box (e.g. "พระเจ้า" typed
// as one) into one syllable per box — the first stays here, the rest ripple into the
// following notes — then move focus on. Space splits at the caret; Enter splits on any
// space already in the box, else just advances. Feels like the note-box entry.
async function focusSlot(target, caret) {
  focusedSlot.value = target
  await nextTick()
  const el = document.querySelector(`[data-slot="${target}"]`)
  if (el) {
    el.focus()
    const n = caret == null ? el.value.length : Math.min(caret, el.value.length)
    el.setSelectionRange?.(n, n)
  }
}
function distribute(i, val) {
  if (!lensRow.value) return
  const arr = lensRow.value.syllables
  const tokens = val.split(/\s+/).filter(Boolean)
  while (arr.length <= i) arr.push('')
  if (tokens.length <= 1) {
    arr[i] = tokens[0] ?? ''
    return focusSlot(i + 1) // nothing to split — just advance
  }
  arr[i] = tokens[0]
  for (let j = tokens.length - 1; j >= 1; j--) arr.splice(i + 1, 0, tokens[j])
  return focusSlot(i + tokens.length) // continue past the words we just placed
}
// Make a syllable box feel like a text field: Space (or Enter) splits at the caret,
// Backspace at the very start merges into the previous box, Delete at the very end
// pulls the next box in — all rippling the whole verse, nothing dropped.
function onSylKey(e, i) {
  const el = e.target
  const arr = lensRow.value?.syllables
  if (!arr) return
  if (e.key === 'Enter') {
    e.preventDefault()
    distribute(i, el.value)
  } else if (e.key === ' ') {
    // Space inserts a syllable break at the caret: text before stays here, text after
    // (even empty) moves to a new box and everything ripples right — so a space at the
    // very start pushes the whole syllable right (bug: it used to do nothing).
    e.preventDefault()
    const c = el.selectionStart ?? el.value.length
    arr[i] = el.value.slice(0, c)
    arr.splice(i + 1, 0, el.value.slice(c))
    focusSlot(i + 1, 0)
  } else if (e.key === 'Backspace') {
    if (i > 0 && (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0) {
      e.preventDefault()
      const prevLen = (arr[i - 1] ?? '').length
      arr[i - 1] = (arr[i - 1] ?? '') + (arr[i] ?? '')
      arr.splice(i, 1)
      focusSlot(i - 1, prevLen)
    }
  } else if (e.key === 'Delete') {
    if (i + 1 < arr.length && (el.selectionStart ?? 0) === el.value.length && (el.selectionEnd ?? 0) === el.value.length) {
      e.preventDefault()
      const curLen = el.value.length
      arr[i] = (arr[i] ?? '') + (arr[i + 1] ?? '')
      arr.splice(i + 1, 1)
      focusSlot(i, curLen)
    }
  }
}
// point the lens at the first row that uses the active stanza (or hide it)
function resetLens() {
  lensChoice.value = arrangement.value.findIndex((r) => r.stanza === activeStanzaId.value)
}
// B097: while undo/redo is restoring a step, applyState() sets activeStanza AND the saved
// lensChoice itself — this switch-driven reset must not fire, or it snaps the lens back to
// the first เที่ยว and the restored lyric view is lost. (applyingHistory declared below with
// the history state; the watcher only ever runs post-setup, so the reference is resolved.)
watch(activeStanzaId, () => {
  if (!applyingHistory) resetLens()
})

// ---------- chord at a note box ----------
// A chord lives on a segment (it covers all that segment's notes). To let the author
// set/insert a chord right above ANY note, note box p of a segment gets a chord cell:
// p===0 shows/edits the segment's own chord; p>0 splits the segment there into a new
// segment that starts with the picked chord. Clearing the chord on a later segment's
// first note merges it back (removes the chord change).
const editingChord = ref(null) // { li, bi, si, p }
function noteBoxCount(note) {
  const t = (note || '').trim()
  return t ? t.split(/\s+/).length : 1
}
function chordEditing(li, bi, si, p) {
  const e = editingChord.value
  return e && e.li === li && e.bi === bi && e.si === si && e.p === p
}
function openChord(li, bi, si, p) {
  editingChord.value = chordEditing(li, bi, si, p) ? null : { li, bi, si, p }
}
function applyChordAt(bar, si, p, chord) {
  const seg = bar.segments[si]
  if (p === 0) {
    if (!chord && si > 0) {
      // clearing a later segment's chord merges its notes back into the previous one
      const prev = bar.segments[si - 1]
      prev.note = [prev.note, seg.note].filter((x) => x && x.trim()).join(' ')
      bar.segments.splice(si, 1)
    } else {
      seg.chord = chord
    }
  } else if (chord) {
    // split the segment at note p; the tail becomes a new segment with this chord
    const toks = (seg.note || '').split(/\s+/).filter(Boolean)
    seg.note = toks.slice(0, p).join(' ')
    bar.segments.splice(si + 1, 0, { chord, note: toks.slice(p).join(' '), lyric: '' })
  }
  editingChord.value = null
}
function onChordOutside(e) {
  if (!e.target.closest?.('.chord-cell')) editingChord.value = null
}
watch(editingChord, (v) => {
  if (v) setTimeout(() => document.addEventListener('mousedown', onChordOutside), 0)
  else document.removeEventListener('mousedown', onChordOutside)
})
onUnmounted(() => document.removeEventListener('mousedown', onChordOutside))

// ---------- stanza (melody) operations ----------
function nextStanzaId() {
  const used = new Set(stanzas.value.map((s) => s.id))
  for (let c = 65; c <= 90; c++) {
    const l = String.fromCharCode(c)
    if (!used.has(l)) return l
  }
  return 'A' + stanzas.value.length
}
function addStanza() {
  stanzas.value.push({ id: nextStanzaId(), lines: [newLine()] })
  activeStanza.value = stanzas.value.length - 1
  activeLine.value = 0
}
function selectStanza(idx) {
  activeStanza.value = idx
  activeLine.value = 0
}
function removeStanza(idx) {
  if (stanzas.value.length <= 1) return
  const id = stanzas.value[idx].id
  if (arrangement.value.some((r) => r.stanza === id)) {
    if (!window.confirm(`ท่อนทำนอง ${id} ถูกใช้ในลำดับเพลงอยู่ — ลบทำนองและแถวที่ใช้มันด้วย?`)) return
  }
  stanzas.value.splice(idx, 1)
  arrangement.value = arrangement.value.filter((r) => r.stanza !== id)
  if (!arrangement.value.length) {
    arrangement.value = [{ stanza: stanzas.value[0].id, label: '', syllables: [], key: '' }]
  }
  activeStanza.value = Math.min(activeStanza.value, stanzas.value.length - 1)
  activeLine.value = 0
  resetLens()
}

// ---------- arrangement (verses/refrains) operations ----------
// syllable slots a stanza's melody bears = sum of syllable-bearing notes across it.
function stanzaSlots(id) {
  const s = stanzas.value.find((x) => x.id === id)
  if (!s) return 0
  let n = 0
  for (const line of s.lines) {
    for (const bar of line.bars) {
      for (const seg of bar.segments) n += syllableSlots(seg.note || '')
    }
  }
  return n
}
// MP2 (B083): a derived preview of a melody so ท่อน that share/pick a melody are told
// apart WITHOUT a name (Q1: no model field, no name input). First few notes = the melody's
// "face"; line + syllable capacity give its shape. All computed from the existing model.
function stanzaFirstNotes(id, n = 6) {
  const s = stanzas.value.find((x) => x.id === id)
  if (!s) return ''
  const toks = []
  for (const line of s.lines)
    for (const bar of line.bars)
      for (const seg of bar.segments)
        for (const t of (seg.note || '').split(/\s+/).filter(Boolean)) {
          toks.push(t)
          if (toks.length >= n) return toks.join(' ') + ' …'
        }
  return toks.join(' ')
}
function stanzaPreview(id) {
  const notes = stanzaFirstNotes(id)
  const s = stanzas.value.find((x) => x.id === id)
  const lines = s ? s.lines.length : 0
  return `${notes ? notes + ' · ' : ''}${lines} บรรทัด · ${stanzaSlots(id)} พยางค์`
}
// live word-count check per arrangement row (like barStatus). Every note box has a
// lyric slot, but only ATTACK notes require a word — held/rest boxes may stay blank.
// So we count words present on attack slots against the number of attack notes.
function rowStatus(row) {
  const s = stanzas.value.find((x) => x.id === row.stanza)
  if (!s) return { need: 0, got: 0, ok: true }
  let idx = 0
  let need = 0
  let got = 0
  for (const line of s.lines)
    for (const bar of line.bars)
      for (const seg of bar.segments)
        for (const kind of noteBoxKinds(seg.note || '')) {
          if (kind === 'struct') continue
          if (kind === 'attack') {
            need++
            if ((row.syllables[idx] || '').trim()) got++
          }
          idx++
        }
  return { need, got, ok: got === need }
}
// ---------- bulk lyric textarea <-> per-note slots (melody-aware) ----------
// The textarea is the "type the words" view: one word per ATTACK note. The per-note
// boxes above expose every slot (incl. held). These map between the two: words land on
// attack slots, held slots stay blank; reading back shows only the attack words. Keeps
// the paste-a-verse workflow 1:1 with the sung syllables even though held notes now
// have their own boxes.
function stanzaKindList(stanzaId) {
  const s = stanzas.value.find((x) => x.id === stanzaId)
  const out = []
  if (!s) return out
  for (const line of s.lines)
    for (const bar of line.bars)
      for (const seg of bar.segments)
        for (const kind of noteBoxKinds(seg.note || '')) {
          if (kind !== 'struct') out.push(kind)
        }
  return out
}
function wordsToSyllables(words, stanzaId) {
  const kinds = stanzaKindList(stanzaId)
  const out = []
  let w = 0
  for (const k of kinds) out.push(k === 'attack' ? (words[w++] ?? '') : '')
  while (w < words.length) out.push(words[w++]) // extra words → overflow slots
  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}
function syllablesToWords(syllables, stanzaId) {
  const kinds = stanzaKindList(stanzaId)
  const out = []
  syllables.forEach((t, i) => {
    if (kinds[i] === undefined || kinds[i] === 'attack') out.push(t)
  })
  return out
}
function rowLyricText(row) {
  return joinSyllables(syllablesToWords(row.syllables, row.stanza))
}
function setRowLyricText(row, text) {
  row.syllables = wordsToSyllables(splitSyllables(text), row.stanza)
}
// MP3 (B083): imported lyrics often arrive as one blob per verse (comma between วรรค). Split
// it into Thai word tokens with Intl.Segmenter (ships with the browser · ICU dict · no lib —
// Q2). Then feed the space-joined tokens back through setRowLyricText so they map onto the
// melody's attack slots, ready to fine-tune with ◀▶. Word-level ≈ syllable, not exact.
const syllableMsg = ref('') // aria-live result of the last ✂ split
function segmentThai(text) {
  const phrases = String(text || '')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const out = []
  const canSeg = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  const seg = canSeg ? new Intl.Segmenter('th', { granularity: 'word' }) : null
  for (const ph of phrases) {
    if (seg) {
      for (const part of seg.segment(ph)) {
        const t = (part.segment || '').trim()
        if (t) out.push(t)
      }
    } else {
      // fallback (no Intl.Segmenter): keep phrases whole, author splits with space/◀▶
      out.push(...ph.split(/\s+/).filter(Boolean))
    }
  }
  return out
}
function autoSyllable() {
  if (!lensRow.value) return
  const tokens = segmentThai(rowLyricText(lensRow.value))
  setRowLyricText(lensRow.value, tokens.join(' '))
  syllableMsg.value = `แยกได้ ${tokens.length} พยางค์ — ปรับต่อด้วย ◀▶ ได้`
}

function addRow() {
  // a new ท่อน inherits the previous row's melody (ท่อน 2 มักทำนองเดียวกับท่อน 1 — SX5),
  // falling back to the active/first stanza, then jumps selection to it so the author can
  // type words immediately (SX5/P8: no "เลือกทำนอง" step to understand first).
  const prev = arrangement.value[arrangement.value.length - 1]
  const stanza = prev?.stanza || activeStanzaId.value || stanzas.value[0].id
  arrangement.value.push({ stanza, label: '', syllables: [], key: '' })
  focusRow(arrangement.value.length - 1)
}
function removeRow(i) {
  arrangement.value.splice(i, 1)
  if (!arrangement.value.length) addRow()
  resetLens()
}
// point active stanza + lens at row i (master-detail: selecting a ท่อน shows its melody +
// its words under the notes). The activeStanzaId watcher resets the lens on a stanza
// switch, so re-assert lensChoice after that flush (same ordering railSelectRow relies on).
function focusRow(i) {
  const row = arrangement.value[i]
  if (!row) return
  const s = stanzas.value.findIndex((x) => x.id === row.stanza)
  if (s >= 0 && s !== activeStanza.value) {
    selectStanza(s)
    nextTick(() => { lensChoice.value = i })
  } else {
    lensChoice.value = i
  }
}

// click-to-edit (issue6/7): click a bar on the whole-song preview → jump the cursor to that
// exact bar in the EXISTING editor. Uses the provenance resolveContent already stamps
// (_stanza / _stanzaLine / _entryIndex) — no new surface, no schema change. `si` is the
// segment index within the resolved line (SongSheet's seg.si), mapped back to the source bar.
function jumpToSource({ li, si }) {
  const rLine = resolvedPreview.value.lines?.[li]
  if (!rLine) return
  const st = stanzas.value.find((s) => s.id === rLine._stanza)
  const srcLine = st?.lines?.[rLine._stanzaLine]
  if (!srcLine) return
  // find which bar the si-th segment sits in
  let count = -1
  let targetBar = 0
  for (let b = 0; b < srcLine.bars.length; b++) {
    let hit = false
    for (let s = 0; s < srcLine.bars[b].segments.length; s++) {
      if (++count === si) { targetBar = b; hit = true; break }
    }
    if (hit) break
  }
  // focusRow points activeStanza + lens at the clicked verse; then focus the bar once its
  // note boxes have re-rendered for the (possibly newly) active stanza.
  if (rLine._entryIndex != null && rLine._entryIndex >= 0) focusRow(rLine._entryIndex)
  nextTick(() => nextTick(() => focusBar(rLine._stanzaLine, targetBar, false)))
}
// reorder a ท่อน from → to (shared by ▲▼ and drag) — the moved row stays selected.
function moveRowTo(from, to) {
  if (from < 0 || to < 0 || from === to) return
  if (from >= arrangement.value.length || to >= arrangement.value.length) return
  const [r] = arrangement.value.splice(from, 1)
  arrangement.value.splice(to, 0, r)
  focusRow(to)
  reorderMsg.value = `ย้าย “${rowLabel(r, to)}” เป็นลำดับที่ ${to + 1} จาก ${arrangement.value.length}`
}
function moveRow(i, dir) {
  moveRowTo(i, i + dir)
}
// MP1 (B083): change the selected ท่อน's melody from the canvas header. Point activeStanza
// at the new melody too (via focusRow) so lensActive stays true — otherwise cshead + the
// word boxes vanish because they're gated on `lensRow.stanza === activeStanzaId`. Q3: a
// mismatch after switching is a warning (rowStatus badge), never a block.
function setRowStanza(id) {
  if (!lensRow.value) return
  lensRow.value.stanza = id
  focusRow(lensChoice.value)
}
// B102 — "ร้องรับทุกข้อ" checkbox: a plain-language helper that writes/removes the strophic
// `afterEachVerse` directive on this ท่อน (the refrain), so the author never needs the music
// term. One refrain per song, so ticking one row clears it on the others. The change lands in
// the arrangement (docState) → captured by undo/redo and by save, like any edit.
function toggleAfterEachVerse(i, on) {
  const row = arrangement.value[i]
  if (!row) return
  if (on) arrangement.value.forEach((r, k) => { r.afterEachVerse = k === i })
  else row.afterEachVerse = false
}
// ---- inline rename (rail row + canvas header edit the same row.label — P1/P5) ----
function startRename(i, where) {
  labelSnapshot.value = arrangement.value[i]?.label ?? ''
  editingLabelWhere.value = where
  editingLabelId.value = i
}
function commitRename() {
  const i = editingLabelId.value
  if (i >= 0 && arrangement.value[i]) arrangement.value[i].label = (arrangement.value[i].label || '').trim()
  editingLabelId.value = -1
  editingLabelWhere.value = ''
}
function cancelRename() {
  const i = editingLabelId.value
  if (i >= 0 && arrangement.value[i]) arrangement.value[i].label = labelSnapshot.value
  editingLabelId.value = -1
  editingLabelWhere.value = ''
}
// ---- drag-to-reorder (mouse = native HTML5 DnD · touch = pointer events on the grip) ----
function rowIndexAtY(y) {
  const rows = document.querySelectorAll('#studioRail .srow')
  let idx = -1
  rows.forEach((r, k) => {
    const b = r.getBoundingClientRect()
    if (y >= b.top && y <= b.bottom) idx = k
  })
  return idx
}
function onRowDragStart(i, e) {
  dragFromRow.value = i
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i)) // Firefox won't start a drag without data
  }
}
function onRowDragOver(i) {
  if (dragFromRow.value < 0) return
  dragOverRow.value = i
}
function onRowDrop(i) {
  if (dragFromRow.value >= 0) moveRowTo(dragFromRow.value, i)
  dragFromRow.value = -1
  dragOverRow.value = -1
}
function onRowDragEnd() {
  dragFromRow.value = -1
  dragOverRow.value = -1
}
function onGripPointerDown(i, e) {
  if (e.pointerType === 'mouse') return // mouse uses native HTML5 drag
  e.preventDefault()
  dragFromRow.value = i
  const move = (ev) => {
    const t = rowIndexAtY(ev.clientY)
    if (t >= 0) dragOverRow.value = t
  }
  const up = (ev) => {
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', up)
    const to = rowIndexAtY(ev.clientY)
    if (to >= 0 && dragFromRow.value >= 0) moveRowTo(dragFromRow.value, to)
    dragFromRow.value = -1
    dragOverRow.value = -1
  }
  document.addEventListener('pointermove', move)
  document.addEventListener('pointerup', up)
}
// MP2: the melody picker's options carry a note preview so A vs B read apart at a glance
// (search stays "ทำนอง X" so typing the letter still filters).
const stanzaIdOptions = computed(() =>
  stanzas.value.map((s) => {
    const notes = stanzaFirstNotes(s.id)
    return { value: s.id, label: notes ? `ทำนอง ${s.id} · ${notes}` : `ทำนอง ${s.id}`, search: 'ทำนอง ' + s.id }
  }),
)
// MP4 (B083): per-ท่อน pairing status for the rail badge — reuses rowStatus (got/need). A
// mismatch (import swapped melody↔lyric, or too many/few words) shows a red count; a fit
// shows ✓. Symbols + numbers, not colour alone (ui-standards). Computed once per row.
function pairInfo(row) {
  const s = rowStatus(row)
  return {
    ok: s.ok,
    text: s.ok ? '✓' : `${s.got}/${s.need} ✗`,
    label: s.ok ? 'จับคู่ทำนอง↔เนื้อพอดี' : `จับคู่ยังไม่พอดี — ใส่คำ ${s.got} จาก ${s.need} พยางค์ของทำนอง`,
  }
}
const pairInfos = computed(() => arrangement.value.map((row) => pairInfo(row)))
const rowKeyOptions = computed(() => [{ value: '', label: 'คีย์เดิม' }, ...KEYS.map((k) => ({ value: k, label: k }))])

// beats per bar vs. time signature — honest: unreadable input is an error, never a pass.
// A line marked "cont" continues the previous line's last bar: those two bars are
// counted as ONE bar (the sheet just broke it at the line end).
const expBeats = computed(() => expectedBeats(opts.timeSignature))
function barTokensAt(li, bi) {
  return lines.value[li]?.bars[bi]?.segments.flatMap((s) => parseNotes(s.note)) ?? []
}
// Validate the ห้องต่อกัน (pickup) bars of the ACTIVE stanza — each in its OWN group, so
// two unrelated partial-bar pairs never contaminate each other. Two group shapes coexist:
//   • a RUN of pickup bars that are adjacent in reading order (consecutive bars, or a bar
//     split at a line end joined to the first bar of the next line): their beats must sum
//     to a whole number of bars. This is the cross-line "ห้องต่อกัน" case (B073).
//   • ISOLATED pickups — a stanza-opening anacrusis and its complementary short final bar
//     are NOT adjacent (full bars between), so they can't form a run; they are grouped
//     together (their total must be whole bars) as the classic first↔last pair (B055).
// Returns per-bar { ok, sum } keyed by bar identity. Grouping locally (not one stanza-wide
// sum) fixes the 11/4 bug where an unrelated pickup dragged a complete pair red.
const pickupCheck = computed(() => {
  const exp = expBeats.value
  const map = new Map() // bar object -> { ok, sum }
  if (exp == null) return map
  const beatsOf = (b) => beatCount(b.segments.flatMap((s) => parseNotes(s.note)))
  const whole = (sum) => sum > 0.01 && Math.abs(sum / exp - Math.round(sum / exp)) < 0.01
  const flat = []
  for (const ln of lines.value) for (const b of ln.bars) flat.push(b)
  const isolated = []
  let i = 0
  while (i < flat.length) {
    if (!flat[i].pickup) { i++; continue }
    let j = i
    while (j < flat.length && flat[j].pickup) j++
    const run = flat.slice(i, j)
    if (run.length >= 2) {
      const sum = run.reduce((a, b) => a + beatsOf(b), 0)
      const ok = whole(sum)
      for (const b of run) map.set(b, { ok, sum })
    } else {
      isolated.push(run[0])
    }
    i = j
  }
  if (isolated.length) {
    const sum = isolated.reduce((a, b) => a + beatsOf(b), 0)
    const ok = whole(sum)
    for (const b of isolated) map.set(b, { ok, sum })
  }
  return map
})
function barStatus(li, bi) {
  const line = lines.value[li]
  const bar = line.bars[bi]
  let tokens = bar.segments.flatMap((s) => parseNotes(s.note))
  let hasText = bar.segments.some((s) => s.note.trim())
  let joined = false
  // an explicit pickup bar is counted with its group, not joined to a neighbour
  if (!bar.pickup) {
    if (bi === 0 && line.cont && li > 0) {
      const prev = lines.value[li - 1]
      tokens = [...barTokensAt(li - 1, prev.bars.length - 1), ...tokens]
      joined = true
    } else if (bi === line.bars.length - 1 && lines.value[li + 1]?.cont && !lines.value[li + 1].bars[0]?.pickup) {
      tokens = [...tokens, ...barTokensAt(li + 1, 0)]
      joined = true
    }
  }
  if (joined) hasText = tokens.length > 0
  const pre = joined ? '⤷ ' : ''
  if (!hasText) return { text: 'ว่าง', ok: true }
  const rawTokens = tokens.filter((t) => t.type === 'raw')
  if (rawTokens.length) {
    return { text: `${pre}อ่านไม่ได้: ${rawTokens.map((t) => t.text).join(' ')}`, ok: false }
  }
  const got = beatCount(tokens)
  if (expBeats.value == null) return { text: pre + fmt(got), ok: true }
  // ห้องต่อกัน: valid when THIS bar's group (its adjacent run, or the isolated anacrusis
  // pair) fills a whole number of bars — grouped locally so unrelated pickups can't skew it.
  if (bar.pickup) {
    const grp = pickupCheck.value.get(bar) ?? { ok: false, sum: got }
    const text = grp.ok
      ? `⤷ ห้องต่อกัน ${fmt(got)} จังหวะ`
      : `⤷ ห้องต่อกัน ${fmt(got)} — รวมห้องต่อกัน ${fmt(grp.sum)}/${fmt(expBeats.value)}`
    return { text, ok: grp.ok, pickup: true }
  }
  const ok = Math.abs(got - expBeats.value) < 0.01
  // a bar that is merely short (not empty, not full) can be a pickup/continuation —
  // surface the quick ห้องยก toggle right here so the fix is discoverable (B055).
  const short = !joined && got > 0.01 && got < expBeats.value - 0.01
  return { text: `${pre}${fmt(got)}/${fmt(expBeats.value)} จังหวะ`, ok, short }
}
function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// ---------- symbol palette ----------
// B033: two rows so the 21 jianpu keys are big enough to tap on mobile — row 1 = numbers
// / rest / dash / tie, row 2 = dots / octave / brackets / accidentals (P'Aim-approved).
const PALETTE = [
  ['1', '2', '3', '4', '5', '6', '7', '0', '-', '~'],
  ['.', "'", '_', '^', '(', ')', '{', '}', '#', 'b', 'n'],
]
let activeInput = null
const activeLine = ref(0) // line the user last touched — target of the floating ▶
function editorFocusIn(e, li) {
  if (li != null) activeLine.value = li
  if (e.target.classList?.contains('note-box') && e.target.tagName === 'INPUT') {
    activeInput = e.target
  }
}
function insertSym(sym) {
  if (!activeInput || !activeInput.isConnected) return
  const start = activeInput.selectionStart ?? activeInput.value.length
  const end = activeInput.selectionEnd ?? start
  activeInput.setRangeText(sym, start, end, 'end')
  activeInput.dispatchEvent(new Event('input', { bubbles: true }))
  activeInput.focus()
}
// dock-space note toolbox: shift the focused NOTE box one octave. jianpu (notation.js): a leading
// '.' per octave below (".5"), a trailing "'" per octave above ("5'"). dir +1 up / -1 down, one
// step on the focused note box (activeInput) — same activeInput pattern as insertSym (PM: keep it,
// do NOT move to NoteBoxes). @mousedown.prevent on the buttons keeps that note box focused.
function octaveShift(dir) {
  if (!activeInput || !activeInput.isConnected) return
  let v = activeInput.value
  if (dir > 0) v = v.startsWith('.') ? v.slice(1) : v + "'"
  else v = v.endsWith("'") ? v.slice(0, -1) : '.' + v
  activeInput.value = v
  activeInput.dispatchEvent(new Event('input', { bubbles: true }))
  activeInput.focus()
}

// ---------- line/bar/segment operations (act on the active stanza) ----------
// B098: add a ห้อง and drop the cursor straight into its (empty) note box, so the user
// can keep typing notes without reaching for the mouse. Focus after nextTick once the new
// bar's seg-strip has rendered — same [data-...] + querySelector idiom as focusSlot.
async function addBar(line, li) {
  line.bars.push(newBar())
  if (li == null) return
  const bi = line.bars.length - 1
  await nextTick()
  document.querySelector(`[data-bar="${li}-${bi}"] .note-box:not(.add)`)?.focus()
}
function removeBar(line, bi) {
  line.bars.splice(bi, 1)
  if (!line.bars.length) line.bars.push(newBar())
}
// Reorder bars (dir -1 = left, +1 = right). Within a line it swaps neighbours; at a line
// edge it HOPS to the adjacent line (B063): the last bar moving right lands at the start
// of the next line, the first bar moving left lands at the end of the previous line — so a
// bar keyed in the wrong line can be walked over without cut/paste. Undo is handled by the
// debounced snapshot watcher, so no explicit history call is needed.
function moveBar(li, bi, dir) {
  const line = lines.value[li]
  if (!line) return
  const to = bi + dir
  if (to >= 0 && to < line.bars.length) {
    const [b] = line.bars.splice(bi, 1)
    line.bars.splice(to, 0, b)
    return
  }
  // past the edge → hop to the neighbouring line. Leaving a line empty would break the
  // "every line has ≥1 bar" invariant, so drop a fresh empty bar in its place (like
  // removeBar). The ⋯ popover is keyed by "li-bi", now stale, so close it.
  if (dir > 0 && bi === line.bars.length - 1) {
    const next = lines.value[li + 1]
    if (!next) return
    const [b] = line.bars.splice(bi, 1)
    next.bars.unshift(b)
    if (!line.bars.length) line.bars.push(newBar())
    barMenuOpen.value = ''
  } else if (dir < 0 && bi === 0) {
    const prev = lines.value[li - 1]
    if (!prev) return
    const [b] = line.bars.splice(bi, 1)
    prev.bars.push(b)
    if (!line.bars.length) line.bars.push(newBar())
    barMenuOpen.value = ''
  }
}
// Duplicate bar bi: drop an exact copy (chords + notes) right after it. Faster than
// re-keying a repeated bar; tweak the copy afterwards.
function duplicateBar(line, bi) {
  const copy = JSON.parse(JSON.stringify(line.bars[bi]))
  line.bars.splice(bi + 1, 0, copy)
}
function removeSegment(bar, si) {
  bar.segments.splice(si, 1)
  if (!bar.segments.length) bar.segments.push(newSegment())
}
// B098 — NOTE-level copy: duplicate ONE segment (chord + note + lyric) right after it,
// leaving the rest of the ห้อง untouched. The bar-level twin is duplicateBar (whole ห้อง).
// Mirrors duplicateBar's deep-copy so tweaks to the copy don't mutate the original.
function duplicateSegment(bar, si) {
  const copy = JSON.parse(JSON.stringify(bar.segments[si]))
  bar.segments.splice(si + 1, 0, copy)
}
function addLine() {
  lines.value.push(newLine())
}
// B088: copy/delete a line must keep each verse's words aligned to the melody, the same way
// B086 (move) does — words are a flat per-row syllables[] indexed by cumulative slot. Copy
// duplicates the line's word slice; delete drops it; both across EVERY verse on the stanza.
function copyLine(li) {
  const s = stanzas.value[activeStanza.value]
  const ls = s ? s.lines : lines.value
  const start = lineSlotStart(ls, li)
  const len = lineSlotLen(ls[li])
  const copy = JSON.parse(JSON.stringify(ls[li]))
  ls.splice(li + 1, 0, copy)
  if (s && len > 0)
    resliceRows(s.id, (p) => {
      while (p.length < start + len) p.push('')
      p.splice(start + len, 0, ...p.slice(start, start + len)) // duplicate this line's words
    })
}
function removeLine(li) {
  const s = stanzas.value[activeStanza.value]
  const ls = s ? s.lines : lines.value
  const start = lineSlotStart(ls, li)
  const len = lineSlotLen(ls[li])
  ls.splice(li, 1)
  if (!ls.length) ls.push(newLine())
  if (s && len > 0) resliceRows(s.id, (p) => p.splice(start, len)) // drop this line's words
}
// B086: slot span (flat syllable indices) a line occupies — advances by syllableSlots per
// segment, matching slotStarts. Needed to carry each verse's words when a line moves.
function lineSlotLen(line) {
  let n = 0
  for (const bar of line.bars) for (const seg of bar.segments) n += syllableSlots(seg.note || '')
  return n
}
// B086/B088: flat-slot index where line `li` starts, and a helper to mutate every verse's
// syllables[] on a stanza then trim trailing empties (parity with setRowLyricText/moveLine).
function lineSlotStart(ls, li) {
  let start = 0
  for (let k = 0; k < li && k < ls.length; k++) start += lineSlotLen(ls[k])
  return start
}
function resliceRows(stanzaId, mutate) {
  for (const row of arrangement.value) {
    if (row.stanza !== stanzaId) continue
    const p = row.syllables.slice()
    mutate(p)
    while (p.length && !((p[p.length - 1] || '').trim())) p.pop()
    row.syllables = p
  }
}
// B086: move the active line up/down within the stanza AND carry every verse's words with
// it. Words are a flat syllables[] per arrangement row, indexed by cumulative slot
// (line→bar→seg). Swapping two adjacent lines' melody must swap the matching slice in EVERY
// row on this stanza, or the words drift onto the wrong notes. Pad first so empty slots are
// explicit before slicing (trailing empties are trimmed), then re-trim.
function moveLine(dir) {
  const s = stanzas.value[activeStanza.value]
  if (!s) return
  const ls = s.lines
  const li = activeLine.value
  const lj = li + dir
  if (lj < 0 || lj >= ls.length) return
  const i = Math.min(li, lj) // adjacent lines → the other is i + 1
  const start = lineSlotStart(ls, i)
  const lenI = lineSlotLen(ls[i])
  const lenJ = lineSlotLen(ls[i + 1])
  const end = start + lenI + lenJ
  ;[ls[i], ls[i + 1]] = [ls[i + 1], ls[i]] // swap the melody lines
  for (const row of arrangement.value) {
    if (row.stanza !== s.id) continue
    const p = row.syllables.slice()
    while (p.length < end) p.push('')
    const next = [
      ...p.slice(0, start),
      ...p.slice(start + lenI, end), // line j's words move up
      ...p.slice(start, start + lenI), // line i's words move down
      ...p.slice(end), // later lines untouched
    ]
    while (next.length && !((next[next.length - 1] || '').trim())) next.pop()
    row.syllables = next
  }
  activeLine.value = lj // keep the moved line active/selected
}

// ---------- B101: คัดลอก→วาง a whole บรรทัด / ห้อง anywhere (incl. a new ท่อน) ----------
// The "ย้ายไปที่อื่น" twin of B098's ทำซ้ำ-in-place (duplicateBar / copyLine). ทำซ้ำ drops a
// copy right next to the original (fast repeat, same spot); คัดลอก loads ONE in-memory slot
// and วาง places it wherever you are — after switching to another (or a brand-new) ท่อน. Paste
// is MELODY-ONLY (notes + chords + a ห้อง's repeat/volta/pickup flags, or a บรรทัด's structure):
// words live per-ข้อ and can't follow across ท่อน, so paste never carries lyrics (ทำซ้ำ stays
// the with-words path for the same ท่อน). `clip` is VIEW state (not the document) → it is NOT
// snapshotted into undo history; the paste itself mutates the doc and is undoable like any edit.
const clip = ref(null) // { kind: 'line' | 'bar', data: <deep copy>, from: string }
function copyBarToClip(li, bi) {
  const bar = lines.value[li]?.bars[bi]
  if (!bar) return
  clip.value = { kind: 'bar', data: JSON.parse(JSON.stringify(bar)), from: `ห้อง ${bi + 1} · บรรทัด ${li + 1}` }
  barMenuOpen.value = ''
}
function copyLineToClip(li) {
  const line = lines.value[li]
  if (!line) return
  clip.value = { kind: 'line', data: JSON.parse(JSON.stringify(line)), from: `บรรทัด ${li + 1}` }
  lineMoreOpen.value = false
}
function clearClip() {
  clip.value = null
}
// paste the copied ห้อง at the end of บรรทัด li (melody only). The button sits on every line,
// so "ที่นี่" = whichever ท่อน/บรรทัด you are on — switch ท่อน first to paste across melodies.
function pasteBarAt(li) {
  if (clip.value?.kind !== 'bar') return
  const line = lines.value[li]
  if (!line) return
  line.bars.push(JSON.parse(JSON.stringify(clip.value.data)))
}
// paste the copied บรรทัด at the end of the ACTIVE ท่อน (melody only)
function pasteLineHere() {
  if (clip.value?.kind !== 'line') return
  lines.value.push(JSON.parse(JSON.stringify(clip.value.data)))
  activeLine.value = lines.value.length - 1
}
// วางเป็นท่อนใหม่ — the headline: a fresh ท่อน (stanza) whose only บรรทัด is the copy, then
// jump to it. Mirrors addStanza's shape (a new melody with no ข้อ yet — words added later).
function pasteLineAsStanza() {
  if (clip.value?.kind !== 'line') return
  stanzas.value.push({ id: nextStanzaId(), lines: [JSON.parse(JSON.stringify(clip.value.data))] })
  activeStanza.value = stanzas.value.length - 1
  activeLine.value = 0
}

// ---------- song list / picker ----------
const songList = ref([])

async function loadSongList() {
  const { data } = await supabase
    .from('songs')
    .select('id, number, title_th, title_en, content, verified')
    .order('number', { ascending: true })
  songList.value = data ?? []
}

const pickerOptions = computed(() => [
  { value: '', label: '— เพลงใหม่ —', search: 'เพลงใหม่ new' },
  // GATE (reuse bookshelf.visibleSongs — same source SongList uses): anon sees only
  // verified songs, team sees all. computed on loggedIn so it re-filters on login/logout
  // without reloading the list.
  ...visibleSongs(songList.value, loggedIn.value).map((s) => ({
    value: s.id,
    label: (s.number != null ? s.number + '. ' : '') + s.title_th,
    search: songHaystack(s),
  })),
])

watch(pickerId, (id) => loadSong(id))

async function loadSong(id) {
  if (!id) return resetForm()
  const { data, error } = await supabase.from('songs').select('*').eq('id', id).single()
  if (error || !data) return
  applyRow(data)
  editingId.value = data.id
  currentDraftId.value = null
  openDraft.value = null
  saveMsg.value = ''
  nextTick(resetHistory)
}

// Load a stored song into the editor. v2 songs load directly; v1 songs are migrated
// to v2 on the way in (Claude seeds the syllable split, the author fixes) — any
// segment whose words don't line up with its notes is flagged for manual review.
function applyRow(data) {
  meta.number = data.number
  meta.title_th = data.title_th
  meta.title_en = data.title_en
  // category/theme/verified exist on published songs (not on draft rows) — default when absent
  meta.category = data.category ?? 'anuchon'
  meta.theme = data.theme ?? ''
  verified.value = data.verified ?? false
  loadedFlags.value = Array.isArray(data.review_flags) ? data.review_flags : [] // B093: keep on publish
  const { content, warnings } = migrateToV2(data.content)
  opts.key = content.key || 'C'
  opts.timeSignature = content.timeSignature || '4/4'
  opts.bpm = content.bpm ?? null
  stanzas.value = (content.stanzas || []).map((s) => ({
    id: s.id,
    lines: (s.lines || []).map(deserializeLine),
  }))
  if (!stanzas.value.length) stanzas.value = [{ id: 'A', lines: [newLine()] }]
  arrangement.value = (content.arrangement || []).map((r) => ({
    stanza: r.stanza,
    label: r.label || '',
    syllables: [...(r.syllables || [])],
    key: r.key || '',
    afterEachVerse: !!r.afterEachVerse, // B102 — strophic "ร้องรับทุกข้อ" directive (round-trips)
  }))
  if (!arrangement.value.length) {
    arrangement.value = [{ stanza: stanzas.value[0].id, label: '', syllables: [], key: '' }]
  }
  activeStanza.value = 0
  activeLine.value = 0
  migrateWarnings.value = warnings
  resetLens()
}

function resetForm() {
  editingId.value = null
  currentDraftId.value = null
  openDraft.value = null
  meta.number = null
  meta.title_th = ''
  meta.title_en = ''
  meta.category = 'anuchon'
  meta.theme = ''
  verified.value = false
  opts.key = 'C'
  opts.timeSignature = '4/4'
  opts.bpm = null
  stanzas.value = [{ id: 'A', lines: [newLine()] }]
  arrangement.value = [{ stanza: 'A', label: '', syllables: [], key: '' }]
  activeStanza.value = 0
  activeLine.value = 0
  migrateWarnings.value = []
  saveMsg.value = ''
  resetLens()
  nextTick(resetHistory)
}

// ---------- drafts ----------
const myDrafts = ref([])
const pendingDrafts = ref([])
const profilesMap = ref({})

async function loadProfilesMap() {
  if (legacy.value || !session.value) return
  const { data } = await supabase.from('profiles').select('id, display_name')
  profilesMap.value = Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name]))
}

async function loadDrafts() {
  myDrafts.value = []
  pendingDrafts.value = []
  if (legacy.value || !session.value) return
  const { data, error } = await supabase
    .from('song_drafts')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') legacy.value = true
    return
  }
  const uid = session.value.user.id
  myDrafts.value = (data ?? []).filter((d) => d.author_id === uid && d.status !== 'approved')
  pendingDrafts.value = (data ?? []).filter((d) => d.status === 'pending')
}

// ---------- identity: derived from DATA, never from which door you walked in through ----------
// (DS editor-orientation §1/D3) Before this, "am I reviewing a draft?" was a ref that only
// loadDraft() ever set — so opening the very same draft-backed song from the picker, a URL
// or a refresh produced a screen that said nothing. These computeds answer the question from
// what is loaded, so every route into the song gives the identical answer.
const uid = computed(() => session.value?.user?.id ?? null)
const draftAuthor = (d) => (d ? profilesMap.value[d.author_id] || 'ผู้เขียน' : '')

// A pending draft open in the editor, own or not. An approver publishing either goes through
// approve_and_publish (B028: publish + close the draft in ONE audited transaction), so this
// — not reviewingDraft — is what the primary action keys on.
const openPendingDraft = computed(() =>
  isApprover.value && openDraft.value?.status === 'pending' ? openDraft.value : null,
)
// "I am reviewing someone ELSE's work" — drives the banner + whose-work labels. The author
// check is what stops an approver's own pending draft from announcing "กำลังตรวจฉบับร่างของ
// [ตัวเอง]" (US §9 edge bug #5).
const reviewingDraft = computed(() =>
  openPendingDraft.value && openPendingDraft.value.author_id !== uid.value ? openPendingDraft.value : null,
)
// A draft is waiting for review on the song currently open, and it is NOT the one on screen
// → publishing from here strands it silently. This is the fact the editor already had in hand
// (pendingDrafts loads on login) but never once asked for.
const pendingForThisSong = computed(() => {
  if (!editingId.value) return null
  return pendingDrafts.value.find((d) => d.song_id === editingId.value && d.id !== openDraft.value?.id) || null
})

// The D4 banner is dismissible ("แก้ฉบับเผยแพร่ต่อ" = I know, I'm working on the live song).
// DS §2 asked it to stay put because the fact hasn't changed — but a button that visibly does
// nothing is the same lie as a row you can't press (editor-friction §2), and the fact does NOT
// get lost: it still rides the primary button's label and the confirm before the overwrite.
// Keyed by draft id, so a different/new pending draft re-announces itself.
const alertDismissedFor = ref(null)
const pendingAlert = computed(() =>
  pendingForThisSong.value && pendingForThisSong.value.id !== alertDismissedFor.value
    ? pendingForThisSong.value
    : null,
)
function dismissPendingAlert() {
  alertDismissedFor.value = pendingForThisSong.value?.id ?? null
}

function loadDraft(d) {
  applyRow(d)
  editingId.value = d.song_id
  currentDraftId.value = d.id
  openDraft.value = d
  reviewComment.value = d.review_comment || ''
  saveMsg.value = d.status === 'rejected' && d.review_comment ? '↩ ถูกส่งกลับ: ' + d.review_comment : ''
  nextTick(resetHistory)
}

const draftRow = () => ({
  song_id: editingId.value,
  number: meta.number || null,
  title_th: meta.title_th.trim(),
  title_en: meta.title_en?.trim() || null,
  content: JSON.parse(JSON.stringify(previewContent.value)),
})

async function saveDraft(status) {
  saveMsg.value = ''
  const row = draftRow()
  if (!row.title_th) {
    saveMsg.value = '⚠️ กรุณาใส่ชื่อเพลงภาษาไทย'
    return
  }
  emit('save', status === 'pending' ? 'pending' : 'draft')
  row.status = status
  // reuse an existing own draft for this song if we did not start from one
  if (!currentDraftId.value && editingId.value) {
    const { data } = await supabase
      .from('song_drafts')
      .select('id')
      .eq('author_id', session.value.user.id)
      .eq('song_id', editingId.value)
      .in('status', ['draft', 'pending', 'rejected'])
      .limit(1)
    if (data?.[0]) currentDraftId.value = data[0].id
  }
  // the store owns the Supabase write (DS-D01); the editor owns which draft it edits
  const { id, error } = await saveDraftRow(row, currentDraftId.value)
  if (id) currentDraftId.value = id
  saveMsg.value = error
    ? '❌ บันทึกไม่สำเร็จ: ' + error.message
    : status === 'pending'
      ? '📨 ส่งตรวจแล้ว — รอผู้อนุมัติ'
      : '💾 บันทึกร่างแล้ว (ยังไม่เผยแพร่)'
  if (!error) markClean() // B100: a persisted draft is no longer "unsaved"
  loadDrafts()
}

// ---------- publish (approver) ----------
// B093: lint every melody bar before publishing. notationLint tags 'unreadable' as ERROR
// and everything structural (จังหวะไม่ครบ = 'beats', R1/R4-R7) as WARNING; P'Aim's intent
// is to catch the beats/symbol problems, so a real issue = severity ERROR **or** WARNING
// (HINT = advisory, ignored). Returns the distinct rule codes + a total issue count.
function lintSong() {
  const ts = opts.timeSignature
  const codes = new Set()
  let count = 0
  for (const s of stanzas.value) {
    for (const line of s.lines) {
      for (const bar of line.bars) {
        const noteStr = bar.segments.map((seg) => seg.note || '').join(' ').trim()
        if (!noteStr) continue
        for (const f of lintBar(noteStr, { timeSignature: ts })) {
          if (f.severity === SEVERITY.HINT) continue
          count++
          codes.add(f.code)
        }
      }
    }
  }
  return { count, codes: [...codes] }
}
// review_flags to write on publish: keep the song's non-lint flags (DA repeat marks etc.),
// refresh the `lint:*` ones from this lint pass (so a fixed song loses its old lint flags).
function reviewFlagsForPublish() {
  const kept = (loadedFlags.value || []).filter((f) => !String(f).startsWith('lint'))
  const { count, codes } = lintSong()
  const lintFlags = count > 0 ? codes.map((c) => 'lint:' + c) : []
  return { flags: [...kept, ...lintFlags], count }
}

async function saveDirect() {
  saveMsg.value = ''
  const row = draftRow()
  delete row.song_id
  delete row.status
  // category/theme are columns on `songs` (not on `song_drafts`) — set them only on the
  // published write. draftRow() stays lean so saving a draft never touches these columns.
  row.category = meta.category || 'anuchon'
  row.theme = meta.theme || null
  if (!row.title_th) {
    saveMsg.value = '⚠️ กรุณาใส่ชื่อเพลงภาษาไทย'
    return false
  }
  emit('save', 'publish')
  // B093: lint the melody → tag review_flags (keep DA flags) + warn, but never block publish
  const { flags, count } = reviewFlagsForPublish()
  lastLintCount.value = count
  row.review_flags = flags
  let error
  if (editingId.value) {
    ;({ error } = await supabase.from('songs').update(row).eq('id', editingId.value))
  } else {
    row.author_id = session.value?.user?.id
    const res = await supabase.from('songs').insert(row).select('id').single()
    error = res.error
    if (res.data) editingId.value = res.data.id
  }
  if (error) {
    saveMsg.value = '❌ บันทึกไม่สำเร็จ: ' + error.message
  } else {
    saveMsg.value =
      count > 0 ? `⚠️ เผยแพร่แล้ว — แต่พบปัญหาโน้ต ${count} จุด (ติดป้ายไว้ให้ตรวจ)` : '✅ เผยแพร่แล้ว'
    markClean() // B100: a published song is no longer "unsaved"
    loadedFlags.value = flags // keep in sync so a same-session re-publish preserves them
    // publishing from one's own draft closes that draft
    if (currentDraftId.value && !reviewingDraft.value) {
      await supabase
        .from('song_drafts')
        .update({ status: 'approved', song_id: editingId.value })
        .eq('id', currentDraftId.value)
      currentDraftId.value = null
      loadDrafts()
    }
    loadSongList()
  }
  return !error
}

async function approve() {
  const d = openPendingDraft.value
  emit('save', 'publish')
  if (!meta.title_th) {
    saveMsg.value = '⚠️ กรุณาใส่ชื่อเพลงภาษาไทย'
    return
  }
  // B093: lint the melody → tag review_flags (keep DA flags) + warn, but never block publish
  const { flags, count } = reviewFlagsForPublish()
  lastLintCount.value = count
  const p_song = {
    number: meta.number || null,
    title_th: meta.title_th.trim(),
    title_en: meta.title_en?.trim() || null,
    content: JSON.parse(JSON.stringify(previewContent.value)),
    category: meta.category || 'anuchon',
    theme: meta.theme || null,
    review_flags: flags,
  }
  // B028: "approve + publish" is ONE logical event. The RPC writes the published song AND
  // flips the draft to approved in a single transaction, tagging both audit rows with the
  // same op_group — so the history shows one line and it is unmistakable who made it public.
  const { data, error } = await supabase.rpc('approve_and_publish', {
    p_draft_id: d.id,
    p_song,
    p_review_comment: reviewComment.value || null,
  })
  if (error) {
    saveMsg.value = '❌ อนุมัติไม่สำเร็จ: ' + error.message
    return
  }
  editingId.value = data
  markClean() // a published song is no longer "unsaved"
  loadedFlags.value = flags // keep in sync so a same-session re-publish preserves them
  saveMsg.value =
    count > 0
      ? `✅ อนุมัติและเผยแพร่แล้ว — แต่พบปัญหาโน้ต ${count} จุด (ติดป้ายไว้ให้ตรวจ)`
      : '✅ อนุมัติและเผยแพร่แล้ว'
  openDraft.value = null
  currentDraftId.value = null
  loadDrafts()
  loadSongList()
}

async function reject() {
  const d = openPendingDraft.value
  const { error } = await supabase
    .from('song_drafts')
    .update({ status: 'rejected', review_comment: reviewComment.value || null })
    .eq('id', d.id)
  saveMsg.value = error ? '❌ ' + error.message : '↩ ส่งกลับให้ผู้เขียนแก้แล้ว'
  openDraft.value = null
  currentDraftId.value = null
  loadDrafts()
}

// issues10 (พี่เปา): "เพลงร่างก็หาที่ลบทั้งเพลงไม่ได้" — there was no way to throw away a draft, so
// abandoned ones piled up in งานร่างของฉัน forever. Scope approved by P'Aim (17 ก.ค.) = OWN DRAFTS
// ONLY; deleting a published song is a separate, unapproved question and is untouched here.
// The RLS policy for this already exists (db/002 "Delete own or as approver"), so no DB change:
// the server refuses a draft that is not yours even if the UI ever slipped. classifyChange()
// already maps a song_drafts DELETE to null ("discard"), so this writes no audit event by design.
async function deleteDraft(d) {
  if (!window.confirm(`ลบร่าง "${d.title_th}" ถาวร? (กู้คืนไม่ได้)`)) return
  const { error } = await supabase.from('song_drafts').delete().eq('id', d.id)
  if (error) {
    saveMsg.value = '❌ ลบร่างไม่สำเร็จ: ' + error.message
    return
  }
  // if the open editor is holding the draft we just deleted, let go of the dead id so the next
  // บันทึกร่าง starts a fresh row instead of updating a row that no longer exists
  if (currentDraftId.value === d.id) currentDraftId.value = null
  // D3: reviewingDraft is derived from openDraft now — drop the source, and the review banner
  // / labels recompute to null on their own (this also covers deleting one's own open draft).
  if (openDraft.value?.id === d.id) openDraft.value = null
  saveMsg.value = '🗑️ ลบร่างแล้ว'
  loadDrafts()
}

async function deleteSong() {
  if (!editingId.value) return
  if (!window.confirm(`ลบเพลง "${meta.title_th}" ออกจากรายการเพลงถาวร?`)) return
  const { error } = await supabase.from('songs').delete().eq('id', editingId.value)
  saveMsg.value = error ? '❌ ลบไม่สำเร็จ: ' + error.message : '🗑️ ลบแล้ว'
  if (!error) {
    resetForm()
    pickerId.value = ''
    loadSongList()
  }
}

// "✓ ตรวจแล้ว": mark this song as human-checked (songs.verified). The catalog reads this
// flag to show which of the 120 imported songs พี่เปา has already reviewed. Toggles, so a
// mistaken tick can be undone. Writes straight to `songs` (RLS: team/approver write) — the
// song must already be saved, so editingId is required.
async function markVerified() {
  if (!editingId.value) {
    saveMsg.value = '⚠️ บันทึก/เผยแพร่เพลงก่อน จึงกด “ตรวจแล้ว” ได้'
    return
  }
  const next = !verified.value
  const { error } = await supabase.from('songs').update({ verified: next }).eq('id', editingId.value)
  if (error) {
    saveMsg.value = '❌ ทำเครื่องหมายไม่สำเร็จ: ' + error.message
    return
  }
  verified.value = next
  saveMsg.value = next ? '✓ ทำเครื่องหมาย “ตรวจแล้ว”' : '↩ ยกเลิก “ตรวจแล้ว”'
  loadSongList()
}

// ---------- history ----------
// The timeline UI lives in RevisionHistory.vue (reads via lib/auditLog.js). Here we only
// keep restore(), which an approver may use to roll a published song back to an older
// snapshot from that history panel.
async function restore(rev) {
  // B028: history entries carry a full "after" snapshot; fall back to legacy new_row
  const r = rev.after ?? rev.new_row
  if (!r) return
  if (!window.confirm('ย้อนเพลงกลับไปเป็นเวอร์ชันนี้?')) return
  const { error } = await supabase
    .from('songs')
    .update({ number: r.number, title_th: r.title_th, title_en: r.title_en, content: r.content })
    .eq('id', editingId.value)
  saveMsg.value = error ? '❌ ' + error.message : '⏪ ย้อนเวอร์ชันแล้ว'
  if (!error) loadSong(editingId.value)
}

// ---------- misc ----------
function downloadJson() {
  emit('save', 'json')
  const data = { ...meta, content: JSON.parse(JSON.stringify(previewContent.value)) }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = (meta.title_th || 'song') + '.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

const AUDIO_BLOCKED_MSG = '🔇 อุปกรณ์ปิดเสียงอยู่ — ตรวจปุ่มปิดเสียง/โหมดเงียบของเครื่อง แล้วลองใหม่'
const playingBar = ref(null) // "li-bi" of the bar currently sounding
let playSeq = 0 // invalidates stale playbacks so `playing` can't flip out of sync

function stopAll() {
  stopPlayback()
  playSeq++
  playing.value = false
  playingBar.value = null
}

function followBar(liOffset) {
  return (n) => {
    const key = `${n.li + liOffset}-${n.bi}`
    if (playingBar.value === key) return
    playingBar.value = key
    const el = document.querySelector(`[data-bar="${key}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 90 || r.bottom > window.innerHeight - 110) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }
}

// follow = highlight editor bars (only valid when the played lines ARE the editor's
// active-stanza lines). Full-song play walks the resolved arrangement, whose line
// indices don't map to editor bars, so it plays without highlight.
async function runPlay(content, liOffset, follow = true) {
  if (playing.value) return stopAll()
  const id = ++playSeq
  playing.value = true
  const onNote = follow ? followBar(liOffset) : undefined
  // B107 step 9: the editor has its OWN "เสียงดนตรี" popover — default Grand · เดี่ยว · ทำนอง ·
  // ตรงโน้ต so พี่เปา checks the raw printed notes on load, but can switch to any instrument/style.
  // ตรงโน้ต = arranger OFF (notes exactly as printed). Choices persist per-page (editor* store refs).
  const sa = editStyleArrange.value
  const songId = props.song?.id ?? props.song?.slug ?? meta.title_th
  const editLead = editorInstrument.value === 'nylon' ? 'guitar' : editorInstrument.value === 'violin' ? 'violin' : 'piano'
  const ok = editorEnsemble.value === 'ensemble'
    ? await playEnsemble(content, { bpm: opts.bpm || 80, onNote, songId, lead: editLead })
    : await playSong(content, {
      bpm: opts.bpm || 80, onNote,
      voices: editorSound.value,
      instrument: editorInstrument.value,
      songId,
      arranger: sa.arranger, arrangeCfg: sa.arrangeCfg,
    })
  if (ok === false) saveMsg.value = AUDIO_BLOCKED_MSG
  if (id === playSeq) {
    playing.value = false
    playingBar.value = null
  }
}

function playStanza() {
  const s = stanzas.value[activeStanza.value]
  return runPlay({ key: opts.key, timeSignature: opts.timeSignature, lines: s.lines.map(serializeLine) }, 0, true)
}
function playFull() {
  return runPlay(resolvedPreview.value, 0, false)
}
function playLine(li) {
  return runPlay({ key: opts.key, lines: [serializeLine(lines.value[li])] }, li, true)
}
function playBar(li, bi) {
  const line = lines.value[li]
  if (!line || !line.bars[bi]) return
  const one = { ...line, bars: [line.bars[bi]], cont: false }
  return runPlay({ key: opts.key, timeSignature: opts.timeSignature, lines: [serializeLine(one)] }, li, false)
}

// ---------- undo / redo ----------
// B097: undo/redo must keep the NOTES and the LYRIC boxes under them in sync. A history
// step is a change to the DOCUMENT (meta + opts + stanzas + arrangement). Which ท่อน is
// active and which เที่ยว the lens shows are VIEW state — pure navigation, NOT a document
// change — so switching them must NOT create an undo step. But the view IS remembered per
// step and restored on undo/redo, so after undoing an edit the lyric boxes come back on the
// SAME เที่ยว/ท่อน the edit was made on (before B097 applyState() called resetLens(), which
// snapped the lens back to the FIRST เที่ยว → "โน้ตถูก เนื้อผิด").
const history = ref([]) // each entry: { doc: <json string>, view: { activeStanza, lensChoice } }
const histPos = ref(-1)
let applyingHistory = false
let histTimer = null

// the DOCUMENT — the only thing whose change opens a new undo step
function docState() {
  return JSON.stringify({
    meta: { ...meta },
    opts: { ...opts },
    stanzas: stanzas.value,
    arrangement: arrangement.value,
  })
}
// the VIEW — remembered inside a step, restored on undo/redo, never a step of its own
function viewState() {
  return { activeStanza: activeStanza.value, lensChoice: lensChoice.value }
}
// watch source: fires on a document OR a view change (view changes only refresh the current
// step's view; document changes push a new step).
function snapshotState() {
  return docState() + ' ' + JSON.stringify(viewState())
}
function commitSnapshot() {
  const doc = docState()
  const cur = history.value[histPos.value]
  if (cur && cur.doc === doc) {
    // document unchanged → this was pure navigation. Refresh where we're looking so a later
    // undo returns to THIS เที่ยว/ท่อน, but do NOT add a history step.
    cur.view = viewState()
    return
  }
  history.value.splice(histPos.value + 1) // typing after undo drops the redo tail
  history.value.push({ doc, view: viewState() })
  if (history.value.length > 100) history.value.shift()
  histPos.value = history.value.length - 1
}
function scheduleCommit() {
  clearTimeout(histTimer)
  histTimer = setTimeout(() => {
    histTimer = null
    commitSnapshot()
  }, 400)
}
watch(snapshotState, () => {
  if (applyingHistory) return
  // B075: commit on the LEADING edge of a burst too. Without this, a second edit that lands
  // within the 400ms debounce coalesces over the first — so the first edit never enters
  // history and Ctrl+Z skips straight past it (พี่เปา: "ย้อนข้ามการแก้ล่าสุด", common on
  // mobile palette tapping). Committing now makes the first edit its own undo step; the
  // trailing timer still captures the burst's final state. (histTimer null = burst idle.)
  // A view-only change also lands here — commitSnapshot() just refreshes the current view.
  if (!histTimer) commitSnapshot()
  scheduleCommit()
})
function resetHistory() {
  clearTimeout(histTimer)
  histTimer = null
  const doc = docState()
  history.value = [{ doc, view: viewState() }]
  histPos.value = 0
  cleanDoc.value = doc // a freshly loaded / reset song is clean (B100)
}
function applyState(entry) {
  applyingHistory = true
  const s = JSON.parse(entry.doc)
  Object.assign(meta, s.meta)
  Object.assign(opts, s.opts)
  stanzas.value = s.stanzas
  arrangement.value = s.arrangement
  // restore the view, clamped to the restored document (arrangement/stanzas may have shrunk,
  // e.g. undoing an add-ท่อน). The activeStanzaId watcher's resetLens() is suppressed while
  // applyingHistory, so the restored lensChoice is not clobbered back to the first เที่ยว.
  const v = entry.view || {}
  activeStanza.value = Math.min(Math.max(v.activeStanza ?? 0, 0), stanzas.value.length - 1)
  let lc = v.lensChoice ?? -1
  if (lc >= arrangement.value.length) lc = arrangement.value.length - 1
  if (lc < -1) lc = -1
  lensChoice.value = lc
  nextTick(() => (applyingHistory = false))
}
const canUndo = computed(() => histPos.value > 0)
const canRedo = computed(() => histPos.value < history.value.length - 1)
function undo() {
  clearTimeout(histTimer)
  histTimer = null
  commitSnapshot() // flush any burst still pending so its final state is the step we leave
  if (histPos.value > 0) {
    histPos.value--
    applyState(history.value[histPos.value])
  }
}
function redo() {
  if (histPos.value < history.value.length - 1) {
    histPos.value++
    applyState(history.value[histPos.value])
  }
}
function onUndoKeys(e) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return
  const k = e.key.toLowerCase()
  if (k === 'z') {
    e.preventDefault()
    e.shiftKey ? redo() : undo()
  } else if (k === 'y') {
    e.preventDefault()
    redo()
  }
}
onMounted(() => {
  window.addEventListener('keydown', onUndoKeys)
  resetHistory()
})
onUnmounted(() => window.removeEventListener('keydown', onUndoKeys))

// ---------- B109: keyboard navigation (bar / line / note jumps · all-device) ----------
// พี่เปา asked to hop across bars (ห้อง) and lines (บรรทัด) from the keyboard. One model, two
// triggers: desktop = physical keys here; mobile = on-screen buttons (UX) call the SAME jump*
// functions. All reuses existing plumbing (slotStarts · focusSlot · [data-bar] · lines) — no new
// data model. Every nav key preventDefaults so the page never scrolls (which would flicker the
// dock's hide-on-scroll · SA flag). Scheme (US §2, MuseScore/Flat.io + ARIA-grid): Ctrl+←/→ = bar,
// Ctrl+↑/↓ = line, Home/End = first/last of bar, Ctrl+Home/End = song, Tab/Shift+Tab = note/syllable.
function currentPos() {
  const el = document.activeElement
  const bar = el?.closest?.('[data-bar]')
  if (!bar) return null
  const [li, bi] = bar.getAttribute('data-bar').split('-').map(Number)
  return { li, bi, onSyllable: !!el.classList?.contains('syl-box') }
}
// focus the FIRST note/syllable of bar (li,bi), keeping the caller's mode (note vs lyric)
function focusBar(li, bi, onSyllable) {
  if (onSyllable) {
    const slot = slotStarts.value[`${li}-${bi}-0`]
    if (slot != null) return focusSlot(slot)
  }
  nextTick(() => document.querySelector(`[data-bar="${li}-${bi}"] .note-box:not(.add)`)?.focus())
}
function jumpBar(dir) {
  const p = currentPos()
  if (!p) return
  const ls = lines.value
  let { li, bi } = p
  bi += dir
  if (bi < 0) { li -= 1; if (li < 0) return; bi = ls[li].bars.length - 1 } // wrap to prev line's last bar
  else if (bi >= ls[li].bars.length) { li += 1; if (li >= ls.length) return; bi = 0 } // next line's first bar
  focusBar(li, bi, p.onSyllable)
}
function jumpLine(dir) {
  const p = currentPos()
  if (!p) return
  const ls = lines.value
  const li = p.li + dir
  if (li < 0 || li >= ls.length) return
  focusBar(li, 0, p.onSyllable)
}
// Tab: next/prev note (or syllable). Syllable slots are a continuous global index, so +1 crosses
// bars/lines by itself; note boxes move in DOM order. Returns true if focus moved (so the caller
// only preventDefaults then — at the very edge, native Tab still escapes the editor · no focus trap).
function jumpNote(dir) {
  const el = document.activeElement
  if (el?.classList?.contains('syl-box') && focusedSlot.value >= 0) {
    const next = document.querySelector(`[data-slot="${focusedSlot.value + dir}"]`)
    if (next) { focusSlot(focusedSlot.value + dir); return true }
    return false
  }
  const boxes = [...document.querySelectorAll('.ed-strip .note-box:not(.add)')]
  const next = boxes[boxes.indexOf(el) + dir]
  if (next) { next.focus(); return true }
  return false
}
// Home/End = first/last of the CURRENT bar; Ctrl+Home/End = first/last of the whole song
function focusEdge(dir, songWide) {
  const p = currentPos()
  const kind = p?.onSyllable ? '.syl-box' : '.note-box:not(.add)'
  const scope = songWide || !p ? '.ed-strip' : `[data-bar="${p.li}-${p.bi}"]`
  const boxes = [...document.querySelectorAll(`${scope} ${kind}`)]
  ;(dir < 0 ? boxes[0] : boxes[boxes.length - 1])?.focus()
}
function editorHasFocus() {
  const el = document.activeElement
  if (!el?.closest?.('.ed-strip')) return false
  if (el.closest?.('.chord-pick')) return false // editing a chord → the picker owns its keys
  return true
}
function onNavKeys(e) {
  if (!editorHasFocus()) return
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl && e.altKey) return // leave OS/other combos alone
  if (ctrl && e.key === 'ArrowRight') { e.preventDefault(); jumpBar(1) }
  else if (ctrl && e.key === 'ArrowLeft') { e.preventDefault(); jumpBar(-1) }
  else if (ctrl && e.key === 'ArrowDown') { e.preventDefault(); jumpLine(1) }
  else if (ctrl && e.key === 'ArrowUp') { e.preventDefault(); jumpLine(-1) }
  else if (ctrl && e.key === 'Home') { e.preventDefault(); focusEdge(-1, true) } // song start (Ctrl only)
  else if (ctrl && e.key === 'End') { e.preventDefault(); focusEdge(1, true) } // song end · plain Home/End = native caret (world-class · P'Aim/UX)
  else if (e.key === 'Tab') { if (jumpNote(e.shiftKey ? -1 : 1)) e.preventDefault() } // no focus trap at edges
}
onMounted(() => window.addEventListener('keydown', onNavKeys))
onUnmounted(() => window.removeEventListener('keydown', onNavKeys))

// ---------- B100: warn before leaving with unsaved edits ----------
// "ยังไม่บันทึก" (dirty) = the DOCUMENT (meta + opts + stanzas + arrangement — the same
// docState() the undo history tracks) differs from the last CLEAN checkpoint. A checkpoint
// is set when a song is loaded / the form is reset (resetHistory) AND after every successful
// save (draft/publish), so a saved-then-untouched song never nags. Two exits are guarded:
//   • in-app route change → our confirm dialog (KISS: window.confirm, like the rest of the
//     editor's confirms — B094's shared dialog is still backlog).
//   • tab close / refresh → the browser's own beforeunload prompt (its wording can't be set).
const cleanDoc = ref(docState())
const isDirty = computed(() => docState() !== cleanDoc.value)
function markClean() {
  cleanDoc.value = docState()
}
function onBeforeUnload(e) {
  if (!isDirty.value) return
  e.preventDefault()
  e.returnValue = '' // Chrome needs a set returnValue to show the native "leave?" prompt
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))
onBeforeRouteLeave(() => {
  if (!isDirty.value) return true
  return window.confirm('มีงานที่ยังไม่บันทึก ถ้าออกจากหน้านี้งานที่แก้ไว้จะหาย — ออกเลยไหม?')
})

// ---------- floating toolbar + sheet overlay ----------
const showSheet = ref(false)
// D2/D4 — the primary action states what it will DO and to WHOSE work, and it refuses to
// overwrite a song that has a draft waiting for review without saying so first.
// `save()` and `primaryLabel` used to live here too, disagreeing with this function about the
// same state; both were dead code (nothing called them — the dock runs primaryAction and
// renders saveLabel), so they are gone rather than kept in sync. One source of truth.
function primaryAction() {
  if (openPendingDraft.value) return approve()
  if (!isApprover.value) return saveDraft('pending')
  const waiting = pendingForThisSong.value
  // HIG Alerts: alert only for an uncommon destructive action that can't be undone — this is
  // one. M3 Dialogs: no ambiguous "Are you sure?" — say what actually happens (US AC-6).
  if (
    waiting &&
    !window.confirm(
      `เผยแพร่ทับฉบับปัจจุบัน — ร่างของ${draftAuthor(waiting)}ที่รอตรวจอยู่จะยังไม่ถูกอนุมัติ\n\nเผยแพร่ทับ?`,
    )
  )
    return
  return saveDirect()
}

// ---------- edit dock = DockKey fed ITEMS_EDIT (DS dockkey-print-edit §2) ----------
// EditorMode mounts its OWN DockKey now (the shared StudioDock is retired). It hands the
// engine a descriptor list: the full-width note-key band (E1), the row-1 chrome (ย้อน/ทำซ้ำ/
// ฟังท่อน↔หยุด), the prime บันทึก + ฟังทั้งเพลง on row 2, and export/draft/preview in ⚙.
// The structural per-bar tools stay INLINE in the table (contextual — not dock commands).
const editAlpha = ref(0.96)
// D2 (WCAG 3.2.4 · 2.4.6 · 3.3.2) — one label per meaning. "เผยแพร่" alone was the same word
// for "publish my own edit", "overwrite the live song" and "overwrite while โม's draft waits":
// three functions wearing one label. saveLabel is the compact BUTTON FACE; saveName is the
// full accessible name (aria-label + title) with no width limit.
//
// Divergence from DS §3 (recorded in the report): DS put the owner's name ON the button face
// ("อนุมัติร่างของโม"). At 360px that face rides row 2 next to ฟังทั้งเพลง, and a real latin
// author name ("k.pituck"/"yeahwong") pushed the row past the viewport (measured: 393px > 360)
// — which US AC-9 forbids as a hard gate. The owner is not lost: it sits in the banner
// directly above the button (review-banner / pending-alert) AND in saveName (the accessible
// name). So the face stays compact + consistent, and WHOSE-work is always on screen beside it.
const saveLabel = computed(() => {
  if (reviewingDraft.value) return 'อนุมัติร่าง'
  if (!isApprover.value) return 'ส่งตรวจ'
  if (openPendingDraft.value) return 'เผยแพร่ร่างฉัน'
  if (pendingForThisSong.value) return '⚠️ เผยแพร่ทับ'
  return editingId.value ? 'เผยแพร่ทับ' : 'เผยแพร่'
})
const saveName = computed(() => {
  if (reviewingDraft.value) return 'อนุมัติและเผยแพร่ร่างของ' + draftAuthor(reviewingDraft.value)
  if (!isApprover.value) return 'ส่งตรวจ'
  if (openPendingDraft.value) return 'เผยแพร่ร่างของฉัน (อนุมัติเอง)'
  if (pendingForThisSong.value)
    return `เผยแพร่ทับฉบับปัจจุบัน — มีร่างของ${draftAuthor(pendingForThisSong.value)}รอตรวจอยู่`
  return editingId.value ? 'เผยแพร่ทับฉบับปัจจุบัน' : 'เผยแพร่'
})

// B107 step 9 — the editor's "เสียงดนตรี" popover (same SoundControl as ฝึกร้อง, its own state).
// 'plain' → arranger OFF (notes as printed · ตรวจโน้ต); calm/arrangement → the matching preset.
const editStyleArrange = computed(() =>
  editorStyle.value === 'plain'
    ? { arranger: false, arrangeCfg: {} }
    : { arranger: true, arrangeCfg: presetCfg(editorStyle.value === 'calm' ? 'piano-calm' : 'piano-arrangement') },
)
const soundGroups = computed(() => [
  { key: 'sound', label: 'เสียงที่เล่น', icon: 'volume-2', value: editorSound.value, options: SOUND_OPTS, onPick: setEditorSound },
  { key: 'ensemble', label: 'การบรรเลง', icon: 'blend', value: editorEnsemble.value, options: ENSEMBLE_OPTS, onPick: setEditorEnsemble },
  { key: 'instrument', label: 'เครื่องดนตรี', icon: 'music', value: editorInstrument.value, options: INSTRUMENT_OPTS, onPick: setEditorInstrument },
  { key: 'style', label: 'อารมณ์ / สไตล์', icon: 'sliders-horizontal', value: editorStyle.value, options: STYLE_OPTS, onPick: setEditorStyle },
])
const INSTR_ICON = { grand: 'piano', nylon: 'guitar', felt: 'music', violin: 'music', cello: 'music' }
const soundIcon = computed(() => (editorEnsemble.value === 'ensemble' ? 'users' : (INSTR_ICON[editorInstrument.value] || 'audio-lines')))

const editItems = computed(() => [
  { id: 'keys', kind: 'keys', name: 'แป้นสัญลักษณ์', rows: PALETTE, onInsert: insertSym },
  { id: 'grip', kind: 'grip', name: 'ย้าย/ย่อ', place: { anchor: 'left', row: 1 } },
  { id: 'undo', kind: 'btn', name: 'ย้อน', icon: 'undo-2', place: { anchor: 'rightOf:grip', row: 1 }, run: undo, disabled: !canUndo.value },
  { id: 'redo', kind: 'btn', name: 'ทำซ้ำ', icon: 'redo-2', place: { anchor: 'rightOf:undo', row: 1 }, run: redo, disabled: !canRedo.value },
  // D4: the two "listen" controls sit side-by-side, so each carries a distinct label +
  // icon — ▶ ฟังท่อน (the stanza being edited) vs ◉ ฟังทั้งเพลง (the whole arrangement).
  { id: 'play', kind: 'btn', name: 'ฟังท่อน ' + activeStanzaId.value, label: 'ฟังท่อน', icon: 'play', place: { anchor: 'rightOf:redo', row: 1 }, run: playStanza, hidden: playing.value },
  { id: 'stop', kind: 'btn', name: 'หยุด', label: 'หยุด', icon: 'square', danger: true, place: { anchor: 'rightOf:redo', row: 1 }, run: stopAll, hidden: !playing.value },
  // B107 step 9 — the single "เสียงดนตรี" button (audio-lines) → popover with all 4 sound axes,
  // so พี่เปา can switch instrument/style right here (default = ตรงโน้ต for raw note-checking).
  // dock-space slim: เสียงดนตรี = สลับเครื่อง/สไตล์นาน ๆ ครั้ง → เข้า ⚙ (slot render ใน ⚙ · dev 1cd032c) · ปักกลับได้.
  { id: 'soundctl', kind: 'slot', name: 'เสียงดนตรี', icon: 'audio-lines', default: 'inSetting', pinnable: true },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'save', kind: 'btn', name: saveName.value, label: saveLabel.value, icon: isApprover.value ? 'badge-check' : 'send', prime: true, place: { row: 2, col: 1, span: 2 }, run: primaryAction, hidden: !loggedIn.value },
  // dock-space slim (UX presentation · P'Aim: dock กินพื้นที่): ฟังทั้งเพลง = ใช้นาน ๆ ครั้ง →
  // ย้ายเข้า ⚙ (ยังกดได้ · ปักกลับขึ้นแถบได้) เพื่อลด footprint row 2 · kind:btn → ⚙ render run ปุ่มได้จริง.
  { id: 'playAll', kind: 'btn', name: 'ฟังทั้งเพลง', label: 'ฟังทั้งเพลง', icon: 'circle-play', default: 'inSetting', pinnable: true, run: playFull, hidden: playing.value },
  // dock-space slim: ดาวน์โหลด = นาน ๆ ครั้ง → เข้า ⚙ (slot render ใน ⚙ · dev 1cd032c) · ปักกลับได้ · row 2 เหลือ save+draft.
  { id: 'export', kind: 'slot', name: 'ดาวน์โหลด', default: 'inSetting', pinnable: true },
  // issues9 (พี่เปา): บันทึกร่าง used to live in ⚙ (default:'inSetting'), where a `btn` renders no
  // control at all — so pinning it was the ONLY way to get a button that runs ("ทำไมต้องกดปักหมุด
  // ก่อนถึงจะเซฟร่างได้"). It is the most-used command for someone typing in 124 songs, so it has a
  // permanent home on the bar. No `pinnable`: an item with a `place` is already on the bar, and
  // pinning it too would render it twice (single source of action · ui-standards §2).
  { id: 'draft', kind: 'btn', name: 'บันทึกร่าง', label: 'บันทึกร่าง', icon: 'save', place: { row: 2, col: 3 }, run: () => saveDraft('draft'), hidden: !loggedIn.value || legacy.value },
  { id: 'preview', kind: 'toggle', name: 'ดูผลทั้งเพลง', icon: 'maximize', default: 'inSetting', pinnable: true, control: { value: sheetWinOpen.value, onToggle: () => (sheetWinOpen.value = !sheetWinOpen.value) } },
  // B109 เฟส A — ปุ่มนำทางบนจอ (◀▶ โน้ต · ⏮⏭ ห้อง · ▲▼ บรรทัด). editor-side slot (markup อยู่
  // #cell-nav ด้านล่าง · ไม่ใช่ DockKey-shared) เรียก jumpNote/jumpBar/jumpLine(±1) ของ dev =
  // navigation model เดียวกับคีย์ desktop (1 model 2 trigger · US §3). row 2 = ใต้แป้นสัญลักษณ์
  // เหนือ core row · ปุ่ม flex-wrap ใน cell → self-fit ทุกจอ (344 = 3×2 ไม่ล้น). ขี่ dock
  // keyboard-aware → โผล่เหนือแป้นพิมพ์ตอนป้อนเนื้อ. ไม่ pinnable = utility ถาวร ไม่ tuck เข้า ⚙.
  { id: 'nav', kind: 'slot', name: 'นำทาง', place: { row: 2, col: 0 } },
])

const STATUS_TH = { draft: 'ร่าง', pending: 'รอตรวจ', rejected: 'ถูกส่งกลับ', approved: 'อนุมัติแล้ว' }

// ---------- studio shell (phase 1: header chrome + edit/sheet mode) ----------
// The redesign wraps the EXISTING editor in a Google-Docs-style shell. Phase 1 = the
// single-row top bar (site menu · title · file menu · mode toggle · login) and the
// edit⇄sheet mode. The parts rail / catalog drawer come in phase 2.
const openMenu = shellMenu // shared with the app-wide ShellBar (one menu open at a time)
// This surface is always "the editor"; the shell owns which mode (view/sheet/edit) shows.
// viewMode stays as an internal constant so the editor's existing guards/actions are
// untouched (the several `viewMode.value = 'edit'` calls below are harmless no-ops now).
const viewMode = ref('edit')
function toggleMenu(m) {
  openMenu.value = openMenu.value === m ? null : m
}
function fileNew() {
  openMenu.value = null
  viewMode.value = 'edit'
  pickerId.value = ''
  resetForm()
}
// B071: "ออกจากเพลงนี้" (fileClose) was removed — P'Aim found it confusing and unneeded.
function scrollToCard(id) {
  openMenu.value = null
  viewMode.value = 'edit'
  nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
// ---------- studio shell (phase 2: parts rail / catalog drawer) ----------
// The rail is the song's table of contents: ทำนอง (stanzas) · เนื้อร้อง (arrangement
// rows / ข้อ) · ลำดับเพลง. Desktop = a sticky left column (📖 collapses it); mobile =
// a slide-in drawer (📖 opens it). Clicking an item selects + scrolls to it.
const railHidden = ref(false) // desktop: collapse the rail to full-width content
const drawerOpen = ref(false) // mobile: slide-in drawer

// clean-editor affordances: the busy per-bar controls are tucked away so the strip reads
// like the wireframe. barMenuOpen = "li-bi" of the bar whose tools popover is open (only
// one at a time). (Line structure moved to the header edhead — US E3.)
const barMenuOpen = ref('')
function toggleBarMenu(li, bi) {
  const k = `${li}-${bi}`
  barMenuOpen.value = barMenuOpen.value === k ? '' : k
}
// the per-bar ⋯ tools popover closes when clicking anywhere outside it
function onBarMenuOutside(e) {
  if (!e.target.closest?.('.ed-bar-more-wrap')) barMenuOpen.value = ''
}
watch(barMenuOpen, (v) => {
  if (v) setTimeout(() => document.addEventListener('mousedown', onBarMenuOutside), 0)
  else document.removeEventListener('mousedown', onBarMenuOutside)
})
onUnmounted(() => document.removeEventListener('mousedown', onBarMenuOutside))
function isMobileView() {
  return window.matchMedia('(max-width: 760px)').matches
}
function toggleCatalog() {
  if (isMobileView()) drawerOpen.value = !drawerOpen.value
  else railHidden.value = !railHidden.value
}
function closeDrawer() {
  drawerOpen.value = false
}
function scrollToEl(id, block = 'start') {
  nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block }))
}
function railSelectStanza(i) {
  viewMode.value = 'edit'
  selectStanza(i)
  closeDrawer()
  scrollToEl('pk-editor')
}
function railSelectRow(i) {
  viewMode.value = 'edit'
  focusRow(i) // master-detail: select the ท่อน, show its melody + words under the notes
  closeDrawer()
  scrollToEl('pk-editor')
}
function rowLabel(row, i) {
  return row.label?.trim() || 'ข้อ ' + (i + 1)
}
// verse options for the breadcrumb's ข้อ selector (clean labels, no "ข้อ ข้อ" doubling)
const edLyrOptions = computed(() => [
  { value: -1, label: '— ซ่อนเนื้อ —' },
  ...lensRowsForActiveStanza.value.map((x) => ({ value: x.i, label: rowLabel(x.r, x.i) })),
])

// issues11 (พี่เปา): the edit header carries the tools for the line being edited (⋯ · ฮุก · ซ้ำ ·
// ย้ายขึ้น/ลง · ลบบรรทัด) but was position:static, so it scrolled away with the page — editing
// line 20 meant scrolling back to the top for every single tool ("ต้องเลื่อนมาบนสุดถึงจะกดใช้ได้
// เสียเวลา"). It now sticks under the shell bar. The bar's height changes with the breakpoint
// (105px at 1280 · taller when it wraps), so measure it rather than hard-code an offset — the
// rail's hard-coded top:58px is exactly the drift this avoids.
const shellH = ref(56)
// Both bars are measured off the live DOM (the same way .shell-bar already is) rather than a
// template ref: the ref stayed null through mount, which silently left edheadH at 0 and pinned
// .cshead straight back on top of the edhead.
const edheadH = ref(0)
let edheadRO = null
function measureShell() {
  if (typeof document === 'undefined') return
  const bar = document.querySelector('.shell-bar')
  if (bar) shellH.value = Math.round(bar.getBoundingClientRect().height)
  const eh = document.querySelector('.edhead')
  if (!eh) return
  edheadH.value = Math.round(eh.getBoundingClientRect().height)
  // the edhead wraps to more rows as the width shrinks (and as its buttons swap), so track its
  // real box — a fixed number would drift the moment the header re-wraps
  if (!edheadRO && typeof ResizeObserver !== 'undefined') {
    edheadRO = new ResizeObserver(() => { edheadH.value = Math.round(eh.getBoundingClientRect().height) })
    edheadRO.observe(eh)
  }
}

// The ท่อน toolbar (.cshead) was ALREADY sticky at a hard-coded top:58px (B085, same reason as
// this header). Once the edhead pins too, 58px puts .cshead UNDER it — measured: 62px of overlap
// and its buttons failed a hit test, i.e. we would have traded one unreachable toolbar for
// another. So .cshead pins below whatever the edhead actually occupies. The edhead wraps at
// narrow widths, so its height is observed, not assumed.
// mobile keeps .cshead's own CSS top (the edhead is not sticky there — see the media query)
const csheadStyle = computed(() => (narrow.value ? {} : { top: shellH.value + edheadH.value + 'px' }))

// ---------- edit header (edhead — prototype ps2 §③) ----------
// The header is a BREADCRUMB that opens the rail (the rail is the only navigation — no
// duplicate ท่อน/ข้อ dropdowns: B031/B003/E1) + in-context help + layout/preview toggles
// + line-level quick structure. Everything structural is line-level; a bar keeps only its
// ▶ + ดูผล (US E3). The model still stores repeat/volta per bar (v2) — UI just sets lines.
const showTip = ref(false) // (i) how-to blurb (was always-on; now on demand like the proto)
const showLegend = ref(false) // (?) symbol legend
const barLayout = ref('flow') // default = ห้องต่อกัน (B048) · 'stack' = 1 ห้อง/แถว · 'flow' = ต่อกัน (B035)
const lineMoreOpen = ref(false) // ⋯ advanced settings for the active line (Fine/D.C. · ต่อห้อง · ชื่อ)

// breadcrumb text: "ท่อน A · ข้อ 1" — shows position only; selecting happens in the rail
const crumbLabel = computed(() => {
  const mel = 'ทำนอง ' + activeStanzaId.value
  return lensActive.value ? mel + ' · ' + rowLabel(lensRow.value, lensChoice.value) : mel
})

// quick structure acts on the ACTIVE line (the one last focused; selectStanza resets to 0)
function curLine() {
  return lines.value[activeLine.value] || null
}
function qHook() {
  const l = curLine()
  if (l) l.marker = l.marker ? '' : '***'
}
// "ซ้ำ" wraps the whole active line in repeat marks — the model keeps them per bar (‖: on
// the first bar, :‖ on the last), toggling off if the line is already wrapped.
function qRepeat() {
  const l = curLine()
  if (!l || !l.bars.length) return
  const first = l.bars[0]
  const last = l.bars[l.bars.length - 1]
  const on = first.repeatStart && last.repeatEnd
  first.repeatStart = !on
  last.repeatEnd = !on
}
function qCopyLine() {
  copyLine(activeLine.value)
}
function qDeleteLine() {
  if (!curLine()) return
  if (!window.confirm(`ลบบรรทัด ${activeLine.value + 1} ทั้งบรรทัด?`)) return
  removeLine(activeLine.value)
  activeLine.value = Math.min(activeLine.value, lines.value.length - 1)
  lineMoreOpen.value = false
}
// B091: clear only the WORDS of this line, in EVERY verse (the melody stays). Reuses the
// B086/B088 slot model — blank this line's slice in each row's syllables[] (later lines'
// words keep their positions). Undo (B075) restores it.
function clearLineLyrics(li) {
  const s = stanzas.value[activeStanza.value]
  if (!s) return
  const start = lineSlotStart(s.lines, li)
  const len = lineSlotLen(s.lines[li])
  if (len <= 0) return
  resliceRows(s.id, (p) => {
    for (let k = start; k < start + len && k < p.length; k++) p[k] = ''
  })
}
function qClearLyrics() {
  if (!curLine()) return
  if (!window.confirm(`ล้างเนื้อร้องของบรรทัด ${activeLine.value + 1} (ทุกข้อ)? โน้ตยังอยู่`)) return
  clearLineLyrics(activeLine.value)
  lineMoreOpen.value = false
}
const curLineHook = computed(() => !!curLine()?.marker)
const curLineRepeat = computed(() => {
  const l = curLine()
  return !!(l && l.bars.length && l.bars[0].repeatStart && l.bars[l.bars.length - 1].repeatEnd)
})
function toggleLineMore() {
  lineMoreOpen.value = !lineMoreOpen.value
}
function onLineMoreOutside(e) {
  if (!e.target.closest?.('.ed-more-wrap')) lineMoreOpen.value = false
}
watch(lineMoreOpen, (v) => {
  if (v) setTimeout(() => document.addEventListener('mousedown', onLineMoreOutside), 0)
  else document.removeEventListener('mousedown', onLineMoreOutside)
})
onUnmounted(() => document.removeEventListener('mousedown', onLineMoreOutside))

// ---------- whole-song preview (ดูผลทั้งเพลง) + per-bar ดูผล (B035) ----------
// Each bar flips between the edit grid and a clean jianpu render (ดูผล — REPLACES the grid,
// never stacks a second row). The header master flips every bar of the active stanza at
// once; its label is authoritative — it reflects whether all bars are currently rendered.
const shownBars = ref({}) // key "li-bi" -> true when that bar shows its render
function barShown(li, bi) {
  return !!shownBars.value[`${li}-${bi}`]
}
function toggleBarShown(li, bi) {
  const k = `${li}-${bi}`
  shownBars.value = { ...shownBars.value, [k]: !shownBars.value[k] }
}
// "ดูผลทั้งเพลง" (B) — a NON-MODAL floating window of the whole song sheet. It replaces the
// old "flip every bar to render inline" toggle (which blocked editing until you flipped back):
// now the sheet floats over the page, resolvedPreview is reactive so it live-syncs while you
// keep editing underneath, and it drags + closes. The drag+clamp is the dock-core pattern
// (StudioDock combinedDown/Move/Up + clampToViewport) so it feels like the app's other
// floating chrome — no new floating engine.
const sheetWinOpen = ref(false)
// P'Aim: "ควรใช้พื้นที่เต็ม · เหลือที่ทางขวาเยอะ". Part of that was the window FORGETTING: drag it
// wide, close it, reopen → back to the default every time. Remembered per browser, like the dock's
// pins/transparency. Values are re-clamped to the viewport on open (onFloatResize), so a size
// saved on a big monitor cannot strand the window off-screen on a laptop.
const FLOAT_BOX_KEY = 'pleng.editor.sheetWinBox'
const savedBox = (() => {
  try {
    const b = JSON.parse(localStorage.getItem(FLOAT_BOX_KEY) || 'null')
    if (b && b.size?.width > 0 && b.size?.height > 0) return b
  } catch { /* ignore bad storage */ }
  return null
})()
const sheetWinPos = ref(savedBox?.pos ?? null) // {left, top} viewport coords · null = default CSS spot (top-right)
const sheetWinSize = ref(savedBox?.size ?? null) // {width, height} px · null = default CSS size
const FLOAT_MIN_W = 280 // don't let a resize squash the sheet past readable
const FLOAT_MIN_H = 200
function isNarrow() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 760px)').matches
}
const narrow = ref(isNarrow())
function toggleSheetWin() { sheetWinOpen.value = !sheetWinOpen.value }

const floatEl = ref(null)
function clampWin(pos, w, h) {
  return {
    left: Math.max(4, Math.min(window.innerWidth - w - 4, pos.left)),
    top: Math.max(4, Math.min(window.innerHeight - h - 4, pos.top)),
  }
}
// drag the window by its title bar — press→move past a small threshold = drag (pins the
// window to explicit fixed coords, then tracks the pointer, clamped inside the viewport).
const FLOAT_DRAG = 5 // px
let fdown = false, fmoved = false, fsx = 0, fsy = 0, foX = 0, foY = 0, fW = 0, fH = 0, fStartL = 0, fStartT = 0
function floatDown(e) {
  if (narrow.value) return // mobile: full-screen, no drag
  fdown = true; fmoved = false
  fsx = e.clientX; fsy = e.clientY
  const el = floatEl.value
  if (el) {
    const r = el.getBoundingClientRect()
    foX = fsx - r.left; foY = fsy - r.top; fW = r.width; fH = r.height; fStartL = r.left; fStartT = r.top
  }
  try { e.target.setPointerCapture(e.pointerId) } catch { /* pointer still tracks without capture */ }
}
function floatMove(e) {
  if (!fdown) return
  const dx = e.clientX - fsx, dy = e.clientY - fsy
  if (!fmoved && dx * dx + dy * dy > FLOAT_DRAG * FLOAT_DRAG) {
    fmoved = true
    sheetWinPos.value = { left: fStartL, top: fStartT } // pin at current spot before tracking
  }
  if (fmoved) { e.preventDefault(); sheetWinPos.value = clampWin({ left: e.clientX - foX, top: e.clientY - foY }, fW, fH) }
}
function floatUp() { if (fmoved) saveWinBox(); fdown = false; fmoved = false }
// resize by the bottom-right corner handle — same press→track→clamp shape as the drag, but it
// grows width/height (from a pinned top-left) instead of moving. Kept inside the viewport with a
// floor (FLOAT_MIN_*) so it can't be squashed and a ceiling so it can't spill off-screen.
let rdown = false, rsx = 0, rsy = 0, rW0 = 0, rH0 = 0, rLeft = 0, rTop = 0
function resizeDown(e) {
  if (narrow.value) return // mobile: full-screen, no resize
  const el = floatEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  rdown = true
  rsx = e.clientX; rsy = e.clientY
  rW0 = r.width; rH0 = r.height; rLeft = r.left; rTop = r.top
  // pin the top-left so the box grows from the corner (matches what the eye expects)
  if (!sheetWinPos.value) sheetWinPos.value = { left: rLeft, top: rTop }
  e.preventDefault(); e.stopPropagation()
  try { e.target.setPointerCapture(e.pointerId) } catch { /* still tracks without capture */ }
}
function resizeMove(e) {
  if (!rdown) return
  e.preventDefault()
  // issues7 ("ยืดขยายไม่ได้อีก"): the window's home is the TOP-RIGHT, so growing only rightwards
  // from a pinned left edge left just 27px of travel at 1536px — the grip looked broken. When the
  // right edge runs out, slide the window LEFT to make room instead of clamping the width. The
  // sheet scales to the window (previewPageStyle), so a wider window = bigger notes: the grip IS
  // the zoom, which is the gesture พี่เปา already reached for.
  const maxRight = window.innerWidth - 4
  let w = Math.max(FLOAT_MIN_W, rW0 + (e.clientX - rsx))
  let left = rLeft
  if (left + w > maxRight) left = Math.max(4, maxRight - w)
  w = Math.min(w, maxRight - left)
  const maxH = window.innerHeight - rTop - 4
  const h = Math.max(FLOAT_MIN_H, Math.min(maxH, rH0 + (e.clientY - rsy)))
  sheetWinPos.value = { left, top: rTop }
  sheetWinSize.value = { width: w, height: h }
}
function resizeUp(e) {
  rdown = false
  saveWinBox()
  try { e.target.releasePointerCapture(e.pointerId) } catch { /* no-op */ }
}
// remember the box the moment a drag/resize settles (not on every pointermove)
function saveWinBox() {
  if (narrow.value || !sheetWinSize.value) return
  try {
    localStorage.setItem(FLOAT_BOX_KEY, JSON.stringify({ pos: sheetWinPos.value, size: sheetWinSize.value }))
  } catch { /* ignore */ }
}
const floatStyle = computed(() => {
  if (narrow.value) return {}
  const s = {}
  if (sheetWinPos.value) {
    s.left = sheetWinPos.value.left + 'px'
    s.top = sheetWinPos.value.top + 'px'
    s.right = 'auto'
    s.bottom = 'auto'
  }
  if (sheetWinSize.value) {
    s.width = sheetWinSize.value.width + 'px'
    s.height = sheetWinSize.value.height + 'px'
    s.maxHeight = 'none' // an explicit height overrides the default 70vh cap
  }
  return s
})
// issues3 (พี่เปา): the preview must wrap EXACTLY like the แผ่นเพลง SCREEN page, not the A4
// print page. The sheet page renders SongSheet inside the studio-wide reading column
// (.container.studio-wide → .card → .sheet-read-scale at readingFontScale·1rem), which on a
// wide desktop is ~68em/line — but the old preview locked to the A4 print ratio (42.05em),
// so it dropped bars to new lines the sheet page keeps together ("บรรทัดตก"). Fix: measure the
// live reading column and render the preview at the SAME em-width, so both break identically.
// The .ed-float-page still scales that em-width to fill the window via font-size (B081), which
// keeps SongSheet's B069 tie overlay measuring real px (no transform/zoom).
const CARD_BOX = 34 // .card chrome between the reading column and the sheet: border(1+1) + padding(16+16)
const sheetColW = ref(0) // px width of the sheet page's SongSheet column at 1rem (readingFontScale·1rem basis)
function measureSheetCol() {
  if (typeof document === 'undefined') return
  const c = document.querySelector('main.container')
  if (!c) return
  const cs = getComputedStyle(c)
  const pad = parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0')
  // The reading column caps at the container's max-width; the song sheet wraps at that cap. We
  // CANNOT read c.clientWidth here — .container has margin:0 auto in a flex column, so auto
  // margins shrink it to its current content (116px on an empty tab, 1160 on a full one). Derive
  // the stable cap instead: min(available width from the flex parent, the container's max-width).
  // The cap comes back UNRESOLVED from getComputedStyle ("min(1160px, 100%)"), so a plain
  // parseFloat is NaN and the old `|| Infinity` silently fell back to the whole viewport:
  // the column measured 1455px instead of its real 1160px at a 1536px window, which rendered
  // the preview ~25% smaller than designed — and the WIDER the screen the smaller it got
  // (issues7 "ตัวเล็กมาก"). Pull the px length out of the expression instead.
  const cap = parseFloat((cs.maxWidth.match(/([\d.]+)px/) || [])[1]) || Infinity // --container-wide (1160px)
  const parentW = c.parentElement ? c.parentElement.clientWidth : window.innerWidth
  const containerW = Math.min(parentW, cap)
  sheetColW.value = Math.max(0, containerW - pad - CARD_BOX)
}
// P'Aim (17 ก.ค.): "ขยายขนาดตัวอักษรไม่ได้ (ต้องขยายยังไง) · ควรมีปุ่มขยาย font ในหน้านั้นเอง —
// ดูตรงไหนแก้ตรงนั้น". The reader "Aa" DID drive this window all along, but พี่เปา could not find
// it, P'Aim could not find it, and it took reading the source to know — so it may as well not
// exist. This zoom lives in the window itself and is deliberately NOT the global Aa: reaching out
// and reflowing the editor behind you is not what "ขยายตรงนี้" means.
// It divides the em-width rather than multiplying the font: the page is always 100cqw wide, so
// scaling the font alone would push the sheet past the window (ui-standards §2: a popup must
// never scroll sideways). Fewer ems = bigger text, no h-scroll, at zoom 1 = parity untouched.
const PREVIEW_ZOOM_KEY = 'pleng.editor.previewZoom'
const clampZoom = (v) => Math.min(4, Math.max(0.5, Math.round(v * 10) / 10))
const previewZoom = ref((() => {
  try {
    const v = parseFloat(localStorage.getItem(PREVIEW_ZOOM_KEY))
    if (v >= 0.5 && v <= 4) return v
  } catch { /* ignore bad storage */ }
  return 1
})())
// persisted: P'Aim sets his reading size ONCE, not on every re-open (the window forgetting is half
// of why it "ไม่ใช้พื้นที่เต็ม")
watch(previewZoom, (v) => { try { localStorage.setItem(PREVIEW_ZOOM_KEY, String(v)) } catch { /* ignore */ } })
function bumpPreviewZoom(d) { previewZoom.value = clampZoom(previewZoom.value + d) }
const previewZoomPct = computed(() => Math.round(previewZoom.value * 100))

// how many ems fit on one sheet line = column px ÷ reader font px. The preview renders exactly
// this many ems, so its bar wrapping matches the แผ่นเพลง page at the current viewport + Aa size.
// Two different floors, and conflating them is a bug: 20em guards a BAD MEASUREMENT, while the
// zoom is the user deliberately asking for fewer ems. Applying the 20em floor after the division
// silently killed the zoom on a phone (the column there is only ~21em, so any zoom hit the floor
// and + did nothing — measured at 412px). Guard the measurement, then let the zoom through, with
// its own much lower floor so a bar can still fit on a line (no sideways scroll · ui-standards §2).
const PREVIEW_MIN_EM = 8
const previewEmWidth = computed(() => {
  const fs = 16 * (readingFontScale.value || 1)
  const raw = sheetColW.value > 0 ? sheetColW.value / fs : 42.05 // fall back to A4 ratio before first measure
  const measured = Math.max(20, raw)
  return Math.max(PREVIEW_MIN_EM, measured / previewZoom.value)
})
const previewPageStyle = computed(() => ({ fontSize: `calc(100cqw / ${previewEmWidth.value.toFixed(2)})` }))
// keep the window on-screen (and sized within it) when the viewport shrinks; refresh mobile flag
function onFloatResize() {
  narrow.value = isNarrow()
  measureShell() // the shell bar's height changes with the breakpoint → keep the edhead's sticky top true
  measureSheetCol() // the reading column tracks the viewport → re-measure so the preview keeps parity
  if (narrow.value || !floatEl.value) return
  if (sheetWinSize.value) {
    sheetWinSize.value = {
      width: Math.min(sheetWinSize.value.width, window.innerWidth - 8),
      height: Math.min(sheetWinSize.value.height, window.innerHeight - 8),
    }
  }
  if (sheetWinPos.value) {
    const r = floatEl.value.getBoundingClientRect()
    sheetWinPos.value = clampWin(sheetWinPos.value, r.width, r.height)
  }
}
onMounted(() => {
  window.addEventListener('resize', onFloatResize)
  measureShell()
  nextTick(measureShell) // the header may not be in the DOM yet on the first pass
  measureSheetCol()
})
onUnmounted(() => {
  window.removeEventListener('resize', onFloatResize)
  edheadRO?.disconnect()
})
// measure fresh each time the preview opens (the reading column may have changed while it was
// closed), and re-clamp the remembered box — a size saved on a wide monitor must not strand the
// window off-screen on a laptop.
watch(sheetWinOpen, (open) => {
  if (!open) return
  nextTick(() => {
    measureSheetCol()
    onFloatResize()
  })
})
// a bar's clean render: a one-line, one-bar content object the SongSheet can draw. Words
// come from the lens verse (if shown) so the render matches what the singer sees.
function barContent(li, bi) {
  const line = lines.value[li]
  if (!line || !line.bars[bi]) return { key: opts.key, lines: [] }
  const isFirst = bi === 0
  const isLast = bi === line.bars.length - 1
  // Each bar renders as its own mini-sheet, so line-level heads/tails must NOT repeat:
  // section + hook marker show only on the first bar, จบเพลง/ป้าย only on the last —
  // otherwise the "♦ ร้อง 1" head stamps every box (B051).
  const one = {
    ...line,
    bars: [line.bars[bi]],
    cont: false,
    section: isFirst ? line.section : '',
    marker: isFirst ? line.marker : '',
    end: isLast ? line.end : false,
    label: isLast ? line.label : '',
  }
  const serial = serializeLine(one)
  // Show the selected verse's words under the notes so the preview matches the sung
  // sheet (B050) — a melody stanza carries no lyric of its own, so pull this bar's
  // slice from the lens row at its global slot offset (same mapping as resolveContent).
  if (lensActive.value && lensRow.value) {
    let slot = slotStarts.value[`${li}-${bi}-0`] ?? 0
    for (const item of serial) {
      if (item.type === 'segment') {
        const n = syllableSlots(item.note || '')
        const slots = lensRow.value.syllables.slice(slot, slot + n)
        item.lyric = joinSyllables(slots)
        item.syllables = slots
        slot += n
      }
    }
  }
  return { version: 2, key: opts.key, timeSignature: opts.timeSignature, lines: [serial] }
}
// B061 (A): the live inline preview above each line's edit strip — the SAME jianpu the sheet
// draws (octave dots · held dashes · ties), rendered from the current line as you type, no
// button. Now rendered PER BAR (reusing barContent, same as the B035 per-bar "ดูผล") so you
// see each ห้อง resolve on its own in real time — bars laid out left→right with a barline
// between, matching the edit strip below. Read-only; the boxes below stay the edit surface.
// livePreview lets a small screen turn the strip off (default on).
const livePreview = ref(true)
const settingsOpen = ref(true) // B060: inline song-settings card, open by default
function lineHasNotes(li) {
  const line = lines.value[li]
  return !!line && line.bars.some((b) => b.segments.some((s) => (s.note || '').trim()))
}
// A (editor-preview-refine): does THIS ห้อง carry any note? — gate for the per-bar live preview,
// so an empty bar shows only its edit boxes (nothing to render yet).
function barHasNotes(li, bi) {
  const bar = lines.value[li]?.bars[bi]
  return !!bar && bar.segments.some((s) => (s.note || '').trim())
}

// dropping the lens/stanza switch also clears any stale per-bar renders so the fresh
// stanza starts in edit mode (indices would otherwise point at the wrong bars)
watch([activeStanza, lines], () => {
  shownBars.value = {}
})

// ---------- studio shell (phase 4: menus/panels) ----------
// Set-once / occasional things live in menus now (เพลง = New/Open/Properties,
// จัดการ = drafts/history/download/delete) opened as panels, so the editor page
// stays as clean as the wireframe.
const activePanel = ref(null) // 'open' | 'history' | 'drafts'
const pendingPick = ref('') // Open dialog: the song chosen, applied only on "เปิดเพลง"
function openPanel(p) {
  openMenu.value = null
  viewMode.value = 'edit'
  if (p === 'open') pendingPick.value = pickerId.value
  activePanel.value = p
}
function closePanel() {
  activePanel.value = null
}
// Open dialog OK: apply the pick (the pickerId watcher loads it; '' = เพลงใหม่)
function confirmOpen() {
  pickerId.value = pendingPick.value
  closePanel()
}
// bring back a previously downloaded JSON to keep editing (the anonymous "save")
function manageUpload() {
  openMenu.value = null
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = 'application/json,.json'
  inp.onchange = async () => {
    const file = inp.files && inp.files[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      applyRow({
        number: data.number ?? null,
        title_th: data.title_th || '',
        title_en: data.title_en || '',
        content: data.content || data,
      })
      editingId.value = null
      currentDraftId.value = null
      viewMode.value = 'edit'
      saveMsg.value = '📂 โหลดไฟล์ JSON แล้ว — แก้ต่อได้เลย'
      nextTick(resetHistory)
    } catch {
      saveMsg.value = '❌ ไฟล์ JSON ไม่ถูกต้อง'
    }
  }
  inp.click()
}
function manageDelete() {
  openMenu.value = null
  deleteSong()
}
// NOTE: the editor strip itself is the read+edit surface (note boxes + a lyric box under
// each note, aligned). We tried a separate per-line sheet preview above it (US-D05) but it
// duplicated the strip and pushed the boxes off-screen — removed per พี่เอม. Full-song
// sheet is still the 🎼 mode button.
const panelTitle = computed(
  () =>
    ({ open: 'เลือกเพลงเพื่อแก้', history: 'ประวัติการแก้ไข', drafts: 'งานร่าง / รอตรวจ' })[
      activePanel.value
    ] || '',
)

// ---------- mode contract wiring (DS-04) — kept last: depends on the editing state above ----------
// The shell hands us the current song. Load it into the editor whenever a genuinely new
// one arrives (route navigation / shell load) — NOT on our own edits (props.song is fed
// from the shell's loadedSong, which changes only on load, so there is no echo loop).
watch(
  () => props.song,
  (s) => {
    if (!s) return
    applyRow(s)
    editingId.value = s.id ?? null
    currentDraftId.value = null
    openDraft.value = null
    saveMsg.value = ''
    nextTick(resetHistory)
  },
  { immediate: true },
)

// Broadcast every edit upward so the shell's central song (and the ดู/แผ่น previews) stay
// in sync — this is what makes "switch mode, work is not lost" true.
const songOut = computed(() => ({
  id: editingId.value,
  number: meta.number,
  title_th: meta.title_th,
  title_en: meta.title_en,
  content: previewContent.value,
}))
watch(songOut, (s) => emit('change', s), { immediate: true })

// Surfaced for US-D01 unit tests (save a draft · reopen an existing draft to continue).
// These are the same functions the dock button / drafts panel call — exposing them lets
// the AC be asserted without reaching through teleported chrome.
defineExpose({
  saveDraft, loadDraft, meta, editingId, currentDraftId, previewContent,
  // issues9/issues10: บันทึกร่าง's seat on the bar + throwing away one's own draft.
  deleteDraft, editItems,
  // D3/D2/D4 identity tests: the derived facts + the one label/action the dock actually uses.
  openDraft, pendingDrafts, reviewingDraft, openPendingDraft, pendingForThisSong, pendingAlert,
  saveLabel, saveName, primaryAction, loadSong, loadDrafts,
  // B097 undo/redo tests: drive the same doc/view state + navigation the UI drives.
  opts, stanzas, arrangement, activeStanza, lensChoice,
  undo, redo, selectStanza, focusRow, addStanza, setSyl, applyChordAt,
  toggleAfterEachVerse, // B102 — "ร้องรับทุกข้อ" refrain directive helper (AC-5 tests)
  history, histPos,
  // B100 leave-warning tests: dirty flag + save/load clean checkpoints.
  isDirty, saveDirect,
})
</script>

<template>
  <div style="padding-bottom: 150px">
    <!-- editor chrome teleported into the app-wide ShellBar — only while this mode is on
         (the shell owns the mode toggle + the static title for view/sheet) -->
    <Teleport to="#shell-title">
      <template v-if="editing">
        <span class="sb-sep" aria-hidden="true"></span>
        <input v-model="meta.title_th" class="sb-title" placeholder="ชื่อเพลง" aria-label="ชื่อเพลง" />
      </template>
    </Teleport>
    <Teleport to="#shell-menus">
      <!-- B071: the "เพลง ▾" menu is gone from the top bar. สร้างเพลงใหม่ / เลือกเพลง now live
           as buttons on the "⚙ ตั้งค่าเพลง" row (#pk-settings); "ออกจากเพลงนี้" was cut
           entirely (P'Aim 10 ก.ค. — confusing, not needed). Only "จัดการ ▾" stays up here. -->
      <!-- help-in-context: link to "คู่มือทำเพลง" (notation standard), new tab so keying isn't lost -->
      <a
        v-if="editing"
        class="sb-text ed-help-link"
        :href="notationHelpUrl"
        target="_blank"
        rel="noopener"
        aria-label="คู่มือทำเพลง (เปิดแท็บใหม่)"
      ><Icon name="circle-help" :size="18" /> คู่มือทำเพลง</a>
      <div v-if="editing" class="sb-menu">
        <button class="sb-text" :aria-expanded="openMenu === 'manage'" aria-haspopup="true" @click.stop="toggleMenu('manage')">จัดการ</button>
        <div v-if="openMenu === 'manage'" class="sb-dropdown" role="menu">
          <!-- B079: JSON/PDF/MP3 download lives ONLY in the dock ExportTool now (single source
               of action · Hick's Law · ui-standards §2). "จัดการ" keeps import + song admin. -->
          <button class="sb-item" role="menuitem" @click="manageUpload"><Icon name="folder-open" /> อัปโหลด JSON</button>
          <template v-if="loggedIn && !legacy">
            <div class="sep"></div>
            <button class="sb-item" role="menuitem" @click="openPanel('drafts')"><Icon name="file-text" /> งานร่าง / รอตรวจ</button>
            <button v-if="editingId" class="sb-item" role="menuitem" @click="openPanel('history')"><Icon name="undo-2" /> ประวัติการแก้ไข</button>
          </template>
          <button v-if="isApprover && loggedIn && editingId && !reviewingDraft" class="sb-item sb-danger" role="menuitem" @click="manageDelete"><Icon name="x" /> ลบเพลง</button>
        </div>
      </div>
    </Teleport>

    <!-- ===== edit workspace: parts rail + the existing editor (unchanged) ===== -->
    <div v-show="viewMode === 'edit'" class="studio-app" :class="{ 'rail-hidden': railHidden }">
      <nav id="studioRail" class="rail" :class="{ open: drawerOpen }" aria-label="ส่วนของเพลง">
        <div class="rail-mhead">
          <span><Icon name="list-music" :size="18" /> ส่วนของเพลง</span>
          <button class="rail-x" aria-label="ปิด" @click="closeDrawer"><Icon name="x" :size="16" /></button>
        </div>
        <!-- ===== โครงเพลง — the one list of ท่อน (arrangement rows), in singing order.
             Drag ⠿ or ▲▼ to reorder · click a name to rename · ♪ picks its melody. Replaces
             the old 3 groups (ทำนอง / เนื้อร้อง / ขั้นสูง→ลำดับเพลง) and the bottom block. ===== -->
        <div class="rail-group rg-main">โครงเพลง</div>
        <p class="rail-hint no-print">ลากจัดลำดับ · คลิกชื่อเพื่อแก้</p>
        <div
          v-for="(row, ri) in arrangement"
          :key="ri"
          class="srow"
          :class="{ sel: ri === lensChoice, drag: ri === dragFromRow, over: ri === dragOverRow && ri !== dragFromRow }"
          draggable="true"
          @click="railSelectRow(ri)"
          @dragstart="onRowDragStart(ri, $event)"
          @dragover.prevent="onRowDragOver(ri)"
          @dragleave="dragOverRow = -1"
          @drop.prevent="onRowDrop(ri)"
          @dragend="onRowDragEnd"
        >
          <!-- pointer-only drag handle (touch). Keyboard/AT reorder = the ▲▼ buttons below,
               so the grip is aria-hidden — a role=button here would advertise an activation
               that Enter/Space can't perform (WCAG 4.1.2 / 2.1.1). -->
          <span
            class="grip"
            title="ลากเพื่อจัดลำดับ"
            aria-hidden="true"
            @pointerdown="onGripPointerDown(ri, $event)"
            @click.stop
          ><Icon name="grip-vertical" :size="16" /></span>
          <span class="snum">{{ ri + 1 }}</span>
          <input
            v-if="editingLabelId === ri && editingLabelWhere === 'rail'"
            v-model="row.label"
            v-focus
            class="snameinp"
            aria-label="แก้ชื่อท่อน"
            @click.stop
            @keydown.enter.prevent="commitRename"
            @keydown.esc.prevent="cancelRename"
            @blur="commitRename"
          />
          <span
            v-else
            class="sname"
            :title="rowLabel(row, ri) + ' — คลิกเพื่อแก้ชื่อ'"
            @click.stop="startRename(ri, 'rail')"
          >{{ rowLabel(row, ri) }}</span>
          <span class="mchip" :title="'ทำนอง ' + row.stanza + ' · ' + stanzaPreview(row.stanza) + ' — เปลี่ยนทำนองได้ที่หัวท่อน'">♪{{ row.stanza }}</span>
          <!-- MP4: melody↔lyric pairing status (spots an import that swapped tune/words) -->
          <span class="pair-badge" :class="pairInfos[ri].ok ? 'good' : 'bad'" :title="pairInfos[ri].label" :aria-label="pairInfos[ri].label">{{ pairInfos[ri].text }}</span>
          <span class="updown" @click.stop>
            <button aria-label="ย้ายท่อนขึ้น" :disabled="ri === 0" @click="moveRow(ri, -1)">▲</button>
            <button aria-label="ย้ายท่อนลง" :disabled="ri === arrangement.length - 1" @click="moveRow(ri, 1)">▼</button>
          </span>
          <button v-if="arrangement.length > 1" class="srow-del" title="ลบท่อนนี้" aria-label="ลบท่อนนี้" @click.stop="removeRow(ri)"><Icon name="trash-2" :size="14" /></button>
        </div>
        <button class="addsec" @click="addRow(); closeDrawer()"><Icon name="plus" :size="16" /> เพิ่มท่อน</button>

        <div class="rail-sep"></div>
        <!-- ทำนอง (โน้ต): secondary group, collapsed — for editing notes / reusing a melody.
             Adding a ท่อน above already gives it a melody, so most authors never open this. -->
        <button class="rail-group rg-toggle" :aria-expanded="melodyOpen" @click="melodyOpen = !melodyOpen">
          <Icon name="chevron-down" :size="14" class="rg-chev" :class="{ 'rg-chev-open': melodyOpen }" /> ทำนอง (โน้ต)
        </button>
        <template v-if="melodyOpen">
          <p class="rail-hint no-print">สำหรับแก้โน้ต / ใช้ทำนองซ้ำ — ปกติไม่ต้องแตะ</p>
          <div v-for="(s, si) in stanzas" :key="s.id" class="rail-rowwrap mel" :class="{ sel: si === activeStanza }">
            <button class="rail-row mel-row" @click="railSelectStanza(si)">
              <Icon name="music" :size="17" />
              <span class="mel-row-main">ทำนอง {{ s.id }}<small class="mel-row-sub">{{ stanzaPreview(s.id) }}</small></span>
            </button>
            <button v-if="stanzas.length > 1" class="rail-del" title="ลบทำนองนี้" aria-label="ลบท่อนทำนองนี้" @click.stop="removeStanza(si)"><Icon name="trash-2" :size="14" /></button>
          </div>
          <button class="rail-row add" @click="addStanza(); closeDrawer()"><Icon name="plus" :size="16" /> เพิ่มทำนอง</button>
        </template>
      </nav>
      <div class="rail-backdrop" :class="{ open: drawerOpen }" aria-hidden="true" @click="closeDrawer"></div>
      <!-- B070: the top-nav "Aa" reader size (store.readingFontScale) scales the edit page too.
           font-size is set in rem here, so the em-based jianpu previews (SongSheet) and any
           inherited text grow/shrink, while the note keypad + edit boxes (fixed px/rem) keep
           their grid — the Aa button never distorts the editing controls. -->
      <div class="content ed-read-scale" :style="{ fontSize: readingFontScale + 'rem' }">
    <!-- B060: song settings inline. These used to hide in the "เพลง ▾ ▸ ตั้งค่า" menu, which
         พี่เปา avoided (afraid a menu would switch the page). Now every field sits right on
         the sheet being edited. "✓ ตรวจแล้ว" marks the song human-checked (catalog reads it). -->
    <div id="pk-settings" class="card ed-settings no-print">
      <div class="ed-settings-head">
        <button class="ed-settings-toggle" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen">
          <Icon name="settings" :size="16" /> ตั้งค่าเพลง
          <Icon name="chevron-down" :size="15" :class="{ 'ed-chev-open': settingsOpen }" />
        </button>
        <span class="ed-grow"></span>
        <!-- B071: song file actions moved here from the removed "เพลง ▾" top-bar menu -->
        <div class="ed-song-acts">
          <button class="ed-song-act" @click="fileNew"><Icon name="file-plus" :size="15" /> สร้างเพลงใหม่</button>
          <button class="ed-song-act" @click="openPanel('open')"><Icon name="folder-open" :size="15" /> เลือกเพลง</button>
        </div>
        <!-- "✓ ตรวจแล้ว" writes songs.verified — RLS lets ONLY approvers (พี่เปา) do that,
             so gate the button on isApprover: editors (ติว) never saw a button whose click
             the DB would reject. -->
        <button
          v-if="isApprover"
          class="ed-verify"
          :class="{ on: verified }"
          :aria-pressed="verified"
          :title="verified ? 'ตรวจแล้ว — กดเพื่อยกเลิก' : 'ทำเครื่องหมายว่าตรวจเพลงนี้แล้ว'"
          @click="markVerified"
        >
          <Icon :name="verified ? 'badge-check' : 'check'" :size="15" /> {{ verified ? 'ตรวจแล้ว' : 'ตรวจแล้ว?' }}
        </button>
      </div>
      <div v-if="settingsOpen" class="ed-settings-grid">
        <label>เลขเพลง<input v-model.number="meta.number" type="number" placeholder="เลขเพลง" /></label>
        <label>ชื่อเพลง (ไทย)<input v-model="meta.title_th" placeholder="ชื่อเพลง (ไทย)" /></label>
        <label>ชื่อเพลง (อังกฤษ)<input v-model="meta.title_en" placeholder="ถ้ามี" /></label>
        <label>คีย์<ComboSelect v-model="opts.key" :options="KEYS" width="100%" /></label>
        <label>จังหวะ<ComboSelect v-model="opts.timeSignature" :options="TIME_SIGNATURES" allow-custom width="100%" /></label>
        <label>ความเร็ว (BPM)<input v-model.number="opts.bpm" type="number" min="30" max="240" placeholder="BPM" /></label>
        <label>ธีม<ComboSelect v-model="meta.theme" :options="themeOptions" width="100%" /></label>
        <label>หมวด<ComboSelect v-model="meta.category" :options="CATEGORY_OPTIONS" width="100%" /></label>
      </div>
    </div>

    <!-- D4 (US AC-6) — this song has a draft waiting for review that is NOT the one on screen.
         Publishing from here strands it silently, so say so on arrival, not only at the button.
         Inline, not a toast: the fact is a lasting state and a snackbar leaves (HIG Feedback).
         aria-live announces it when it appears mid-session (loadDrafts resolves after loadSong). -->
    <div v-if="pendingAlert" class="card pending-alert no-print" role="status" aria-live="polite">
      <!-- ⚠️ as text, matching .migrate-note below: Icon.vue renders `ICONS[name] || ''`, so a
           glyph it doesn't carry (it has no warning triangle) would vanish without an error -->
      <strong>⚠️ {{ draftAuthor(pendingAlert) }}ส่งร่างของเพลงนี้มารอตรวจ</strong>
      <span class="muted"> — เผยแพร่ทับตอนนี้ ร่างนั้นจะยังค้างรอตรวจอยู่</span>
      <div class="pa-actions">
        <button class="pa-go" @click="loadDraft(pendingAlert)">
          ดูร่างของ{{ draftAuthor(pendingAlert) }}
        </button>
        <button @click="dismissPendingAlert">แก้ฉบับเผยแพร่ต่อ</button>
      </div>
    </div>

    <!-- review banner (contextual — while an approver is reviewing SOMEONE ELSE's draft) -->
    <div v-if="reviewingDraft" class="card review-banner no-print" role="status" aria-live="polite">
      <strong>🔍 กำลังตรวจฉบับร่างของ {{ draftAuthor(reviewingDraft) }}</strong>
      <span class="muted"> — แก้ไขในฟอร์มด้านล่างได้ก่อนอนุมัติ</span>
      <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; align-items: center">
        <button @click="approve">✅ อนุมัติและเผยแพร่</button>
        <button class="danger" @click="reject">↩ ส่งกลับให้แก้</button>
        <input v-model="reviewComment" placeholder="ความเห็นถึงผู้เขียน (ถ้ามี)" style="flex: 1; min-width: 200px" />
      </div>
    </div>

    <!-- picker → "เพลง › Open" panel · metadata → "เพลง › Properties" panel (below) -->

    <!-- migrate notice: v1 song auto-split into v2, some rows need a human check -->
    <div v-if="migrateWarnings.length" class="card no-print migrate-note">
      <strong>⚠️ แปลงจากรูปแบบเดิม (v1) — ตรวจ {{ migrateWarnings.length }} จุดที่พยางค์ไม่พอดีโน้ต</strong>
      <ul class="muted" style="margin: 6px 0 0 18px">
        <li v-for="(w, i) in migrateWarnings" :key="i">
          โน้ต "{{ w.note }}" ต้องการ {{ w.slots }} พยางค์ แต่เนื้อ "{{ w.lyric }}" มี {{ w.got }} — แก้ในกล่องใต้โน้ต หรือแผง “📝 แก้เนื้อแบบย่อหน้า”
        </li>
      </ul>
    </div>

    <!-- ===== edit header (edhead) — ps2 prototype §③: breadcrumb OPENS the rail (the rail
         is the only navigation, no duplicate ท่อน/ข้อ dropdowns · B031/B003/E1) · in-context
         help · layout / whole-song-preview toggles · line-level quick structure ===== -->
    <div id="pk-editor" class="edhead no-print" :style="{ top: shellH + 'px' }">
      <button
        class="ed-crumb"
        aria-label="เปิดแถบองค์ประกอบเพลง (ทำนอง·เนื้อ·ลำดับ)"
        title="องค์ประกอบเพลง — เลือกท่อน/ข้อจากแถบซ้าย"
        @click.stop="toggleCatalog"
      >
        <Icon name="panel-left-open" :size="17" /> <span class="ed-crumb-t">{{ crumbLabel }}</span>
      </button>
      <button class="ed-ico" :class="{ on: showTip }" title="วิธีใช้โต๊ะแก้" aria-label="วิธีใช้โต๊ะแก้" @click="showTip = !showTip"><Icon name="info" :size="16" /></button>
      <button class="ed-ico" :class="{ on: showLegend }" title="ความหมายสัญลักษณ์โน้ต" aria-label="ความหมายสัญลักษณ์โน้ต" @click="showLegend = !showLegend"><Icon name="circle-help" :size="16" /></button>
      <span class="ed-grow"></span>
      <div class="ed-lay" role="group" aria-label="เค้าโครงห้อง">
        <button :class="{ on: barLayout === 'stack' }" :aria-pressed="barLayout === 'stack'" @click="barLayout = 'stack'">1 ห้อง/แถว</button>
        <button :class="{ on: barLayout === 'flow' }" :aria-pressed="barLayout === 'flow'" @click="barLayout = 'flow'">ต่อกัน</button>
      </div>
      <!-- พรีวิว group: A = live per-bar preview inline · B = pop-out floating whole-song window -->
      <span class="ed-preview-grp" role="group" aria-label="พรีวิว">
        <button class="ed-chip" :class="{ act: livePreview }" :aria-pressed="livePreview" title="ตัวอย่างสด — เห็นผลแต่ละห้องระหว่างพิมพ์ (เหนือบรรทัด)" @click="livePreview = !livePreview">
          <Icon name="eye" :size="15" /> ตัวอย่างสด
        </button>
        <button class="ed-chip" :class="{ act: sheetWinOpen }" :aria-pressed="sheetWinOpen" title="ดูผลทั้งเพลง — เปิดหน้าต่างลอยแผ่นเพลง แก้ไปดูไป (ลากได้ · ปิดได้)" @click="toggleSheetWin">
          <Icon name="picture-in-picture-2" :size="15" /> ดูผลทั้งเพลง
        </button>
      </span>
      <button class="ed-ico" title="ฟังท่อนนี้" aria-label="ฟังท่อนนี้" @click="playStanza"><Icon name="play" :size="16" /></button>
      <span class="ed-quick" aria-label="โครงเพลงด่วน (บรรทัดที่กำลังแก้)">
        <button class="ed-ico" :class="{ on: curLineHook }" title="ทำเครื่องหมายท่อนฮุกให้บรรทัดที่กำลังแก้" aria-label="ท่อนฮุก" @click="qHook"><Icon name="fishing-hook" :size="16" /></button>
        <button class="ed-ico" :class="{ on: curLineRepeat }" title="เล่นซ้ำบรรทัดที่กำลังแก้ ‖: :‖" aria-label="เล่นซ้ำบรรทัด" @click="qRepeat"><Icon name="repeat" :size="16" /></button>
        <!-- B086: move the active line up/down; each verse's words follow the melody line -->
        <button class="ed-ico ed-mvline" title="ย้ายบรรทัดที่กำลังแก้ขึ้น (เนื้อทุกข้อตามไปด้วย)" aria-label="ย้ายบรรทัดขึ้น" :disabled="activeLine === 0" @click="moveLine(-1)"><span aria-hidden="true">▲</span></button>
        <button class="ed-ico ed-mvline" title="ย้ายบรรทัดที่กำลังแก้ลง (เนื้อทุกข้อตามไปด้วย)" aria-label="ย้ายบรรทัดลง" :disabled="activeLine === lines.length - 1" @click="moveLine(1)"><span aria-hidden="true">▼</span></button>
        <button class="ed-ico" title="ทำซ้ำบรรทัดที่กำลังแก้ (วางถัดไปทันที · เนื้อทุกข้อตามไปด้วย) — ถ้าอยากวางที่ท่อนอื่น ใช้ ⋯ › คัดลอกบรรทัด" aria-label="ทำซ้ำบรรทัด" @click="qCopyLine"><Icon name="copy" :size="16" /></button>
        <button class="ed-ico danger-ic" title="ลบบรรทัดที่กำลังแก้" aria-label="ลบบรรทัด" @click="qDeleteLine"><Icon name="trash-2" :size="16" /></button>
      </span>
      <span class="ed-more-wrap">
        <button class="ed-ico" :class="{ on: lineMoreOpen }" :aria-expanded="lineMoreOpen" title="เพิ่มเติม — ชื่อบรรทัด · ต่อห้อง · ป้าย (Fine/D.C.)" aria-label="เพิ่มเติม" @click.stop="toggleLineMore"><Icon name="ellipsis" :size="16" /></button>
        <div v-if="lineMoreOpen && curLine()" class="ed-more-menu" role="menu">
          <div class="ed-more-title">บรรทัด {{ activeLine + 1 }}</div>
          <input v-model="curLine().section" class="ed-opt-input" placeholder="ชื่อบรรทัด (เว้นว่างได้)" aria-label="ชื่อกำกับบรรทัดนี้" />
          <label v-if="activeLine > 0" class="ed-opt-check"><input v-model="curLine().cont" type="checkbox" /> ⤷ ต่อห้องจากบรรทัดก่อน</label>
          <!-- B056: "จบเพลง" ยกออกไปเป็นปุ่มเห็นชัดในหัวแต่ละบรรทัด (ed-line-end) แล้ว -->
          <input v-model="curLine().label" class="ed-opt-input" placeholder="ป้าย เช่น Fine, D.C. al Fine" aria-label="ข้อความกำกับท้ายบรรทัด" />
          <!-- B101: copy this บรรทัด onto the clipboard to วาง it in another ท่อน (or a new one).
               ทำซ้ำ (header ⧉) drops a copy right here; คัดลอก moves it anywhere. -->
          <div class="ed-more-sep" role="separator"></div>
          <button class="ed-more-act" aria-label="คัดลอกบรรทัดนี้ไปวางที่ท่อนอื่น" @click="copyLineToClip(activeLine)"><Icon name="clipboard-copy" :size="14" /> คัดลอกบรรทัด (ไปวางที่ท่อนอื่น)</button>
          <!-- B091: clear just the words (all verses) OR just the notes of this line -->
          <div class="ed-more-sep" role="separator"></div>
          <button class="ed-more-act" @click="qClearLyrics"><span aria-hidden="true">🧹</span> ล้างเนื้อบรรทัดนี้ (ทุกข้อ · โน้ตอยู่)</button>
        </div>
      </span>
    </div>
    <!-- (?) legend + (i) how-to — in-context help, hidden until asked (prototype) -->
    <div v-if="showLegend" class="ed-legend no-print">
      <span><b>1–7</b> ระดับเสียง</span><span><b>5'</b> จุดบน=สูงทบ</span><span><b>.5</b> จุดล่าง=ต่ำทบ</span>
      <span><b>5_</b> ขีดใต้=เขบ็ต</span><span><b>5.</b> จุดขวา=เพิ่มครึ่ง</span><span><b>6~6</b> โค้ง=เอื้อน</span>
      <span><b>–</b> ลากเสียง</span><span><b>|</b> เส้นแบ่งห้อง</span>
    </div>
    <p v-if="showTip" class="muted no-print ed-tip">
      พิมพ์โน้ตในช่อง — <b>1 ช่อง = 1 โน้ต</b> · กด <b>Enter</b>/<b>เว้นวรรค</b> ขึ้นช่องถัดไป · <b>← →</b> เลื่อนช่อง ·
      จุด/ขีด/เครื่องหมายอื่นแตะช่องแล้วจิ้มปุ่มแถบล่าง · แต่ละห้องกด “ดูผล” เห็นแบบแผ่นเพลง ·
      เนื้อร้องพิมพ์ในกล่องใต้โน้ต หรือแผง “📝 แก้เนื้อแบบย่อหน้า” (เลือกข้อจากแถบซ้าย)
      <router-link class="pk-info" style="margin-left: 6px" :to="{ path: '/guide', hash: '#notation' }" aria-label="คู่มือโน้ตตัวเลข">เปิดคู่มือ →</router-link>
    </p>
    <!-- aria-live: announce the new order after a drag/▲▼ move (WCAG 2.5.7 · screen readers) -->
    <div class="sr-only" aria-live="polite">{{ reorderMsg }}</div>

    <!-- ===== canvas section header for the selected ท่อน — rename + melody + reorder right
         where you edit (SX2/SX3/SX5). The note/word/beat editor below is unchanged (SX7). ===== -->
    <div v-if="lensActive" class="cshead no-print" :style="csheadStyle">
      <span class="grip" aria-hidden="true"><Icon name="grip-vertical" :size="16" /></span>
      <span class="cs-num">{{ lensChoice + 1 }}</span>
      <input
        v-if="editingLabelId === lensChoice && editingLabelWhere === 'canvas'"
        v-model="lensRow.label"
        v-focus
        class="cs-name-inp"
        aria-label="แก้ชื่อท่อน"
        @keydown.enter.prevent="commitRename"
        @keydown.esc.prevent="cancelRename"
        @blur="commitRename"
      />
      <span
        v-else
        class="cs-name"
        role="button"
        tabindex="0"
        title="คลิกเพื่อแก้ชื่อท่อน"
        @click="startRename(lensChoice, 'canvas')"
        @keydown.enter.prevent="startRename(lensChoice, 'canvas')"
      >{{ rowLabel(lensRow, lensChoice) }}</span>
      <ComboSelect
        class="cs-mel"
        :model-value="lensRow.stanza"
        :options="stanzaIdOptions"
        aria-label="เลือกทำนองของท่อนนี้ (ตัวเลือกโชว์พรีวิวโน้ต)"
        width="150px"
        @update:model-value="setRowStanza($event)"
      />
      <label class="cs-key">คีย์
        <ComboSelect
          :model-value="lensRow.key"
          :options="rowKeyOptions"
          aria-label="เปลี่ยนคีย์ท่อนนี้"
          width="94px"
          @update:model-value="lensRow.key = $event"
        />
      </label>
      <!-- B102 — "ร้องรับทุกข้อ": mark this ท่อน as the refrain sung after every verse. Writes
           the strophic directive; the sheet still shows it once, playback repeats it. -->
      <label class="cs-refrain" title="ให้ฝึกร้องเล่นท่อนนี้ (ท่อนรับ) ซ้ำหลังทุกข้อ — แผ่นเพลงยังโชว์ครั้งเดียว">
        <input
          type="checkbox"
          :checked="!!lensRow.afterEachVerse"
          aria-label="ร้องรับทุกข้อ"
          @change="toggleAfterEachVerse(lensChoice, $event.target.checked)"
        /> ร้องรับทุกข้อ
      </label>
      <span class="cs-grow"></span>
      <span class="updown">
        <button aria-label="ย้ายท่อนขึ้น" :disabled="lensChoice === 0" @click="moveRow(lensChoice, -1)">▲</button>
        <button aria-label="ย้ายท่อนลง" :disabled="lensChoice === arrangement.length - 1" @click="moveRow(lensChoice, 1)">▼</button>
      </span>
      <button v-if="arrangement.length > 1" class="cs-del" title="ลบท่อนนี้" aria-label="ลบท่อนนี้" @click="removeRow(lensChoice)"><Icon name="trash-2" :size="15" /></button>
    </div>

    <p v-if="lensActive" class="muted no-print" style="margin: 0 0 8px">
      พิมพ์คำร้องในช่องใต้โน้ต · ช่องสีแดง = ยังไม่ได้ใส่คำ · ช่องเส้นประ = โน้ตลากเสียง (เว้นว่างได้ หรือใส่ “-”)
    </p>

    <!-- B101: clipboard tray — appears only while a บรรทัด/ห้อง is on the clipboard, so the
         normal editor stays clean. Tells you what is held + how to place it, and (for a line)
         the one-tap "วางเป็นท่อนใหม่". The inline "วาง…" buttons live down at each ＋ zone. -->
    <div v-if="clip" class="ed-clip no-print" role="status" aria-live="polite">
      <span class="ed-clip-what">
        <Icon name="clipboard-copy" :size="15" />
        คัดลอกไว้: <b>{{ clip.kind === 'line' ? 'บรรทัด' : 'ห้อง' }}</b>
        <span class="muted">({{ clip.from }})</span>
      </span>
      <span class="ed-clip-hint">— เปิดท่อนที่ต้องการ แล้วกด “วาง{{ clip.kind === 'line' ? 'บรรทัด' : 'ห้อง' }}” (โน้ต·คอร์ด ไม่รวมเนื้อ)</span>
      <button v-if="clip.kind === 'line'" class="ed-clip-new" title="สร้างท่อน (ทำนอง) ใหม่ แล้ววางบรรทัดนี้เป็นบรรทัดแรก" @click="pasteLineAsStanza">
        <Icon name="plus" :size="13" /> วางเป็นท่อนใหม่
      </button>
      <button class="ed-clip-x" aria-label="ยกเลิกการคัดลอก" title="ยกเลิกการคัดลอก" @click="clearClip">✕ ยกเลิก</button>
    </div>

    <!-- line editor (edits the ACTIVE stanza) — clean strip like the wireframe: the
         busy per-line / per-bar controls are tucked behind ⋯ so the notes read first,
         but every one of them is still here (revealed on tap, never removed) -->
    <div
      v-for="(line, li) in lines"
      :key="`${activeStanzaId}-${li}`"
      class="ed-line"
      :class="{ 'line-active': li === activeLine }"
      @focusin="editorFocusIn($event, li)"
    >
      <div class="ed-line-head no-print">
        <strong class="ed-line-no">บรรทัด {{ li + 1 }}</strong>
        <span v-if="line.section" class="ed-line-tag">{{ line.section }}</span>
        <span v-if="line.marker" class="ed-line-tag">*** ฮุก</span>
        <span v-if="line.cont" class="ed-line-tag">⤷ ต่อห้อง</span>
        <span v-if="line.label" class="ed-line-tag">{{ line.label }}</span>
        <span class="ed-line-actions">
          <!-- B056: "จบเพลง" — ปุ่มเห็นชัดต่อบรรทัด (ยกออกจาก ⋯) · เปิด = เส้นจบเพลง (final
               barline) สำหรับเพลงที่ไม่มีย้อนซ้ำ · ไม่ผูก repeat/volta -->
          <button
            class="ed-line-end"
            :class="{ on: line.end }"
            :aria-pressed="line.end"
            title="จบเพลง — ทำเส้นจบเพลง (สำหรับเพลงที่ไม่มีย้อนซ้ำ)"
            aria-label="ทำเครื่องหมายจบเพลงที่บรรทัดนี้"
            @click="line.end = !line.end"
          >‖ จบเพลง</button>
          <button class="ed-mini" title="ฟังบรรทัดนี้" aria-label="ฟังบรรทัดนี้" @click="playLine(li)"><Icon name="play" :size="14" /></button>
        </span>
      </div>
      <!-- A (editor-preview-refine): the live jianpu preview now sits IN PLACE — a small
           read-only render above each ห้อง's own edit boxes (see .ed-bar-live inside the strip),
           not one shared strip on the line head. So editing a bar shows that bar's render right
           above it, in real time, in both layouts. Toggle off via "ตัวอย่างสด". -->
      <!-- line structure (ชื่อ · ฮุก · ต่อห้อง · จบเพลง · ป้าย · สำเนา · ลบ) now lives in the
           header quick-struct + ⋯, acting on the focused line — US E3 "all structure is
           line-level in the header; a bar keeps only ▶ + ดูผล". The tags above echo state. -->
      <!-- the strip: bars flow left→right with a drawn barline between them. This IS the
           read+edit surface — note boxes (ripple) with a lyric box under each note (ripple),
           aligned in one column, chords on top. No separate sheet preview (would duplicate
           this and overflow the screen). -->
      <div class="ed-strip" :class="'lay-' + barLayout">
        <template v-for="(bar, bi) in line.bars" :key="bi">
          <span v-if="bi > 0" class="ed-barline" aria-hidden="true"></span>
          <div
            class="ed-bar"
            :class="{ 'bar-playing': playingBar === `${li}-${bi}` }"
            :data-bar="`${li}-${bi}`"
          >
            <!-- A (editor-preview-refine): live jianpu preview of THIS ห้อง, in place right above
                 its edit boxes — the same render the sheet draws, updating as you type. Read-only;
                 the boxes below stay the edit surface. Hidden when the bar is empty or already
                 flipped to full ดูผล (which replaces the grid). barContent keeps section/hook on the
                 first bar only, so the head shows once per line (B051). -->
            <div v-if="livePreview && !barShown(li, bi) && barHasNotes(li, bi)" class="ed-bar-live no-print" aria-label="ตัวอย่างโน้ตห้องนี้ (อ่านอย่างเดียว)">
              <SongSheet :content="barContent(li, bi)" mode="full" chord-system="letter" :display-key="opts.key" />
            </div>
            <!-- one column per note: chord on top, note box, then the syllable box
                 directly under its note (edit everything here — no duplicate preview) -->
            <div v-if="!barShown(li, bi)" class="seg-strip">
              <div v-for="(seg, si) in bar.segments" :key="si" class="seg-col" @focusin="onSegFocus($event, li, bi, si)">
                <!-- dock-space merged contextual toolbox (§10): ONE on-selection set per note,
                     hoisted to .seg-col so it shows in EVERY mode. The selection is STICKY (selSlot
                     /focusedSeg survive blur → fold/rotate/keyboard-close keep it · SA §7). Groups
                     are mutually exclusive by what's selected: a NOTE box → octave ▼▲; a SYLLABLE →
                     ◀▶ align. ⧉/✕ copy·delete the note (bar,si) always. Anchored + 344-clamped by CSS. -->
                <span v-if="focusedSeg === `${li}-${bi}-${si}`" class="slot-tools" :style="tbxStyle">
                  <template v-if="selSlot >= 0">
                    <button class="secondary slot-btn" aria-label="ดึงคำมาซ้าย (ลบช่องนี้)" title="ดึงคำมาซ้าย (ลบช่องนี้)" @mousedown.prevent @click="pullSlot(selSlot)">◀</button>
                    <button class="secondary slot-btn" aria-label="ดันคำไปขวา (แทรกช่องว่าง)" title="ดันคำไปขวา (แทรกช่องว่าง)" @mousedown.prevent @click="pushSlot(selSlot)">▶</button>
                  </template>
                  <template v-else>
                    <button class="secondary slot-btn" aria-label="ลดเสียงลงหนึ่งช่วงเสียง" title="ลดเสียงลงหนึ่งช่วง (โน้ตที่เลือก)" @mousedown.prevent @click="octaveShift(-1)">▼</button>
                    <button class="secondary slot-btn" aria-label="เพิ่มเสียงขึ้นหนึ่งช่วงเสียง" title="เพิ่มเสียงขึ้นหนึ่งช่วง (โน้ตที่เลือก)" @mousedown.prevent @click="octaveShift(1)">▲</button>
                  </template>
                  <span class="slot-div" aria-hidden="true"></span>
                  <button class="secondary slot-btn" aria-label="คัดลอกโน้ตนี้" title="คัดลอกโน้ตนี้ (เพิ่มถัดจากนี้)" @mousedown.prevent @click="duplicateSegment(bar, si)"><Icon name="copy" :size="13" /></button>
                  <button class="secondary slot-btn slot-del" aria-label="ลบโน้ตนี้" title="ลบโน้ตนี้ (ห้องยังอยู่)" @mousedown.prevent @click="removeSegment(bar, si)">✕</button>
                </span>
                <div class="chord-row">
                  <span v-for="p in noteBoxCount(seg.note)" :key="'c' + (p - 1)" class="chord-cell" @keydown.esc="editingChord = null">
                    <!-- B109: Enter=ยืนยันคอร์ด via allow-custom (accept the typed value, not just a
                         list pick — root cause Enter did nothing) · Esc=ยกเลิก at the wrapper (closes
                         editingChord · mirrors the rename pattern · NOT emitted into shared ComboSelect). -->
                    <ComboSelect
                      v-if="chordEditing(li, bi, si, p - 1)"
                      :model-value="p - 1 === 0 ? seg.chord : ''"
                      :options="p - 1 === 0 ? chordPickOpts : chordOpts"
                      placeholder="คอร์ด"
                      aria-label="เลือกคอร์ด"
                      width="120px"
                      class="chord-pick"
                      allow-custom
                      autofocus
                      @update:model-value="applyChordAt(bar, si, p - 1, $event)"
                    />
                    <button
                      v-else
                      class="chord-btn"
                      :class="p - 1 === 0 && seg.chord ? 'chord-set' : 'chord-add'"
                      :aria-label="p - 1 === 0 ? 'คอร์ดของช่วงนี้' : 'ใส่คอร์ดที่โน้ตนี้'"
                      @click="openChord(li, bi, si, p - 1)"
                    >{{ p - 1 === 0 && seg.chord ? seg.chord : '+' }}</button>
                  </span>
                </div>
                <NoteBoxes v-model="seg.note" />
                <span v-if="lensActive" class="syl-boxes">
                  <span v-for="(cell, bx) in sylCells(li, bi, si, seg.note)" :key="bx" class="syl-slot">
                    <template v-if="cell.slot !== null">
                      <input
                        class="syl-box"
                        :class="{ 'syl-empty': !cell.held && !sylAt(lensRow, cell.slot), 'syl-held': cell.held }"
                        :value="sylAt(lensRow, cell.slot)"
                        :data-slot="cell.slot"
                        :placeholder="cell.held ? '-' : ''"
                        :aria-label="cell.held ? `โน้ตลากเสียง ช่องที่ ${cell.slot + 1} (เว้นว่างได้)` : `พยางค์ที่ ${cell.slot + 1}`"
                        @focus="focusedSlot = cell.slot; selSlot = cell.slot"
                        @blur="focusedSlot = -1"
                        @keydown="onSylKey($event, cell.slot)"
                        @input="setSyl(lensRow, cell.slot, $event.target.value)"
                      />
                    </template>
                    <span v-else class="syl-spacer" aria-hidden="true"></span>
                  </span>
                </span>
                <!-- note copy/delete moved UP into the hoisted merged toolbox (dock-space §10) -->
              </div>
            </div>
            <!-- ดูผล: the same bar drawn clean (jianpu render) — REPLACES the edit grid, not
                 stacked. Words come from the lens verse so it matches the singer's sheet. -->
            <div v-else class="ed-bar-render" @click="toggleBarShown(li, bi)" title="แตะเพื่อกลับไปแก้">
              <SongSheet :content="barContent(li, bi)" mode="full" chord-system="letter" :display-key="opts.key" />
            </div>
            <!-- bar foot: beat status + repeat/volta marks + ▶ฟัง + ดูผล + ⋯ tools popover -->
            <div class="ed-bar-foot no-print">
              <span class="ed-bar-status" :class="{ bad: !barStatus(li, bi).ok }">
                <template v-if="barStatus(li, bi).text">{{ barStatus(li, bi).text }} {{ barStatus(li, bi).ok ? '✓' : '❌' }}</template>
                <template v-else>ห้อง {{ bi + 1 }}</template>
              </span>
              <!-- B055: a short bar can be a ห้องยก (pickup) whose beats finish in another
                   partial bar — offer the one-tap toggle right where the ❌ shows -->
              <button
                v-if="barStatus(li, bi).short"
                class="ed-bar-pickup"
                title="ห้องต่อกัน — จังหวะไม่เต็ม แต่นับรวมกับห้องที่ต่อกัน เช่น เริ่มกลางห้อง"
                aria-label="ทำเครื่องหมายห้องต่อกัน (จังหวะข้ามห้อง)"
                @click="bar.pickup = true"
              >↻ ห้องต่อกัน</button>
              <button
                v-else-if="bar.pickup"
                class="ed-bar-pickup on"
                title="ห้องต่อกัน (นับรวมจังหวะกับห้องที่ต่อกัน) — แตะเพื่อยกเลิก"
                aria-label="ยกเลิกห้องต่อกัน"
                @click="bar.pickup = false"
              >↻ ห้องต่อกัน</button>
              <span v-if="bar.repeatStart" class="ed-bar-mark" title="เริ่มเล่นซ้ำ">‖:</span>
              <span v-if="bar.repeatEnd" class="ed-bar-mark" title="วนกลับ">:‖</span>
              <span v-if="bar.volta" class="ed-bar-mark" :title="bar.volta === 1 ? 'ห้องจบรอบแรก' : 'ห้องจบรอบสอง'">{{ bar.volta }}.</span>
              <!-- P'Aim: the bar tools used to repeat under EVERY ห้อง (เปลืองที่). Now they only
                   take space on the ห้อง you clicked into (its note is focused) — every other bar
                   keeps just its ✓/❌ beat-status. Hidden via CSS (kept in the DOM) so keyboard/AT
                   reach them only when the bar is active, and nothing else changes. -->
              <span class="ed-bar-acts" :class="{ 'bar-tools-off': !barToolsOn(li, bi) }">
                <button class="ed-mini" title="ฟังห้องนี้" aria-label="ฟังห้องนี้" @click="playBar(li, bi)"><Icon name="play" :size="14" /></button>
                <button class="ed-mini" :class="{ on: barShown(li, bi) }" :aria-pressed="barShown(li, bi)" title="ดูผล — สลับ แก้ ⇄ แผ่นเพลง (ห้องนี้)" aria-label="ดูผลห้องนี้" @click="toggleBarShown(li, bi)"><Icon name="music" :size="14" /></button>
                <!-- B092: bar move/copy/delete surfaced out of the ⋯ popover — one tap, no menu.
                     Icon-only + compact. Responsive-split: ← → stay surfaced on every screen;
                     ⧉สำเนา/✕ลบ are surfaced on tablet/desktop but fold back into ⋯ on a phone
                     (≤480) so the bar foot stays one row (ui-standards no-crowd). -->
                <button class="ed-mini ed-bar-mv" title="ย้ายห้องไปทางซ้าย" aria-label="ย้ายห้องไปทางซ้าย (สุดขอบ = ไปบรรทัดก่อน)" :disabled="bi === 0 && li === 0" @click="moveBar(li, bi, -1)"><span aria-hidden="true">←</span></button>
                <button class="ed-mini ed-bar-mv" title="ย้ายห้องไปทางขวา" aria-label="ย้ายห้องไปทางขวา (สุดขอบ = ไปบรรทัดถัดไป)" :disabled="bi === line.bars.length - 1 && li === lines.length - 1" @click="moveBar(li, bi, 1)"><span aria-hidden="true">→</span></button>
                <button class="ed-mini bar-act-wide" title="ทำซ้ำทั้งห้องนี้ (วางเป็นห้องถัดไปทันที) — ถ้าอยากวางที่ท่อนอื่น ใช้ ⋯ › คัดลอกห้อง" aria-label="ทำซ้ำห้องนี้เป็นห้องถัดไป" @click="duplicateBar(line, bi)"><Icon name="copy" :size="14" /></button>
                <button class="ed-mini danger-ic bar-act-wide" title="ลบทั้งห้องนี้ (ทุกโน้ตในห้อง)" aria-label="ลบห้องนี้" @click="removeBar(line, bi)"><Icon name="trash-2" :size="14" /></button>
              </span>
              <span class="ed-bar-more-wrap" :class="{ 'bar-tools-off': !barToolsOn(li, bi) }">
                <button
                  class="ed-mini"
                  :class="{ on: barMenuOpen === `${li}-${bi}` }"
                  :aria-expanded="barMenuOpen === `${li}-${bi}`"
                  aria-label="เครื่องมือห้องนี้ (ห้องต่อกัน · เล่นซ้ำ · วนกลับ · ห้องจบ)"
                  title="เครื่องมือห้อง"
                  @click.stop="toggleBarMenu(li, bi)"
                >⋯</button>
                <div v-if="barMenuOpen === `${li}-${bi}`" class="ed-bar-menu" role="menu">
                  <!-- B101: copy this ห้อง onto the clipboard to วาง it in another ท่อน/บรรทัด.
                       Distinct from ทำซ้ำ (below/foot) which drops a copy right here. -->
                  <div class="ed-bar-menu-row">
                    <button class="secondary tiny" aria-label="คัดลอกห้องนี้ไปวางที่ท่อนหรือบรรทัดอื่น" title="คัดลอกไปวางที่อื่น (ท่อน/บรรทัดไหนก็ได้)" @click="copyBarToClip(li, bi)"><Icon name="clipboard-copy" :size="13" /> คัดลอกห้อง (ไปวางที่อื่น)</button>
                  </div>
                  <!-- B092 responsive-split: on a phone (≤480) ทำซ้ำ/ลบ live here instead of the
                       foot (hidden on tablet/desktop where they're surfaced) -->
                  <div class="ed-bar-menu-row bar-menu-narrow">
                    <button class="secondary tiny" aria-label="ทำซ้ำห้องนี้ วางถัดไปทันที" @click="duplicateBar(line, bi)">⧉ ทำซ้ำห้อง</button>
                    <button class="danger tiny" aria-label="ลบห้องนี้" @click="removeBar(line, bi)">✕ ลบห้อง</button>
                  </div>
                  <label class="ed-bar-menu-check" title="จังหวะไม่เต็ม แต่นับรวมกับห้องที่ต่อกัน เช่น เริ่มกลางห้อง"><input v-model="bar.pickup" type="checkbox" /> ↻ ห้องต่อกัน (จังหวะไม่เต็ม — นับรวมกับห้องที่ต่อกัน)</label>
                  <label class="ed-bar-menu-check"><input v-model="bar.repeatStart" type="checkbox" /> ‖: เริ่มเล่นซ้ำ</label>
                  <label class="ed-bar-menu-check"><input v-model="bar.repeatEnd" type="checkbox" /> :‖ วนกลับ</label>
                  <label class="ed-bar-menu-check">ห้องจบ:
                    <select v-model.number="bar.volta">
                      <option :value="0">— ไม่ใช่ —</option>
                      <option :value="1">รอบแรก (จบ 1)</option>
                      <option :value="2">รอบสอง (จบ 2)</option>
                    </select>
                  </label>
                </div>
              </span>
            </div>
          </div>
        </template>
        <button class="ed-addbar" title="เพิ่มห้อง" aria-label="เพิ่มห้อง" @click="addBar(line, li)"><Icon name="plus" :size="14" /> ห้อง</button>
        <!-- B101: paste the copied ห้อง at the end of THIS บรรทัด — only shown when a ห้อง is
             on the clipboard, in whichever ท่อน you're on (แล้วเลื่อน ← → จัดตำแหน่งได้) -->
        <button v-if="clip && clip.kind === 'bar'" class="ed-addbar ed-paste" title="วางห้องที่คัดลอกไว้ ต่อท้ายบรรทัดนี้" aria-label="วางห้องที่นี่" @click="pasteBarAt(li)"><Icon name="clipboard-paste" :size="14" /> วางห้อง</button>
      </div>
    </div>
    <!-- live word-count for the ข้อ being shown under the notes (like the wireframe) -->
    <div v-if="lensActive" class="ed-count no-print" :class="{ bad: !rowStatus(lensRow).ok }">
      {{ rowStatus(lensRow).ok ? '✓' : '⚠' }} {{ rowStatus(lensRow).got }}/{{ rowStatus(lensRow).need }} คำ
      {{ rowStatus(lensRow).ok ? '· ลงพอดี' : '· ยังไม่ครบ' }}
    </div>
    <span class="ed-addline-row">
      <button class="ed-addline" @click="addLine"><Icon name="plus" :size="14" /> เพิ่มบรรทัด</button>
      <!-- B101: paste the copied บรรทัด at the end of THIS ท่อน — only when a บรรทัด is copied -->
      <button v-if="clip && clip.kind === 'line'" class="ed-addline ed-paste" title="วางบรรทัดที่คัดลอกไว้ ต่อท้ายท่อนนี้" aria-label="วางบรรทัดที่นี่" @click="pasteLineHere"><Icon name="clipboard-paste" :size="14" /> วางบรรทัด</button>
    </span>

    <!-- overflow: syllables typed past the last note — shown as note-less boxes so an
         over-count is visible and fixable, never silently dropped -->
    <div v-if="overflowSlots.length" class="card overflow-strip no-print">
      <strong style="color: var(--red)">⚠ เกินโน้ต {{ overflowSlots.length }} พยางค์ — ไม่มีโน้ตรองรับ (ดึงกลับ ◀ หรือลบทิ้ง)</strong>
      <div class="syl-boxes" style="margin-top: 8px; flex-wrap: wrap">
        <span v-for="i in overflowSlots" :key="i" class="syl-slot">
          <span v-if="focusedSlot === i" class="slot-tools">
            <button class="secondary slot-btn" aria-label="ดึงคำมาซ้าย (ลบช่องนี้)" @mousedown.prevent @click="pullSlot(i)">◀</button>
            <button class="secondary slot-btn" aria-label="ดันคำไปขวา (แทรกช่องว่าง)" @mousedown.prevent @click="pushSlot(i)">▶</button>
          </span>
          <input
            class="syl-box syl-overflow"
            :data-slot="i"
            :value="sylAt(lensRow, i)"
            :aria-label="`พยางค์เกินที่ ${i + 1}`"
            @focus="focusedSlot = i"
            @blur="focusedSlot = -1"
            @keydown="onSylKey($event, i)"
            @input="setSyl(lensRow, i, $event.target.value)"
          />
        </span>
      </div>
    </div>

    <!-- paragraph editor for the chosen ข้อ (collapsible) — edit lyrics as free text -->
    <div v-if="lensActive" class="card no-print" style="margin-top: 10px">
      <button class="secondary" @click="paraOpen = !paraOpen">
        📝 แก้เนื้อแบบย่อหน้า (ข้อที่เลือก) {{ paraOpen ? '▲' : '▼' }}
      </button>
      <div v-if="paraOpen" style="margin-top: 8px">
        <p class="muted" style="margin: 0 0 6px">เว้นวรรค = พยางค์ใหม่ · "-" = ต่อคำเดิม · แก้ตรงนี้แล้วกล่องใต้โน้ตขยับตาม</p>
        <textarea
          :value="rowLyricText(lensRow)"
          rows="4"
          class="arr-lyric"
          aria-label="เนื้อร้องแบบย่อหน้า"
          @input="setRowLyricText(lensRow, $event.target.value)"
        ></textarea>
        <!-- MP3: split a pasted/imported lyric blob into syllables that land on the melody's
             notes, then fine-tune with the ◀▶ tools under each note -->
        <div class="para-tools">
          <button class="secondary auto-syl" aria-label="แยกพยางค์อัตโนมัติ" @click="autoSyllable">
            <span aria-hidden="true">✂</span> แยกพยางค์อัตโนมัติ
          </button>
          <span class="muted para-tools-hint">แตกเนื้อที่วางมาเป็นก้อน → ช่องพยางค์ (คร่าว ๆ · ปรับต่อด้วย ◀▶)</span>
        </div>
        <span class="sr-only" aria-live="polite">{{ syllableMsg }}</span>
      </div>
    </div>

    <!-- (arrangement of ท่อน — order · name · melody · key — now lives in the "โครงเพลง" rail
         + the canvas section header above, not a separate bottom block. editor-section-ux.) -->

    <!-- (play ทั้งเพลง = dock · ดาวน์โหลด/ลบ/ประวัติ = "จัดการ" menu · แผ่นเต็ม = 🎼 mode) -->
      </div>
      <!-- /content -->
    </div>
    <!-- ===== end edit workspace ===== -->

    <!-- edit dock — the DockKey engine fed ITEMS_EDIT (แป้นโน้ต band · ย้อน/ทำซ้ำ/ฟัง ·
         บันทึก prime · export/draft/preview in ⚙). Same engine as ฝึกร้อง/แผ่นเพลง. -->
    <!-- dock-space: auto-hide = เปิด engine hide-on-scroll ที่ dev ทำใน DockKey (คืนพื้นที่ตอนอ่าน/เลื่อน · a11y ปิดเองเมื่อ screen reader) -->
    <DockKey :items="editItems" store-key="edit" v-model:alpha="editAlpha" :message="saveMsg" :auto-hide="true" :resizable="true">
      <template #cell-export="{ open, toggle, close }">
        <ExportTool
          :content="previewContent"
          :filename-base="meta.title_th || 'song'"
          :on-json="downloadJson"
          :open="open"
          @toggle="toggle"
          @close="close"
        />
      </template>
      <!-- เสียงดนตรี — one button → popover with all 4 sound axes (B107 step 9) -->
      <template #cell-soundctl="{ open, toggle, close }">
        <SoundControl :open="open" :groups="soundGroups" :icon="soundIcon" @toggle="toggle" @close="close" />
      </template>
      <!-- B109 เฟส A — ปุ่มนำทางบนจอ (touch/mobile) → เรียก jump* ของ dev = คีย์ desktop ตัวเดียวกัน.
           @mousedown.prevent = ห้ามปุ่มแย่งโฟกัสจากช่องโน้ต (jump* อ่าน document.activeElement). -->
      <template #cell-nav>
        <span class="ed-nav" role="group" aria-label="นำทางในเพลง">
          <button type="button" class="ed-nav-btn" aria-label="โน้ตก่อนหน้า" title="โน้ตก่อนหน้า" @mousedown.prevent @click="jumpNote(-1)">◀</button>
          <button type="button" class="ed-nav-btn" aria-label="โน้ตถัดไป" title="โน้ตถัดไป" @mousedown.prevent @click="jumpNote(1)">▶</button>
          <span class="ed-nav-div" aria-hidden="true"></span>
          <button type="button" class="ed-nav-btn" aria-label="ห้องก่อนหน้า" title="ห้องก่อนหน้า" @mousedown.prevent @click="jumpBar(-1)">⏮</button>
          <button type="button" class="ed-nav-btn" aria-label="ห้องถัดไป" title="ห้องถัดไป" @mousedown.prevent @click="jumpBar(1)">⏭</button>
          <span class="ed-nav-div" aria-hidden="true"></span>
          <button type="button" class="ed-nav-btn" aria-label="บรรทัดก่อนหน้า" title="บรรทัดก่อนหน้า" @mousedown.prevent @click="jumpLine(-1)">▲</button>
          <button type="button" class="ed-nav-btn" aria-label="บรรทัดถัดไป" title="บรรทัดถัดไป" @mousedown.prevent @click="jumpLine(1)">▼</button>
        </span>
      </template>
    </DockKey>

    <!-- B: NON-MODAL floating whole-song preview (ดูผลทั้งเพลง). No backdrop → the editor
         underneath stays interactive (edit-and-watch). resolvedPreview is reactive so it
         live-syncs while you type. Drag by the title bar (dock-core clamp keeps it on-screen);
         ✕ closes. Mobile (≤760px): opens full-screen with the same ✕, no drag. -->
    <div
      v-if="sheetWinOpen"
      ref="floatEl"
      class="ed-float no-print"
      :style="floatStyle"
      role="dialog"
      aria-label="แผ่นเพลงทั้งเพลง (แก้ไปดูไป)"
    >
      <div
        class="ed-float-head"
        @pointerdown="floatDown"
        @pointermove="floatMove"
        @pointerup="floatUp"
        @pointercancel="floatUp"
      >
        <Icon name="grip-horizontal" :size="16" class="ed-float-grip" />
        <span class="ed-float-title">{{ meta.number != null ? meta.number + '. ' : '' }}{{ meta.title_th || 'แผ่นเพลง' }}</span>
        <span class="ed-float-key muted">Key {{ opts.key }}</span>
        <!-- P'Aim: "ควรมีปุ่มขยาย font ในหน้านั้นเอง — ดูตรงไหนแก้ตรงนั้น". pointerdown.stop so a
             press on the buttons never starts the title bar's drag. -->
        <span class="ed-float-zoom" role="group" aria-label="ขนาดตัวอักษรในหน้าต่างนี้" @pointerdown.stop>
          <button
            class="ed-float-zb"
            aria-label="ตัวอักษรเล็กลง"
            title="ตัวอักษรเล็กลง"
            :disabled="previewZoom <= 0.5"
            @click="bumpPreviewZoom(-0.1)"
          ><Icon name="minus" :size="15" /></button>
          <button
            class="ed-float-zpct"
            :aria-label="'ขนาดตัวอักษร ' + previewZoomPct + ' เปอร์เซ็นต์ — กดเพื่อคืนค่าปกติ'"
            title="คืนค่าปกติ (100%)"
            @click="previewZoom = 1"
          >{{ previewZoomPct }}%</button>
          <button
            class="ed-float-zb"
            aria-label="ตัวอักษรใหญ่ขึ้น"
            title="ตัวอักษรใหญ่ขึ้น"
            :disabled="previewZoom >= 4"
            @click="bumpPreviewZoom(0.1)"
          ><Icon name="plus" :size="15" /></button>
        </span>
        <button class="ed-float-x" aria-label="ปิดหน้าต่างแผ่นเพลง" title="ปิด" @click="sheetWinOpen = false"><Icon name="x" :size="16" /></button>
      </div>
      <div class="ed-float-body">
        <!-- B081: render at the REAL A4 printable width (178mm : 1rem ratio) so bars wrap
             exactly like the printed page. The .ed-float-page is scaled to fit the window
             (font-size, not transform → keeps SongSheet's tie overlay measuring real px),
             so there is no horizontal scroll and no clipped column. -->
        <div class="ed-float-page" :style="previewPageStyle">
          <!-- click-to-edit (issue6/7): tap a bar here → cursor jumps to it in the editor -->
          <SongSheet :content="resolvedPreview" mode="full" chord-system="letter" :display-key="opts.key" interactive @seek="jumpToSource" />
        </div>
      </div>
      <!-- resize by dragging this bottom-right corner (desktop only; mobile is full-screen) -->
      <div
        v-if="!narrow"
        class="ed-float-resize"
        role="separator"
        aria-label="ปรับขนาดหน้าต่างแผ่นเพลง"
        title="ลากเพื่อปรับขนาด"
        @pointerdown="resizeDown"
        @pointermove="resizeMove"
        @pointerup="resizeUp"
        @pointercancel="resizeUp"
      ></div>
    </div>

    <!-- full sheet overlay -->
    <div v-if="showSheet" class="sheet-overlay no-print" role="dialog" aria-label="แผ่นเพลง" @click.self="showSheet = false" @keydown.esc="showSheet = false">
      <div class="sheet-panel">
        <button class="secondary" style="float: right" aria-label="ปิดแผ่นเพลง" @click="showSheet = false">✕ ปิด</button>
        <h2 style="margin-top: 0; color: var(--brand)">{{ meta.number != null ? meta.number + '. ' : '' }}{{ meta.title_th || '(ยังไม่มีชื่อเพลง)' }}</h2>
        <p class="muted">Key {{ opts.key }} · {{ opts.timeSignature }}<template v-if="opts.bpm"> · ♩= {{ opts.bpm }}</template></p>
        <SongSheet :content="resolvedPreview" mode="full" chord-system="letter" :display-key="opts.key" />
      </div>
    </div>

    <!-- ===== menu panels: Open / Properties / History / Drafts ===== -->
    <div v-if="activePanel" class="panel-overlay no-print" role="dialog" aria-modal="true" @click.self="closePanel">
      <div class="panel-box">
        <div class="panel-head">
          <strong>{{ panelTitle }}</strong>
          <button class="secondary panel-x" aria-label="ปิด" @click="closePanel"><Icon name="x" :size="16" /></button>
        </div>

        <!-- Open: pick a song to edit (applied on "เปิดเพลง", not on select) -->
        <div v-if="activePanel === 'open'">
          <label style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">เลือกเพลง:
            <ComboSelect v-model="pendingPick" :options="pickerOptions" placeholder="พิมพ์ค้นหา: ชื่อ เลข เนื้อร้อง โน้ต…" width="320px" />
          </label>
          <p class="muted" style="margin: 10px 0 0">เลือกเพลงจากรายการ แล้วกด “เปิดเพลง” · หรือเลือก “— เพลงใหม่ —” เพื่อเริ่มเพลงเปล่า</p>
          <div class="panel-foot">
            <button class="secondary" @click="closePanel">ยกเลิก</button>
            <button @click="confirmOpen">เปิดเพลง</button>
          </div>
        </div>

        <!-- History (B028): full timeline across draft + published, snapshot names, both
             hands colour-coded. Reads via lib/auditLog.js — cannot be edited by anyone. -->
        <div v-else-if="activePanel === 'history'">
          <RevisionHistory
            :song-id="editingId"
            :draft-id="currentDraftId"
            :can-restore="isApprover"
            :profiles-map="profilesMap"
            @restore="restore"
          />
          <div class="panel-foot"><button class="secondary" @click="closePanel">ปิด</button></div>
        </div>

        <!-- Drafts / review queue -->
        <div v-else-if="activePanel === 'drafts'">
          <p v-if="!pendingDrafts.length && !myDrafts.length" class="muted">ยังไม่มีงานร่างหรือรายการรอตรวจ</p>
          <template v-if="isApprover && pendingDrafts.length">
            <strong>📨 รออนุมัติ ({{ pendingDrafts.length }})</strong>
            <div v-for="d in pendingDrafts" :key="d.id" class="draft-row">
              <a href="#" @click.prevent="loadDraft(d); closePanel()">{{ d.number != null ? d.number + '. ' : '' }}{{ d.title_th }}</a>
              <span class="muted"> — โดย {{ profilesMap[d.author_id] || '?' }}</span>
            </div>
            <hr v-if="myDrafts.length" style="border: none; border-top: 1px solid var(--line); margin: 10px 0" />
          </template>
          <template v-if="myDrafts.length">
            <strong>📝 งานร่างของฉัน</strong>
            <!-- issues10: the ลบ lives ON the draft's own row — the row IS the draft, so that is
                 where พี่เปา looks for it ("หาที่ลบทั้งเพลงไม่ได้ · ทำไมมันหายาก"). -->
            <div v-for="d in myDrafts" :key="d.id" class="draft-row">
              <a href="#" @click.prevent="loadDraft(d); closePanel()">{{ d.number != null ? d.number + '. ' : '' }}{{ d.title_th }}</a>
              <span :class="['status-chip', 's-' + d.status]">{{ STATUS_TH[d.status] }}</span>
              <button
                class="draft-del"
                :aria-label="'ลบร่าง ' + d.title_th"
                title="ลบร่างนี้ถาวร"
                @click="deleteDraft(d)"
              ><Icon name="trash-2" :size="16" /></button>
            </div>
          </template>
          <div class="panel-foot"><button class="secondary" @click="closePanel">ปิด</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  margin: 6px 0 8px;
  color: var(--brand);
}
.stanza-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 10px;
}
.stanza-tab {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px 10px 0 0;
  padding: 6px 12px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.stanza-tab.active {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--cream);
}
.stanza-x {
  font-size: 11px;
  color: var(--muted);
  border-radius: 50%;
  padding: 0 4px;
}
.stanza-x:hover { color: var(--red); }
.bar-box {
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 8px;
  /* one bar per row, full width, so a bar reads as a single horizontal line and the
     next bar sits below it (easier to read words + notes than side-by-side bars) */
  width: 100%;
}
.bar-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin-bottom: 6px;
  gap: 6px;
}
.bar-head > span:first-child { flex: 1; min-width: 0; }
.bar-tools { display: flex; gap: 3px; flex-shrink: 0; }
.bar-tools .tiny { padding: 4px 6px; }
.repeat-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 8px;
}
.repeat-row label { display: inline-flex; align-items: center; gap: 4px; }
/* one bar = a strip of note-columns (chord / notes / syllable) that reads left to
   right; segments wrap only if the bar is very long */
.seg-strip { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
/* position:relative so the hoisted merged toolbox (.slot-tools, absolute bottom:100%) anchors
   above THIS note column (dock-space §10) */
.seg-col { position: relative; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.seg-col :deep(.combo input) { color: var(--chord-red); font-weight: 700; }
.seg-col :deep(.note-boxes) { flex-wrap: nowrap; }
/* chord row: one cell above each note box (same 46px + 3px gap so it lines up) */
.chord-row { display: flex; gap: 3px; flex-wrap: nowrap; min-height: 28px; }
.chord-cell { position: relative; width: 46px; }
.chord-btn {
  position: absolute;
  left: 0;
  top: 0;
  white-space: nowrap;
  min-height: 26px;
  padding: 2px 6px;
  border-radius: 5px;
  font-weight: 700;
}
.chord-btn.chord-set { color: var(--chord-red); background: var(--cream); border: 1px solid var(--line); z-index: 2; }
.chord-btn.chord-add {
  color: var(--muted);
  background: transparent;
  border: 1px dashed var(--line);
  font-weight: 400;
  opacity: 0.5;
}
.chord-btn.chord-add:hover { opacity: 1; }
.chord-pick { position: absolute; left: 0; top: 0; z-index: 20; }
/* B098: note-level tools (คัดลอกโน้ต + ลบโน้ต) sit together under each note column */
/* .seg-tools removed — note copy/delete merged into the hoisted .slot-tools toolbox (dock-space §10) */
/* plain-language "how to" overview card */
.how-to { background: var(--cream); border-color: var(--brand); }
.how-to ol { line-height: 1.5; }
.lens-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 0 0 10px; }
/* syllable boxes sit in the row under the note boxes — same 46px width + 3px gap as
   NoteBoxes so each word lines up under its note. nowrap keeps the columns aligned. */
.syl-boxes { display: inline-flex; gap: 3px; flex-wrap: nowrap; align-items: center; }
.syl-slot { position: relative; display: inline-flex; }
.syl-spacer { display: inline-block; width: 46px; }
.syl-box {
  width: 46px;
  padding: 6px 2px;
  text-align: center;
  font-size: 0.95rem;
  border: 1px solid var(--line);
  border-radius: 5px;
  min-height: 30px;
}
.syl-box.syl-empty { border-color: var(--red); background: #fff5f5; }
/* held '-' / rest box: optional, so a blank one is calm (dashed, faint) — never red */
.syl-box.syl-held { border-style: dashed; background: #fafafa; color: var(--muted); }
.syl-box.syl-held::placeholder { color: var(--line); }
.syl-box.syl-overflow { border-color: var(--red); background: #fff0f0; color: var(--red); }
.overflow-strip { border-color: var(--red); background: #fff7f7; }
/* ◀ ▶ align tools float above the focused syllable box, no layout shift */
.slot-tools {
  position: absolute;
  /* dock-space positioning (UX · P'Aim: toolbox ห่างจากตัวที่เลือก) — anchor เหนือ "โน้ต" (NoteBoxes)
     ไม่ใช่ยอด .seg-col: .chord-row (min-height 28px + gap 4 = ~32px) อยู่บนสุดดันกล่องลอยสูง.
     วัดจริง (dispatched focusin): เดิม gapToNote=35 · gapToSyllable=83. ดึงลง 32px → กล่องเกาะเหนือโน้ต
     (gap ~3-5) + ใกล้พยางค์ขึ้น. 32 = chord-row min-height(28)+gap(4) · ถ้า chord-row สูงขึ้น กล่องยังอยู่
     เหนือโน้ตเสมอ (32 ≤ chord-row จริง) ไม่ทับ. */
  bottom: calc(100% - 32px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2px;
  margin-bottom: 3px;
  padding: 2px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 5;
  /* dock-space §5 / DS note 1 — contextual toolbox ห้ามล้มจอแคบสุด (Fold ~344): clamp
     ความกว้างไว้กับ viewport แล้วปุ่มที่เกินเลื่อนแนวนอนในตัว toolbox (icon-only + overflow).
     รองรับตอนเติม note tools (จุดบน/ล่าง · เขบ็ต · ลบ) เข้ามาโดยไม่ยื่นเลยจอ. */
  max-width: calc(100vw - 24px);
  overflow-x: auto;
  scrollbar-width: none;
}
.slot-tools::-webkit-scrollbar { display: none; }
/* dock-space GATE2 (tester CONCERN B): the contextual toolbox holds a DESTRUCTIVE ✕ลบ +
   octave/copy — a mis-tap deletes a note. Lift from 30×26 (WCAG 2.5.8 minimum, +2px only) to
   44×44 = the dock's own floor (WCAG 2.5.5 Enhanced / project --touch-min), ✕ลบ included.
   ≤5 buttons × 44 + gaps ≈ 228px < the 344 clamp (max-width: 100vw-24); more buttons overflow
   in-toolbox (overflow-x). dev's clampTbx re-measures after render → the wider box re-clamps. */
.slot-btn { min-width: 44px; min-height: 44px; padding: 4px; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; }
/* B109 เฟส A — ปุ่มนำทางบนจอ (◀▶ โน้ต · ⏮⏭ ห้อง · ▲▼ บรรทัด) ในแถบ dock (editor-side · #cell-nav).
   44px touch floor (WCAG 2.5.5 / parity dock · = เกณฑ์เดียวกับ .slot-btn) · flex-wrap → บนจอแคบสุด
   (Fold 344) ยุบเป็น 3×2 ไม่ยื่นเลยจอ (cellFlex = 0 0 auto · cell กว้างเท่าเนื้อหา) · icon-only + aria-label. */
.ed-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; }
.ed-nav-btn { min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; padding: 4px; }
.ed-nav-div { width: 1px; align-self: stretch; margin: 4px 2px; background: var(--line); flex: 0 0 auto; }
/* divider ระหว่าง 2 กลุ่มใน contextual toolbox: [◀▶ พยางค์] ┊ [คัดลอก/ลบ โน้ต] */
.slot-div { width: 1px; align-self: stretch; margin: 2px 2px; background: var(--line); flex: 0 0 auto; }
.slot-del { color: var(--muted); }
.slot-del:hover { color: var(--red); }
/* ===== editor-section-ux: "โครงเพลง" rail rows + canvas section header ===== */
/* screen-reader-only live region (reorder announcements) */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.rail-group.rg-main { color: var(--brand); }
.rail-hint { font-size: 11.5px; color: var(--muted); margin: 0 6px 6px; }
/* the collapsible "ทำนอง (โน้ต)" group header is a button */
.rg-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  text-transform: none;
}
.rg-chev { transform: rotate(-90deg); transition: transform 0.15s; }
.rg-chev-open { transform: rotate(0); }
/* a ท่อน row in the rail — ONE line, controls aligned (ui-standards §2 list-row):
   grip · num · name (roomy, only truncates when it must) · ♪ pill · ▲▼ (side-by-side,
   never stacked) · delete. Row height is a single control tall, not two. */
.srow {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 9px;
  padding: 3px 6px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: box-shadow 0.12s, border-color 0.12s, opacity 0.12s;
}
.srow.sel { border-color: var(--brand); box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.14); background: var(--cream); }
.srow.drag { opacity: 0.5; }
.srow.over { border-color: var(--ok); border-style: dashed; }
.grip {
  color: var(--muted);
  cursor: grab;
  flex: 0 0 14px;
  display: inline-flex;
  align-items: center;
  touch-action: none;
}
.snum { color: var(--muted); font-size: 12px; min-width: 12px; text-align: right; flex: 0 0 auto; }
.sname {
  flex: 1 1 auto;
  min-width: 48px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: text;
  padding: 4px 5px;
  border-radius: 6px;
  border: 1px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sname:hover { background: var(--cream); }
.snameinp {
  flex: 1 1 auto;
  min-width: 48px;
  width: 100%;
  font-size: 0.92rem;
  font-weight: 600;
  padding: 4px 5px;
  border: 1px solid var(--brand);
  border-radius: 6px;
  font-family: inherit;
}
/* ♪ pill = compact melody indicator (change the melody in the canvas header) */
.mchip {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--brand);
  font-weight: 700;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 3px 7px;
  white-space: nowrap;
}
/* MP4: pairing badge — melody↔lyric fit. Symbols + numbers (not colour alone). */
.pair-badge {
  flex: 0 0 auto;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 20px;
  padding: 2px 7px;
  white-space: nowrap;
}
.pair-badge.good { color: #fff; background: var(--ok); }
.pair-badge.bad { color: #fff; background: var(--red); }
/* MP2: melody list row shows a note preview under "ทำนอง X" */
.mel-row { align-items: flex-start !important; }
.mel-row-main { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.mel-row-sub { font-size: 11px; font-weight: 400; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* MP3: ✂ auto-syllable tools under the paragraph textarea */
.para-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
.auto-syl { display: inline-flex; align-items: center; gap: 6px; }
.para-tools-hint { font-size: 12px; }
/* ▲▼ side by side (single line — never stacked; ui-standards §2). Override the global
   button min-height (44px) so the row stays compact; ≥24px still meets WCAG 2.5.8. */
.updown { display: inline-flex; flex-direction: row; gap: 2px; flex: 0 0 auto; align-items: center; }
.updown button {
  border: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
  border-radius: 5px;
  width: 26px;
  height: 26px;
  min-height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  font-size: 9px;
  line-height: 1;
}
.updown button:disabled { opacity: 0.3; cursor: default; }
.srow-del {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--muted);
  border-radius: 6px;
  padding: 3px;
  min-width: 26px;
  min-height: 26px;
  cursor: pointer;
}
.srow-del:hover { color: var(--red); background: #fff0ef; }
/* "+ เพิ่มท่อน" and "+ เพิ่มทำนอง" primary add row */
.addsec {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  border: 1px dashed var(--brand);
  background: transparent;
  color: var(--brand);
  border-radius: 9px;
  padding: 8px;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  min-height: var(--touch-min);
}
.addsec:hover { background: var(--cream); }
/* canvas section header — rename/melody/reorder for the selected ท่อน, above the notes */
/* B085: the ท่อน toolbar (melody · rename · ▲▼ · delete) stays pinned under the top bar so
   its controls are reachable while scrolling down through a long ท่อน. Opaque bg so the
   notes scroll cleanly underneath; z-index over the note strip, under menus/dropdowns.
   `top` below is the MOBILE value only — on desktop the edhead is sticky too, so this pins
   under it via the measured csheadStyle (58px would put it 62px behind the edhead). */
.cshead {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 11px 11px 0 0;
  padding: 8px 10px;
  margin-bottom: 10px;
  position: sticky;
  top: 58px;
  z-index: 4;
  box-shadow: 0 3px 8px rgba(45, 42, 38, 0.08);
}
/* B086: ▲▼ move-line buttons — plain glyphs sized to sit in the .ed-ico square */
.ed-mvline { font-size: 11px; line-height: 1; font-weight: 700; }
.cshead .grip { color: var(--muted); cursor: default; }
.cs-num { color: var(--muted); font-size: 13px; min-width: 16px; text-align: right; }
.cs-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--brand);
  cursor: text;
  padding: 3px 7px;
  border-radius: 6px;
  border: 1px solid transparent;
}
.cs-name:hover { background: #fff; }
.cs-name-inp {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--brand);
  padding: 3px 7px;
  border: 1px solid var(--brand);
  border-radius: 6px;
  font-family: inherit;
  min-width: 120px;
}
.cs-mel { flex: 0 0 auto; }
.cs-mel :deep(input) { color: var(--brand); font-weight: 700; }
.cs-key { display: inline-flex; align-items: center; gap: 4px; font-size: 0.85rem; color: var(--muted); }
/* B102 — "ร้องรับทุกข้อ" refrain toggle in the ท่อน header */
.cs-refrain { display: inline-flex; align-items: center; gap: 5px; font-size: 0.85rem; color: var(--muted); cursor: pointer; white-space: nowrap; }
.cs-refrain input { width: 16px; height: 16px; cursor: pointer; }
.cs-grow { flex: 1; }
.cs-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--line);
  color: var(--muted);
  border-radius: 7px;
  padding: 4px;
  min-width: 32px;
  min-height: 32px;
  cursor: pointer;
}
.cs-del:hover { color: var(--red); background: #fff0ef; border-color: var(--red); }
.arr-lyric {
  width: 100%;
  min-height: 46px;
  padding: 6px 8px;
  font-size: 1rem;
  resize: vertical;
}
/* small buttons still meet the 24x24 target size (WCAG 2.2 2.5.8) */
.tiny { padding: 4px 10px; font-size: 13px; min-height: 28px; min-width: 28px; }
.role-badge {
  background: var(--cream);
  color: var(--brand);
  border-radius: 10px;
  padding: 2px 10px;
  font-size: 13px;
  margin-left: 6px;
}
/* one row = one line: title grows, chip and ลบ hold their size at the end (ui-standards §2) */
.draft-row { margin-top: 6px; display: flex; align-items: center; gap: 4px; }
.draft-row > a { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-chip { border-radius: 10px; padding: 1px 10px; font-size: 12px; margin-left: 8px; flex: 0 0 auto; }
/* ghost until wanted — ลบ must not compete with the title for attention, but stays a 44px
   target (WCAG 2.2 AA 2.5.8 · the project's 44px goal) so it is tappable on พี่เปา's phone */
.draft-del {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-height: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
@media (hover: hover) { .draft-del:hover { color: var(--danger, #c53030); border-color: var(--line); background: #fff; } }
.draft-del:focus-visible { color: var(--danger, #c53030); }
.s-draft { background: #edf2f7; }
.s-pending { background: #fefcbf; }
.s-rejected { background: #fed7d7; }
.review-banner { background: #fffbeb; border-color: #f6e05e; }
/* D4 — "someone's draft is waiting on this song". Warmer + heavier than .review-banner on
   purpose: that one says "you are somewhere safe", this one says "you can destroy work here".
   Never colour alone (WCAG 1.4.1) — the icon and the author's name carry it too. */
.pending-alert {
  background: #fff4ed;
  border-color: var(--red, #c53030);
  border-left: 4px solid var(--red, #c53030);
}
.pa-actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; align-items: center; }
/* min-height 44 = WCAG 2.5.8 target size with room to spare, matching the draft-row buttons */
.pa-actions button { min-height: 44px; }
.pa-actions .pa-go { background: var(--brand); color: #fff; border-color: var(--brand); }
.migrate-note { background: #fffbeb; border-color: #f6e05e; }
.rev-row { border-top: 1px solid var(--line); padding: 8px 0; margin-top: 8px; }
.line-active { border-color: var(--brand); }
.bar-playing {
  border: 1.5px solid var(--brand);
  background: var(--cream);
  box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.15);
}
/* B: non-modal floating preview window — position:fixed with its own drag+clamp (dock-core
   pattern). No backdrop: the editor underneath stays fully interactive (edit-and-watch). */
.ed-float {
  position: fixed;
  top: 72px;
  right: 16px;
  z-index: 95;
  /* The sheet SCALES TO THE WINDOW (.ed-float-page), so this width sets the reading size: at the
     old 720px the song rendered at ~9px and พี่เปา could not read it (issues7). P'Aim then asked
     for "ใช้พื้นที่เต็ม" and reminded us not to bake fixed numbers in — so this tracks the screen
     (65% of it) instead of a magic pixel count, floored so a small laptop still gets a usable
     window and capped by the viewport. Whatever P'Aim drags it to is remembered from then on. */
  width: clamp(min(680px, calc(100vw - 32px)), 65vw, calc(100vw - 32px));
  max-height: min(80vh, calc(100vh - 96px));
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}
.ed-float-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  background: var(--cream);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.ed-float-head:active { cursor: grabbing; }
.ed-float-grip { color: var(--muted); flex: 0 0 auto; }
.ed-float-title { font-weight: 700; color: var(--brand); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1 1 auto; }
.ed-float-key { font-size: 0.8rem; flex: 0 0 auto; }
/* font zoom for THIS window (P'Aim: ดูตรงไหนแก้ตรงนั้น). Sits with the ✕ as title-bar chrome:
   same 32px box as .ed-float-x so the bar keeps one rhythm, with the 44px pointer target coming
   from the padded row rather than a taller button (WCAG 2.2 AA 2.5.8 · ui-standards §1). */
.ed-float-zoom { display: inline-flex; align-items: center; gap: 2px; flex: 0 0 auto; }
.ed-float-zb,
.ed-float-zpct {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  min-height: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}
.ed-float-zb { width: 32px; }
.ed-float-zpct { min-width: 48px; padding: 0 6px; font-size: 0.78rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.ed-float-zb:disabled { opacity: 0.4; cursor: default; }
@media (hover: hover) {
  .ed-float-zb:not(:disabled):hover,
  .ed-float-zpct:hover { background: var(--cream); border-color: var(--brand); color: var(--brand); }
}
.ed-float-x {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-height: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  cursor: pointer;
}
@media (hover: hover) { .ed-float-x:hover { background: var(--cream); border-color: var(--brand); } }
/* The floating "ดูผลทั้งเพลง" preview scales the whole song sheet to fit the window with no
   horizontal scroll and no clipped column (the old nowrap + max-content forced one long row
   per line → overflow). It renders SongSheet at a fixed em-width and scales-to-fit via font:
   • container-type on the body → 100cqw == the body's content width (inside the 12px pad).
   • .ed-float-page width = 100cqw, so it always fills the window (no h-scroll).
   • font-size = 100cqw / <em-width> is set INLINE (previewPageStyle). Because the sheet is
     em-based, scaling the font scales every bar the same, so bar wrapping is identical at ANY
     window width. Scaling via font-size (not transform/zoom) keeps SongSheet's B069 tie overlay
     measuring real px.
   B081 locked <em-width> to the A4 print ratio (42.05). issues3 (พี่เปา) instead wants the
   preview to match the แผ่นเพลง SCREEN page, so <em-width> is now the LIVE reading-column width
   (previewEmWidth, measured from .container) → both wrap at the same bar. The global
   .song-line { flex-wrap: wrap } (styles.css) then wraps bars exactly like that page. */
/* scrollbar-gutter:stable reserves the vertical scrollbar's width up front, so 100cqw is the
   real available width and the page can't end up a scrollbar-width too wide (that stray ~15px
   was the only horizontal scroll left). max-width:100% is the belt-and-suspenders cap for
   engines without scrollbar-gutter. */
.ed-float-body { padding: 12px; overflow: auto; flex: 1 1 auto; min-height: 0; container-type: inline-size; scrollbar-gutter: stable; }
.ed-float-page { width: 100cqw; max-width: 100%; } /* font-size set inline via previewPageStyle */
/* resize grip (bottom-right corner) — the diagonal lines are the standard resize affordance.
   Sits above the scrolling body so it stays grabbable. Desktop only (v-if hides it on mobile). */
.ed-float-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18px;
  height: 18px;
  cursor: nwse-resize;
  touch-action: none;
  z-index: 2;
  background: linear-gradient(
    135deg,
    transparent 0 46%,
    var(--muted) 46% 54%,
    transparent 54% 66%,
    var(--muted) 66% 74%,
    transparent 74%
  );
}
/* mobile (≤760px): the floating window makes no sense on a small screen → full-screen sheet
   with the same ✕, no drag (brief B mobile path). */
@media (max-width: 760px) {
  .ed-float {
    inset: 0;
    width: 100%;
    max-height: none;
    border: none;
    border-radius: 0;
  }
  .ed-float-head { cursor: default; }
}
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(45, 42, 38, 0.55);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px 8px;
  overflow: auto;
}
.sheet-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  max-width: 920px;
  width: 100%;
  max-height: calc(100vh - 40px);
  overflow: auto;
}

/* ===== studio shell header (phase 1) ===== */
.studio-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  border-bottom: 1px solid var(--line);
  /* bleed to the container edges so the bar spans full width and reads as a top chrome */
  margin: -16px -16px 12px;
  padding: 8px 12px;
}
.sb-menu { position: relative; display: inline-flex; align-items: center; }
.sb-brand,
.sb-text {
  background: transparent;
  border: none;
  color: var(--ink);
  font: inherit;
  font-size: 1rem;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sb-brand { color: var(--brand); font-weight: 700; white-space: nowrap; text-decoration: none; }
.sb-caret {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
}
@media (hover: hover) {
  .sb-brand:hover,
  .sb-caret:hover,
  .sb-text:hover { background: rgba(0, 0, 0, 0.06); }
}
.sb-sep { width: 1px; align-self: stretch; background: var(--line); min-height: 22px; }
.sb-title {
  flex: 1;
  min-width: 60px;
  font-weight: 700;
  font-size: 1.05rem;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  padding: 4px 8px;
  min-height: 36px;
}
.sb-title:hover { border-color: var(--line); }
.sb-title:focus { border-color: var(--brand); background: #fff; outline: none; }
.sb-title-static { flex: 1; min-width: 0; font-weight: 700; font-size: 1.05rem; color: var(--ink); padding: 4px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-mode-label { font-weight: 600; }
.chev { opacity: 0.55; }
.sb-brand-icon { display: none; }
.sb-login { display: inline-flex; align-items: center; }
/* mobile: keep the top bar on one row — brand collapses to a menu icon, mode shows
   icon-only, the title ellipsizes, so nothing overflows the narrow screen */
@media (max-width: 760px) {
  .studio-bar { gap: 4px; padding: 8px; }
  .sb-brand { font-size: 0.98rem; }
  .sb-sep { display: none; }
  .sb-mode-label { display: none; }
  .sb-title,
  .sb-title-static { font-size: 1rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sb-text { padding: 6px; }
}
.sb-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 234px;
  max-width: calc(100vw - 20px);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  padding: 6px;
  z-index: 60;
  display: flex;
  flex-direction: column;
}
.sb-dropdown.sb-mode-menu { left: auto; right: 0; } /* mode sits at the right — align to its edge */
.sb-dropdown a,
.sb-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--ink);
  text-decoration: none;
  background: transparent;
  border: none;
  font: inherit;
  font-size: 0.98rem;
  cursor: pointer;
  text-align: left;
  width: 100%;
  min-height: 40px;
}
/* clearly visible highlight (cream-hover was too faint) — a warm brand tint that
   works on hover AND keyboard focus */
.sb-dropdown a:hover,
.sb-item:hover,
.sb-dropdown a:focus-visible,
.sb-item:focus-visible { background: rgba(139, 69, 19, 0.1); outline: none; }
.sb-dropdown .icn { color: var(--brand); }
.sb-k { margin-left: auto; color: var(--muted); font-size: 0.8rem; }
.sb-mode-item { align-items: flex-start; }
.sb-mode-item .mt { display: flex; flex-direction: column; line-height: 1.25; }
.sb-mode-item .mt small { color: var(--muted); font-size: 0.8rem; }
.sb-chk { margin-left: auto; color: var(--brand); font-weight: 700; }
.sb-backdrop { position: fixed; inset: 0; z-index: 40; }
.sb-cat {
  background: transparent;
  border: none;
  color: var(--brand);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
}
@media (hover: hover) {
  .sb-cat:hover { background: rgba(0, 0, 0, 0.06); }
}

/* ===== parts rail (phase 2) ===== */
.studio-app { display: flex; gap: 16px; align-items: flex-start; }
.content { flex: 1; min-width: 0; }
.rail {
  flex: 0 0 288px;
  width: 288px;
  position: sticky;
  top: 58px;
  align-self: flex-start;
  max-height: calc(100dvh - 74px);
  overflow: auto;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px;
}
.studio-app.rail-hidden .rail { display: none; }
.rail-mhead { display: none; }
.rail-group { font-size: 12px; color: var(--muted); font-weight: 700; padding: 8px 8px 4px; }
.rail-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--ink);
  font: inherit;
  font-size: 0.98rem;
  padding: 8px 9px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 38px;
}
.rail-row .icn { color: var(--muted); }
.rail-row.mel .icn { color: var(--note-blue); }
.rail-row.lyr .icn { color: #6b4fb0; }
.rail-row.arr .icn { color: #b5771a; }
.rail-row.add { color: var(--muted); }
.rail-row.sel { background: var(--cream); border: 1px solid var(--line); font-weight: 700; }
/* a row + its delete button (B032). The whole wrapper carries mel/lyr colour + sel state */
.rail-rowwrap { display: flex; align-items: center; border-radius: 8px; }
.rail-rowwrap .rail-row { flex: 1; min-width: 0; }
.rail-rowwrap.mel .icn { color: var(--note-blue); }
.rail-rowwrap.lyr .icn { color: #6b4fb0; }
.rail-rowwrap.sel { background: var(--cream); border: 1px solid var(--line); }
.rail-rowwrap.sel .rail-row { font-weight: 700; }
.rail-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--muted);
  border-radius: 7px;
  padding: 4px;
  min-width: 30px;
  min-height: 30px;
  margin-right: 3px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s;
}
.rail-rowwrap:hover .rail-del,
.rail-rowwrap:focus-within .rail-del { opacity: 1; }
.rail-del:hover { color: var(--red); background: #fff0ef; }
@media (hover: none) {
  .rail-del { opacity: 1; }
}
@media (hover: hover) {
  .rail-row:hover { background: rgba(139, 69, 19, 0.08); }
}
.rail-sep { border-top: 1px solid var(--line); margin: 6px 4px; }
.rail-backdrop { display: none; }

@media (max-width: 760px) {
  .studio-app { display: block; }
  .rail {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    width: 90%;
    max-width: 340px;
    z-index: 80;
    border-radius: 0;
    max-height: none;
    transform: translateX(-102%);
    transition: transform 0.22s ease;
  }
  .rail.open { transform: none; }
  .studio-app.rail-hidden .rail { display: block; } /* drawer visibility is via .open, not collapse */
  .rail-mhead {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 4px 8px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 6px;
    font-weight: 700;
  }
  .rail-mhead > span { display: inline-flex; align-items: center; gap: 6px; }
  .rail-x {
    margin-left: auto;
    background: var(--cream);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 4px 8px;
    min-height: 32px;
    color: var(--ink);
    cursor: pointer;
  }
  .rail-backdrop.open {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(30, 20, 5, 0.4);
    z-index: 75;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rail { transition: none; }
}
/* ===== edit header (edhead — ps2 §③) ===== */
.edhead {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  background: #fffdf8;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 7px 9px;
  margin: 0 0 10px;
}
/* issues11: the header sticks under the shell bar so the line tools (⋯ · ฮุก · ซ้ำ · ย้าย · ลบ)
   stay reachable from any line instead of forcing a scroll back to the top. `top` is measured
   (shellH) because the shell bar's height moves with the breakpoint. z-index sits above the
   editor content but below the shell bar (50), the floating preview (95) and the dock (90).
   DESKTOP ONLY — measured at 360px the header wraps to 6 rows / 256px, so pinning it there would
   eat a third of the phone screen for good. Making it stick on a phone needs the header to be
   short first, which is a different job (see docs/reports/editor-friction.md). */
@media (min-width: 761px) {
  .edhead {
    position: sticky;
    z-index: 20;
  }
}
/* breadcrumb button — opens the rail, shows "ท่อน A · ข้อ 1" (position only, not a menu) */
.ed-crumb {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--cream);
  border: 1px solid var(--line);
  color: var(--brand);
  font: inherit;
  font-weight: 700;
  border-radius: 8px;
  padding: 6px 11px;
  min-height: 34px;
  cursor: pointer;
  max-width: 100%;
}
.ed-crumb-t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ed-grow { flex: 1 1 8px; }
/* generic header icon button (24×24 target · WCAG 2.5.8) */
.ed-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink);
  border-radius: 8px;
  padding: 5px;
  min-width: 32px;
  min-height: 32px;
  cursor: pointer;
}
.ed-ico.on { background: var(--cream); border-color: var(--brand); color: var(--brand); }
.ed-ico.danger-ic { color: var(--red); }
/* layout segmented control: 1 ห้อง/แถว ⇄ ต่อกัน */
.ed-lay { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.ed-lay button {
  background: #fff;
  border: none;
  color: var(--muted);
  font: inherit;
  font-size: 0.85rem;
  padding: 6px 10px;
  min-height: 32px;
  cursor: pointer;
}
.ed-lay button + button { border-left: 1px solid var(--line); }
.ed-lay button.on { background: var(--cream); color: var(--brand); font-weight: 700; }
/* whole-song preview chip */
.ed-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink);
  font: inherit;
  font-size: 0.88rem;
  border-radius: 8px;
  padding: 6px 10px;
  min-height: 32px;
  cursor: pointer;
}
.ed-chip.act { background: var(--cream); border-color: var(--brand); color: var(--brand); font-weight: 700; }
.ed-preview-grp { display: inline-flex; gap: 4px; }
.ed-quick { display: inline-flex; gap: 4px; }
/* ⋯ line-more popover (advanced settings for the active line) */
.ed-more-wrap { position: relative; display: inline-flex; }
.ed-more-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 30;
  min-width: 240px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(60, 40, 10, 0.18);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ed-more-title { font-weight: 700; color: var(--brand); font-size: 0.85rem; }
/* B091: line clear-parts actions in the ⋯ menu */
.ed-more-sep { border-top: 1px solid var(--line); margin: 2px 0; }
.ed-more-act {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  background: var(--cream);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  min-height: var(--touch-min);
}
.ed-more-act:hover { background: var(--cream-hover); border-color: var(--brand); }
/* in-context help: (?) legend + (i) tip */
.ed-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--ink);
}
.ed-legend b { color: var(--brand); font-family: 'Courier New', monospace; }
.ed-tip { margin: 0 0 10px; }
.ed-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink);
  border-radius: 7px;
  padding: 4px;
  min-width: 30px;
  min-height: 30px;
  cursor: pointer;
}
.ed-mini:disabled { opacity: 0.35; cursor: default; }
.ed-mini.danger-ic { color: var(--red); }
/* B092: move-bar ← → glyphs sized to read as directional (distinct from the ▶ play icon) */
.ed-bar-mv { font-size: 15px; line-height: 1; font-weight: 700; }
/* B092 responsive-split: on a phone (≤480) keep only ← → surfaced and fold สำเนา/ลบ back
   into ⋯ so the bar foot stays one row; tablet/desktop keep all four surfaced. */
.bar-menu-narrow { display: none; }
@media (max-width: 480px) {
  .bar-act-wide { display: none; }
  .bar-menu-narrow { display: flex; }
}
@media (hover: hover) {
  .ed-ico:hover,
  .ed-crumb:hover,
  .ed-chip:hover,
  .ed-mini:hover { background: var(--cream-hover); }
}
/* mobile: quick-struct (ฮุก·ซ้ำ·สำเนา·ลบบรรทัด) stays reachable on tablet/phone — the
   header just wraps to more rows; tighten spacing so it doesn't overflow */
@media (max-width: 760px) {
  .edhead { gap: 5px; padding: 6px; }
  .ed-quick { flex-wrap: wrap; }
  .ed-lay button { padding: 6px 8px; font-size: 0.8rem; }
  .ed-chip { padding: 6px 8px; font-size: 0.82rem; }
  /* B101 fix: on a phone the header wraps, so the ⋯ button can land anywhere. Its dropdown was
     anchored to that tiny wrapper (right:0 + 240px), so when ⋯ sat on the left the menu ran off
     the left edge and "คัดลอกบรรทัด" was hard to tap. Anchor it to the FULL-WIDTH header instead
     (edhead) + clamp width to the viewport, so it always opens on-screen wherever ⋯ wrapped to. */
  .edhead { position: relative; }
  .ed-more-wrap { position: static; }
  .ed-more-menu {
    top: calc(100% + 4px);
    right: 6px;
    left: auto;
    min-width: 0;
    width: max-content;
    max-width: calc(100vw - 16px);
  }
  /* same viewport clamp for the per-ห้อง ⋯ menu (holds "คัดลอกห้อง") — never wider than the screen */
  .ed-bar-menu { max-width: calc(100vw - 16px); }
}
/* read row (phase 4): the pair in sheet style, above the edit boxes */
/* จัดการ menu danger item + divider */
.sb-danger { color: var(--red); }
.sb-danger .icn { color: var(--red); }
.sb-dropdown .sep { border-top: 1px solid var(--line); margin: 4px 6px; }
/* menu panels (Open / Properties / History / Drafts) */
.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(45, 42, 38, 0.5);
  z-index: 95;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 60px 12px 20px;
  overflow: auto;
}
.panel-box {
  background: #fff;
  border-radius: 14px;
  padding: 18px 20px;
  max-width: 560px;
  width: 100%;
  box-shadow: 0 16px 44px rgba(60, 40, 10, 0.28);
}
.panel-head { display: flex; align-items: center; margin-bottom: 12px; }
.panel-head strong { font-size: 1.1rem; color: var(--brand); }
.panel-x { margin-left: auto; padding: 6px 8px; display: inline-flex; }
.panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.panel-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem; color: var(--muted); }
.panel-grid label input { color: var(--ink); }
.panel-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
@media (max-width: 560px) {
  .panel-grid { grid-template-columns: 1fr; }
}
/* ===== clean editing strip (matches the wireframe) ===== */
.ed-line {
  background: #fffdf8;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
}
.ed-line.line-active { border-color: var(--brand); }
/* A (editor-preview-refine): live per-bar preview IN PLACE — a tinted read-only render that
   sits directly above each ห้อง's own edit boxes and updates as you type. Sits at the top of the
   .ed-bar flex column, so it works the same in both layouts (1 ห้อง/แถว + ห้องต่อกัน). Scrolls
   horizontally on its own so a long bar never widens the column. */
.ed-bar-live {
  background: #fffdf5;
  border: 1px dashed var(--brand);
  border-radius: 6px;
  padding: 3px 6px;
  overflow-x: auto;
  min-width: 0;
}
/* B060: inline song-settings card */
.ed-settings { padding: 10px 12px; margin-bottom: 12px; }
/* flex-wrap so the ⚙ + song-action buttons + ✓ตรวจแล้ว stack onto a second row when the
   card is too narrow (mobile) instead of overflowing (B071) */
.ed-settings-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
/* B071: สร้างเพลงใหม่ / เลือกเพลง — ghost pills matching the ✓ตรวจแล้ว button next to them */
.ed-song-acts { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.ed-song-act {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink);
  font: inherit;
  font-size: 0.88rem;
  border-radius: 999px;
  padding: 5px 12px;
  min-height: 32px;
  cursor: pointer;
}
.ed-song-act:hover { border-color: var(--brand); color: var(--brand); }
.ed-settings-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--brand);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 2px;
  min-height: 34px;
}
.ed-chev-open { transform: rotate(180deg); }
.ed-settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px 12px;
  margin-top: 10px;
}
.ed-settings-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: var(--muted); }
.ed-settings-grid label input {
  color: var(--ink);
  min-height: 34px;
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
/* "✓ ตรวจแล้ว" toggle — ghost until ticked, then green (checked/verified) */
.ed-verify {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink);
  font: inherit;
  font-size: 0.88rem;
  border-radius: 999px;
  padding: 5px 12px;
  min-height: 32px;
  cursor: pointer;
  white-space: nowrap;
}
.ed-verify:hover { border-color: var(--brand); color: var(--brand); }
.ed-verify.on { background: #2f7d4f; border-color: #2f7d4f; color: #fff; }
.ed-line-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.ed-line-no { font-size: 0.82rem; color: var(--muted); font-weight: 700; }
.ed-line-tag {
  font-size: 0.72rem;
  color: var(--brand);
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 1px 7px;
}
.ed-line-actions { margin-left: auto; display: inline-flex; gap: 4px; align-items: center; }
/* B056: จบเพลง per-line toggle — ghost when off, filled when the line ends the song */
.ed-line-end {
  font-size: 0.72rem;
  line-height: 1;
  padding: 4px 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  white-space: nowrap;
}
.ed-line-end:hover { border-color: var(--brand); color: var(--brand); }
.ed-line-end.on { background: var(--brand); border-color: var(--brand); color: #fff; }
.ed-mini.on { background: var(--cream); border-color: var(--brand); color: var(--brand); }
.ed-line-opts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 4px 10px;
  margin-bottom: 8px;
  border-bottom: 1px dashed var(--line);
}
.ed-opt-input {
  min-height: 32px;
  padding: 4px 8px;
  font-size: 0.85rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  flex: 1 1 150px;
  min-width: 130px;
}
.ed-opt-check { display: inline-flex; align-items: center; gap: 4px; font-size: 0.85rem; color: var(--muted); }
/* the strip: bars laid out per the layout toggle (B035).
   lay-stack = 1 ห้อง/แถว (each bar its own full-width row) · lay-flow = ห้องต่อกัน (side by
   side, wrapping only when very long). stack is the default (matches the prototype). */
.ed-strip { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
.ed-strip.lay-flow { flex-direction: row; }
.ed-strip.lay-stack { flex-direction: column; align-items: stretch; gap: 8px; }
.ed-strip.lay-stack .ed-barline { display: none; } /* 1 bar/row — no vertical barline needed */
.ed-strip.lay-stack .ed-bar { width: 100%; }
.ed-strip.lay-stack .ed-addbar { align-self: flex-start; }
.ed-barline { align-self: stretch; width: 0; border-left: 2px solid var(--muted); margin: 4px 0; min-height: 44px; }
.ed-bar { display: flex; flex-direction: column; gap: 6px; border-radius: 8px; padding: 4px 2px 2px; }
.ed-bar .seg-strip { gap: 10px; flex-wrap: nowrap; }
.ed-bar.bar-playing { background: var(--cream); box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.15); }
.ed-bar-foot { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.ed-bar-status { color: var(--muted); }
.ed-bar-status.bad { color: var(--red); font-weight: 700; }
.ed-bar-mark { font-family: 'Courier New', monospace; font-weight: 700; color: var(--brand); font-size: 12px; }
/* B055: ห้องยก (pickup) quick toggle — a small chip beside the beat status */
.ed-bar-pickup {
  font-size: 11px;
  line-height: 1;
  padding: 3px 7px;
  border: 1px solid var(--brand);
  border-radius: 999px;
  background: transparent;
  color: var(--brand);
  cursor: pointer;
  white-space: nowrap;
}
.ed-bar-pickup:hover { background: var(--cream-hover); }
.ed-bar-pickup.on { background: var(--brand); color: #fff; }
.ed-bar-acts { display: inline-flex; gap: 4px; margin-left: auto; }
.ed-bar-more-wrap { position: relative; }
/* P'Aim: bar tools only take space on the ห้อง you clicked into — hide on every other bar */
.ed-bar-acts.bar-tools-off,
.ed-bar-more-wrap.bar-tools-off { display: none; }
/* push the ✓/❌ status to the right when the action row is hidden, so the foot stays tidy */
.ed-bar-acts.bar-tools-off + * { margin-left: auto; }
/* ดูผล render: the clean bar drawn in place of the edit grid (tap to go back to editing) */
.ed-bar-render {
  border: 1px dashed var(--brand);
  border-radius: 8px;
  background: #fffdf5;
  padding: 8px 10px;
  cursor: pointer;
  min-height: 44px;
}
@media (hover: hover) {
  .ed-bar-render:hover { background: var(--cream); }
}
.ed-bar-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 30;
  min-width: 210px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(60, 40, 10, 0.18);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ed-bar-menu-row { display: flex; gap: 6px; }
.ed-bar-menu-row .tiny { flex: 1; }
.ed-bar-menu-check { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
.ed-addbar,
.ed-addline {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  border: 1px dashed var(--line);
  color: var(--muted);
  border-radius: 8px;
  padding: 6px 12px;
  min-height: 34px;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
}
.ed-addbar { align-self: center; }
.ed-addline { margin: 2px 0 6px; }
@media (hover: hover) {
  .ed-addbar:hover,
  .ed-addline:hover { background: var(--cream); color: var(--brand); border-color: var(--brand); }
}
.ed-count { font-size: 0.9rem; color: #2f7d4f; margin: 2px 0 8px; font-weight: 600; }
.ed-count.bad { color: var(--red); }
/* B101 clipboard: the paste "วาง…" buttons echo the ＋ add buttons but in brand colour so
   they read as an ACTION (a filled destination), not another dashed placeholder. */
.ed-addline-row { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ed-paste {
  border-style: solid;
  border-color: var(--brand);
  color: var(--brand);
  background: var(--cream);
}
@media (hover: hover) {
  .ed-paste:hover { background: var(--brand); color: #fff; border-color: var(--brand); }
}
/* B101 clipboard tray — a sticky notice while a บรรทัด/ห้อง is held, so you always see what
   will be pasted no matter how far you scroll to the target ท่อน. */
.ed-clip {
  position: sticky;
  top: 6px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 6px 0 10px;
  padding: 7px 12px;
  border: 1px solid var(--brand);
  border-radius: 10px;
  background: var(--cream);
  color: var(--ink);
  font-size: 0.9rem;
}
.ed-clip-what { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.ed-clip-hint { color: var(--muted); font-size: 0.82rem; margin-right: auto; }
.ed-clip-new {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  min-height: 32px;
  border: 1px solid var(--brand);
  border-radius: 8px;
  background: var(--brand);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  white-space: nowrap;
}
.ed-clip-new:hover { filter: brightness(1.08); }
.ed-clip-x {
  padding: 5px 10px;
  min-height: 32px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  white-space: nowrap;
}
@media (hover: hover) {
  .ed-clip-x:hover { border-color: var(--brand); color: var(--brand); }
}
/* (.seg-tools reveal CSS removed — the merged toolbox now reveals via focusedSeg on-selection) */
.sheet-head { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-2); }
.only-print { display: none; }
@media print {
  .only-print { display: block; }
}

/* ===== S3 responsive polish — mobile (≤760px) =====
   Desktop keeps its compact, mouse-precise density; on phones every editing
   control grows to the app's 44px touch standard (design tokens) and dense
   rows WRAP instead of pushing the page wider. Pure layout — no behaviour
   change, no logic touched, no colour hard-coded. */
@media (max-width: 760px) {
  /* ⭐ kill the horizontal page scroll: a wide bar wraps its note-columns
     instead of overflowing. Each column keeps chord·note·syllable stacked and
     aligned within itself, so wrapping COLUMNS never breaks the 1:1 note↔word
     alignment (a horizontal scroll box was rejected — it would clip the ◀▶
     align tools and the chord dropdown that pop above/below a cell). */
  .ed-bar .seg-strip { flex-wrap: wrap; column-gap: var(--sp-3); row-gap: var(--sp-4); }
  .ed-bar-render { overflow-x: auto; }
  .ed-bar-foot { flex-wrap: wrap; row-gap: var(--sp-1); }

  /* header + inline action buttons → full 44px hit targets */
  .ed-ico,
  .ed-mini { min-width: var(--touch-min); min-height: var(--touch-min); }
  .ed-crumb,
  .ed-verify,
  .ed-settings-toggle,
  .ed-lay button,
  .ed-chip,
  .ed-addbar,
  .ed-addline,
  .ed-line-end,
  .ed-bar-pickup { min-height: var(--touch-min); }

  /* dense secondary tools (bar ⋯ menu · arrangement ▲▼✎✕ · ◀▶ align) */
  .tiny,
  .slot-btn { min-width: var(--touch-min); min-height: var(--touch-min); }

  /* primary editing inputs under each note */
  .syl-box { min-height: var(--touch-min); }
  .chord-btn { min-height: 34px; }

  /* parts drawer (rail) — the mobile navigation */
  .rail-row { min-height: var(--touch-min); }
  .rail-del,
  .rail-x { min-width: var(--touch-min); min-height: var(--touch-min); }

  /* โครงเพลง rows + canvas header: fat touch targets (WCAG 2.5.8; SOP ≥44px),
     still a single-line row — ▲▼ stay side-by-side, just taller for the thumb */
  .srow { padding: 6px; gap: 5px; }
  .grip { min-width: 30px; min-height: 40px; }
  .srow-del,
  .cs-del { min-width: var(--touch-min); min-height: var(--touch-min); }
  .updown button { width: 34px; height: 40px; font-size: 11px; }
  .addsec { min-height: var(--touch-min); }
}
</style>
