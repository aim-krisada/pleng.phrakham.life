<script setup>
// The read/listen surface for one song — same engine as the old SongView (play,
// transpose, tempo, loop, font size, display layers, play-by-section + follow-along
// highlight = the karaoke feel). The controls are a bottom "music player" built on the
// DockKey core engine: this page owns the song state and hands <SingTransport> the data;
// SingTransport turns it into the DockKey descriptor list (ITEMS_SING) and the engine draws
// the 2-row dock (ไทม์ไลน์ · คีย์ · เลือกท่อน · transport · Aa · ⚙ + pin). Mounted directly
// here; แผ่นเพลง and แก้ไข mount their own DockKey the same way.
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { KEYS } from '../lib/chords.js'
import {
  playSong, playEnsemble, stopPlayback, setTranspose, keyTranspose, songToNotes, TEMPO_MARKS,
  effectiveOrder, buildPlayNotes,
} from '../lib/midi.js'
import { isSampledInstrument } from '../lib/sampler.js'
import { resolveContent, resolvePlayOrder, lyricSetName, inLyricSet } from '../lib/songModel.js'
import { downloadSong } from '../lib/jsonIO.js'
import { currentSong, readingFontScale, soundMode, setSoundMode, playStyle, setPlayStyle, styleAuto,
  sparkleLevel, setSparkleLevel, arrangeOverrides, setArrangeOverride, resetArrangeOverrides,
  ensembleMode, setEnsembleMode, leadInstrument, setLeadInstrument } from '../store.js'
import { presetCfg, recommendRecipe, songFeatures } from '../lib/arranger/presets.js'
import { buildArrangeCfg, readTechniques } from '../lib/arranger/techniques.js'
import { SOUND_OPTS, ENSEMBLE_OPTS, INSTRUMENT_OPTS, STYLE_OPTS } from '../lib/soundOptions.js'
import { bookRefLabels } from '../lib/bookCodes.js'
import SongSheet from './SongSheet.vue'
import SingTransport from './SingTransport.vue'

// `tier` is part of the WT-0 mode contract ({ song, tier }). The reading surface is
// view-only for everyone, so it is accepted but not used to gate anything — there are
// no save/edit affordances here regardless of tier (US-A01 AC3).
const props = defineProps({
  song: { type: Object, required: true },
  tier: { type: String, default: 'guest' },
})
// 717 — which lyric set the reader switched to, so the shell can open แก้ไข on that same set.
const emit = defineEmits(['set'])

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

// 717 multi-lyric — one number, one melody (stanza), several lyric SETS you SWITCH between
// (not stack). content.lyricSets = [{label}]; each arrangement entry tags its set via `set`
// (index) — an entry with NO `set` is SHARED across every set (e.g. a common refrain). Tabs
// show only when a song declares >1 set → zero impact on all existing songs. The filter runs
// BEFORE resolveContent so the render/print/highlight engine is untouched (songModel locked).
const lyricSets = computed(() => {
  const ls = props.song?.content?.lyricSets
  return Array.isArray(ls) && ls.length > 1 ? ls : null
})
const activeSet = ref(0)
// The positional caption ("เนื้อร้องที่ 1", "เนื้อร้องที่ 2"), never the set's stored name
// (พี่เปา via P'Aim, 26 ก.ค.: "ไม่ต้องใส่ชื่อ") — a set's stored name is its own first line, so
// the tabs were two long Thai phrases to read before choosing. lyricSetName() is the one place
// that decides this, shared with the editor, the catalog card and the printed heading.
const lyricSetLabels = computed(() => (lyricSets.value || []).map((ls, i) => lyricSetName(ls, i)))
const activeSetName = computed(() => lyricSetLabels.value[activeSet.value] || '')
// reset the active tab only when the SONG changes (not on every edit), so a live edit keeps
// you on the set you're viewing.
watch(() => props.song?.id, () => { activeSet.value = 0; setsOpen.value = false })
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
  emit('set', i) // so แก้ไข opens on the set that was on screen (Studio → EditorMode)
})

// ---- the switcher is a DISCLOSURE around the tabs (P'Aim, 26 ก.ค.) ----------------------
// You pick your set once and then sing; an always-open strip spent permanent space above the
// words on a control used once per song. Collapsed, the summary still NAMES the set on the
// sheet and says how many there are, so the singer always knows which words these are and that
// others exist (a bare "▾ ชุดเนื้อร้อง" would hide both). Disclosure pattern (WAI-ARIA APG): a
// real <button> with aria-expanded + aria-controls over the panel; the tablist inside keeps its
// own tab semantics unchanged.
const setsOpen = ref(false)
const setsPanel = ref(null)
const summaryBtn = ref(null)
// G-verify, 26 ก.ค. (the one finding that survived source-checking): a role="tabpanel" whose
// tablist is not present is a broken widget — the sheet was claiming to be the panel of tabs a
// screen-reader user could not reach. So the TAB semantics only exist while the tabs do. While
// folded the sheet is just the sheet, and the summary button is what names the current set.
const setTabsVisible = computed(() => !!lyricSets.value && setsOpen.value)
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
  setsOpen.value = false
  nextTick(() => summaryBtn.value?.focus())
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

// The song as the SELECTED set — the SSOT every downstream consumer must read (sheet, play
// order, export). Filtering here and nowhere else is what keeps them in step: a consumer that
// reads props.song.content instead sees the OTHER set's entries too, and any display-line
// index it computes is an index into a different, longer sheet (see strophicOrder below).
// No lyric sets → the song object passes through untouched, byte-identical to before 717.
const setContent = computed(() => {
  const content = props.song?.content
  if (!content) return null
  if (!lyricSets.value || !Array.isArray(content.arrangement)) return content
  const arrangement = content.arrangement.filter((e) => inLyricSet(e, activeSet.value))
  return { ...content, arrangement }
})
const resolved = computed(() => {
  const content = setContent.value
  if (!content) return null
  return { ...content, lines: resolveContent(content) }
})
const printTitle = computed(() => {
  const s = props.song
  if (!s) return ''
  const base = (s.number != null ? s.number + '. ' : '') + (s.title_th || 'เพลง')
  // print takes the SELECTED set only, so the paper has to say which one — otherwise two
  // printouts of the same song number carry different words under the same heading.
  const set = lyricSets.value ? lyricSetLabels.value[activeSet.value] : ''
  return set ? base + ' — ' + set : base
})
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
// 717 — that "same content" MUST be the set-filtered one (setContent, not props.song.content).
// resolvePlayOrder returns {fromLi,toLi} ranges into the sheet IT resolved, so handing it the
// unfiltered song while playNotes runs on the filtered sheet indexes the wrong lines: on 717
// the refrain (a set-0 entry carrying afterEachVerse) got replayed once per entry of EVERY
// set — 464/551 notes instead of 232, with the other set's verses spliced in.
const strophicOrder = computed(() => resolvePlayOrder(setContent.value) ?? undefined)
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
})
onUnmounted(() => {
  window.removeEventListener('wheel', onUserScroll)
  window.removeEventListener('touchmove', onUserScroll)
  stopPlayback()
})

// tap a syllable/note in the sheet → jump playback there (US H1). Find the note's index
// in the CURRENT play order and start from it, in the current key.
function onSeek({ li, si, syk }) {
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

    <!-- 717 multi-lyric — the words under the SAME melody, switched by segmented tabs that
         live inside a COLLAPSED disclosure (you choose a set once, then sing). The summary
         always names the set currently on the sheet. Only for a song that declares >1 lyric
         set; not printed (print takes the chosen set, and printTitle names it on the paper). -->
    <div v-if="lyricSets" class="lyric-set-wrap no-print">
      <button
        ref="summaryBtn"
        class="lset-summary"
        :class="{ open: setsOpen }"
        :aria-expanded="setsOpen ? 'true' : 'false'"
        aria-controls="lset-tabs"
        @click="toggleSets"
      >
        <span class="lset-summary-k">ชุดเนื้อร้อง:</span>
        <span class="lset-summary-v">{{ activeSetName }}</span>
        <!-- the COUNT is what P'Aim settled on (26 ก.ค.): a singer must learn this song has
             other words without having to open anything first — progressive disclosure, not
             a hidden feature. -->
        <span class="lset-count">{{ lyricSets.length }} ชุด</span>
        <span class="lset-chev" aria-hidden="true">{{ setsOpen ? '▴' : '▾' }}</span>
      </button>
      <div
        v-show="setsOpen"
        id="lset-tabs"
        ref="setsPanel"
        class="lyric-set-tabs"
        role="tablist"
        aria-label="เลือกเนื้อร้อง"
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
      </div>
      <!-- a screen reader hears WHICH words are on the sheet now; sighted users read it in the
           summary above. Collapsing hides the tabs, so this is the only spoken confirmation. -->
      <p class="sv-sr-only" aria-live="polite">กำลังแสดงเนื้อร้อง: {{ activeSetName }}</p>
    </div>

    <div
      ref="sheetWrap"
      class="sheet-scale"
      :style="{ fontSize: readingFontScale + 'rem' }"
      :id="lyricSets ? 'lset-panel' : null"
      :role="setTabsVisible ? 'tabpanel' : null"
      :aria-labelledby="setTabsVisible ? `lset-tab-${activeSet}` : null"
    >
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
        interactive
        :song-title="printTitle"
        @seek="onSeek"
      />
    </div>

    <!-- B107: on first play the chosen instrument's samples download (~2–3 MB, cached after);
         this pill shows the progress, like the MP3 export. Playback starts once it's ready.
         Pressing พัก during the wait cancels (the pill hides via stopPlay). -->
    <div v-if="instrumentLoading" class="inst-loading" role="status" aria-live="polite">
      🎵 กำลังโหลดเสียง{{ loadingLabel }}… {{ Math.round(instrumentProgress * 100) }}%
      <progress class="inst-bar" :value="Math.round(instrumentProgress * 100)" max="100"
                :aria-label="`โหลดเสียง${loadingLabel} ${Math.round(instrumentProgress * 100)}%`"></progress>
    </div>

    <!-- the sing dock — DockKey core engine, fed the ITEMS_SING descriptor list by
         <SingTransport>. Fixed at the bottom; the engine owns collapse/drag/Setting/clamp. -->
    <SingTransport
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
      :content="setContent"
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
   active segment, WCAG target size (≥38px tall). Reuses the app's --brand token.

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
@media (pointer: coarse) {
  .lset-summary { min-height: 44px; }
}
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

/* visually-hidden live region (the tabs can be folded away, so this is the only spoken
   confirmation that the words on the sheet changed) */
.sv-sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* Leave room so the fixed transport dock (S4 <StudioDock>/<SingTransport>) never covers
   the last line while singing. The dock is ~147px on wider screens but grows to ~191px
   once its controls wrap at ≤480px; add the iOS home-indicator inset on top so the last
   line clears on notched phones too. (Clearance tracks the dock height, which S4 owns.) */
.sheet-scale { padding-bottom: calc(160px + env(safe-area-inset-bottom, 0px)); }
@media (max-width: 480px) {
  .sheet-scale { padding-bottom: calc(210px + env(safe-area-inset-bottom, 0px)); }
}

/* B107 — "loading real piano" hint, a small pill sitting just above the fixed dock. Purely
   informational (the synth is already playing); fades in, never blocks interaction. */
.inst-loading {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(170px + env(safe-area-inset-bottom, 0px));
  z-index: 20;
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
