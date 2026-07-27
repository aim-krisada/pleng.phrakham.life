<script setup>
// The read/listen surface for one song — same engine as the old SongView (play,
// transpose, tempo, loop, font size, display layers, play-by-section + follow-along
// highlight = the karaoke feel). The controls are a bottom "music player" built on the
// DockKey core engine: this page owns the song state and hands <SingTransport> the data;
// SingTransport turns it into the DockKey descriptor list (ITEMS_SING) and the engine draws
// the 2-row dock (ไทม์ไลน์ · คีย์ · เลือกท่อน · transport · Aa · ⚙ + pin). Mounted directly
// here; แผ่นเพลง and แก้ไข mount their own DockKey the same way.
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { KEYS, chordOptions, isValidChord } from '../lib/chords.js'
import {
  playSong, playEnsemble, stopPlayback, setTranspose, keyTranspose, songToNotes, TEMPO_MARKS,
  effectiveOrder, buildPlayNotes,
} from '../lib/midi.js'
import { isSampledInstrument } from '../lib/sampler.js'
import { resolveContent, resolvePlayOrder, lyricSetName, scopeToLyricSet } from '../lib/songModel.js'
import { addLyricSet, deleteLyricSet } from '../lib/songStructure.js'
import { withNotePitch, withInsertedBox, withDeletedNote, withRestAt, withClearedSyllable, withSetSyllable, withOctaveShift, withAccidental, withChord, withJumpMarker, removeJumpMarker, updateJumpMarker, activeSymbolsAt, activeMarksAt, withBracketRemovedAt } from '../lib/songEdit.js'
import { findOrphanJumps } from '../lib/songFlow.js'
import { downloadSong } from '../lib/jsonIO.js'
import { currentSong, readingFontScale, soundMode, setSoundMode, playStyle, setPlayStyle, styleAuto,
  sparkleLevel, setSparkleLevel, arrangeOverrides, setArrangeOverride, resetArrangeOverrides,
  ensembleMode, setEnsembleMode, leadInstrument, setLeadInstrument } from '../store.js'
import { presetCfg, recommendRecipe, songFeatures } from '../lib/arranger/presets.js'
import { buildArrangeCfg, readTechniques } from '../lib/arranger/techniques.js'
import { SOUND_OPTS, ENSEMBLE_OPTS, INSTRUMENT_OPTS, STYLE_OPTS } from '../lib/soundOptions.js'
import { bookRefLabels } from '../lib/bookCodes.js'
import { noteBoxKinds } from '../lib/notation.js'
import { learnKey, loadLayoutMap } from '../lib/keyHints.js'
import { SYMBOL_CHARS, symbolForKey, applySymbolToContent, JUMP_PRESETS, JUMP_COMMANDS, applyJumpCommand } from '../lib/editorCommands.js'
import { lintContent, SEVERITY } from '../lib/notationLint.js'
import { createHistory, undoIntent } from '../lib/editHistory.js'
import SongSheet from './SongSheet.vue'
import SingTransport from './SingTransport.vue'
import NoteInputBar from './NoteInputBar.vue'
import SongSettings from './SongSettings.vue'
import CompletionStatus from './CompletionStatus.vue'
import { mailtoLink } from '../lib/share.js'
import StructureDrawer from './StructureDrawer.vue'
import Icon from './Icon.vue'
import { t } from '../i18n/index.js'

// `tier` is part of the WT-0 mode contract ({ song, tier }). The reading surface is
// view-only for everyone, so it is accepted but not used to gate anything — there are
// no save/edit affordances here regardless of tier (US-A01 AC3).
const props = defineProps({
  song: { type: Object, required: true },
  tier: { type: String, default: 'guest' },
  // A-fix (23 ก.ค.): the save state of the inline edit, owned by the shell (Studio holds the
  // song + the Supabase write). 'clean' | 'dirty' | 'saving' | 'saved' | 'error'. The editor
  // just SHOWS it and asks for a save — so the user always knows whether the work is kept.
  saveState: { type: String, default: 'clean' },
  saveError: { type: String, default: '' },
  // whether the shell managed to mirror this edit into the local working copy. It decides
  // whether leaving the editor with unsaved work is a non-event (the normal case) or the last
  // chance to keep it (storage blocked/full) — see requestExitEdit.
  recoverable: { type: Boolean, default: true },
  // BI-007 — this song's open-draft status ('draft'|'pending'|'rejected'|'approved'|null) and any
  // rejection note, owned by the shell. Drives the you-are-here stepper + the finish button.
  draftStatus: { type: String, default: null },
  reviewComment: { type: String, default: '' },
  // EPIC H — a shared link may carry the key it was shared at (?key=, lib/share.js). It is a
  // STARTING point only: the listener's own คีย์ pick afterwards wins. '' = use the song's key.
  startKey: { type: String, default: '' },
  // …and which lyric SET to open on, already resolved from the link's ?set=<permanent id> by
  // the shell. Same deal as startKey: a STARTING point only — the reader's own tab wins after.
  startSet: { type: Number, default: 0 },
  // B-DUP — { level, message, links } from the owner (Studio) when this song's name already
  // exists in the library. Passed straight through to ⚙ ตั้งค่าเพลง, where the name is typed.
  dupNote: { type: Object, default: null },
})
// The reading surface stays a READER: it never mutates props.song. When the pencil is on
// and a note is retyped, it hands the OWNER (Studio → liveSong, the live v2 SSOT) a new
// content via `update-content`; that flows back down as props.song and the sheet re-renders.
// `key-change` reports the reading key up so the shell can share the song AT the key the
// listener is actually reading (EPIC H round-trip). Read-only signal — nothing flows back down.
// `update-meta` (B060) is the same idea for the song's ROW fields (เลข · ชื่อไทย · ชื่ออังกฤษ ·
// ธีม · หมวด), which live on the songs row and not in `content` — the ⚙ ตั้งค่าเพลง panel hands
// up a patch and the owner merges it, exactly as it does with a new content.
// 'set' = which lyric set the reader switched to, so the shell can print/export the same one.
const emit = defineEmits(['update-content', 'update-meta', 'update-music', 'save', 'withdraw', 'key-change', 'update:editing', 'left-dirty', 'new-song', 'set'])

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

// EPIC H — a shared link can open the song at the key it was shared at (?key=). Only a key we
// can actually render is honoured; anything else falls back to the song's own key, so a stale
// or hand-typed link never strands the reader.
// The rule: the link's key holds for the SONG THE LINK POINTED AT, until the reader picks a key
// themselves. It cannot be a one-shot at mount — on a cold load the shell hands this surface a
// BLANK song first (the editor is mounted alongside and emits its empty draft before the routed
// song arrives), and the two load re-syncs below would then stamp the stored key over the link's.
// Opening any OTHER song spends it, so the rest of the session reads each song at its own key.
let pendingLinkKey = KEYS.includes(props.startKey) ? props.startKey : ''
let linkKeySong = null // identity of the song the ?key= belongs to — the first real one we show
// the editor's blank draft has neither a number nor a title; a real song has at least one
const isRealSong = () => props.song?.number != null || !!(props.song?.title_th || '').trim()
const songIdentity = () => `${props.song?.number}|${props.song?.title_th}`
// what to show a song at when it LOADS (mount or a song switch) — the link's key or its own
function keyOnLoad(storedKey) {
  if (pendingLinkKey && isRealSong()) {
    if (linkKeySong === null) linkKeySong = songIdentity()
    if (linkKeySong === songIdentity()) return pendingLinkKey
    pendingLinkKey = '' // a different song — the link has had its say
  }
  return storedKey || 'C'
}
const displayKey = ref(keyOnLoad(props.song?.content?.key))
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
// ---- ฟังตอนแก้ (P'Aim 24 ก.ค.) — a song-maker works แก้ → ฟัง → แก้ → ฟัง, so listening must
// not cost an exit from the pencil. There is NO second audio path: a scope preview is the same
// startPlay/playSong call the dock makes, with `order` narrowed to the range under the cursor.
// previewOrder ≠ null ONLY while a scoped preview sounds (stopPlay + the natural end clear it),
// so "playing with no preview" always means the whole song.
const previewOrder = ref(null) // [{name,fromLi,toLi}] — the narrowed play order
const previewScope = ref(null) // 'line' | 'section' — which button is lit
const previewLabel = ref('') // what that scope is, in words (shown while it sounds)
function clearPreview() {
  previewOrder.value = null
  previewScope.value = null
  previewLabel.value = ''
}

// 717 multi-lyric — one number, one melody (stanza), several lyric SETS you SWITCH between
// (not stack). content.lyricSets = [{name}]; each arrangement entry tags its set via `set`
// (index) — an entry with NO `set` is SHARED across every set (e.g. a common refrain). Tabs
// show only when a song declares >1 set → zero impact on all existing songs. The set is
// chosen INSIDE resolveContent (opts.set), so every resolved line keeps its original
// `_entryIndex` and the inline editor still writes to the right arrangement entry.
const lyricSets = computed(() => {
  const ls = props.song?.content?.lyricSets
  return Array.isArray(ls) && ls.length > 1 ? ls : null
})
const activeSet = ref(0)
// Each set's own name ("ชื่อของเนื้อชุดนั้น"), not a positional caption: different words are
// a different song to whoever sings them. lyricSetName() keeps the `label` and positional-
// caption fallbacks, so already-saved 717 songs read exactly as before.
const lyricSetLabels = computed(() => (lyricSets.value || []).map((ls, i) => lyricSetName(ls, i)))
const activeSetName = computed(() => lyricSetLabels.value[activeSet.value] || '')
// reset the active tab only when the SONG changes (not on every edit), so a live edit keeps
// you on the set you're viewing.
watch(() => props.song?.id, () => { activeSet.value = 0; setsOpen.value = false })
// …and a set can also disappear WITHOUT the id changing (an edit deletes one; the song object
// is replaced carrying the same id — or the same undefined id). resolveContent already clamps
// an out-of-range set, so the sheet stays correct, but the tab bar would show nothing selected
// and aria-labelledby would name a tab that no longer exists. Clamp the state too.
watch(() => lyricSets.value?.length || 0, (n) => { if (activeSet.value >= n) activeSet.value = 0 })
// A shared ?set= link opens on its set — ONCE, and only for a REAL song: the editor mounts a
// blank draft alongside, so spending the link on that would drop the reader back on set 1 the
// moment the routed song lands. Same guard shape as ?key= above. Declared AFTER the two
// watchers that reset activeSet so it runs last in the flush and they cannot stomp it.
let pendingLinkSet = props.startSet > 0 ? props.startSet : 0
watch(
  () => `${isRealSong()}|${lyricSets.value?.length || 0}|${props.startSet}`,
  () => {
    if (!pendingLinkSet && props.startSet > 0) pendingLinkSet = props.startSet // resolved late by the shell
    const n = lyricSets.value?.length || 0
    if (!pendingLinkSet || !isRealSong() || !n) return // sets not loaded yet — retry when they are
    activeSet.value = Math.min(pendingLinkSet, n - 1) // a deleted set clamps, never goes blank
    pendingLinkSet = 0
  },
  { immediate: true },
)
// Switching set swaps the WORDS wholesale: different ท่อน, different line count, so every
// index the transport is holding (the ท่อน ticks, the play position) now refers to a sheet
// that is no longer on screen. Treat it like opening the song afresh — stop, rewind, re-tick
// every ท่อน — otherwise a tick left over from the previous set makes the selection a strict
// subset and playback quietly drops to "only the ท่อน you picked" instead of the whole song.
watch(activeSet, (i) => {
  stopPlay()
  pausedIndex.value = 0
  posIndex.value = 0
  nextTick(selectAllSecs) // tags are recomputed from the NEW set's sheet — tick after that
  emit('set', i) // so แผ่นเพลง prints/exports the set that was on screen
})
// what to hand the model: undefined for every ordinary song (nothing to filter), so the
// resolve path is byte-identical unless a song opts in.
const setOpt = computed(() => (lyricSets.value ? { set: activeSet.value } : undefined))
// …and the same choice baked into a standalone song, for the export path (MP3 + its size/length
// estimate), which derives everything from `content` alone and so cannot be handed an option.
// Read-only: its `_entryIndex` values index the narrowed arrangement, not the original.
const exportContent = computed(() =>
  props.song ? scopeToLyricSet(props.song.content, activeSet.value) : null,
)

// ---- the switcher is a DISCLOSURE around the tabs (P'Aim, 26 ก.ค.) ----------------------
// You pick your set once and then sing; an always-open strip spent permanent space above the
// words on a control used once per song. Collapsed, the summary still NAMES the set on the
// sheet, so the singer always knows which words these are (a bare "▾ ชุดเนื้อร้อง" would hide
// that). Disclosure pattern (WAI-ARIA APG): a real <button> with aria-expanded + aria-controls
// over the panel; the tablist inside keeps its own tab semantics unchanged.
const setsOpen = ref(false)
const setsPanel = ref(null)
const summaryBtn = ref(null)
// G-verify, 26 ก.ค. (the one finding that survived source-checking): a role="tabpanel" whose
// tablist is not present is a broken widget — the sheet was claiming to be the panel of tabs a
// screen-reader user could not reach. So the TAB semantics only exist while the tabs do. While
// folded the sheet is just the sheet, and the summary button is what names the current set.
const setTabsVisible = computed(() => !!lyricSets.value && (editMode.value || setsOpen.value))
function toggleSets() {
  setsOpen.value = !setsOpen.value
  // opening lands you on the CHOICE, not back at the top of the panel (APG: move focus to the
  // active tab so ← → work immediately)
  if (setsOpen.value) nextTick(() => setsPanel.value?.querySelectorAll('.lset-tab')[activeSet.value]?.focus())
}
// Pointer/Enter on a tab = a decision → apply it and close, focus back on the summary that now
// reads the new name. Arrow keys (below) only MOVE the selection, so a keyboard user can browse
// the sets without the panel shutting under them.
function pickSet(i) {
  activeSet.value = i
  // while editing the strip stays open (there is no summary to hand focus back to) — folding it
  // would hide the very thing the next keystroke writes into
  if (editMode.value) return
  setsOpen.value = false
  nextTick(() => summaryBtn.value?.focus())
}

// ＋ เพิ่มชุดเนื้อร้อง — /v2's inline editor is the only editor it has, so making a new set of
// words has to be possible here (P'Aim, 26 ก.ค.). Pure content op on the same seam as every
// other structure action; the shell owns the save. Land on the set that was just created, so
// the author types into it rather than hunting for where it went.
function onAddLyricSet() {
  const next = addLyricSet(props.song.content)
  if (next === props.song.content) return
  emit('update-content', next)
  nextTick(() => { activeSet.value = (next.lyricSets?.length || 1) - 1 })
}

// 🗑 ลบชุดนี้ — the way OUT of a set. /v2 ships the ＋ that makes one, so a set added by mistake
// has to be removable here too; until now only the v1 editor could take one away, which on this
// site meant "permanent". Same pure content op both sites share (songStructure.deleteLyricSet),
// so the two stay ONE behaviour: this set's WORDS go, the melody (stanzas) and every shared row
// stay, the sets after it renumber (delete the middle of three → 1 · 2, never 1 · 3), and the
// last set can never be deleted — down to one set the song COLLAPSES back to an ordinary one
// with no `lyricSets` and no leftover `set` keys.
const confirmDelSet = ref(-1) // set index pending delete (-1 = no dialog)
const delSetBtn = ref(null) // the 🗑 that opened the confirm — focus returns here on cancel
const cancelDelBtn = ref(null)
const okDelBtn = ref(null)
// aria-modal="true" is only true if focus cannot wander off behind the scrim. Two buttons, so
// the trap is a toggle rather than a list walk.
function cycleConfirmFocus() {
  const el = document.activeElement === cancelDelBtn.value ? okDelBtn.value : cancelDelBtn.value
  el?.focus()
}
const setMsg = ref('') // aria-live: what the delete actually did (lives OUTSIDE the tab strip)
function askDeleteLyricSet() {
  if ((lyricSets.value?.length || 0) <= 1) return // guard — the button is disabled as well
  confirmDelSet.value = activeSet.value
  // Focus lands on ยกเลิก, not on the destructive button (Apple HIG "Alerts": for a destructive
  // action the SAFE choice is the default). v1 focuses ลบ and binds Enter to it — a held Enter
  // from the tab strip then deletes a set nobody chose to delete. Esc still cancels; ลบ needs a
  // deliberate press. This is the one place /v2 deliberately diverges from v1's dialog.
  nextTick(() => cancelDelBtn.value?.focus())
}
function cancelDeleteLyricSet() {
  confirmDelSet.value = -1
  nextTick(() => delSetBtn.value?.focus())
}
function doDeleteLyricSet() {
  const i = confirmDelSet.value
  confirmDelSet.value = -1
  if (i < 0 || (lyricSets.value?.length || 0) <= 1) return
  const name = lyricSetLabels.value[i] || ''
  const next = deleteLyricSet(props.song.content, i)
  if (next === props.song.content) return
  emit('update-content', next)
  const left = next.lyricSets?.length || 1
  // Land on the set ABOVE the deleted one (v1 does the same): delete set 2 of 3 and you are on
  // what is now set 1, never on a blank strip. Set it here rather than leaving it to the clamp
  // watcher, which only runs on the next flush — long enough for the sheet to flash set 1.
  activeSet.value = Math.min(Math.max(0, i - 1), left - 1)
  setMsg.value = left > 1
    ? t('lyricSet.deleted', { name, n: left })
    : t('lyricSet.deletedLast', { name })
}

// WAI-ARIA tabs pattern: ← → Home End move between tabs (roving tabindex below), so the
// switch is reachable without a pointer.
function onSetKey(e) {
  const n = lyricSets.value?.length || 0
  if (!n) return
  const k = e.key
  // Esc closes the disclosure without changing the set (APG) and returns focus to the summary.
  if (k === 'Escape') {
    e.preventDefault()
    setsOpen.value = false
    nextTick(() => summaryBtn.value?.focus())
    return
  }
  let next = -1
  if (k === 'ArrowRight') next = (activeSet.value + 1) % n
  else if (k === 'ArrowLeft') next = (activeSet.value - 1 + n) % n
  else if (k === 'Home') next = 0
  else if (k === 'End') next = n - 1
  else return
  e.preventDefault()
  activeSet.value = next
  nextTick(() => e.currentTarget?.querySelectorAll('.lset-tab')[next]?.focus())
}

const resolved = computed(() =>
  props.song
    ? { ...props.song.content, lines: resolveContent(props.song.content, setOpt.value) }
    : null,
)
const printTitle = computed(() => {
  const s = props.song
  if (!s) return ''
  const base = (s.number != null ? s.number + '. ' : '') + (s.title_th || 'เพลง')
  // print takes the SELECTED set only, so the paper has to say which one — otherwise two
  // printouts of the same song number carry different words under the same heading.
  const set = lyricSets.value ? lyricSetLabels.value[activeSet.value] : ''
  return set ? base + ' — ' + set : base
})

// ---- issue9 lead-sheet header (DISPLAY only) — the song title moves onto its own full line
// above the sheet (it used to be teleported into the app bar and truncated with "…"), with a
// Key · Time · Tempo meta strip in the international lead-sheet order. All inputs already exist
// (no model change). `leadTitle` reuses `printTitle` (same "141. โอ…"/เพลง-fallback text).
// `displayKey` (line 158) is the LIVE transpose value, so the strip stays reactive to a key
// change in the dock. Display honesty: an absent bpm/timeSignature is HIDDEN here — NOT the
// synth's fallback-92 (`tempo`, line 167) — because a wrong tempo/meter on a chart is worse
// than none.
const leadTitleEn = computed(() => (props.song?.title_en || '').trim())
const origKey = computed(() => props.song?.content?.key || '')
const isTransposed = computed(
  () => !!displayKey.value && !!origKey.value && displayKey.value !== origKey.value,
)
const timeSig = computed(() => {
  const t = props.song?.content?.timeSignature
  return typeof t === 'string' && t.trim() ? t.trim() : ''
})
const bpmVal = computed(() => {
  const b = props.song?.content?.bpm
  return Number.isFinite(b) && b > 0 ? b : null
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
// The symbol characters the inline editor understands (the toolbar shows a button per
// character; these are also what we learn keyboard positions for). SYMBOL_CHARS is derived from
// the single registry (lib/editorCommands.js) = its on-bar entries — no second list here.
// the browser's measured keyboard layout (Chromium/Edge); null elsewhere — then a hint is only
// composed for keys whose `code` IS the character (digits/letters). Never a guessed table.
const layoutMap = ref(null)
// bumped whenever a new position is learned, so the toolbar re-reads the hint store
const hintNonce = ref(0)
// ---- undo / redo (regression: the editor on `main` has always had it) -------------------
// P'Aim: "ควรมีปุ่ม undo redo ด้วย ของเดิมมี พร้อม shortcut key". Same engine/behaviour as that
// editor (lib/editHistory), pointed at the inline surface: the DOCUMENT is the song content
// (so EVERY edit path is covered — notes, words, chords, chords cleared, insert/delete,
// แทรก/ทับ, all 12 symbols — because they all flow through `update-content`), and the cursor
// is the view that rides along, so undo puts you back where the edit happened.
const history = createHistory()
const canUndo = ref(false)
const canRedo = ref(false)
let applyingHistory = false
function syncHistoryFlags() {
  canUndo.value = history.canUndo()
  canRedo.value = history.canRedo()
}
history.reset(props.song?.content ?? null, 0)
syncHistoryFlags()
// The history covers the EDITING SESSION: it starts when the pencil goes on and ends when it
// goes off. Content changes that happen outside it (the shell finishing its load, a recovered
// working copy being applied, the migration pass) are the starting point, NOT steps — recording
// them made ย้อน jump back to a song state the user never typed.
watch(
  () => props.song?.content,
  (c) => {
    if (applyingHistory) return // replaying a step must not record it as a new one
    if (!editMode.value) { history.reset(c ?? null, curIdx.value) } else { history.record(c ?? null, curIdx.value) }
    syncHistoryFlags()
  },
)
watch(editMode, (on) => {
  // entering แก้ = a clean slate (nothing to undo yet — and the buttons say so)
  if (on) history.reset(props.song?.content ?? null, curIdx.value)
  syncHistoryFlags()
})
// a fresh song (switched in the picker) starts a fresh history — you cannot undo into another song
watch(
  () => props.song?.id ?? props.song?.title_th,
  () => { history.reset(props.song?.content ?? null, curIdx.value); syncHistoryFlags() },
)
function applyHistoryStep(step) {
  if (!step) return // nothing to undo/redo — the buttons are disabled, so this is belt+braces
  applyingHistory = true
  emit('update-content', step.doc)
  if (typeof step.view === 'number') curIdx.value = Math.min(Math.max(step.view, -1), editUnits.value.length - 1)
  nextTick(() => { applyingHistory = false })
  syncHistoryFlags()
  focusCapture()
}
function undoEdit() { applyHistoryStep(history.undo()) }
function redoEdit() { applyHistoryStep(history.redo()) }
// The shortcut must work while the caret is in the note/word field — that is where the user
// is. One rule (lib/editHistory.undoIntent) serves both this window listener and the capture
// field, so the two can never disagree.
function onUndoKeys(e) {
  if (!editMode.value) return
  if (transportKey(e)) return // ฟังบรรทัด/ท่อน · Esc หยุด (transportKey owns preventDefault)
  const intent = undoIntent(e)
  if (!intent) return
  e.preventDefault()
  intent === 'redo' ? redoEdit() : undoEdit()
}
// how a typed digit behaves — DEFAULT 'overwrite' (a number lands right ON the current note,
// predictable "กด 1 = ใส่ 1 ตรงที่อยู่"). 'insert' (push the rest right) is the toggle for adding
// notes. The Insert key flips it.
//
// item 4 (2-mode caret) — the two modes now wear two cursor SHAPES so the hand knows which is
// live (VS Code/Word overtype ↔ insert): 'overwrite' = a BLOCK covering one note (the existing
// .nt-sel highlight); 'insert' = a thin blinking LINE CARET sitting BETWEEN notes at `caretGap`.
// caretGap is a gap index in [0 .. inlineCells.length]: g sits BEFORE note-cell g, and g ===
// length is the gap AFTER the last note. gap 0 (g0) is the position before the very first note —
// which is what lets you insert a note ahead of it ("insert 5 before 2"). Block mode ignores it.
const typeMode = ref('overwrite')
const caretGap = ref(0)
const noteCellCount = computed(() => inlineCells.value.length)
// keep the (invisible) capture input near the caret so the physical/phone keyboard stays put:
// point curIdx at the note the caret sits at (or the last note when it is past the end).
function syncCurIdxToCaret() {
  const n = noteCellCount.value
  if (!n) return
  curIdx.value = Math.min(caretGap.value, n - 1) * 2 // the note UNIT (even index) of that cell
}
// move the line caret one gap left/right (insert mode). Clamped to [0, N] so it can reach both
// g0 (before the first note) and gN (after the last).
function moveCaret(dir) {
  caretGap.value = Math.max(0, Math.min(caretGap.value + dir, noteCellCount.value))
  syncCurIdxToCaret()
}
function toggleTypeMode() {
  typeMode.value = typeMode.value === 'insert' ? 'overwrite' : 'insert'
  // entering แทรก: drop the line caret just BEFORE the note that was selected (its left edge),
  // so pressing Insert then typing inserts ahead of it — and from g0 you can precede the first note.
  if (typeMode.value === 'insert') {
    const ci = curIdx.value >= 0 ? Math.floor(curIdx.value / 2) : 0
    caretGap.value = Math.max(0, Math.min(ci, noteCellCount.value))
  }
}
// item 5 (keyboard octave) — `.` is a DEAD-KEY prefix: while armed, the NEXT digit becomes a LOW
// note (.5), matching the parser SSOT (notation.js: a dot BEFORE the digit = low octave; a dot
// AFTER = augmentation). If the next key is not a digit the '.' resolves to a plain aug dot. A
// faint pending indicator shows the armed state; Esc (or any resolve) clears it. One-shot, no timeout.
const pendingLow = ref(false)
// All keys arrive at the hidden capture <input> (focused on selection so the device keyboard
// opens: numeric for a note, Thai text for a word). NOTE layer: digits/arrows/delete are
// commands. WORD layer: text flows into the input (→ withSetSyllable), and ← → only leave the
// word when the caret is at its edge; ↑ ↓ / space / Enter navigate.
function onCaptureKey(e) {
  if (!editMode.value) return
  // ฟังบรรทัด/ท่อน (Ctrl+Enter / Ctrl+Shift+Enter) + Esc หยุด — checked FIRST so plain Enter
  // keeps meaning "next unit" and the transport never steals a typing key.
  if (transportKey(e)) return
  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y while typing — handled here as well as on the window, so a
  // browser/IME that swallows the event before it bubbles cannot lose the shortcut. stopPropagation
  // is REQUIRED (same reasoning as transportKey): the capture field sees the key first, and without
  // it the SAME event bubbles to the window listener (onUndoKeys), which runs undo/redo a SECOND
  // time — one Ctrl+Z then undoing two steps at once (caught 24 ก.ค.: typed 5→4→7, one ย้อน gave 5,3,3).
  const histIntent = undoIntent(e)
  if (histIntent) {
    e.preventDefault()
    e.stopPropagation()
    histIntent === 'redo' ? redoEdit() : undoEdit()
    return
  }
  // DS §4.1: learn where this character lives on THIS keyboard, from the key actually pressed.
  // The toolbar then shows it on that character's button, so the next time it can be typed
  // straight away. Measured only — a character never typed here simply has no hint.
  if (selLayer.value !== 'word' && SYMBOL_CHARS.includes(e.key)) {
    if (learnKey(e.key, e.code, e.shiftKey, layoutMap.value)) hintNonce.value++
  }
  // Ctrl+K (⌘K) — open the ใส่สัญลักษณ์วน/นำทาง menu (jump/navigation markers). stopPropagation for
  // the same reason as undo: the capture field sees the key first, and the window listener would
  // otherwise fire a second time. Ctrl+K collides with nothing the note/word layer types. When the
  // general command palette (docs/ds/command-palette.md) later lands, this delegates to it and
  // markers become one of its categories — for now it is the marker menu's keyboard door (spec §3.1).
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault(); e.stopPropagation()
    toggleMarkerMenu()
    return
  }
  const ctrl = e.ctrlKey || e.metaKey
  const word = selLayer.value === 'word'
  const el = e.target
  const atStart = word && (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0
  const atEnd = word && (el.selectionStart ?? 0) >= el.value.length && (el.selectionEnd ?? 0) >= el.value.length
  // Esc — leave the pencil (item 2). A pending low-octave dead key eats the first Esc (cancels
  // it); an open chord popup owns Esc itself (it holds focus — see onChordKey), so none reaches here.
  if (e.key === 'Escape') {
    e.preventDefault()
    if (pendingLow.value) { pendingLow.value = false; return }
    // Esc closes the layers the pencil owns before it leaves the pencil (AC-9): disarm a pending
    // marker drop, then the ใส่สัญลักษณ์วน/นำทาง menu — only a bare Esc exits the editor.
    if (armedDrop.value >= 0) { armedDrop.value = -1; return }
    if (markerMenuOpen.value) { markerMenuOpen.value = false; markerNeedNote.value = false; return }
    requestExitEdit()
    return
  }
  // item 5 dead-key resolution — once '.' is armed the NEXT key decides: a digit → a LOW note
  // (.5); anything else → the '.' was a plain augmentation dot on the current note, then that key
  // still runs its normal job below (so '.' then Enter = 5. and move on).
  if (!word && pendingLow.value) {
    if (/^[0-7]$/.test(e.key)) { e.preventDefault(); pendingLow.value = false; typeLowDigit(e.key); return }
    pendingLow.value = false
    applySymbol('.')
  }
  // insert mode moves the LINE CARET one gap; overwrite mode moves the BLOCK by one note (±2 units)
  const insNote = !word && typeMode.value === 'insert'
  if (e.key === 'ArrowRight') { if (ctrl) { e.preventDefault(); moveBar(1) } else if (!word || atEnd) { e.preventDefault(); insNote ? moveCaret(1) : moveHoriz(1) } }
  else if (e.key === 'ArrowLeft') { if (ctrl) { e.preventDefault(); moveBar(-1) } else if (!word || atStart) { e.preventDefault(); insNote ? moveCaret(-1) : moveHoriz(-1) } }
  else if (e.key === 'ArrowDown') { e.preventDefault(); ctrl ? moveLineJump(1) : moveVert(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); ctrl ? moveLineJump(-1) : moveVert(-1) }
  else if (e.key === 'Insert') { e.preventDefault(); toggleTypeMode() }
  else if (e.key === 'Enter') { e.preventDefault(); moveHoriz(1) }
  else if (e.key === ' ') { e.preventDefault(); word ? splitWordAdvance(el) : moveUnit(1) } // space = split syllable / next unit
  // Home / End = first / last note. Ctrl+Home / Ctrl+End do the same, because that is the pair
  // a document editor trains your hands on (Docs/VS Code/Notion) — and on the WORD layer plain
  // Home/End are left to the browser, where they mean "start/end of this word" as they should.
  else if (!word && (e.key === 'Home' || (ctrl && e.key === 'Home'))) { e.preventDefault(); curIdx.value = 0 }
  else if (!word && (e.key === 'End' || (ctrl && e.key === 'End'))) { e.preventDefault(); curIdx.value = editUnits.value.length - 1 }
  else if (word && ctrl && e.key === 'Home') { e.preventDefault(); curIdx.value = 0 }
  else if (word && ctrl && e.key === 'End') { e.preventDefault(); curIdx.value = editUnits.value.length - 1 }
  // item 3 — CHORD at the cursor: `c` opens the chord popup right over this note (the MAIN way to
  // add/edit a chord now; the toolbar คอร์ด ▾ stays as a fallback). 'c' collides with nothing —
  // digits own 0-7, the marks/accidentals own their own keys. Ctrl+C is left to the browser (copy).
  else if (!word && (e.key === 'c' || e.key === 'C') && !ctrl) { e.preventDefault(); openChordPopup() }
  // item 5 — arm the low-octave dead key ('.'); the next key resolves it (handled above). Must
  // come BEFORE the generic symbol branch, which would otherwise apply '.' as an aug dot at once.
  else if (!word && e.key === '.') { e.preventDefault(); pendingLow.value = true }
  // NOTE layer: a digit sets the note. Overwrite (block) STAYS on the note so you can add octave /
  // ♯♭ before moving (P'Aim); ← → / space move on. Insert drops the digit at the LINE CARET.
  else if (!word && /^[0-7]$/.test(e.key)) {
    e.preventDefault()
    if (typeMode.value === 'insert') insertAtCaret(e.key)
    else overwriteDigit(e.key)
  }
  // The rest of the jianpu symbol set, typed straight onto the sheet — # b n (accidentals, on a
  // physical keyboard so they need no button), the marks _ ~ ^ that ride on the note, the
  // structural boxes - ( ) { }, the high-octave ' (and the curly-quote ’ some keyboards emit),
  // and the | bar line. ⛔ ONE dispatch: `symbolForKey` (the registry) decides if a key is a
  // symbol, then `applySymbol` classifies it — the SAME path the toolbar buttons take. The
  // keydown handler must never re-implement the classification (that was CP-0's silent drift).
  else if (!word && symbolForKey(e.key)) { e.preventDefault(); applySymbol(e.key) }
  // item 4 — Delete = ลบขวา (pull-tight forward delete) · Backspace = ลบซ้าย (แล้วถอย). The old
  // Delete=rest-in-place moved to typing 0 (overwriteDigit('0')), so the direction is text-standard.
  else if (!word && e.key === 'Delete') { e.preventDefault(); deleteRight() }
  else if (!word && e.key === 'Backspace') { e.preventDefault(); deleteLeft() }
  // WORD layer: an empty word + Backspace removes the whole cell; otherwise let the text edit
  // (native) — onCaptureInput writes it back to the syllable.
  else if (word && e.key === 'Backspace' && el.value === '') { e.preventDefault(); removeCell() }
}
// WORD layer: mirror the input's text into the current verse's syllable, live.
function onCaptureInput(e) {
  if (selLayer.value !== 'word') { e.target.value = ''; return } // note layer stays empty
  const loc = cellLoc()
  if (!loc) return
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
// BI-005 — the syllable address of ANY edit unit (not just the selected one), so a split can
// carry the tail onto the next note. Same shape cellLoc() returns.
function wordLocFor(unit) {
  const rline = unit ? resolved.value?.lines?.[unit.li] : null
  if (!rline || rline._entryIndex == null) return null
  return { resolvedLine: rline, si: unit.si, syk: unit.syk }
}
// the word currently under a given unit (this verse) — to see whether the next note is free
function syllableTextFor(unit) {
  const line = unit ? resolved.value?.lines?.[unit.li] : null
  if (!line) return ''
  let si = -1
  for (const it of line) {
    if (it.type !== 'segment') continue
    si++
    if (si === unit.si) return it.syllables?.[unit.syk] ?? ''
  }
  return ''
}
// BI-005 ("v1 ดีกว่าเยอะ") — port v1's (EditorMode.onSylKey) lyric feel to the inline editor:
// Space SPLITS the syllable at the caret — the text before stays on THIS note, the text after
// flows onto the NEXT note — then the cursor advances. So a whole phrase can be typed into one
// box and chopped note-by-note instead of clicking every cell. The tail only lands on a following
// note that is EMPTY (never overwrites an existing lyric); otherwise space is a plain advance (the
// live-typed text already sits in this box).
function splitWordAdvance(el) {
  const loc = cellLoc()
  if (!loc) { moveHoriz(1); return }
  const c = el.selectionStart ?? el.value.length
  const head = el.value.slice(0, c)
  const tail = el.value.slice(c)
  const nextIdx = curIdx.value + 2
  const nextUnit = editUnits.value[nextIdx]
  if (tail && nextUnit && nextUnit.layer === 'word' && !syllableTextFor(nextUnit)) {
    let next = withSetSyllable(props.song.content, loc, head)
    const nloc = wordLocFor(nextUnit)
    if (nloc) next = withSetSyllable(next, nloc, tail)
    if (next !== props.song.content) emit('update-content', next)
    curIdx.value = nextIdx // advance onto the carried tail (focusCapture reloads the field)
    return
  }
  moveHoriz(1)
}

// ---- the editing FRAME (24 ก.ค.) --------------------------------------------------------
// While the pencil is on, the editing surface becomes an app frame under the shell bar: the
// sheet scrolls in its own region and the tool dock is a flex child BESIDE it. Before this the
// dock floated over the sheet — hit-testing every visible glyph on the real app showed up to
// 92 of 279 note/word cells hidden behind it at 1280 (and every visible cell at 360), which is
// exactly the line you are typing on. In a frame it cannot cover a cell at ANY scroll offset,
// and it never moves, so the same tool stays under the same finger all day.
// `frameTop` = the sticky shell bar's real height (it changes with width / when login wraps),
// measured rather than hard-coded. `kbInset` lifts the frame's floor above a phone's on-screen
// keyboard, so the dock rides just over it as a keyboard accessory does.
const WIDE_MIN = 768
const isWide = ref(typeof window !== 'undefined' ? window.innerWidth >= WIDE_MIN : true)
const frameTop = ref(56)
const kbInset = ref(0)
function measureFrame() {
  const bar = typeof document !== 'undefined' ? document.querySelector('.shell-bar') : null
  frameTop.value = bar ? Math.round(bar.getBoundingClientRect().bottom) : 56
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  kbInset.value = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0
}
function onResizeWidth() {
  isWide.value = window.innerWidth >= WIDE_MIN
  measureFrame()
  updateNoteRect()
}
// the dock is part of the editor's chrome, not a per-selection popup: it is there the whole
// time the pencil is on, so its buttons never appear/disappear under the user's hand.
const showToolbar = computed(() => editMode.value)
// วิธีใช้ — a permanent 6-line block used to ride above the sheet (72px at 1280 · 226px at 360
// = 28% of a phone screen). It now lives behind the dock's ? button, which is always visible,
// and it OPENS BY ITSELF the first time this browser ever edits, so a newcomer still meets it.
// (The lesson we are respecting: a control that is only in a menu gets used 0 times.)
const HELP_SEEN_KEY = 'pleng.editHelpSeen'
const helpOpen = ref(false)
function markHelpSeen() {
  try { localStorage.setItem(HELP_SEEN_KEY, '1') } catch { /* private mode — just show it again */ }
}
function setHelpOpen(v) {
  helpOpen.value = v
  if (v) markHelpSeen()
  focusCapture()
}
// the selected cell's on-screen rect — the (invisible) capture input is pinned over it so the
// caret and the device keyboard sit where the user is looking. Re-read on selection + scroll.
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
  updateCaretRect()
}
// item 4 — the LINE CARET's on-screen rect (insert mode only). It sits at the LEFT edge of the
// note-cell at the gap, or at the RIGHT edge of the last note when the caret is past the end (gN).
const caretRect = ref(null)
function updateCaretRect() {
  if (!editMode.value || typeMode.value !== 'insert' || !sheetWrap.value) { caretRect.value = null; return }
  const n = noteCellCount.value
  if (!n) { caretRect.value = null; return }
  const g = Math.max(0, Math.min(caretGap.value, n))
  const atEnd = g >= n
  const cell = inlineCells.value[atEnd ? n - 1 : g]
  const el = cell && sheetWrap.value.querySelector(`.segment[data-seg="${cell.li}-${cell.si}"] .nt[data-idx="${cell.syk}"]`)
  if (!el) { caretRect.value = null; return }
  const r = el.getBoundingClientRect()
  caretRect.value = { top: r.top, height: Math.max(16, r.bottom - r.top), x: atEnd ? r.right : r.left }
}
watch([caretGap, typeMode], () => nextTick(updateCaretRect))
// item 1 — keep the edit point IN VIEW. When ↑↓/←→ move the caret past the visible edge of the
// scrolling sheet, bring it back — block:'nearest' (only when it is actually leaving; no jump to
// center → keeps spatial memory + no jitter on fast typing) and behavior:'auto' (instant → arrow
// bursts never queue/cancel a smooth animation). The save-bar (top) and the tool dock / phone
// keyboard (bottom) are flex SIBLINGS outside .sv-doc, so they can't cover the cell; scroll-padding
// on .sv-doc adds a little breathing room anyway. Real-Chrome behaviour (scrollIntoView has been
// silent inside the browser pane — memory pleng-agent-browser-not-rendering).
function scrollCaretIntoView() {
  if (!editMode.value || !sheetWrap.value) return
  const sel = selLayer.value === 'word' ? '.syl-sel-active, .syl-sel' : '.nt-sel-active, .nt-sel'
  const el = sheetWrap.value.querySelector(sel)
  el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
}
watch(selCell, () => nextTick(() => { updateNoteRect(); scrollCaretIntoView() }))
watch(editMode, (on) => {
  if (!on) { noteRect.value = null; caretRect.value = null; pendingLow.value = false; closeChordPopup(); return }
  measureFrame()
  let seen = true
  try { seen = localStorage.getItem(HELP_SEEN_KEY) === '1' } catch { seen = false }
  if (!seen) { helpOpen.value = true; markHelpSeen() }
  nextTick(updateNoteRect)
})

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
  const next = withNotePitch(props.song.content, loc, digit)
  if (next !== props.song.content) emit('update-content', next)
}
// resolve an ARBITRARY inline note cell (not just the selected one) to its source address, so
// insert/delete can act at the line caret's gap rather than only under the block cursor.
function locForCell(cell) {
  if (!cell) return null
  const rline = resolved.value?.lines?.[cell.li]
  if (!rline || !rline._stanza) return null
  return { resolvedLine: rline, si: cell.si, syk: cell.syk }
}
// item 4 — INSERT a note at the line caret (insert mode). gap g < N → insert to the LEFT of
// note-cell g (so from g0 the new note precedes the first note); gap N → append after the last
// note. The caret then advances one gap (left-to-right entry). `low` (item 5) drops the new note
// an octave in the SAME emit, so `.5` is one undo step. With no notes yet, fall back to setting
// the selected cell's pitch so the very first digit is never lost.
function insertAtCaret(digit, low = false) {
  const c = props.song.content
  const n = noteCellCount.value
  if (!n) {
    const loc0 = selLoc()
    if (!loc0) return
    let nx = withNotePitch(c, loc0, digit)
    if (low) nx = withOctaveShift(nx, loc0, -1)
    if (nx !== c) emit('update-content', nx)
    return
  }
  const g = Math.max(0, Math.min(caretGap.value, n))
  const before = g < n
  const loc = locForCell(inlineCells.value[before ? g : n - 1])
  if (!loc) return
  let next = withInsertedBox(c, loc, digit, before)
  if (next === c) return
  if (low) next = withOctaveShift(next, { ...loc, syk: loc.syk + (before ? 0 : 1) }, -1)
  emit('update-content', next)
  caretGap.value = g + 1
  nextTick(syncCurIdxToCaret)
}
// item 5 — type a LOW-octave note by keyboard (the `.` dead key). Insert mode routes through the
// caret; overwrite mode sets the covered note's pitch then drops it an octave, both in ONE emit
// (so `.5` is a single undo step, and a no-op pitch — retyping the same digit — still gets the dot).
function typeLowDigit(digit) {
  if (typeMode.value === 'insert') { insertAtCaret(digit, true); return }
  const loc = selLoc()
  if (!loc) return
  const c = props.song.content
  let next = withNotePitch(c, loc, digit)
  next = withOctaveShift(next, loc, -1)
  if (next !== c) emit('update-content', next)
}
// item 4 — Backspace deletes the note to the LEFT of the caret and steps the caret back
// (Wikipedia: "deletes the character before the cursor"). In block mode this is the existing
// "remove the covered cell, step back". Both pull the following notes tight (withDeletedNote).
function deleteLeft() {
  if (typeMode.value === 'insert') {
    const g = caretGap.value
    if (g <= 0) return
    const loc = locForCell(inlineCells.value[g - 1])
    if (!loc) return
    const next = withDeletedNote(props.song.content, loc)
    if (next !== props.song.content) { emit('update-content', next); caretGap.value = g - 1; nextTick(syncCurIdxToCaret) }
    return
  }
  removeCell()
}
// item 4 — Delete deletes the note to the RIGHT of the caret, pull-tight (forward delete). In
// block mode "the note to the right of the caret" IS the covered note, so Delete removes it and
// pulls the next one into its place (this REPLACES the old Delete=rest; "rest in place" is now
// made by typing 0). The bar line '|' is a separate line item, never a note cell, so a forward
// delete at a bar's end naturally skips the '|' and removes the first note of the next bar.
function deleteRight() {
  if (typeMode.value === 'insert') {
    const g = caretGap.value
    if (g >= noteCellCount.value) return
    const loc = locForCell(inlineCells.value[g])
    if (!loc) return
    const next = withDeletedNote(props.song.content, loc)
    if (next !== props.song.content) { emit('update-content', next); nextTick(syncCurIdxToCaret) }
    return
  }
  const loc = selLoc()
  if (!loc) return
  const next = withDeletedNote(props.song.content, loc)
  if (next !== props.song.content) {
    emit('update-content', next) // cursor stays put (the next note pulls into this slot); clamp after
    nextTick(() => { const max = editUnits.value.length - 1; if (curIdx.value > max) curIdx.value = Math.max(-1, max) })
  }
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
  const next = withRestAt(props.song.content, loc)
  if (next !== props.song.content) emit('update-content', next)
}
// word layer → blank just this word in this verse; the note stays.
function clearWord() {
  const loc = cellLoc()
  if (!loc) return
  const next = withClearedSyllable(props.song.content, loc)
  if (next !== props.song.content) emit('update-content', next)
}
// Backspace = remove the WHOLE cell (note box + its word slot in every verse) so the line
// actually gets shorter. Works from either layer. Cursor steps back to the previous note.
function removeCell() {
  const loc = cellLoc()
  if (!loc) return
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
  const next = withOctaveShift(props.song.content, loc, dir)
  if (next !== props.song.content) emit('update-content', next)
}
function accidentalSel(acc) {
  const loc = selLoc()
  if (!loc) return
  const next = withAccidental(props.song.content, loc, acc)
  if (next !== props.song.content) emit('update-content', next)
}
// ONE entry point for a symbol, whether it was TYPED (keydown passes e.key) or tapped on the
// toolbar (@symbol passes the button char). DS §4.1: the buttons and the keyboard must be the
// same thing seen from two sides — never two code paths that drift. Classification lives in the
// single registry (lib/editorCommands.js): `symbolForKey` resolves the key to its canonical
// character (so the curly quote ’ raises the octave just like '), and `applySymbolToContent`
// maps it to the engine action. This function only wires that pure result to the song + cursor.
function applySymbol(key) {
  const ch = symbolForKey(key)
  if (ch) {
    const loc = selLoc()
    if (loc) {
      const next = applySymbolToContent(props.song.content, loc, ch)
      if (next !== props.song.content) {
        emit('update-content', next)
        // The cursor STAYS on the note it acted on — every symbol is a toggle now (BI-003), so
        // pressing the same key again must land on the same note to undo it (`-` inserted here,
        // press `-` again removes it; `~` ties, press again unties). Moving on is ← → / space.
      }
    }
  }
  focusCapture() // tapping a button must not steal the caret / close the phone keyboard
}
// the symbol keys already applied to the SELECTED note — the toolbar lights each matching key so
// the toggle-to-remove is discoverable (a lit `~` says "press again to take the arc off"). Empty
// on the word layer or with no note selected. Recomputes on selection or content change.
const activeSymbols = computed(() => {
  const loc = selLoc()
  return loc ? activeSymbolsAt(props.song.content, loc) : []
})
// the same marks as friendly chips (BI-011c) — the phone-first "what is on this note" affordance:
// one [เอื้อน ✕] chip per human concept, tap ✕ = remove. Empty on the word layer / no selection.
const activeMarks = computed(() => {
  const loc = selLoc()
  return loc ? activeMarksAt(props.song.content, loc) : []
})
// remove one active mark from the selected note (the chip's ✕). A slur/triplet is a group removed
// wherever its brackets live (withBracketRemovedAt); every other mark is a plain key toggle-off.
function removeMark(act) {
  const loc = selLoc()
  if (!loc) { focusCapture(); return }
  if (act === 'slur' || act === 'triplet') {
    const [open, close] = act === 'slur' ? ['(', ')'] : ['{', '}']
    const next = withBracketRemovedAt(props.song.content, loc, open, close)
    if (next !== props.song.content) emit('update-content', next)
    focusCapture()
  } else {
    applySymbol(act) // the same toggle the key press uses (already re-focuses the caret)
  }
}
// the chord picker's options for the song's key ("— ไม่มีคอร์ด —" first = clear)
const chordOpts = computed(() => chordOptions(props.song?.content?.key || 'C'))
// set / clear the chord on the selected note's segment (chord '' = remove, keep the note)
function setChord(chord) {
  const loc = cellLoc()
  if (!loc) return
  const next = withChord(props.song.content, loc, chord)
  if (next !== props.song.content) emit('update-content', next)
  focusCapture()
}
// ---- item 3: chord AT the cursor (the MAIN path) ------------------------------------------
// A popup that appears right ON the note (not a far toolbar): press `c`, type, and the chord
// lands on that note. Space confirms + advances to the next note (MuseScore 4 chord-symbol flow),
// so a whole line's chords go in without touching the mouse. The engine is the SAME withChord /
// isValidChord the toolbar uses — this only adds the at-cursor entry surface.
const chordPopupOpen = ref(false)
const chordDraft = ref('')
const chordBad = ref(false)
const chordPristine = ref(true) // untouched popup + Enter must NOT delete an existing chord
const chordPopInput = ref(null)
// the chord currently on the selected note's segment (pre-fills the popup, select-all so a type
// overwrites it) — read from the resolved line, same walk selCell/currentWord use.
const chordAtCursor = computed(() => {
  const c = selCell.value
  if (!c) return ''
  const line = resolved.value?.lines?.[c.li]
  if (!line) return ''
  let si = -1
  for (const it of line) {
    if (it.type !== 'segment') continue
    si++
    if (si === c.si) return it.chord || ''
  }
  return ''
})
// BI-012 — open a fresh chord entry ON a note by CLICK/TAP of the slot above it (the pencil is on).
// Selects that note's cell then opens the popup over it — the same surface `c` and the run use.
function onChordEdit({ li, si }) {
  const cell = inlineCells.value.find((c) => c.li === li && c.si === si)
  if (!cell) return
  gotoCellNote(cell)
  nextTick(openChordPopup)
}
function openChordPopup() {
  if (!selCell.value) return
  chordDraft.value = chordAtCursor.value
  chordPristine.value = true
  chordBad.value = false
  chordPopupOpen.value = true
  nextTick(() => {
    const el = chordPopInput.value
    if (el) { el.focus(); el.select() } // pre-fill + select-all → typing overwrites (G · verified UX)
  })
}
// live parse-preview under the caret (G r3): NO blocking dropdown — chords are 1–4 chars, so a
// dropdown just fights the Space run. Instead show how the text parses (F#m7 → F♯m7) so a beginner
// sees the app understood it, red when it isn't a readable chord. Pure preview; commit stays on Space/Enter.
const chordPreview = computed(() => {
  const q = chordDraft.value.trim()
  if (!q || chordPristine.value) return null
  const pretty = q.replace(/#/g, '♯').replace(/b/g, '♭') // # → ♯, b → ♭ (b in a chord is always a flat)
  return { text: pretty, ok: isValidChord(q) }
})
// aria-live anchor announcement — read the current chord slot's bar so a screen reader follows the
// caret as Space walks the song (G a11y).
const chordAnchorLabel = computed(() => {
  if (!chordPopupOpen.value) return ''
  const c = selCell.value
  if (!c) return ''
  const cell = inlineCells.value.find((x) => x.li === c.li && x.si === c.si && x.syk === c.syk)
  const bar = cell ? cell.bi + 1 : '?'
  return `${chordAtCursor.value ? 'แก้คอร์ด ' + chordAtCursor.value : 'ใส่คอร์ด'} · ห้อง ${bar}`
})
function closeChordPopup() {
  chordPopupOpen.value = false
  chordBad.value = false
}
// write the popup's text to the note. NEVER traps the run AND never discards what the user typed
// (BI-012, PM gate: no silent data loss + no hard-block). pristine = keep the existing chord; empty =
// clear it; ANY other text is written verbatim — a valid chord renders normally, an unreadable one is
// KEPT and soft-marked red on the sheet (chordReadable) so the editor fixes it later. Audio/transpose
// already skip unparseable chords, so the model + sound stay safe. The caret always advances.
function commitChordDraft() {
  if (chordPristine.value) return // untouched → keep existing chord
  const q = chordDraft.value.trim()
  if (q === '') { setChord(''); return } // cleared on purpose → delete the chord
  if (!isValidChord(q)) chordBad.value = true // unreadable → flag it, but still keep the text below
  setChord(q) // keep whatever was typed — valid renders, invalid is soft-marked (no silent discard)
}
// advance to the next CHORD SLOT and reopen the popup, so chords can be keyed in a run (Space).
// A chord lives on a SEGMENT, so this skips the other note-boxes of the current segment and lands on
// the first note of the NEXT segment — one Space = one chord slot forward (not one note-box, which
// would stop twice on a beamed/melisma segment that shares a single chord). Crosses bars/lines.
function chordNextNote() {
  const cells = inlineCells.value
  const cur = selCell.value
  if (!cur) { closeChordPopup(); focusCapture(); return }
  const ci = cells.findIndex((c) => c.li === cur.li && c.si === cur.si && c.syk === cur.syk)
  const next = cells.slice(ci + 1).find((c) => c.li !== cur.li || c.si !== cur.si) // first note of next segment
  if (!next) { closeChordPopup(); focusCapture(); return } // no more chord slots — just close
  gotoCellNote(next)
  nextTick(openChordPopup)
}
// mirror of chordNextNote — Shift+Space / Shift+Tab step BACK a chord slot (G non-expert key set), so
// a mis-keyed chord is one step back to fix, still without the mouse. Lands on the FIRST note of the
// previous segment (where its chord is pinned).
function chordPrevNote() {
  const cells = inlineCells.value
  const cur = selCell.value
  if (!cur) { closeChordPopup(); focusCapture(); return }
  const ci = cells.findIndex((c) => c.li === cur.li && c.si === cur.si && c.syk === cur.syk)
  const prevAny = [...cells.slice(0, ci)].reverse().find((c) => c.li !== cur.li || c.si !== cur.si)
  if (!prevAny) { closeChordPopup(); focusCapture(); return }
  const first = cells.find((c) => c.li === prevAny.li && c.si === prevAny.si) || prevAny
  gotoCellNote(first)
  nextTick(openChordPopup)
}
// jump the caret to the FIRST note of the NEXT bar and reopen (Ctrl+Space — for a chord that
// holds across a whole bar). moveBar already lands on the next bar's first note.
function chordNextBar() {
  moveBar(1)
  nextTick(openChordPopup)
}
function pickChordFromPopup(v) {
  setChord(v)
  closeChordPopup()
  focusCapture()
}
// mobile "โน้ตถัดไป ►" — the touch equivalent of Space (soft keyboards lack an easy Space), so a
// phone user still runs the whole song from one surface without dismissing the keyboard.
function advanceFromButton() {
  chordPristine.value = false
  commitChordDraft()
  chordNextNote()
}
// mobile delete (≥24px trash) — poking the keyboard to blank the text is annoying on a phone (G)
function deleteChordFromPopup() {
  setChord('')
  closeChordPopup()
  focusCapture()
}
function onChordKey(e) {
  chordPristine.value = false
  if (e.key === 'Enter') {
    // Enter = commit + EXIT chord mode (end of a line/song). Never traps on junk (write valid only).
    e.preventDefault(); e.stopPropagation()
    commitChordDraft(); closeChordPopup(); focusCapture()
  } else if (e.key === ' ') {
    // Space = commit + ADVANCE to the next note + reopen — the continuous-run key (chord names carry
    // no spaces, so a space can only mean "next"). Ctrl = next bar · Shift = previous note. Advances
    // even on junk (soft-mark, never trap — G r3), so one typo can't stop the run.
    e.preventDefault(); e.stopPropagation()
    commitChordDraft()
    if (e.ctrlKey || e.metaKey) chordNextBar()
    else if (e.shiftKey) chordPrevNote()
    else chordNextNote()
  } else if (e.key === 'Tab') {
    // Tab / Shift+Tab = commit + next / previous note — the web-form muscle-memory alias for the run
    // (G non-expert key set). Bound here so focus can't escape the run mid-song.
    e.preventDefault(); e.stopPropagation()
    commitChordDraft()
    if (e.shiftKey) chordPrevNote()
    else chordNextNote()
  } else if (e.key === 'Escape') {
    // cancel: keep the existing chord (drop the typed edit), close, and hand focus back to the
    // note cell so the arrows work at once (G pitfall: Esc otherwise drops focus to <body>).
    e.preventDefault(); e.stopPropagation()
    closeChordPopup()
    focusCapture()
  }
  // Other keys (typing, ↑↓ within the field) fall through to the native input.
}
// place the popup ABOVE the note by default; if that would push it off the top (or under the
// save-bar) drop it BELOW instead. On a phone the on-screen keyboard shrinks the visual viewport —
// clamp the popup so it stays above the keyboard (visualViewport.height + offsetTop) rather than
// hiding behind it (§3 mobile: "ป๊อปอัปเหนือแป้นพิมพ์เสมอ").
const CHORD_POP_H = 118 // approx popup height for the above/below decision (measured-enough)
const chordPopStyle = computed(() => {
  const r = noteRect.value
  if (!r) return { display: 'none' }
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  const vTop = vv ? vv.offsetTop : 0
  const vBottom = vv ? vv.offsetTop + vv.height : (typeof window !== 'undefined' ? window.innerHeight : 800)
  const above = r.top - CHORD_POP_H - 6
  const placeBelow = above < vTop + 8
  const style = { position: 'fixed', left: Math.max(8, r.left) + 'px', 'z-index': 'var(--z-inline-edit)' }
  if (placeBelow) style.top = Math.min(r.bottom + 6, vBottom - CHORD_POP_H - 8) + 'px'
  else style.top = above + 'px'
  return style
})
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
// BI-014 — the editor's invariant is "visible selection ⟺ keyboard focus": while a cell is
// highlighted the user must be able to keep typing it. A plain click on the BLANK part of the
// sheet (padding, the gap between cells — anything that is not a note, a word, or a control)
// otherwise lets the browser move focus off the hidden capture <input> to <body>: the highlight
// stayed but typing died (P'Aim's report). We keep focus by preventing the mousedown's default
// focus-shift — the same trick NoteInputBar's buttons use (@mousedown.prevent). MOUSE ONLY: on a
// touch device a tap on empty space should stay free to dismiss the on-screen keyboard (the
// natural gesture; the editor also has an explicit เสร็จ / Esc exit), so we never preventDefault
// there. Google Docs / Notion keep the caret the same way on a margin click.
let lastPointerType = 'mouse'
function onSheetPointerDown(e) { lastPointerType = e.pointerType || 'mouse' }
function isInteractiveSheetTarget(t) {
  return !!(t && t.closest && t.closest(
    '.nt[data-idx], .syl, .sv-capture, .sv-chordpop, button, a, input, textarea, select, [role="button"], [contenteditable]',
  ))
}
function onSheetMouseDown(e) {
  if (!editMode.value || !selCell.value) return
  if (lastPointerType && lastPointerType !== 'mouse') return // touch/pen → allow blur (OSK dismiss)
  if (isInteractiveSheetTarget(e.target)) return // a real edit target / control handles its own focus
  e.preventDefault() // blank space + mouse → keep the capture input focused (selection stays live)
}
function onInlinePick(e) {
  if (!editMode.value) return
  const nt = e.target.closest?.('.nt[data-idx]')
  if (!nt) {
    // Safety net: if a mouse click on empty space still slipped focus off the capture field
    // (onSheetMouseDown's preventDefault should stop this), pull it back so the highlighted cell
    // stays editable. Touch is left to blur so the on-screen keyboard can close.
    if (selCell.value && lastPointerType === 'mouse' && document.activeElement !== captureInput.value) focusCapture()
    return
  }
  const seg = nt.closest('.segment[data-seg]')
  if (!seg) return
  const [li, si] = seg.dataset.seg.split('-').map(Number)
  const syk = Number(nt.dataset.idx)
  // A jump-marker placeholder is armed → this tap DROPS the marker on the note (spec §3.2 point 3:
  // "แตะ chip → แตะโน้ตปลายทาง"), it does NOT move the edit selection.
  if (armedDrop.value >= 0) { placeArmedFromTap(li, si, syk); return }
  selectUnit(li, si, syk, 'note') // tapped the note glyph → edit the NOTE
}
// ---- save status (A-fix 23 ก.ค.) --------------------------------------------------------
// The inline editor used to have exactly ONE button ("เสร็จ") and no way to keep the work:
// a reload wiped it silently. It now states its state at all times and offers the save path
// that fits the tier — the gate is on STORING, never on editing (mission 3-tier model):
//   logged in → บันทึกร่าง into the server (draft, never overwrites the published song)
//   anon      → บันทึกเป็นไฟล์ (JSON download) = their own copy, exactly as mission.md says
// Either way the shell also mirrors every keystroke into a local working copy, so even a
// crash/reload can be recovered.
const canStoreServer = computed(() => props.tier !== 'anon' && props.tier !== 'guest')
// BI-007 — the REAL publish ceiling (store.js / db/002 RLS): approver writes `songs`; editor tops
// out at "ส่งตรวจ" (a review draft); anon can only keep a file + ask the team.
const canApprove = computed(() => props.tier === 'approver')
const SAVE_TEXT = {
  clean: 'บันทึกแล้ว',
  dirty: 'ยังไม่บันทึก',
  saving: 'กำลังบันทึก…',
  saved: 'บันทึกแล้ว',
  error: 'บันทึกไม่สำเร็จ',
}
const saveText = computed(() => SAVE_TEXT[props.saveState] || SAVE_TEXT.clean)
const saveIsSaved = computed(() => props.saveState === 'clean' || props.saveState === 'saved')
const saveLabel = computed(() => (canStoreServer.value ? 'บันทึกร่าง' : 'ดาวน์โหลด JSON'))
function requestSave() {
  if (props.saveState === 'saving') return
  if (canStoreServer.value) emit('save')
  else {
    // anon keeps their work as JSON (mission tier-0 path). Fall back to the song this viewer
    // holds when the shell store has none, so the download can never silently do nothing.
    downloadSong(currentSong.value || props.song)
    emit('save', 'file')
  }
}

// ---- BI-007 completion flow — the you-are-here model + the one adaptive finish button ---------
// completionModel (harvested from the stood-down EditorMode build, adapted to the inline surface)
// = the role×status state machine the CompletionStatus stepper reads. anon 5-step / editor 5-step
// / approver 2-step lanes. The inline editor never reviews OTHERS' drafts (that stays in แก้ไข), so
// there is no 'review' lane here.
const completionModel = computed(() => {
  if (!canStoreServer.value) {
    return {
      steps: ['แก้ไข', 'เก็บไฟล์', 'ส่งให้ทีมงาน', 'ทีมตรวจ', 'ขึ้นคลัง'],
      current: 0, tone: 'anon',
      statusText: 'งานนี้เก็บอยู่ในเครื่องคุณ',
      nextText: 'กด “ส่งข้อเสนอแนะให้ทีมงาน” — ดาวน์โหลดไฟล์แล้วส่งอีเมลให้ทีมงานนำขึ้นคลัง',
      rejectComment: '',
    }
  }
  if (canApprove.value) {
    const published = props.draftStatus === 'approved'
    return {
      steps: ['แก้ไข', 'เผยแพร่แล้ว'],
      current: published ? 1 : 0, tone: published ? 'approved' : 'draft',
      statusText: published ? 'เผยแพร่ขึ้นคลังแล้ว' : 'แก้ฉบับที่เผยแพร่',
      nextText: published ? 'อยู่บนเว็บแล้ว — แก้ต่อได้ทันที (กด “อนุมัติและเผยแพร่” ซ้ำเพื่ออัปเดต)' : 'กด “อนุมัติและเผยแพร่” = ขึ้นคลังทันที',
      rejectComment: '',
    }
  }
  const steps = ['แก้ไข', 'เก็บร่าง', 'ส่งตรวจทาน', 'รออนุมัติ', 'เผยแพร่แล้ว']
  switch (props.draftStatus) {
    case 'pending':
      return { steps, current: 3, tone: 'pending', statusText: 'ส่งตรวจทานแล้ว · รออนุมัติ', nextText: 'ผู้อำนวยเพลงกำลังตรวจทาน — จะแจ้งเมื่อขึ้นคลัง/ส่งกลับ (ถอนกลับมาแก้ได้)', rejectComment: '' }
    case 'approved':
      return { steps, current: 4, tone: 'approved', statusText: 'ขึ้นคลังแล้ว', nextText: 'อยู่บนเว็บแล้ว · แก้ต่อได้เป็นร่างใหม่', rejectComment: '' }
    case 'rejected':
      return { steps, current: 0, tone: 'rejected', statusText: 'ถูกส่งกลับให้แก้', nextText: 'แก้ตามความเห็นผู้อำนวยเพลง แล้วกด “ส่งให้ผู้อำนวยเพลงตรวจทาน” อีกครั้ง', rejectComment: props.reviewComment }
    default: // draft, or no draft yet
      return { steps, current: 1, tone: 'draft', statusText: 'บันทึกร่างแล้ว', nextText: 'พร้อมแล้วกด “ส่งให้ผู้อำนวยเพลงตรวจทาน” → จะรับไปพิจารณานำขึ้นคลัง', rejectComment: '' }
  }
})
// the auto-save micro-status the stepper shows (editor+ only): idle | saving | saved
const autoSaveState = computed(() => {
  if (!canStoreServer.value) return 'idle'
  if (props.saveState === 'saving') return 'saving'
  if (props.saveState === 'dirty' || props.saveState === 'error') return 'idle'
  return 'saved'
})
// G-review #3 — a steady reassurance beside the save controls that drafts are kept without a
// button press, so the user doesn't worry (and doesn't confuse "เก็บร่าง" with "ส่งตรวจ"). Only
// while working on a draft (an editor that has NOT yet submitted / been published).
const showAutosaveNote = computed(() => canStoreServer.value && !canApprove.value && props.draftStatus !== 'pending' && props.draftStatus !== 'approved')

// ONE primary finish button, adaptive by role + state (never a disabled dead-button — spec §4):
// anon = "ส่งให้ทีม" (download + email) · editor = "ส่งตรวจ" (submit) or "ถอนกลับมาแก้" while รอตรวจ
// · approver = "เผยแพร่" (writes songs). The pressable label always states the real outcome.
const isPending = computed(() => props.draftStatus === 'pending')
const finishKind = computed(() => {
  if (!canStoreServer.value) return 'anon'
  if (canApprove.value) return 'publish'
  return isPending.value ? 'withdraw' : 'submit'
})
// G-review (2026-07-24): drop system jargon for FUNCTION language — say what the button DOES for
// whom, so a user who doesn't know "publish/draft/approver" still understands.
const FINISH = {
  anon: { label: 'ส่งข้อเสนอแนะให้ทีมงาน', icon: 'send', title: 'ส่งเพลงให้ทีมงานพิจารณานำขึ้นคลัง (ดาวน์โหลดไฟล์ + อีเมล)' },
  publish: { label: 'อนุมัติและเผยแพร่', icon: 'globe', title: 'เผยแพร่ขึ้นคลังเพลงทันที — คนอื่นเห็นเลย' },
  submit: { label: 'ส่งให้ผู้อำนวยเพลงตรวจทาน', icon: 'send', title: 'ส่งงานให้ผู้อำนวยเพลงตรวจทานและนำขึ้นคลัง' },
  withdraw: { label: 'ถอนกลับมาแก้', icon: 'pencil', title: 'ดึงงานที่รอตรวจทานกลับมาแก้ต่อ' },
}
const finish = computed(() => FINISH[finishKind.value])
const submittedCard = ref(false) // D-D post-submit confirmation
const anonCard = ref(false) // D-B anon "ส่งให้ทีม" explainer
function requestFinish() {
  if (props.saveState === 'saving') return
  const kind = finishKind.value
  if (kind === 'anon') { anonCard.value = true; return }
  if (kind === 'publish') { emit('save', 'publish'); return }
  if (kind === 'withdraw') { emit('withdraw'); return }
  emit('save', 'pending')
  submittedCard.value = true
}
function anonDownload() { downloadSong(currentSong.value || props.song); emit('save', 'file') }
const mailtoHref = computed(() => {
  const title = (props.song?.number != null ? props.song.number + '. ' : '') + (props.song?.title_th || 'เพลง')
  return mailtoLink({
    to: 'pleng@phrakham.life',
    subject: 'ขอส่งเพลงขึ้นคลัง: ' + title,
    body: 'สวัสดีทีมพระคำ\n\nขอส่งเพลง "' + title + '" ให้ช่วยตรวจและนำขึ้นคลังครับ/ค่ะ\n(ได้แนบไฟล์ .json ที่ดาวน์โหลดจากเว็บมาด้วย — กด “ดาวน์โหลด JSON” ในหน้านั้นก่อนส่ง)\n\nขอบคุณครับ/ค่ะ',
  })
})
watch(() => props.draftStatus, (s) => { if (s !== 'pending') submittedCard.value = false })
// ---- ⚙ ตั้งค่าเพลง (B060) --------------------------------------------------------------
// พี่เปา asked for this on 9 ก.ค.: the song's own settings had to be edited in the OTHER
// editor, so keying a song meant bouncing between two surfaces. The panel lives here now.
// It is only offered while ✏️ is on — it is an editing action, not a reading one.
const settingsOpen = ref(false)
function toggleSettings() { settingsOpen.value = !settingsOpen.value; if (settingsOpen.value) structureOpen.value = false }
watch(editMode, (on) => { if (!on) settingsOpen.value = false })

// 🎼 โครงเพลง (structure drawer) — the section/melody manager + คัดลอก/วาง, brought onto the
// inline surface from the old boxed editor. Same open-while-editing rule as ตั้งค่าเพลง; the two
// side panels never share the screen (both would dock at the same spot), so opening one closes
// the other. `clip` is the คัดลอก buffer — view state that must survive the drawer closing, so it
// lives here (not inside the drawer).
const structureOpen = ref(false)
const clip = ref(null) // { kind:'bar'|'line', data, from } | null
function toggleStructure() { structureOpen.value = !structureOpen.value; if (structureOpen.value) settingsOpen.value = false }
watch(editMode, (on) => { if (!on) structureOpen.value = false })

// ตรวจโน้ต (notation lint) — brought onto the inline surface from the old boxed editor, which only
// ran the full rule set at publish. lintContent walks the whole v2 song and returns findings the
// author sees at the spot (ท่อน/บรรทัด/ห้อง): จังหวะไม่ครบ · ตัวพิมพ์อ่านไม่ได้ · ♮ ผิด · เอื้อน/โยงคร่อม ·
// repeat/volta ไม่สมดุล · ลำดับ modifier · จุดวนร้อง (D.S./Coda) ไม่ครบ. HINT-level advice is left out of
// the count (it is not a problem). Reactive to every edit — props.song.content is a NEW object per
// immutable edit, so the computed refreshes as you type.
const SEV_RANK = { [SEVERITY.ERROR]: 0, [SEVERITY.WARNING]: 1, [SEVERITY.HINT]: 2 }
const lintResult = computed(() => lintContent(props.song?.content))
const lintItems = computed(() =>
  lintResult.value.findings
    .filter((f) => f.severity !== SEVERITY.HINT)
    .slice()
    .sort((a, b) =>
      (SEV_RANK[a.severity] - SEV_RANK[b.severity]) ||
      ((a.lineIndex ?? -1) - (b.lineIndex ?? -1)) ||
      ((a.barIndex ?? -1) - (b.barIndex ?? -1))),
)
const lintCount = computed(() => lintItems.value.length)
const lintHasError = computed(() => lintItems.value.some((f) => f.severity === SEVERITY.ERROR))
// a finding's location in human words — ท่อน (only when the song has more than one) · บรรทัด · ห้อง;
// a song-level finding (an orphan jump, no line) reads "ทั้งเพลง".
function lintWhere(f) {
  if (f.lineIndex == null) return 'ทั้งเพลง'
  const stanzas = props.song?.content?.stanzas || []
  const ord = stanzas.findIndex((s) => s.id === f.stanzaId) + 1
  const parts = []
  if (stanzas.length > 1 && ord > 0) parts.push(`ท่อน ${ord}`)
  parts.push(`บรรทัด ${f.lineIndex + 1}`)
  if (f.barIndex != null) parts.push(`ห้อง ${f.barIndex + 1}`)
  return parts.join(' · ')
}
const lintOpen = ref(false)
function toggleLint() { lintOpen.value = !lintOpen.value }
watch(editMode, (on) => { if (!on) lintOpen.value = false })

// ---- ใส่สัญลักษณ์วน/นำทาง (D.C./D.S./Segno/Coda/To-Coda/Fine) — the ENTRY UI (marker-entry-ui.md) --
// Song-makers could RENDER these markers but never INSERT one: the note-key strip can't carry a
// {kind,al} structured marker, and typing a "label" only made cosmetic text. This wires the entry
// surface onto the already-built engine — it reads the ONE registry (editorCommands JUMP_PRESETS /
// JUMP_COMMANDS) so the ⋮ button, the Ctrl+K accelerator, and any future palette can't drift (CP-0).
// withJumpMarker / applyJumpCommand do the insert; mintMarkerIds (inside them) auto-links a
// To-Coda↔Coda / Segno↔D.S. pair BY KIND on every insert, so the dropzone only has to drop the right
// KIND at the right note — the id pairing is the engine's job (the iReal "can't-break-routing" idea).
const markerMenuOpen = ref(false)
const markerProMode = ref(false)       // false = plain-Thai presets; true = one-piece-at-a-time commands
const markerNeedNote = ref(false)      // "เลือกโน้ตก่อน" hint when the caret is not on a note
// placeholders a chosen preset still needs the user to DROP (its place[].drop entries). Grows as
// chips on the panel; each: { kind, placed }. Cleared when the menu/editor closes.
const pendingDrops = ref([])
const armedDrop = ref(-1)              // index of the chip armed for a note tap, or -1
const dropZoneRef = ref(null)          // the STEP-2 dropzone, so newly-grown chips scroll into view
// On a short screen the panel scrolls internally (max-height), so the dropzone that appends when a
// preset is chosen can land below the panel's own fold (and below the note-key dock). Bring it into
// the panel's view — the panel's visible area sits ABOVE the dock, so the chips end up reachable
// without the user hunting for them (Tester short-screen finding 24 ก.ค.). Instant, NOT smooth:
// smooth scrollIntoView silently no-ops on a nested overflow container in some Chromium builds
// (measured), so the chips would stay below the fold — instant is reliable.
function scrollDropsIntoView() { nextTick(() => dropZoneRef.value?.scrollIntoView({ block: 'nearest' })) }

const JUMP_KIND_LABEL = {
  segno: '𝄋 เครื่องหมายวน', coda: '𝄌 โคดา', 'to-coda': 'ไปโคดา',
  fine: 'Fine (จุดจบ)', dc: 'D.C.', ds: 'D.S.',
}
function jumpKindLabel(kind) { return JUMP_KIND_LABEL[kind] || kind }

function toggleMarkerMenu() {
  markerMenuOpen.value = !markerMenuOpen.value
  if (markerMenuOpen.value) { settingsOpen.value = false; structureOpen.value = false; lintOpen.value = false }
  else { markerNeedNote.value = false }
}
watch(editMode, (on) => { if (!on) { markerMenuOpen.value = false; pendingDrops.value = []; armedDrop.value = -1; markerNeedNote.value = false } })

// (a marker anchors to a NOTE cell; the tap handlers resolve it via the existing locForCell(cell).)

// choose a plain-Thai preset (e.g. "D.S. al Coda"): place its COMMAND at the caret immediately, then
// grow a chip for each placeholder the routing still needs (drop:true) so nothing is left implicit.
function chooseJumpPreset(preset) {
  const loc = selLoc()
  if (!loc) { markerNeedNote.value = true; return }
  markerNeedNote.value = false
  const cmd = preset.place.find((p) => !p.drop) || preset.place[0]
  const next = applyJumpCommand(props.song.content, loc, { kind: cmd.kind, al: cmd.al })
  if (next !== props.song.content) emit('update-content', next)
  pendingDrops.value = preset.place.filter((p) => p.drop).map((p) => ({ kind: p.kind, placed: false }))
  armedDrop.value = pendingDrops.value.length ? 0 : -1     // arm the first placeholder for a tap
  markerProMode.value = false
  if (pendingDrops.value.length) scrollDropsIntoView()     // reveal the new chips (short-screen)
  focusCapture()
}

// pro mode: drop ONE command at the caret (for someone who knows the theory / a routing no preset covers)
function chooseJumpCommand(cmd) {
  const loc = selLoc()
  if (!loc) { markerNeedNote.value = true; return }
  markerNeedNote.value = false
  const next = applyJumpCommand(props.song.content, loc, { kind: cmd.kind })
  if (next !== props.song.content) emit('update-content', next)
  focusCapture()
}

// place the idx-th pending placeholder on a note loc (from a tap, or the caret via placeDropAtCaret).
function placeDropAt(idx, loc) {
  const d = pendingDrops.value[idx]
  if (!d || d.placed || !loc) return
  const next = withJumpMarker(props.song.content, loc, { kind: d.kind })
  if (next !== props.song.content) emit('update-content', next)   // mintMarkerIds auto-links the pair
  const arr = pendingDrops.value.slice(); arr[idx] = { ...d, placed: true }; pendingDrops.value = arr
  armedDrop.value = arr.findIndex((x) => !x.placed)               // arm the next unplaced, or -1 when done
}
function placeDropAtCaret(idx) {
  const loc = selLoc()
  if (!loc) { markerNeedNote.value = true; return }
  markerNeedNote.value = false
  placeDropAt(idx, loc)
}
// A single note tap fires BOTH onSeek (SongSheet's emit) and onInlinePick (the wrapper) — for
// SELECTION that is harmless (the second just re-selects), but for a DROP each would consume a
// different chip. This guard makes one physical tap place exactly one marker; the flag clears on
// the next microtask, after both same-tick handlers have run. (syk is irrelevant to jump placement —
// withJumpMarker anchors to the SEGMENT si — so whichever handler wins lands on the same spot.)
let dropTapGuard = false
function placeArmedFromTap(li, si, syk) {
  if (armedDrop.value < 0 || dropTapGuard) return
  dropTapGuard = true
  Promise.resolve().then(() => { dropTapGuard = false })
  placeDropAt(armedDrop.value, locForCell({ li, si, syk }))
}
function armDrop(idx) { armedDrop.value = armedDrop.value === idx ? -1 : idx; markerNeedNote.value = false }
function clearPendingDrops() { pendingDrops.value = []; armedDrop.value = -1 }

// orphan guard (AC-3) — the engine SSOT, so it never disagrees with playback. A leftover pending
// chip OR a routing the resolver can't complete (findOrphanJumps) both surface as a persistent notice.
const orphanJumps = computed(() => findOrphanJumps(props.song?.content) || [])
// findOrphanJumps reports {kind:'ds-orphan'} (a D.S. with no Segno to return to) / {kind:'tocoda-orphan'}
// (a To Coda with no Coda to jump to) — spell the MISSING partner so the fix is obvious.
const ORPHAN_LABEL = {
  'ds-orphan': 'ยังไม่ได้วาง 𝄋 เครื่องหมายวน (จุดที่ D.S. ย้อนไป)',
  'tocoda-orphan': 'ยังไม่ได้วาง 𝄌 โคดา (จุดที่ ไปโคดา กระโดดไป)',
}
const orphanText = computed(() =>
  [...new Set(orphanJumps.value.map((o) => ORPHAN_LABEL[o.kind] || o.kind))].join(' · '))

// every jump marker currently in the song, in reading order — the edit/delete list (AC-7) and the
// "มีอยู่แล้ว" awareness. {id, kind, al, stanzaIndex, lineIndex} walked straight off the stored model.
const placedMarkers = computed(() => {
  const c = props.song?.content
  if (!c?.stanzas) return []
  const out = []
  c.stanzas.forEach((s, sIdx) => (s.lines || []).forEach((line, lIdx) => {
    if (!Array.isArray(line)) return
    line.forEach((it) => { if (it && it.type === 'jump' && it.id) out.push({ id: it.id, kind: it.kind, al: it.al, stanzaIndex: sIdx, lineIndex: lIdx }) })
  }))
  return out
})
const jumpsPresent = computed(() => placedMarkers.value.length > 0)

// delete a placed marker. A dc/ds COMMAND owns a routing (Segno/Coda it points at); offer to remove
// the whole set so no orphan is left (spec §5 delete-cascade). Its partners are the segno/coda/to-coda
// markers of the SAME song — we clear them all when the user confirms a full-set delete.
function deleteMarker(m) {
  const partnersOf = (kind, al) => {
    if (kind === 'ds') return al === 'coda' ? ['segno', 'to-coda', 'coda'] : ['segno']
    if (kind === 'dc') return al === 'coda' ? ['to-coda', 'coda'] : []
    return []
  }
  const partners = partnersOf(m.kind, m.al)
  let content = props.song.content
  if (partners.length && typeof window !== 'undefined' &&
      window.confirm(`ลบ ${jumpDirectiveLabel(m)} พร้อมจุดที่มันชี้ไป (${partners.map(jumpKindLabel).join(' · ')}) ด้วยไหม?\n\nกด "ตกลง" = ลบทั้งชุด · "ยกเลิก" = ลบเฉพาะคำสั่งนี้`)) {
    // remove partners (each unique id whose kind is a partner)
    for (const pm of placedMarkers.value) {
      if (pm.id !== m.id && partners.includes(pm.kind)) content = removeJumpMarker(content, pm.id)
    }
  }
  content = removeJumpMarker(content, m.id)
  if (content !== props.song.content) emit('update-content', content)
}
// change a placed marker's kind/al in place (edit popup)
function changeMarker(id, patch) {
  const next = updateJumpMarker(props.song.content, id, patch)
  if (next !== props.song.content) emit('update-content', next)
}
function jumpDirectiveLabel(m) {
  if (m.kind === 'dc') return m.al === 'fine' ? 'D.C. al Fine' : m.al === 'coda' ? 'D.C. al Coda' : 'D.C.'
  if (m.kind === 'ds') return m.al === 'fine' ? 'D.S. al Fine' : m.al === 'coda' ? 'D.S. al Coda' : 'D.S.'
  return jumpKindLabel(m.kind)
}

// breadcrumb "ลำดับเล่นจริง" (AC-6) — the deterministic play order from resolvePlayOrder, spelled in
// human words so the author sees the routing WITHOUT tracing arrows. Each range → the section name of
// its first display line (or ท่อน N). Updates live because it is a computed over props.song.content.
const playOrderCrumbs = computed(() => {
  const c = props.song?.content
  const order = resolvePlayOrder(c, setOpt.value)
  const lines = resolved.value?.lines || []
  if (!Array.isArray(order) || !order.length) return []
  const sectionOf = (li) => {
    const rl = lines[li]
    const sec = Array.isArray(rl) ? rl.find((it) => it && it.type === 'section') : null
    if (sec?.name) return sec.name
    const ei = rl?._entryIndex
    if (ei == null) return `บรรทัด ${li + 1}`
    // number the ท่อน by its position ON THIS SHEET, not by its raw arrangement index — with
    // lyric sets the entries in between belong to another set and aren't here, so a raw index
    // would call the second set's only verse "ท่อน 2". Identical without sets (contiguous).
    const seq = [...new Set(lines.map((l) => l?._entryIndex).filter((x) => x != null))].indexOf(ei)
    return `ท่อน ${(seq < 0 ? ei : seq) + 1}`
  }
  return order.map((r) => sectionOf(r.fromLi))
})
const showBreadcrumb = computed(() => jumpsPresent.value && playOrderCrumbs.value.length > 1)
// The cursor's source address (which melody line + bar + verse), for the drawer's คัดลอก/วาง.
// Maps the display cursor back through the resolved line's provenance tags. null when unselected.
const structCursor = computed(() => {
  const u = curUnit.value
  const rl = u ? resolved.value?.lines?.[u.li] : null
  if (!u || !rl || rl._stanza == null) return null
  return { stanzaId: rl._stanza, lineIndex: rl._stanzaLine ?? 0, barOrdinal: u.bi ?? 0, entryIndex: rl._entryIndex }
})
// A structure/clip edit produces a whole new content — same channel as every note/word edit.
function onStructureContent(next) {
  if (next && next !== props.song.content) emit('update-content', next)
}
// row fields → straight up to the owner (Studio holds the songs row).
function onSettingsMeta(patch) { emit('update-meta', patch) }
// content fields (คีย์ · จังหวะ · ความเร็ว) → handed UP as a patch, not applied here. The
// owner (Studio) holds the live song, so it applies the patch to the freshest content there
// is — this surface's `song` prop is a snapshot that only refreshes on re-render, and two
// settings changed in the same tick would then write the second one over the first.
//   คีย์ = a TRANSPOSE (lib/songEdit.withSongKey → lib/chords): the jianpu numbers are scale
//   degrees so they stand, the absolute chord letters move with the key. One key engine, the
//   same one the reading transpose uses; sheet and playback both read content.key, so what is
//   printed is what is heard.
function onSettingsMusic(patch) { emit('update-music', patch) }

// The edit surface's handlers, exposed so the tests can drive the SAME functions the UI does
// (a test that reimplements the wiring proves nothing about the wiring).
defineExpose({ applySymbol, setChord, deleteSel, selectUnit, focusFirstUnit, undoEdit, redoEdit, toggleEdit, requestExitEdit, playScope, playWholeFromEditor, requestSave, requestFinish, toggleSettings, onSettingsMusic, onSettingsMeta,
  // marker-entry UI (for tests that drive the SAME handlers the panel does)
  toggleMarkerMenu, chooseJumpPreset, chooseJumpCommand, placeDropAtCaret, armDrop, deleteMarker, changeMarker, pendingDrops, placedMarkers, orphanJumps, playOrderCrumbs,
  // 717 lyric sets — exposed so a test can drive the same guard the disabled button relies on
  askDeleteLyricSet, confirmDelSet })

// Leaving the editor — ONE gate, wherever the request comes from (the ✓ button, or the shell's
// mode tabs asking to take the user somewhere else). Returns true when we actually left, so the
// caller can hold its own action back if the user says "no, let me save first".
//
// Whether it asks depends on ONE thing: can the work still be got back?
//   • recoverable (the shell mirrored this edit into the local working copy — the normal case,
//     including a brand-new song, which keeps its own 'new' slot) → LEAVE, no dialog. The work
//     is in memory and on disk; the shell says so in a banner with a way straight back. A
//     confirm you answer "yes" to twenty times a day is one people stop reading, and then it
//     protects nothing (Apple HIG Alerts · NN/g on confirmation dialogs: modals are for
//     irreversible consequences).
//   • NOT recoverable (localStorage blocked or full — private mode, quota) → this really is the
//     last chance, so ASK. That is the case the heuristic keeps modals for.
function requestExitEdit() {
  if (!editMode.value) return true
  const dirty = props.saveState === 'dirty'
  if (dirty && !props.recoverable) {
    const ok = window.confirm(
      `ยังไม่ได้บันทึกงานที่แก้ไว้ และเบราว์เซอร์นี้เก็บสำเนากันหายไม่ได้\n\nกด "ตกลง" เพื่อออกจากโหมดแก้ (งานที่แก้จะหายเมื่อปิดหรือรีเฟรชหน้านี้)\nกด "ยกเลิก" แล้วกด "${saveLabel.value}" เพื่อเก็บงานก่อน`,
    )
    if (!ok) return false
  }
  editMode.value = false
  if (dirty) emit('left-dirty')
  return true
}
function toggleEdit() {
  if (editMode.value) { requestExitEdit(); return }
  editMode.value = true
  if (curIdx.value < 0 && editUnits.value.length) curIdx.value = 0
}
// Put the caret on the FIRST editable unit and hand it the keyboard. Used when the song under an
// already-open pencil is swapped out (the shell's "＋ เพลงใหม่") — toggleEdit's on-entry seeding
// never runs then, so a stale curIdx from the old song would leave the new blank song with no
// caret and nothing to type into. Force the selection to change (-1 → 0) so watch(curIdx) fires
// focusCapture even when the old index was already 0. No-op when there is nothing to select.
function focusFirstUnit() {
  curIdx.value = -1
  nextTick(() => { curIdx.value = editUnits.value.length ? 0 : -1 })
}
// the shell needs to know, so its mode tabs can tell the truth about where the user is
watch(editMode, (on) => emit('update:editing', on), { immediate: true })
// BI-002 — entering the editor STOPS playback. The reading transport (SingTransport) is hidden the
// moment the pencil turns on, so a song left playing became unstoppable — the audio ran on with no
// visible ⏹ (P'Aim: "เสียงค้าง"). Stop on the transition IN only (the watch fires on change, so the
// edit-mode ฟัง buttons that START playback AFTER we are already in edit mode are never cut off).
watch(editMode, (on) => { if (on) stopPlay() })
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
const strophicOrder = computed(() => resolvePlayOrder(props.song?.content, setOpt.value) ?? undefined)
// a partial ท่อน selection → ranges (undefined when every ท่อน is picked = whole song)
const selectionOrder = computed(() => (allSelected.value ? undefined : effectiveOrder(sections.value, selectedSecs.value)))
// what actually PLAYS: a scope preview from the pencil wins (ฟังท่อนนี้ / ฟังบรรทัดนี้ — it is a
// deliberate, temporary narrowing); then an explicit selection; otherwise the strophic default
// (or, with no directive, undefined = whole song in display order — byte-identical to before B102).
const order = computed(() => previewOrder.value ?? selectionOrder.value ?? strophicOrder.value)
// true ONLY when a strict subset is selected — then play/full indices differ and must be
// mapped. A strophic whole-song play has playNotes === fullNotes, so mapping stays identity.
const isSelectionSubset = computed(() => !!(previewOrder.value || selectionOrder.value))
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
    displayKey.value = keyOnLoad(c.key)
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
  (k) => { if (k) displayKey.value = keyOnLoad(k) },
)
// EPIC H — tell the shell which key is being read, so ↗ แชร์ shares THIS key (immediate: the
// shell must know before the user touches anything, incl. a link that opened on ?key=).
watch(displayKey, (k) => emit('key-change', k), { immediate: true })

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
  clearPreview() // a scope preview never outlives the sound it named
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
    clearPreview() // the scope has finished sounding — the label must not keep claiming it
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

// ---------- ฟังตอนแก้ — the transport that lives INSIDE the pencil (P'Aim 24 ก.ค.) ----------
// Everything here funnels into the same startPlay() the dock uses, so the golden piano, the
// สไตล์/ประกาย recipe, the shared pitch rule and the per-verse flow are byte-identical to
// โหมดฟัง. The ONLY difference a preview makes is `order` — which lines get scheduled.
//
// Why the LINE is the small unit (and the ท่อน the big one): a single note carries no musical
// information on its own — you cannot hear "wrong" without the phrase around it — while a whole
// ท่อน is 20–40 s of waiting for a one-note fix. A บรรทัด is the phrase a song-maker actually
// thinks in, and it is what the sheet already draws as one row, so "ฟังบรรทัดนี้" needs no
// explaining. ท่อนนี้ sits next to it for the wider check (does the fix still fit the verse?).
// Both are ONE tap — a scope menu would double the clicks of the loop this whole task exists to fix.
function lineScopeLabel(li) {
  const sec = sections.value.find((s) => li >= s.fromLi && li <= s.toLi)
  // _stanzaLine = the line's index inside its own ท่อน, so the number matches what the singer
  // counts on the page rather than a running total across the song.
  const n = (resolved.value?.lines?.[li]?._stanzaLine ?? li) + 1
  return sec ? `ท่อน ${sec.name} · บรรทัดที่ ${n}` : `บรรทัดที่ ${n}`
}
// The range under the cursor. 'section' falls back to the whole song when the song has no
// ท่อน markers at all (a single unlabelled lyric block) — never a silent no-op.
function scopeRange(scope) {
  const li = curUnit.value?.li
  if (li == null) return null
  if (scope === 'section') {
    const sec = sections.value.find((s) => li >= s.fromLi && li <= s.toLi)
    if (!sec) return null
    return { fromLi: sec.fromLi, toLi: sec.toLi, name: sec.name, label: `ท่อน ${sec.name}` }
  }
  if (scope === 'bar') {
    // BI-006 (พี่เปา) — just the ห้อง the caret sits in: the finest fine-tune unit. Reuses the
    // fromSi/toSi range that inPlayRange already honours (built for mid-bar repeat jumps), so no
    // engine change — the play narrows to this line's segments in the caret's bar (curUnit.bi).
    const bi = curUnit.value?.bi
    if (bi == null) return null
    const cells = inlineCells.value.filter((c) => c.li === li && c.bi === bi)
    if (!cells.length) return null
    const sis = cells.map((c) => c.si)
    return { fromLi: li, toLi: li, fromSi: Math.min(...sis), toSi: Math.max(...sis), name: null, label: `${lineScopeLabel(li)} · ห้องที่ ${bi + 1}` }
  }
  return { fromLi: li, toLi: li, name: null, label: lineScopeLabel(li) }
}
const canPlayLine = computed(() => !!scopeRange('line'))
const canPlaySection = computed(() => !!scopeRange('section'))
const canPlayBar = computed(() => !!scopeRange('bar'))
// ▶ ท่อนนี้ / ▶ บรรทัดนี้ — press the lit one again to stop.
function playScope(scope) {
  if (playing.value && previewScope.value === scope) { stopPlay(); pausedIndex.value = 0; posIndex.value = 0; return }
  const r = scopeRange(scope)
  if (!r) return
  stopPlay() // also clears any previous preview, so the label can never lie
  previewScope.value = scope
  // fromSi/toSi (BI-006 bar scope) narrow the single line to one ห้อง; absent for line/section.
  previewOrder.value = [{ name: r.name, fromLi: r.fromLi, toLi: r.toLi, fromSi: r.fromSi, toSi: r.toSi }]
  previewLabel.value = r.label
  pausedIndex.value = 0
  startPlay(0)
  focusCapture() // hand the caret straight back — the loop is แก้ → ฟัง → แก้, not แก้ → ฟัง → คลิก → แก้
}
// ▶ ทั้งเพลง — the dock's own play/pause, reachable from inside the pencil. Pressing it during
// a scope preview widens to the whole song rather than pausing.
function playWholeFromEditor() {
  if (playing.value) {
    const wasPreview = !!previewOrder.value
    pausedIndex.value = wasPreview ? 0 : playedIndex.value
    stopPlay()
    if (!wasPreview) return // it was a genuine pause of the whole song
  }
  startPlay(pausedIndex.value)
  focusCapture()
}
// what is sounding right now, in words — a partial play must always say what it is playing
const editPlayLabel = computed(() => (playing.value ? previewLabel.value || 'ทั้งเพลง' : ''))
// which button is lit. Named computeds (rather than an inline comparison in the template) keep
// every string literal inside a dynamic :name a real icon id — the Icon coverage gate.
const isWholePlaying = computed(() => playing.value && !previewScope.value)
const isSectionPlaying = computed(() => previewScope.value === 'section')
const isLinePlaying = computed(() => previewScope.value === 'line')
const isBarPlaying = computed(() => previewScope.value === 'bar')
// Keyboard, for the hands that never leave the notes. Ctrl+Enter = this line, Ctrl+Shift+Enter =
// this ท่อน, Esc = stop. Duplicated onto the capture field AND the window so an IME that swallows
// the event before it bubbles cannot lose it (same reasoning as the undo shortcut).
// It stops propagation itself: the capture field sees the key first and the window listener would
// otherwise see the SAME event and run the action a second time — and since each button toggles,
// the second run stopped the playback the first had just started (caught in the browser, 24 ก.ค.).
function transportKey(e) {
  if (!editMode.value) return false
  const act = e.key === 'Escape' && playing.value ? () => stopPlay()
    : e.key === 'Enter' && (e.ctrlKey || e.metaKey) ? () => playScope(e.shiftKey ? 'section' : 'line')
      : null
  if (!act) return false
  e.preventDefault()
  e.stopPropagation()
  act()
  return true
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
    // the reader's own pick always wins from here on — and spends a shared link's ?key=
    options: keyOptions.value, onPick: (v) => { pendingLinkKey = ''; displayKey.value = v },
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
  window.addEventListener('keydown', onUndoKeys)
  loadLayoutMap().then((m) => { layoutMap.value = m }) // for the symbol keys' "⇧ + 6" hints
  selectAllSecs() // B105: first-load default = every ท่อน ticked (the identity watcher isn't immediate)
  window.addEventListener('wheel', onUserScroll, { passive: true })
  window.addEventListener('touchmove', onUserScroll, { passive: true })
  // wheel/touchmove only cover a hand-scroll GESTURE. Keyboard scrolling (PageDown/space),
  // dragging the scrollbar and the follow-along auto-scroll all move the page WITHOUT one, and
  // the popup then kept its old viewport spot while the note slid away — that is how it ended up
  // sitting in the header band (P'Aim 23 ก.ค.). A plain scroll listener catches every case.
  window.addEventListener('scroll', onPageScroll, { capture: true, passive: true })
  window.addEventListener('resize', onResizeWidth)
  // a phone's on-screen keyboard shrinks the VISUAL viewport only — watch it so the frame's
  // floor (and with it the tool dock) lifts above the keyboard instead of hiding behind it. item 1:
  // ALSO re-scroll the caret into view once the keyboard has finished pushing the viewport (a
  // scrollIntoView fired before it settles computes the wrong position — G's visualViewport pitfall).
  const vv = window.visualViewport
  if (vv) { vv.addEventListener('resize', onViewportResize); vv.addEventListener('scroll', measureFrame) }
  nextTick(() => { isWide.value = window.innerWidth >= WIDE_MIN; measureFrame() }) // re-read once layout has a real width
})
function onViewportResize() {
  measureFrame()
  if (editMode.value) nextTick(() => { updateCaretRect(); scrollCaretIntoView() })
}
onUnmounted(() => {
  window.removeEventListener('keydown', onUndoKeys)
  window.removeEventListener('wheel', onUserScroll)
  window.removeEventListener('touchmove', onUserScroll)
  window.removeEventListener('scroll', onPageScroll, { capture: true })
  window.removeEventListener('resize', onResizeWidth)
  const vv = window.visualViewport
  if (vv) { vv.removeEventListener('resize', onViewportResize); vv.removeEventListener('scroll', measureFrame) }
  stopPlayback()
})

// tap a syllable/note in the sheet → jump playback there (US H1). Find the note's index
// in the CURRENT play order and start from it, in the current key.
function onSeek({ li, si, syk }) {
  // ✏️ on + a marker placeholder armed → drop it on this cell's note (a word tap still anchors the
  // marker to its note; markers carry no syllable). onInlinePick handles the note-glyph tap; this
  // covers a word (.syl @click.stop) tap so either target places the armed marker.
  if (editMode.value && armedDrop.value >= 0) { placeArmedFromTap(li, si, syk); return }
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
    <!-- The editing FRAME. While the pencil is off this is a plain wrapper and the page scrolls
         as usual; while it is on, the frame pins itself under the shell bar, the sheet scrolls
         inside .sv-doc, and the tool dock is a sibling BELOW it — so the dock can never cover a
         note or a word at any scroll position (measured 24 ก.ค.: it used to hide up to 92 of 279
         visible cells). `--sv-top` is the measured shell-bar height; `--sv-kb` is the phone
         keyboard's height, so the dock rides just above it. -->
    <div
      class="sv-surface"
      :class="{ 'sv-frame': editMode }"
      :style="editMode ? { '--sv-top': frameTop + 'px', '--sv-kb': kbInset + 'px' } : null"
    >
      <!-- BI-007 D-A — the persistent you-are-here stepper: where this song is in the
           แก้→ร่าง→ส่งตรวจ→เผยแพร่ journey + what to do next. In normal flow (not the dock), so it
           never vanishes on scroll/reload (fixes G2/G4). Shown for every tier (anon has its own
           5-step "ส่งให้ทีม" lane). Fed by the role×status completionModel. -->
      <CompletionStatus
        v-if="editMode"
        :steps="completionModel.steps"
        :current="completionModel.current"
        :tone="completionModel.tone"
        :status-text="completionModel.statusText"
        :next-text="completionModel.nextText"
        :reject-comment="completionModel.rejectComment"
        :auto-save="autoSaveState"
      />
      <!-- the editor's header: SAVE STATE stated at all times (A-fix) — "ยังไม่บันทึก" vs
           "บันทึกแล้ว ✓" — plus the save button that fits the tier and the way out. It is a flex
           child of the frame, ABOVE the scroll region: it used to be `position: sticky` inside it,
           which meant it sat on top of the first line of every verse as you scrolled (measured:
           34 cells hidden behind it). Nothing in the editor floats over the sheet any more. -->
      <div v-if="editMode" class="sv-save-bar no-print">
          <span class="sv-save-state" :class="saveIsSaved ? 'ok' : 'pending'" role="status" aria-live="polite">
            <Icon v-if="saveIsSaved" name="check" :size="16" /><span v-else class="sv-save-dot" aria-hidden="true">●</span>
            {{ saveText }}
          </span>
          <!-- ฟังตอนแก้ (P'Aim 24 ก.ค.) — the แก้ → ฟัง → แก้ loop must close without leaving the
               pencil. Three plain buttons, always drawn, never behind a gesture: the whole song,
               the ท่อน under the cursor, the บรรทัด under the cursor. Same audio path as โหมดฟัง
               (startPlay) — only `order` differs, so nothing about the sound can drift. -->
          <span class="sv-play-group" role="group" aria-label="ฟังเพลงขณะแก้">
            <button
              class="sv-play-btn"
              :class="{ on: isWholePlaying }"
              :aria-pressed="isWholePlaying"
              title="ฟังทั้งเพลง (กดอีกครั้งเพื่อพัก)"
              @click="playWholeFromEditor"
            ><Icon :name="isWholePlaying ? 'pause' : 'play'" :size="16" /> ทั้งเพลง</button>
            <button
              class="sv-play-btn"
              :class="{ on: isSectionPlaying }"
              :aria-pressed="isSectionPlaying"
              :disabled="!canPlaySection"
              title="ฟังเฉพาะท่อนที่กำลังแก้ (Ctrl+Shift+Enter)"
              @click="playScope('section')"
            ><Icon :name="isSectionPlaying ? 'square' : 'play'" :size="16" /> ท่อนนี้</button>
            <button
              class="sv-play-btn"
              :class="{ on: isLinePlaying }"
              :aria-pressed="isLinePlaying"
              :disabled="!canPlayLine"
              title="ฟังเฉพาะบรรทัดที่กำลังแก้ (Ctrl+Enter)"
              @click="playScope('line')"
            ><Icon :name="isLinePlaying ? 'square' : 'play'" :size="16" /> บรรทัดนี้</button>
            <!-- BI-006 (พี่เปา): the finest unit — just the ห้อง the caret is in, for checking one
                 fix without waiting through the whole บรรทัด. Same audio path (playScope). -->
            <button
              class="sv-play-btn"
              :class="{ on: isBarPlaying }"
              :aria-pressed="isBarPlaying"
              :disabled="!canPlayBar"
              title="ฟังเฉพาะห้องที่กำลังแก้"
              @click="playScope('bar')"
            ><Icon :name="isBarPlaying ? 'square' : 'play'" :size="16" /> ห้องนี้</button>
          </span>
          <!-- a partial play must SAY what it is playing — never leave the ear guessing -->
          <span v-if="editPlayLabel" class="sv-play-now" role="status" aria-live="polite">
            กำลังเล่น: {{ editPlayLabel }}
          </span>
          <span v-if="saveState === 'error' && saveError" class="sv-save-err">{{ saveError }}</span>
          <!-- B060 ⚙ ตั้งค่าเพลง — the song's เลข/ชื่อ/คีย์/จังหวะ/ความเร็ว/ธีม/หมวด, right here
               in the editor instead of over in the old grid editor. Belongs to THE DOCUMENT, so
               it sits with the save controls (not with the note-level dock). Added beside the
               save/done buttons without moving lane A's เสร็จ or lane B's ฟัง group. -->
          <!-- 🎼 โครงเพลง — จัดลำดับท่อน (ข้อ/รับ) · เลือก/แยกทำนอง · คัดลอก/วาง ห้อง/บรรทัด/ท่อน.
               Structure editing used to live only in the old boxed editor; this brings it onto the
               one-surface pencil flow beside ตั้งค่าเพลง (both are document-level editing actions). -->
          <!-- ＋ เพลงใหม่ — start a brand-new blank song WITHOUT leaving the pencil (the create
               action used to live only on the home catalog). Studio owns the song row + the
               unsaved-work guard, so this only asks for the intent; it swaps in a blank song and
               keeps ✏️ on so the author can type at once. A "create" affordance (file-plus), kept
               as the leading chip of the document-tool cluster; the ghost-chip style + label
               collapse match its siblings so the row still reads as one control group. -->
          <button
            class="sv-newsong-btn"
            type="button"
            title="สร้างเพลงใหม่ — เริ่มเพลงเปล่าในตัวแก้นี้ทันที"
            @click="$emit('new-song')"
          ><Icon name="file-plus" :size="16" /> <span class="sv-settings-lbl">เพลงใหม่</span></button>
          <!-- ตรวจโน้ต — the notation lint, ported from the old editor's publish-time check onto the
               inline surface. A quiet ✓ while clean, an amber/red count when there is something to
               look at; tap to see each issue with its ท่อน/บรรทัด/ห้อง and what to fix. -->
          <button
            class="sv-lint-btn"
            type="button"
            :class="{ 'has-error': lintHasError, 'has-warn': lintCount && !lintHasError, clean: !lintCount }"
            :aria-expanded="lintOpen"
            :aria-pressed="lintOpen"
            :title="lintCount ? `ตรวจโน้ต — พบ ${lintCount} จุดที่ควรตรวจ` : 'ตรวจโน้ต — ไม่พบปัญหา'"
            @click="toggleLint"
          ><Icon :name="lintCount ? 'triangle-alert' : 'badge-check'" :size="16" /> <span class="sv-settings-lbl">{{ lintCount ? `ตรวจโน้ต ${lintCount}` : 'ตรวจโน้ต' }}</span></button>
          <!-- ใส่สัญลักษณ์วน/นำทาง (D.C./D.S./Segno/Coda/Fine) — the ⋮ door (spec §3.1). Ctrl+K opens
               the same menu. An amber dot marks a routing that still needs a marker dropped. -->
          <button
            class="sv-marker-btn"
            type="button"
            :class="{ 'has-pending': pendingDrops.some((d) => !d.placed) || orphanJumps.length }"
            :aria-expanded="markerMenuOpen"
            :aria-pressed="markerMenuOpen"
            aria-haspopup="menu"
            title="ใส่สัญลักษณ์วน/นำทาง — ย้อนต้น (D.C.) · ย้อนเครื่องหมายวน (D.S.) · โคดา · Fine (Ctrl+K)"
            @click="toggleMarkerMenu"
          ><Icon name="repeat" :size="16" /> <span class="sv-settings-lbl">วน/นำทาง</span></button>
          <button
            class="sv-structure-btn"
            type="button"
            :aria-expanded="structureOpen"
            :aria-pressed="structureOpen"
            title="โครงเพลง — ลำดับท่อน (ข้อ/รับ) · ทำนอง · คัดลอก/วาง"
            @click="toggleStructure"
          ><Icon name="list-ordered" :size="16" /> <span class="sv-settings-lbl">โครงเพลง</span></button>
          <button
            class="sv-settings-btn"
            type="button"
            :aria-expanded="settingsOpen"
            :aria-pressed="settingsOpen"
            title="ตั้งค่าเพลง — เลขเพลง ชื่อ คีย์ จังหวะ ความเร็ว ธีม หมวด"
            @click="toggleSettings"
          ><Icon name="settings" :size="16" /> <span class="sv-settings-lbl">ตั้งค่าเพลง</span></button>
          <!-- G-review #3 — steady reassurance that drafts save themselves (near the buttons). -->
          <span v-if="showAutosaveNote" class="sv-autosave-note"><Icon name="check" :size="13" /> ระบบบันทึกร่างอัตโนมัติ</span>
          <!-- บันทึกร่าง = SECONDARY now (BI-007 D-C): auto-save keeps the work, so this is a manual
               backup, not the finish. anon keeps "ดาวน์โหลด JSON" (their own copy). -->
          <button
            class="sv-save-btn"
            :disabled="saveState === 'saving'"
            :title="canStoreServer ? 'เก็บร่างเดี๋ยวนี้ (ปกติระบบเก็บอัตโนมัติให้แล้ว)' : 'บันทึกงานเป็นไฟล์ JSON เก็บไว้ในเครื่อง'"
            @click="requestSave"
          ><Icon :name="canStoreServer ? 'save' : 'download'" :size="16" /> {{ saveLabel }}</button>
          <!-- BI-007 — the ONE primary finish button, adaptive by role + state (anon ส่งให้ทีม ·
               editor ส่งตรวจ/ถอนกลับมาแก้ · approver เผยแพร่). Always the best action the tier
               allows — never a disabled dead-button. -->
          <button
            class="sv-finish-btn"
            :disabled="saveState === 'saving'"
            :title="finish.title"
            @click="requestFinish"
          ><Icon :name="finish.icon" :size="16" /> {{ finish.label }}</button>
          <!-- "เสร็จ" lives HERE, beside the save state, instead of on a floating round button:
               a big fixed FAB is one more thing sitting on top of the sheet, and it collided with
               the dock once the dock took real height. Editor actions belong in the editor's own
               header (Docs/Sheets/Word all do this); the ✏️ FAB stays only as the way IN. -->
          <button class="sv-done-btn" title="เสร็จ — กลับไปฝึกร้อง (ไม่ได้ส่งหรือเผยแพร่)" aria-label="เสร็จการแก้ไข" @click="requestExitEdit">
            <Icon name="check" :size="16" /> เสร็จ
          </button>
        </div>

        <!-- BI-007 D-D — post-submit confirmation (editor): the "ส่งตรวจ" moment must not vanish as
             a toast. A calm inline card that says it landed + what happens next. -->
        <div v-if="editMode && submittedCard && isPending" class="sv-flow-card no-print" role="status" aria-live="polite">
          <Icon name="send" :size="18" class="sv-flow-ic" />
          <div class="sv-flow-body">
            <b>ส่งตรวจแล้ว 🎉</b>
            <span>ทีมผู้อนุมัติรับงานไปพิจารณาแล้ว — จะขึ้นคลังเมื่ออนุมัติ ระหว่างนี้ยัง “ถอนกลับมาแก้” ได้</span>
          </div>
          <button class="sv-flow-x" aria-label="ปิด" @click="submittedCard = false"><Icon name="x" :size="16" /></button>
        </div>

        <!-- BI-007 D-B — the anon "ส่งให้ทีม" flow: no server account, so the path is keep-a-file +
             email the team (WT-C). An ENABLED route, not a disabled publish button that misleads. -->
        <div v-if="editMode && anonCard" class="sv-flow-card sv-flow-anon no-print" role="dialog" aria-label="ส่งเพลงให้ทีม">
          <button class="sv-flow-x" aria-label="ปิด" @click="anonCard = false"><Icon name="x" :size="16" /></button>
          <div class="sv-flow-body">
            <b>ส่งเพลงให้ทีมนำขึ้นคลัง</b>
            <ol class="sv-flow-steps">
              <li><b>ดาวน์โหลดไฟล์เพลง</b> (JSON) เก็บงานของคุณ<br />
                <button class="sv-flow-act" @click="anonDownload"><Icon name="download" :size="15" /> ดาวน์โหลด JSON</button></li>
              <li><b>แนบไฟล์นั้นส่งอีเมล</b>ถึงทีม แล้วทีมจะตรวจและนำขึ้นคลังให้<br />
                <a class="sv-flow-act" :href="mailtoHref"><Icon name="send" :size="15" /> เปิดอีเมลถึงทีม</a></li>
            </ol>
            <p class="sv-flow-note">ทีมมีบัญชีอยู่แล้ว? <b>เข้าสู่ระบบ</b> (เมนูมุมขวาบน) เพื่อส่งตรวจได้ในเว็บเลย</p>
          </div>
        </div>

      <!-- ตรวจโน้ต result — a plain problems list (like Docs' spell-check panel): each issue names
           its spot and what to check. Anchored under the save bar, does not float over the sheet. -->
      <div v-if="editMode && lintOpen" class="sv-lint-panel no-print" role="dialog" aria-label="ผลตรวจโน้ต" @keydown.esc="lintOpen = false">
        <div class="sv-lint-head">
          <strong>ตรวจโน้ต</strong>
          <span class="sv-lint-sub">{{ lintCount ? `พบ ${lintCount} จุดที่ควรตรวจ` : 'ไม่พบปัญหา' }}</span>
          <button class="sv-lint-close" type="button" aria-label="ปิด" @click="lintOpen = false"><Icon name="x" :size="16" /></button>
        </div>
        <p v-if="!lintCount" class="sv-lint-empty"><Icon name="badge-check" :size="18" /> โน้ตผ่านการตรวจ — ไม่พบจังหวะขาด สัญลักษณ์ผิด หรือจุดวนร้องไม่ครบ</p>
        <ul v-else class="sv-lint-list">
          <li v-for="(f, i) in lintItems" :key="i" class="sv-lint-item" :class="f.severity">
            <Icon name="triangle-alert" :size="15" class="sv-lint-ic" aria-hidden="true" />
            <span class="sv-lint-sev-label">{{ f.severity === 'error' ? 'ผิด' : 'ควรตรวจ' }}</span>
            <div class="sv-lint-body">
              <span class="sv-lint-where">{{ lintWhere(f) }}</span>
              <span class="sv-lint-msg">{{ f.message }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- ใส่สัญลักษณ์วน/นำทาง — the marker-entry panel (spec docs/ds/marker-entry-ui.md). Anchored
           under the save bar like ตรวจโน้ต; never floats over the sheet. Reads the registry only. -->
      <div v-if="editMode && markerMenuOpen" class="sv-marker-panel no-print" role="dialog" aria-label="ใส่สัญลักษณ์วน/นำทาง" @keydown.esc="toggleMarkerMenu">
        <div class="sv-marker-head">
          <strong>ใส่สัญลักษณ์วน/นำทาง</strong>
          <span class="sv-marker-sub">ย้อนต้น (D.C.) · ย้อนเครื่องหมายวน (D.S.) · โคดา · Fine</span>
          <button class="sv-marker-close" type="button" aria-label="ปิด" @click="toggleMarkerMenu"><Icon name="x" :size="16" /></button>
        </div>

        <!-- select a NOTE first — a marker anchors to a note; say so instead of failing silently -->
        <p v-if="markerNeedNote" class="sv-marker-note" role="alert">
          <Icon name="info" :size="16" /> แตะโน้ตที่จะให้สัญลักษณ์ไปอยู่ก่อน แล้วเลือกอีกครั้ง
        </p>

        <!-- STEP 1 — pick a routing. Plain-Thai presets first (no theory needed); โหมดมือโปร below. -->
        <div v-if="!markerProMode" class="sv-marker-presets" role="listbox" aria-label="รูปแบบการวนร้อง">
          <button
            v-for="p in JUMP_PRESETS"
            :key="p.id"
            class="sv-marker-preset"
            type="button"
            role="option"
            @click="chooseJumpPreset(p)"
          ><Icon name="repeat" :size="16" class="sv-marker-preset-ic" aria-hidden="true" /> {{ p.th }}</button>
          <button class="sv-marker-promode" type="button" @click="markerProMode = true">
            <Icon name="wrench" :size="15" /> โหมดมือโปร (วางทีละชิ้น)
          </button>
        </div>
        <div v-else class="sv-marker-presets" role="listbox" aria-label="สัญลักษณ์ทีละชิ้น">
          <button
            v-for="cmd in JUMP_COMMANDS"
            :key="cmd.id"
            class="sv-marker-preset"
            type="button"
            role="option"
            @click="chooseJumpCommand(cmd)"
          >{{ cmd.th }}</button>
          <button class="sv-marker-promode" type="button" @click="markerProMode = false">
            <Icon name="chevron-left" :size="15" /> กลับไปรูปแบบสำเร็จ
          </button>
        </div>

        <!-- STEP 2 — dropzone: place each placeholder the routing still needs (auto-linked on drop) -->
        <div v-if="pendingDrops.length" ref="dropZoneRef" class="sv-marker-drops">
          <p class="sv-marker-drops-lead">ยังต้องวาง — แตะชิป แล้วแตะโน้ตที่จะวาง (หรือกด “วางที่เคอร์เซอร์”):</p>
          <div class="sv-marker-chips">
            <span
              v-for="(d, i) in pendingDrops"
              :key="i"
              class="sv-marker-chip"
              :class="{ placed: d.placed, armed: armedDrop === i }"
            >
              <button
                class="sv-marker-chip-main"
                type="button"
                :disabled="d.placed"
                :aria-pressed="armedDrop === i"
                @click="armDrop(i)"
              >
                <Icon v-if="d.placed" name="check" :size="15" />
                <Icon v-else-if="armedDrop === i" name="hand-pointer" :size="15" />
                {{ jumpKindLabel(d.kind) }}
              </button>
              <button
                v-if="!d.placed"
                class="sv-marker-chip-here"
                type="button"
                title="วางที่โน้ตที่เลือกอยู่"
                @click="placeDropAtCaret(i)"
              >วางที่เคอร์เซอร์</button>
            </span>
          </div>
          <p v-if="armedDrop >= 0 && !pendingDrops[armedDrop].placed" class="sv-marker-armhint">
            <Icon name="hand-pointer" :size="15" /> แตะโน้ตบนแผ่นเพลงเพื่อวาง {{ jumpKindLabel(pendingDrops[armedDrop].kind) }}
          </p>
          <button v-if="pendingDrops.every((d) => d.placed)" class="sv-marker-done" type="button" @click="clearPendingDrops">
            <Icon name="check" :size="15" /> วางครบแล้ว
          </button>
        </div>

        <!-- orphan guard (AC-3) — a routing missing its partner. Persists until fixed. -->
        <p v-if="orphanText" class="sv-marker-orphan" role="alert">
          <Icon name="triangle-alert" :size="16" /> {{ orphanText }}
        </p>

        <!-- ลำดับเล่นจริง (AC-6) — the deterministic play order, in words, live. -->
        <div v-if="showBreadcrumb" class="sv-marker-crumbs">
          <span class="sv-marker-crumbs-lead">ลำดับเล่นจริง:</span>
          <span class="sv-marker-crumb-list">
            <template v-for="(c, i) in playOrderCrumbs" :key="i"><span class="sv-marker-crumb">{{ c }}</span><span v-if="i < playOrderCrumbs.length - 1" class="sv-marker-arrow" aria-hidden="true"> ➔ </span></template>
          </span>
        </div>

        <!-- placed markers — edit (kind/al) or delete, with delete-cascade (AC-7) -->
        <div v-if="placedMarkers.length" class="sv-marker-list">
          <p class="sv-marker-list-lead">สัญลักษณ์ในเพลงนี้</p>
          <div v-for="m in placedMarkers" :key="m.id" class="sv-marker-row">
            <span class="sv-marker-row-label">{{ jumpDirectiveLabel(m) }}</span>
            <span v-if="m.kind === 'dc' || m.kind === 'ds'" class="sv-marker-al">
              <label>จบที่:
                <select :value="m.al || ''" @change="changeMarker(m.id, { al: $event.target.value || null })">
                  <option value="">— (เล่นต่อจนจบ)</option>
                  <option value="fine">Fine</option>
                  <option value="coda">โคดา</option>
                </select>
              </label>
            </span>
            <button class="sv-marker-del" type="button" :title="`ลบ ${jumpDirectiveLabel(m)}`" :aria-label="`ลบ ${jumpDirectiveLabel(m)}`" @click="deleteMarker(m)">
              <Icon name="trash-2" :size="15" />
            </button>
          </div>
        </div>
      </div>

      <!-- B060 — the settings themselves. Non-modal beside the sheet on a wide screen, a
           full-screen page on a phone (SongSettings owns that split). Lives inside the frame so
           it rides with the editor; position:fixed, so its place in the DOM is not its place on
           screen. -->
      <SongSettings
        v-if="editMode"
        :open="settingsOpen"
        :number="song.number"
        :title-th="song.title_th || ''"
        :dup-note="dupNote"
        :title-en="song.title_en || ''"
        :category="song.category || ''"
        :theme="song.theme || ''"
        :song-key="song.content && song.content.key ? song.content.key : 'C'"
        :time-signature="song.content && song.content.timeSignature ? song.content.timeSignature : '4/4'"
        :bpm="song.content ? song.content.bpm : null"
        @meta="onSettingsMeta"
        @music="onSettingsMusic"
        @close="settingsOpen = false"
      />

      <!-- 🎼 โครงเพลง drawer — same fixed side-panel/phone-full-screen shape as SongSettings.
           Dumb over lib/songStructure: every action hands a new content up via @update-content. -->
      <StructureDrawer
        v-if="editMode"
        :open="structureOpen"
        :content="song.content"
        :cursor="structCursor"
        :clip="clip"
        @update-content="onStructureContent"
        @set-clip="clip = $event"
        @close="structureOpen = false"
      />

      <div class="sv-doc">
        <!-- issue9: lead-sheet header — the song title on its own full-width line (wraps, never
             truncates) + a Key · Time · Tempo meta strip, above the sheet. Screen-only; print
             keeps SongSheet's centered .sheet-print-title. -->
        <header class="lead-header no-print">
          <h1 class="lead-title">{{ printTitle }}</h1>
          <div v-if="leadTitleEn" class="lead-subtitle">{{ leadTitleEn }}</div>

          <dl class="lead-meta" :aria-label="t('leadHeader.metaLabel')">
            <div class="lm-item">
              <dt class="sr-only">{{ t('leadHeader.key') }}</dt>
              <dd>
                <span class="lm-label">{{ t('leadHeader.key') }}</span>
                <span class="lm-key">{{ displayKey }}</span>
                <span v-if="isTransposed" class="lm-orig">· {{ t('leadHeader.orig') }} {{ origKey }}</span>
              </dd>
            </div>
            <div v-if="timeSig" class="lm-item">
              <dt class="sr-only">{{ t('leadHeader.time') }}</dt>
              <dd class="lm-time">{{ timeSig }}</dd>
            </div>
            <div v-if="bpmVal" class="lm-item">
              <dt class="sr-only">{{ t('leadHeader.tempo') }}</dt>
              <dd class="lm-tempo">♩ = {{ bpmVal }}</dd>
            </div>
          </dl>
        </header>

        <!-- B053: แหล่งเพลง (source books) + scripture reference — small captions above the
             sheet, mirroring the catalog card. Only render when the song actually has them. -->
        <div v-if="refLabels.length || song.scripture" class="song-refs">
          <div v-if="refLabels.length" class="src-tag muted">แหล่งเพลง: {{ refLabels.join(' · ') }}</div>
          <div v-if="song.scripture" class="scripture-tag muted">📖 {{ song.scripture }}</div>
        </div>

        <!-- 717 multi-lyric — the WORDS under the SAME melody, switched by segmented tabs.
             READING folds them into a disclosure whose summary names the set on the sheet and
             says how many exist (you choose once, then sing). EDITING never folds: the active
             set is what your typing goes into, so it has to be readable and switchable without
             a click (P'Aim, 26 ก.ค.). Not printed — print takes the chosen set and printTitle
             names it on the paper. -->
        <div v-if="lyricSets" class="lyric-set-wrap no-print">
          <button
            v-if="!editMode"
            ref="summaryBtn"
            class="lset-summary"
            :class="{ open: setsOpen }"
            :aria-expanded="setsOpen ? 'true' : 'false'"
            aria-controls="lset-tabs"
            @click="toggleSets"
          >
            <span class="lset-summary-k">{{ t('lyricSet.summaryKey') }}</span>
            <span class="lset-summary-v">{{ activeSetName }}</span>
            <!-- the COUNT is what P'Aim settled on (26 ก.ค.): a singer must learn this song has
                 other words without having to open anything first — progressive disclosure, not
                 a hidden feature. -->
            <span class="lset-count">{{ t('lyricSet.count', { n: lyricSets.length }) }}</span>
            <span class="lset-chev" aria-hidden="true">{{ setsOpen ? '▴' : '▾' }}</span>
          </button>
          <div
            v-show="editMode || setsOpen"
            id="lset-tabs"
            ref="setsPanel"
            class="lyric-set-tabs"
            role="tablist"
            :aria-label="t('lyricSet.tablist')"
            @keydown="onSetKey"
          >
            <button
              v-for="(ls, i) in lyricSets"
              :key="i"
              class="lset-tab"
              :class="{ active: activeSet === i }"
              role="tab"
              :id="`lset-tab-${i}`"
              aria-controls="lset-panel"
              :aria-selected="activeSet === i ? 'true' : 'false'"
              :tabindex="activeSet === i ? 0 : -1"
              @click="pickSet(i)"
            >{{ lyricSetLabels[i] }}</button>
            <!-- /v2 has no separate editor, so this is the only place someone can make a THIRD
                 set of words — without it they would have to go back to the v1 editor. -->
            <button
              v-if="editMode"
              class="lset-add"
              :title="t('lyricSet.addTitle')"
              @click="onAddLyricSet"
            >{{ t('lyricSet.add') }}</button>
            <!-- …and the way OUT of a set. Destructive, so it is red and set apart from ＋ rather
                 than sitting in the row of pills you tap to switch. Disabled (with the reason in
                 its tooltip) when only one set is left — a song must always have words. -->
            <button
              v-if="editMode"
              ref="delSetBtn"
              class="lset-del"
              :disabled="lyricSets.length <= 1"
              :title="lyricSets.length > 1 ? t('lyricSet.delTitle') : t('lyricSet.delLastTitle')"
              :aria-label="t('lyricSet.delAria', { name: activeSetName })"
              @click="askDeleteLyricSet"
            ><Icon name="trash-2" :size="14" /> {{ t('lyricSet.del') }}</button>
          </div>
          <!-- destructive confirm — a REAL modal (the app's ShareSheet shape: fixed scrim at
               --z-modal, centred card), not an inline card under the strip. In edit mode the
               sheet has its own scroll region, and on a 360px phone that region measures ~31px
               tall between the save bar and the tool dock — an inline confirm renders INSIDE it,
               so its question scrolls out of sight and the person is left looking at a bare red
               button. A confirm that can be clipped is not a confirm. Escaping the container
               also makes aria-modal="true" honest: the scrim swallows the page behind it, Esc
               and a scrim click cancel, and Tab cycles between the two buttons. -->
          <div
            v-if="confirmDelSet >= 0"
            class="lset-confirm-scrim"
            @click.self="cancelDeleteLyricSet"
            @keydown.esc.stop="cancelDeleteLyricSet"
            @keydown.tab.prevent="cycleConfirmFocus"
          >
            <div
              class="lset-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="lset-confirm-t"
              aria-describedby="lset-confirm-d"
            >
              <p id="lset-confirm-t" class="lset-confirm-t">
                {{ t('lyricSet.confirmTitle', { name: lyricSetLabels[confirmDelSet] }) }}
              </p>
              <p id="lset-confirm-d" class="lset-confirm-d">
                {{ t('lyricSet.confirmBody') }} <b>{{ t('lyricSet.confirmKeep') }}</b>
              </p>
              <div class="lset-confirm-btns">
                <button ref="cancelDelBtn" class="lset-confirm-cancel" @click="cancelDeleteLyricSet">
                  {{ t('lyricSet.confirmCancel') }}
                </button>
                <button ref="okDelBtn" class="lset-confirm-del" @click="doDeleteLyricSet">
                  <Icon name="trash-2" :size="14" /> {{ t('lyricSet.confirmDel') }}
                </button>
              </div>
            </div>
          </div>
          <!-- a screen reader hears WHICH words are on the sheet now; sighted users read it in
               the summary. The tabs can be folded away, so this is the only spoken confirmation.
               .sv-sr-only (not .sr-only, which is scoped to .lead-header). -->
          <p class="sv-sr-only" aria-live="polite">{{ t('lyricSet.now', { name: activeSetName }) }}</p>
        </div>
        <!-- ONE set (≈ the whole library): the reader shows nothing at all, and the editor shows
             only this — a light way in, so a second set stays one tap away without charging every
             ordinary song for a feature it does not use (P'Aim, 26 ก.ค. · progressive disclosure). -->
        <div v-else-if="editMode" class="lyric-set-wrap no-print">
          <button class="lset-add-lone" :title="t('lyricSet.addTitle')" @click="onAddLyricSet">
            {{ t('lyricSet.addLone') }}
          </button>
        </div>
        <!-- the delete announcement lives OUT here on purpose: deleting the second-to-last set
             collapses the song and unmounts the whole tab strip, so a live region inside it would
             be torn out in the same tick and the result would never be spoken. -->
        <p class="sv-sr-only" aria-live="polite">{{ setMsg }}</p>

        <div
          ref="sheetWrap"
          class="sheet-scale"
          :class="{ 'sv-editing': editMode, 'sv-settings-open': settingsOpen }"
          :style="{ fontSize: readingFontScale + 'rem' }"
          :id="lyricSets ? 'lset-panel' : null"
          :role="setTabsVisible ? 'tabpanel' : null"
          :aria-labelledby="setTabsVisible ? `lset-tab-${activeSet}` : null"
          :tabindex="setTabsVisible && !editMode ? 0 : null"
          @pointerdown="onSheetPointerDown"
          @mousedown="onSheetMouseDown"
          @click="onInlinePick"
        >
          <!-- the focused capture field — opens the device keyboard on a phone (numeric for a
               note, Thai text for a word) and carries the typed lyric. Sits over the selected cell. -->
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
          <!-- item 4 — the LINE CARET (insert mode): a thin blinking bar BETWEEN notes, visually
               distinct from the block (so the hand knows insert vs overwrite). Sits at the caret gap. -->
          <span
            v-if="editMode && typeMode === 'insert' && caretRect"
            class="sv-linecaret no-print"
            :style="{ left: caretRect.x + 'px', top: caretRect.top + 'px', height: caretRect.height + 'px' }"
            aria-hidden="true"
          ></span>
          <!-- item 5 — pending low-octave indicator: a faint dot at the caret the instant '.' is
               armed, so the user sees a low note is coming BEFORE typing the digit (guards the
               "meant an aug dot" slip). -->
          <span
            v-if="editMode && pendingLow && noteRect"
            class="sv-pending-low no-print"
            :style="{ left: noteRect.left + 'px', top: noteRect.top + 'px' }"
            aria-hidden="true"
          >.</span>
          <!-- BI-012 — chord AT the cursor: opens on the note (click the slot above it, or `c`).
               DESKTOP power path = lean caret: type → Space commit+advance to the next note → run the
               whole song, no mouse (Tab/Shift+Tab too; Enter exits; Esc cancels). A live parse-preview
               replaces any dropdown. MOBILE fallback (narrow) adds the quick-pick chips + a
               "โน้ตถัดไป ►" button, since soft keyboards lack an easy Space. -->
          <div
            v-if="editMode && chordPopupOpen && noteRect"
            class="sv-chordpop no-print"
            :style="chordPopStyle"
            role="dialog"
            aria-label="ใส่คอร์ดบนโน้ตนี้"
            @mousedown.stop
            @click.stop
          >
            <div class="sv-chordpop-row">
              <input
                ref="chordPopInput"
                v-model="chordDraft"
                class="sv-chordpop-input"
                :class="{ bad: chordBad }"
                type="text"
                inputmode="text"
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                placeholder="พิมพ์คอร์ด เช่น G, Am · Space = ถัดไป"
                aria-label="พิมพ์คอร์ด — Space ยืนยันไปโน้ตถัดไป · Tab ถัดไป · Enter ยืนยัน · Esc ยกเลิก"
                :aria-invalid="chordBad"
                @keydown="onChordKey"
                @input="chordBad = false"
              />
              <!-- ALWAYS-visible advance control (G r4 #1): mouse users get a visible "next", and the
                   Space badge teaches the shortcut so everyday use trains the keyboard run. -->
              <button
                class="sv-chordpop-next"
                type="button"
                title="ยืนยัน + ไปโน้ตถัดไป (Space)"
                aria-label="ยืนยันคอร์ดแล้วไปโน้ตถัดไป"
                @mousedown.prevent
                @click="advanceFromButton"
              >โน้ตถัดไป <kbd v-if="isWide" class="sv-nextkbd">Space</kbd><span v-else aria-hidden="true">→</span></button>
              <button
                class="sv-chordpop-del"
                type="button"
                title="ลบคอร์ด"
                aria-label="ลบคอร์ดออกจากโน้ตนี้"
                @mousedown.prevent
                @click="deleteChordFromPopup"
              ><Icon name="trash-2" :size="16" /></button>
            </div>
            <!-- live parse-preview (no dropdown): shows how the text reads, red when it isn't a chord. -->
            <div v-if="chordPreview" class="sv-chordpop-preview" :class="{ bad: !chordPreview.ok }" aria-hidden="true">
              <template v-if="chordPreview.ok"><Icon name="check" :size="13" /> {{ chordPreview.text }}</template>
              <template v-else>ยังไม่ใช่คอร์ด — เก็บข้อความไว้ก่อน แก้ทีหลังได้</template>
            </div>
            <div v-if="chordBad" class="sv-chordpop-err" role="alert">ยังไม่ใช่คอร์ดที่อ่านได้ (A–G เช่น Bb, C#m7, G/B) — เก็บไว้ให้แล้ว กด Space ไปต่อได้</div>
            <div v-if="!isWide" class="sv-chordpop-list" role="listbox" aria-label="คอร์ดที่ใช้บ่อยในคีย์นี้">
              <button
                v-for="c in chordOpts"
                :key="c.value"
                class="sv-chordpop-chip"
                :class="{ none: c.value === '' }"
                type="button"
                @mousedown.prevent
                @click="pickChordFromPopup(c.value)"
              >{{ c.value === '' ? '— ไม่มีคอร์ด —' : c.value }}</button>
            </div>
            <!-- screen-reader anchor: follows the caret as Space walks the song (G a11y). -->
            <div class="sv-sr-only" aria-live="polite">{{ chordAnchorLabel }}</div>
          </div>
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
            :editing="editMode"
            :song-title="printTitle"
            @seek="onSeek"
            @chordedit="onChordEdit"
          />
        </div>
      </div>

      <!-- the tool dock — DOCKED, not floating: a flex child of the frame, so it takes its own
           room instead of sitting on top of the words being typed. Same engine via bar* handlers. -->
      <NoteInputBar
        v-if="showToolbar"
        :layer="selLayer"
        :wide="isWide"
        :mode="typeMode"
        :chords="chordOpts"
        :hint-nonce="hintNonce"
        :active-symbols="activeSymbols"
        :active-marks="activeMarks"
        @remove-mark="removeMark"
        :can-undo="canUndo"
        :can-redo="canRedo"
        :help-open="helpOpen"
        @update:help-open="setHelpOpen"
        @undo="undoEdit"
        @redo="redoEdit"
        @symbol="applySymbol"
        @nav="barNav"
        @octave="barOctave"
        @accidental="barAccidental"
        @chord="setChord"
        @toggle-mode="typeMode = typeMode === 'insert' ? 'overwrite' : 'insert'"
      />
    </div>

    <!-- ✏️ edit — a floating round action button (Google-Docs pattern), bottom-right above the
         play dock. It is the way IN only: once editing, "เสร็จ" sits in the editor's own save
         bar, so nothing floats over the sheet while the user is typing on it. -->
    <button
      v-if="canEdit && !editMode"
      class="sv-fab no-print"
      title="แก้ไขเพลงนี้"
      aria-label="แก้ไขเพลงนี้"
      @click="toggleEdit"
    ><Icon name="pencil" :size="24" /></button>

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
      :content="exportContent"
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

  </div>
</template>

<style scoped>
/* ---------- 717 multi-lyric — segmented tabs (Material 3 segmented button) --------------
   One melody, several lyric sets you switch between. Centered above the sheet, brand-tinted
   active segment, WCAG target size. Reuses the app's --brand token.

   TYPE SIZE (พี่เปา, 26 ก.ค. — "ตัวหนังสือใหญ่ไป"): the tabs used to inherit --fs-base (18px)
   from <body> while the sheet they label renders at 1rem/16px, so a control read once per song
   was the biggest text above the words. They now sit at 1rem — measured equal to .sheet-scale,
   equal to the editor's own .eset-tab, and inside M3's label-large / HIG's segmented-control
   range for a tab label. Only font-size shrinks: min-height (38px, and 44px on a coarse
   pointer) is untouched, so the TARGET still clears WCAG 2.5.8 AA with room to spare. */
.lyric-set-wrap { display: flex; flex-direction: column; align-items: center; max-width: 100%; }

/* the collapsed disclosure — reads "ชุดเนื้อร้อง: <name of the set on the sheet> ▾". Sized and
   weighted like a caption, not a heading: it must not compete with the song's own title. */
.lset-summary {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* NOT flex-wrap: a long set name at 360px used to push the ▾ onto a line of its own, which
     reads as a stray mark rather than "this opens". The name wraps INSIDE its own box instead
     (min-width:0 + overflow-wrap below) and the caret stays beside it, the way a select does. */
  flex-wrap: nowrap;
  gap: 6px;
  max-width: 100%;
  min-height: 38px;
  margin: 4px auto 6px;
  padding: 5px 14px;
  border: 1px solid var(--line, #e2d9c8);
  border-radius: 999px;
  background: var(--surface-2, #f5efe3);
  color: var(--ink-2, #6b5d45);
  font: inherit;
  font-size: 1rem;
  line-height: 1.35;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.lset-summary:hover { background: color-mix(in srgb, var(--brand, #8b4513) 8%, var(--surface-2, #f5efe3)); }
.lset-summary:focus-visible { outline: 2px solid var(--brand, #8b4513); outline-offset: 2px; }
.lset-summary.open { border-color: var(--brand, #8b4513); }
/* the fixed parts never wrap — only the NAME does, so the caption can't break into
   "ชุดเนื้อ / ร้อง:" on a 360px phone while the name still has room to reflow */
.lset-summary-k { font-weight: 400; opacity: 0.8; flex: 0 0 auto; white-space: nowrap; }
/* the NAME is the one thing that must survive a glance — it is what tells the singer which
   words are on the sheet while everything else is folded away */
.lset-summary-v { font-weight: 700; color: var(--brand, #8b4513); overflow-wrap: anywhere; flex: 0 1 auto; min-width: 0; }
/* "N ชุด" — a count, not an action: quiet, but enough that nobody sings this song for a year
   without learning it has another set of words. */
.lset-count {
  flex: 0 0 auto;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand, #8b4513) 14%, transparent);
  color: var(--brand, #8b4513);
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}
.lset-chev { flex: 0 0 auto; font-size: 0.75rem; opacity: 0.7; }

/* ＋ เพิ่มชุด — only in the editor. Dashed, brand-tinted, deliberately lighter than a tab: it
   MAKES something rather than selects it, and it must never be mistaken for the set you are on.
   .lset-add-lone is the one-set case, which renders alone with no strip around it. */
.lset-add,
.lset-add-lone {
  appearance: none;
  min-height: 38px;
  padding: 4px 14px;
  border: 1px dashed var(--brand, #8b4513);
  border-radius: 999px;
  background: transparent;
  color: var(--brand, #8b4513);
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.lset-add-lone {
  /* the ordinary song's only set chrome — quieter still, so it reads as an offer, not a control */
  margin: 4px auto 6px;
  border-color: var(--line, #e2d9c8);
  color: var(--ink-2, #6b5d45);
  font-size: 0.9rem;
  font-weight: 400;
}
.lset-add:hover,
.lset-add-lone:hover { background: color-mix(in srgb, var(--brand, #8b4513) 10%, transparent); }
.lset-add-lone:hover { border-color: var(--brand, #8b4513); color: var(--brand, #8b4513); }
.lset-add:focus-visible,
.lset-add-lone:focus-visible { outline: 2px solid var(--brand, #8b4513); outline-offset: 2px; }

/* 🗑 ลบชุดนี้ — destructive, so it reads as its OWN kind of control: red outline instead of the
   brand tint, and pushed away from ＋ by a real gap so a mis-tap next to "add" cannot land on
   "delete". Same pill geometry and same 38/44px target as its neighbours (WCAG 2.5.8 AA, aligned
   up to HIG's 44pt on a finger) — only the colour and the distance say "careful". */
.lset-del {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 38px;
  margin-left: 10px;
  padding: 4px 14px;
  border: 1px solid var(--red, #c0392b);
  border-radius: 999px;
  background: transparent;
  color: var(--red, #c0392b);
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.lset-del:hover:not(:disabled) { background: color-mix(in srgb, var(--red, #c0392b) 10%, transparent); }
.lset-del:focus-visible { outline: 2px solid var(--red, #c0392b); outline-offset: 2px; }
/* the last set can't go — the button stays PRESENT (so the affordance doesn't blink out of
   existence) but inert, with the reason in its tooltip */
.lset-del:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: var(--line, #e2d9c8);
  color: var(--ink-2, #6b5d45);
}
@media (pointer: coarse) {
  .lset-summary,
  .lset-add,
  .lset-add-lone,
  .lset-del { min-height: 44px; }
}

/* the confirm — the app's own modal shape (cf. ShareSheet): a fixed scrim at --z-modal, above
   the tool dock and the shell bar, so the question is always where the eye already is and can
   never be clipped by the editing frame's ~31px scroll region on a phone. */
.lset-confirm-scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 1200);
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.lset-confirm {
  width: 100%;
  max-width: 360px;
  max-height: 92vh;
  overflow-y: auto;
  padding: 16px;
  border: 1px solid var(--red, #c0392b);
  border-radius: 12px;
  background: var(--surface, #fff);
  box-shadow: 0 20px 50px rgba(0, 0, 0, .3);
  text-align: center;
}
.lset-confirm-t { margin: 0 0 4px; font-weight: 700; color: var(--ink, #2b2b2b); }
.lset-confirm-d { margin: 0 0 12px; font-size: 0.85rem; color: var(--ink-2, #6b5d45); }
.lset-confirm-btns { display: flex; gap: 8px; justify-content: center; }
.lset-confirm-cancel,
.lset-confirm-del {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
/* ยกเลิก is where focus opens, so it must not look like the afterthought */
.lset-confirm-cancel {
  border: 1px solid var(--line, #e2d9c8);
  background: var(--surface-2, #f5efe3);
  color: var(--ink, #2b2b2b);
}
.lset-confirm-del { border: 0; background: var(--red, #c0392b); color: #fff; }
.lset-confirm-cancel:focus-visible,
.lset-confirm-del:focus-visible { outline: 2px solid var(--brand, #8b4513); outline-offset: 2px; }
.lyric-set-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  max-width: 100%;
  margin: 4px auto 10px;
  padding: 3px;
  border: 1px solid var(--line, #e2d9c8);
  /* A set NAME is a real Thai phrase (~25 chars), not the old "ทำนอง ๑" caption, so two of
     them do not fit side by side on a 360px phone. The strip WRAPS instead of overflowing
     (M3 lets long tab labels reflow; a scrolling strip would hide the very name the singer
     is choosing between). Corner radius stays pill-like on one row and reads as a rounded
     card once it wraps to two — 999px would bow a two-row strip. */
  border-radius: 21px;
  background: var(--surface-2, #f5efe3);
}
.lset-tab {
  appearance: none;
  border: 0;
  min-height: 38px;
  padding: 7px 18px;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2, #6b5d45);
  font: inherit;
  font-size: 1rem; /* = .sheet-scale, = the editor's .eset-tab (was --fs-base 18px) */
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, color .15s;
  /* grow: wrapped rows fill their line so stacked names align instead of looking ragged.
     min-width:0 + overflow-wrap: a single name longer than the whole viewport still wraps
     inside its own pill rather than pushing the page sideways. */
  flex: 1 1 auto;
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  line-height: 1.35;
  text-align: center;
}
.lset-tab:focus-visible { outline: 2px solid var(--brand, #8b4513); outline-offset: 2px; }
/* Touch: WCAG 2.5.8 (AA) only asks 24px, but HIG says 44pt and M3 says 48dp for a finger —
   align UP on coarse pointers. Growing a target can never hide anything, so a device that
   mis-reports pointer:coarse (Surface with a mouse) is harmless here. */
@media (pointer: coarse) {
  .lset-tab { min-height: 44px; }
}
.lset-tab:hover:not(.active) { background: color-mix(in srgb, var(--brand, #8b4513) 10%, transparent); }
.lset-tab.active { background: var(--brand, #8b4513); color: #fff; }

/* ---------- the editing frame (24 ก.ค.) --------------------------------------------------
   Reading: .sv-surface / .sv-doc are inert wrappers and the page scrolls normally.
   Editing:  the surface becomes an app frame pinned under the sticky shell bar. The sheet gets
   its own scroll region (.sv-doc) and the tool dock is the next flex child, so the dock OWNS
   its space instead of floating over the words. That is what makes "0 cells covered at any
   scroll" achievable at all — a fixed/floating palette always covers whatever is beneath it.
   z-index sits at --z-dock (40), one tier BELOW the shell bar (--z-nav 50), so the mode tabs,
   the ☰ menu and every dropdown stay on top and clickable while editing. */
.sv-frame {
  position: fixed;
  top: var(--sv-top, 56px);
  left: 0;
  right: 0;
  /* the phone's on-screen keyboard eats the bottom of the viewport — lift the whole frame so
     the dock rides just above it, the way a keyboard accessory bar does */
  bottom: var(--sv-kb, 0px);
  z-index: var(--z-dock);
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bg, #fff);
}
.sv-frame > .sv-doc {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--sp-4, 16px);
  /* item 1 — auto-scroll breathing room: keep the caret a little clear of the top/bottom edges
     when scrollIntoView({block:'nearest'}) brings it back into view. */
  scroll-padding-top: 12px;
  scroll-padding-bottom: 28px;
}
/* printing must never see the frame — an A4 sheet is one long document, not a viewport */
@media print {
  .sv-frame { position: static; display: block; }
  .sv-frame > .sv-doc { overflow: visible; padding: 0; }
}

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
/* phone: the dock is ~full-width at the bottom, so lift the FAB clear of it */
@media (max-width: 640px) {
  .sv-fab { right: 16px; bottom: calc(210px + env(safe-area-inset-bottom, 0px)); }
}

/* A-fix: the save-state bar = the editor's header row. A flex child of the frame (NOT sticky
   inside the scroll region — sticky meant it covered the first line of whatever you scrolled
   past), so "ยังไม่บันทึก / บันทึกแล้ว ✓" and the save button are always on screen and never on
   top of the song. Google-Docs pattern: state on the left, the actions on the right. */
.sv-save-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 6px 10px;
  margin: 0 0 6px;
  border-radius: 8px;
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e2e8f0);
  font-size: 13px;
}
.sv-save-state { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; }
.sv-save-state.ok { color: var(--ok, #15803d); }
.sv-save-state.pending { color: var(--warn-text, #92400e); }
.sv-save-dot { font-size: 10px; line-height: 1; }
.sv-save-err { color: var(--danger, #b91c1c); }
.sv-save-note { color: var(--muted, #64748b); }
/* บันทึกร่าง = SECONDARY (outline) — auto-save carries the work, so the filled PRIMARY beside it
   is the finish action (ส่งตรวจ/เผยแพร่/ส่งให้ทีม). Standard draft→publish hierarchy. BI-007. */
.sv-save-btn {
  margin-inline-start: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 14px;
  border-radius: 8px;
  border: 1px solid var(--brand, #8b4513);
  background: var(--surface, #fff);
  color: var(--brand, #8b4513);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.sv-save-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--brand, #8b4513) 8%, transparent); }
.sv-save-btn:disabled { opacity: 0.6; cursor: default; }

/* BI-007 — the PRIMARY finish button (filled brand). Its label follows the tier/state. */
.sv-finish-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 16px;
  border-radius: 8px;
  border: 1px solid var(--brand, #8b4513);
  background: var(--brand, #8b4513);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.sv-finish-btn:hover:not(:disabled) { filter: brightness(1.08); }
.sv-finish-btn:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
.sv-finish-btn:disabled { opacity: 0.6; cursor: default; }

/* BI-007 — inline flow cards (post-submit confirmation · anon ส่งให้ทีม). Calm, in normal flow,
   dismissible — HIG/M3: a persistent state change is a card, not a snackbar. */
.sv-flow-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 6px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--brand, #8b4513);
  background: color-mix(in srgb, var(--brand, #8b4513) 6%, var(--surface, #fff));
  font-size: 13px;
}
.sv-flow-ic { color: var(--brand, #8b4513); flex: 0 0 auto; margin-top: 1px; }
.sv-flow-body { display: flex; flex-direction: column; gap: 3px; }
.sv-flow-body > b { font-size: 13.5px; }
.sv-flow-steps { margin: 4px 0 0; padding-inline-start: 18px; display: flex; flex-direction: column; gap: 8px; }
.sv-flow-act {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  min-height: 30px;
  padding: 3px 12px;
  border-radius: 7px;
  border: 1px solid var(--brand, #8b4513);
  background: var(--surface, #fff);
  color: var(--brand, #8b4513);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.sv-flow-note { margin: 8px 0 0; color: var(--muted, #64748b); font-size: 12.5px; }
.sv-flow-x {
  position: absolute;
  top: 6px;
  inset-inline-end: 6px;
  display: inline-flex;
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--muted, #64748b);
  border-radius: 6px;
  cursor: pointer;
}
.sv-flow-x:hover { background: color-mix(in srgb, currentColor 12%, transparent); }
.sv-flow-anon { flex-direction: column; padding-inline-end: 34px; }

/* G-review #3 — the auto-save reassurance caption beside the save controls */
.sv-autosave-note {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted, #64748b);
  font-size: 12px;
}
@media (max-width: 640px) { .sv-autosave-note { display: none; } } /* the stepper already says it on phones */

/* B060 ⚙ ตั้งค่าเพลง — a secondary control in the same 32px row as บันทึกร่าง (its sibling),
   so the two read as one bar. WCAG 2.2 AA target size is 24px; matching the sibling at 32
   clears it without inflating one button to 44 and breaking the row (brief 24 ก.ค.). */
.sv-settings-btn,
.sv-structure-btn,
.sv-lint-btn,
.sv-newsong-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--surface, #fff);
  color: var(--ink, #0f172a);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
/* ＋ เพลงใหม่ — same ghost chip as its siblings, but a "create" affordance: the icon + label take
   the brand colour so it reads as an action that makes something new (not a toggle over the open
   song like ตรวจโน้ต/โครงเพลง/ตั้งค่าเพลง). Hover firms the brand edge, matching .sv-play-btn. */
.sv-newsong-btn { color: var(--brand, #8b4513); font-weight: 600; }
.sv-newsong-btn:hover { border-color: var(--brand, #8b4513); }
.sv-newsong-btn:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
.sv-settings-btn[aria-pressed='true'],
.sv-structure-btn[aria-pressed='true'],
.sv-lint-btn[aria-pressed='true'] { border-color: var(--brand, #8b4513); color: var(--brand, #8b4513); }
.sv-settings-btn:focus-visible,
.sv-structure-btn:focus-visible,
.sv-lint-btn:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
/* ตรวจโน้ต chip — severity colours the border + text (not colour alone: the icon glyph and the
   count/word carry the same meaning, WCAG 1.4.1). clean = a quiet green tick; warn = amber; error
   = red. Kept as the OUTLINE style of the sibling chips so the row reads as one control group. */
.sv-lint-btn.clean { color: var(--cat-green, #3fa34d); border-color: var(--line, #e2e8f0); }
.sv-lint-btn.has-warn { color: var(--brand, #b45309); border-color: color-mix(in srgb, var(--brand, #b45309) 45%, var(--line, #e2e8f0)); }
.sv-lint-btn.has-error { color: var(--red, #c0392b); border-color: color-mix(in srgb, var(--red, #c0392b) 50%, var(--line, #e2e8f0)); }
.sv-lint-btn.has-warn[aria-pressed='true'] { border-color: var(--brand, #b45309); }
.sv-lint-btn.has-error[aria-pressed='true'] { border-color: var(--red, #c0392b); }
/* phone: the row gets tight — keep the icon, drop the word, and take a full touch target */
@media (max-width: 640px) {
  .sv-settings-lbl { display: none; }
  .sv-settings-btn,
  .sv-structure-btn,
  .sv-lint-btn,
  .sv-newsong-btn { min-height: var(--touch-min, 44px); min-width: var(--touch-min, 44px); justify-content: center; padding: 0 10px; }
}

/* ตรวจโน้ต panel — a plain problems list under the save bar (Docs spell-check pattern). A flex
   child of the frame, ABOVE the sheet scroll region, so it never floats over the notes. */
.sv-lint-panel {
  flex: 0 0 auto;
  margin: 0 0 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e2e8f0);
  max-height: 34vh;
  overflow-y: auto;
  font-size: 13px;
}
.sv-lint-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.sv-lint-head strong { color: var(--ink, #0f172a); }
.sv-lint-sub { color: var(--muted, #6f6455); font-size: 12px; }
.sv-lint-close { margin-inline-start: auto; display: inline-flex; align-items: center; justify-content: center; min-width: 28px; min-height: 28px; border: 0; background: transparent; color: var(--muted, #6f6455); border-radius: 6px; cursor: pointer; }
.sv-lint-close:hover { background: color-mix(in srgb, var(--ink, #362f28) 8%, transparent); }
.sv-lint-close:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
.sv-lint-empty { display: flex; align-items: center; gap: 8px; margin: 4px 2px; color: var(--cat-green, #3fa34d); }
.sv-lint-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.sv-lint-item { display: grid; grid-template-columns: auto auto 1fr; align-items: start; gap: 8px; padding: 6px 6px; border-radius: 6px; }
.sv-lint-item + .sv-lint-item { border-top: 1px solid color-mix(in srgb, var(--line, #e2e8f0) 70%, transparent); }
.sv-lint-ic { margin-top: 2px; flex: 0 0 auto; }
.sv-lint-item.error .sv-lint-ic, .sv-lint-item.error .sv-lint-sev-label { color: var(--red, #c0392b); }
.sv-lint-item.warning .sv-lint-ic, .sv-lint-item.warning .sv-lint-sev-label { color: var(--brand, #b45309); }
.sv-lint-sev-label { font-size: 11px; font-weight: 700; padding-top: 2px; white-space: nowrap; }
.sv-lint-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.sv-lint-where { font-weight: 600; color: var(--ink, #362f28); font-size: 12px; }
.sv-lint-msg { color: var(--muted, #6f6455); line-height: 1.4; }

/* ---- ใส่สัญลักษณ์วน/นำทาง — the ⋮ button + its panel (marker-entry-ui.md) ---------------------- */
/* the trigger matches its save-bar siblings (ตรวจโน้ต/โครงเพลง/ตั้งค่าเพลง) so the row reads as one group */
.sv-marker-btn {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 32px; padding: 4px 12px; border-radius: 8px;
  border: 1px solid var(--line, #e2e8f0); background: var(--surface, #fff);
  color: var(--ink, #0f172a); font: inherit; font-size: 13px; cursor: pointer;
}
.sv-marker-btn[aria-pressed='true'] { border-color: var(--brand, #8b4513); color: var(--brand, #8b4513); }
.sv-marker-btn:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
/* an unfinished routing (a pending drop or an orphan) glows amber — colour is NOT the only signal:
   the panel's orphan banner and the pending chips carry the same meaning in words (WCAG 1.4.1). */
.sv-marker-btn.has-pending { border-color: color-mix(in srgb, var(--brand, #b45309) 55%, var(--line, #e2e8f0)); color: var(--brand, #b45309); }
@media (max-width: 640px) {
  .sv-marker-btn { min-height: var(--touch-min, 44px); min-width: var(--touch-min, 44px); justify-content: center; padding: 0 10px; }
}

/* panel — same anchored card as ตรวจโน้ต; a flex child above the sheet, never floating over notes */
.sv-marker-panel {
  flex: 0 0 auto; margin: 0 0 6px; padding: 10px 12px; border-radius: 8px;
  background: var(--surface, #fff); border: 1px solid var(--line, #e2e8f0);
  max-height: 46vh; overflow-y: auto; font-size: 13px;
}
.sv-marker-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.sv-marker-head strong { color: var(--ink, #0f172a); }
.sv-marker-sub { color: var(--muted, #6f6455); font-size: 12px; }
.sv-marker-close { margin-inline-start: auto; display: inline-flex; align-items: center; justify-content: center; min-width: 28px; min-height: 28px; border: 0; background: transparent; color: var(--muted, #6f6455); border-radius: 6px; cursor: pointer; }
.sv-marker-close:hover { background: color-mix(in srgb, var(--ink, #362f28) 8%, transparent); }
.sv-marker-close:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
.sv-marker-note { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; padding: 6px 8px; border-radius: 6px; background: color-mix(in srgb, var(--brand, #b45309) 10%, transparent); color: var(--brand, #b45309); }

/* STEP 1 — routing list. Each row a full-width tap target (≥40px), left-aligned like a menu. */
.sv-marker-presets { display: flex; flex-direction: column; gap: 4px; }
.sv-marker-preset {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: start;
  min-height: 40px; padding: 8px 10px; border-radius: 8px;
  border: 1px solid var(--line, #e2e8f0); background: var(--surface, #fff);
  color: var(--ink, #0f172a); font: inherit; font-size: 13px; cursor: pointer;
}
.sv-marker-preset:hover { border-color: color-mix(in srgb, var(--brand, #b45309) 40%, var(--line, #e2e8f0)); background: color-mix(in srgb, var(--brand, #b45309) 6%, transparent); }
.sv-marker-preset:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
.sv-marker-preset-ic { flex: 0 0 auto; color: var(--brand, #b45309); }
.sv-marker-promode { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; min-height: 32px; margin-top: 2px; padding: 4px 8px; border: 0; background: transparent; color: var(--muted, #6f6455); font: inherit; font-size: 12px; cursor: pointer; border-radius: 6px; }
.sv-marker-promode:hover { color: var(--brand, #b45309); text-decoration: underline; }

/* STEP 2 — dropzone chips */
.sv-marker-drops { margin-top: 10px; padding-top: 8px; border-top: 1px solid color-mix(in srgb, var(--line, #e2e8f0) 70%, transparent); }
.sv-marker-drops-lead { margin: 0 0 6px; color: var(--muted, #6f6455); font-size: 12px; }
.sv-marker-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.sv-marker-chip { display: inline-flex; align-items: stretch; border-radius: 8px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--brand, #b45309) 45%, var(--line, #e2e8f0)); }
.sv-marker-chip.placed { border-color: var(--cat-green, #3fa34d); }
.sv-marker-chip.armed { box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand, #b45309) 55%, transparent); }
.sv-marker-chip-main { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 4px 10px; border: 0; background: color-mix(in srgb, var(--brand, #b45309) 8%, transparent); color: var(--ink, #362f28); font: inherit; font-size: 13px; cursor: pointer; }
.sv-marker-chip.placed .sv-marker-chip-main { background: color-mix(in srgb, var(--cat-green, #3fa34d) 12%, transparent); color: var(--cat-green, #2f7d3a); cursor: default; }
.sv-marker-chip-main[aria-pressed='true'] { background: color-mix(in srgb, var(--brand, #b45309) 20%, transparent); font-weight: 600; }
.sv-marker-chip-here { min-height: 34px; padding: 4px 8px; border: 0; border-inline-start: 1px solid color-mix(in srgb, var(--brand, #b45309) 30%, var(--line, #e2e8f0)); background: transparent; color: var(--brand, #b45309); font: inherit; font-size: 12px; cursor: pointer; }
.sv-marker-chip-here:hover { background: color-mix(in srgb, var(--brand, #b45309) 10%, transparent); }
.sv-marker-chip-main:focus-visible, .sv-marker-chip-here:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: -1px; }
.sv-marker-armhint { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; color: var(--brand, #b45309); font-size: 12px; }
.sv-marker-done { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; margin-top: 8px; padding: 4px 12px; border-radius: 8px; border: 1px solid var(--cat-green, #3fa34d); background: color-mix(in srgb, var(--cat-green, #3fa34d) 10%, transparent); color: var(--cat-green, #2f7d3a); font: inherit; font-size: 13px; cursor: pointer; }

/* orphan banner (AC-3) */
.sv-marker-orphan { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; padding: 6px 8px; border-radius: 6px; background: color-mix(in srgb, var(--red, #c0392b) 8%, transparent); color: var(--red, #c0392b); }

/* ลำดับเล่นจริง breadcrumb (AC-6) */
.sv-marker-crumbs { margin-top: 10px; padding-top: 8px; border-top: 1px solid color-mix(in srgb, var(--line, #e2e8f0) 70%, transparent); line-height: 1.7; }
.sv-marker-crumbs-lead { color: var(--muted, #6f6455); font-size: 12px; margin-inline-end: 6px; }
.sv-marker-crumb { display: inline-block; padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--brand, #b45309) 8%, transparent); color: var(--ink, #362f28); }
.sv-marker-arrow { color: var(--muted, #6f6455); }

/* placed-markers list — edit al / delete (AC-7) */
.sv-marker-list { margin-top: 10px; padding-top: 8px; border-top: 1px solid color-mix(in srgb, var(--line, #e2e8f0) 70%, transparent); }
.sv-marker-list-lead { margin: 0 0 6px; color: var(--muted, #6f6455); font-size: 12px; }
.sv-marker-row { display: flex; align-items: center; gap: 10px; padding: 5px 2px; }
.sv-marker-row + .sv-marker-row { border-top: 1px solid color-mix(in srgb, var(--line, #e2e8f0) 60%, transparent); }
.sv-marker-row-label { font-weight: 600; color: var(--ink, #362f28); }
.sv-marker-al { color: var(--muted, #6f6455); font-size: 12px; }
.sv-marker-al select { font: inherit; font-size: 12px; padding: 2px 4px; border-radius: 6px; border: 1px solid var(--line, #e2e8f0); background: var(--surface, #fff); color: var(--ink, #362f28); }
.sv-marker-del { margin-inline-start: auto; display: inline-flex; align-items: center; justify-content: center; min-width: 28px; min-height: 28px; border: 1px solid transparent; background: transparent; color: var(--red, #c0392b); border-radius: 6px; cursor: pointer; }
.sv-marker-del:hover { background: color-mix(in srgb, var(--red, #c0392b) 10%, transparent); }
.sv-marker-del:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 1px; }

/* ฟังตอนแก้ — the transport inside the pencil. Sized to the save bar's own button (32px tall),
   which clears the WCAG 2.2 AA 24px target floor without towering over its siblings. Plain
   buttons in normal flow: no hover gate, no gesture, visible the whole time edit mode is on. */
.sv-play-group { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.sv-play-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 32px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid var(--border, #e2e8f0);
  background: var(--surface, #fff);
  color: var(--text, #0f172a);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.sv-play-btn:hover:not(:disabled) { border-color: var(--brand, #8b4513); }
.sv-play-btn:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
/* the scope that is sounding right now reads as pressed (not merely tinted) */
.sv-play-btn.on {
  border-color: var(--brand, #8b4513);
  background: var(--brand, #8b4513);
  color: #fff;
}
.sv-play-btn:disabled { opacity: 0.5; cursor: default; }
.sv-play-now { color: var(--brand, #8b4513); font-weight: 600; }

/* ✓ เสร็จ — the way out, beside the save state. Green like the old FAB so the affordance is
   recognisable, 34px tall to match .sv-save-btn (WCAG 2.2 AA target size = 24px min). */
.sv-done-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 14px;
  border-radius: 8px;
  border: 1px solid #16a34a;
  background: #16a34a;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

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

/* item 4 — the LINE CARET (insert mode). A thin blinking vertical bar between notes, clearly
   different from the block highlight so the hand knows insert ≠ overwrite (G: the two modes must
   not look alike). position:fixed — anchored to the measured caret rect, like the capture field. */
.sv-linecaret {
  position: fixed;
  width: 2px;
  background: var(--brand, #8b4513);
  z-index: var(--z-inline-edit);
  pointer-events: none;
  animation: sv-caret-blink 1.05s step-end infinite;
}
@keyframes sv-caret-blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .sv-linecaret { animation: none; } }

/* item 5 — pending low-octave indicator: a faint low dot shown the moment '.' is armed, so the
   user sees a LOW note is coming before typing the digit. Sits just under the note's left edge. */
.sv-pending-low {
  position: fixed;
  z-index: var(--z-inline-edit);
  pointer-events: none;
  color: var(--brand, #8b4513);
  opacity: 0.5;
  font-weight: 700;
  transform: translateY(0.5em);
  animation: sv-pending-blink 0.8s step-end infinite;
}
@keyframes sv-pending-blink { 0%, 60% { opacity: 0.55; } 61%, 100% { opacity: 0.15; } }
@media (prefers-reduced-motion: reduce) { .sv-pending-low { animation: none; } }

/* item 3 — chord-at-cursor popup. Small card anchored over the note (chordPopStyle decides
   above/below + keeps it above the phone keyboard). Input first (auto-focus), then the key's
   common chords as chips. font-size ≥16px so iOS Safari never zooms the page on focus. */
.sv-chordpop {
  width: min(280px, 92vw);
  padding: 8px;
  background: var(--surface, #fff);
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sv-chordpop-row { display: flex; gap: 6px; }
.sv-chordpop-input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 8px;
  background: #fff;
  color: var(--ink, #0f172a);
  font: inherit;
  font-size: 16px; /* ⛔ never below 16px — iOS Safari zooms the page on focus otherwise */
}
.sv-chordpop-input:focus { outline: 2px solid var(--brand, #8b4513); outline-offset: -1px; }
.sv-chordpop-input.bad { border-color: #b91c1c; }
.sv-chordpop-del {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px; /* WCAG 2.5.8 AA target size (24px min) — comfortably cleared */
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 8px;
  background: var(--surface, #fff);
  color: var(--danger, #b91c1c);
  cursor: pointer;
}
.sv-chordpop-del:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
/* BI-012 mobile advance button — the touch equivalent of Space. */
.sv-chordpop-next {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-height: 36px; /* WCAG 2.5.8 AA target size */
  padding: 0 10px;
  border: 1px solid var(--brand, #8b4513);
  border-radius: 8px;
  background: var(--brand, #8b4513);
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}
.sv-chordpop-next:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
/* the Space badge on the advance button — teaches the keyboard run while giving a visible control. */
.sv-nextkbd {
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
/* BI-012 live parse-preview pill (replaces any dropdown). */
.sv-chordpop-preview {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  background: color-mix(in srgb, var(--brand, #8b4513) 12%, transparent);
  color: var(--brand, #8b4513);
}
.sv-chordpop-preview.bad { background: rgba(185, 28, 28, 0.1); color: #b91c1c; }
.sv-sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.sv-chordpop-err { font-size: 12px; line-height: 1.4; color: #b91c1c; }
.sv-chordpop-list { display: flex; flex-wrap: wrap; gap: 4px; max-height: 132px; overflow-y: auto; }
.sv-chordpop-chip {
  min-width: 40px;
  min-height: 30px;
  padding: 0 8px;
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 6px;
  background: #fff;
  color: var(--ink, #0f172a);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.sv-chordpop-chip:hover { border-color: var(--brand, #8b4513); color: var(--brand, #8b4513); }
.sv-chordpop-chip.none { flex: 1 0 100%; color: var(--muted, #64748b); }

/* Leave room so the fixed transport dock (S4 <StudioDock>/<SingTransport>) never covers
   the last line while singing. The dock is ~147px on wider screens but grows to ~191px
   once its controls wrap at ≤480px; add the iOS home-indicator inset on top so the last
   line clears on notched phones too. (Clearance tracks the dock height, which S4 owns.) */
.sheet-scale { padding-bottom: calc(160px + env(safe-area-inset-bottom, 0px)); }
/* B060 — while ⚙ ตั้งค่าเพลง is open on a wide screen the panel is docked on the right, so the
   sheet steps aside instead of being covered (measured at 1280: 2 note/word cells sat under the
   panel before this). A docked panel that hides the thing you are tuning is worse than useless —
   the whole reason it is non-modal is that คีย์/จังหวะ change what is drawn. On a phone the panel
   is full-screen, so there is nothing to make room for. */
@media (min-width: 761px) {
  .sheet-scale.sv-settings-open { padding-right: 348px; }
}
@media (max-width: 480px) {
  .sheet-scale { padding-bottom: calc(210px + env(safe-area-inset-bottom, 0px)); }
}
/* while editing there IS no fixed dock to clear — the tool dock is in flow below the sheet's
   scroll region — so that reserve would just be dead space at the end of every song. */
.sheet-scale.sv-editing { padding-bottom: var(--sp-4, 16px); }
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

/* issue9 — lead-sheet header: title on its own full line + Key · Time · Tempo meta strip.
   S0 tokens only (theme-aware / dark-mode-safe); no hard-coded colors, no new tokens. */
.lead-header {
  margin: 0 0 var(--sp-3);
}
.lead-title {
  margin: 0;
  font-size: var(--fs-xl);
  font-weight: 700;
  line-height: 1.25;
  color: var(--ink);
  overflow-wrap: break-word; /* long Thai title wraps, never clips */
}
.lead-subtitle {
  margin-top: 2px;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--muted);
}
.lead-meta {
  /* <dl> reset → a horizontal wrapping strip */
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px var(--sp-2);
  margin: var(--sp-1) 0 0;
  font-size: var(--fs-sm);
  color: var(--ink);
}
.lead-meta .lm-item {
  display: flex;
  align-items: baseline;
}
.lead-meta .lm-item + .lm-item::before {
  /* separator dot between rendered items only — an omitted item leaves no orphan dot */
  content: '·';
  margin-right: var(--sp-2);
  color: var(--muted);
}
.lead-meta dd {
  margin: 0;
}
.lm-label {
  color: var(--muted);
  margin-right: 4px;
}
.lm-key {
  font-weight: 700;
}
.lm-orig {
  color: var(--muted);
  font-weight: 500;
  margin-left: 4px;
  font-size: 0.92em;
}
.lm-time,
.lm-tempo {
  font-variant-numeric: tabular-nums;
}
.lead-header .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>
