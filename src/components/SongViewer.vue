<script setup>
// The read/listen surface for one song — same engine as the old SongView (play,
// transpose, tempo, loop, font size, display layers, play-by-section + follow-along
// highlight = the karaoke feel). B043 reshapes the controls into a bottom "music player":
// the shared <StudioDock> hosts ONE full-width custom control, <SingTransport> (progress +
// section markers + ⏮ ▶/⏸ ⏭ 🔁 + ⚙ settings panel + ☰ section selector). All the song
// controls (display/chord/key/tempo/font/download/print) live in that ⚙ panel, adjustable
// inline. This component owns the state; SingTransport is a page-agnostic core control.
import { ref, computed, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue'
import { KEYS } from '../lib/chords.js'
import {
  playSong, stopPlayback, setTranspose, keyTranspose, songToNotes, TEMPO_MARKS,
  effectiveOrder, buildPlayNotes,
} from '../lib/midi.js'
import { resolveContent } from '../lib/songModel.js'
import { downloadSong } from '../lib/jsonIO.js'
import { currentSong, readingFontScale } from '../store.js'
import SongSheet from './SongSheet.vue'
import SingTransport from './SingTransport.vue'

const SingTransportRaw = markRaw(SingTransport)

// `tier` is part of the WT-0 mode contract ({ song, tier }). The reading surface is
// view-only for everyone, so it is accepted but not used to gate anything — there are
// no save/edit affordances here regardless of tier (US-A01 AC3).
const props = defineProps({
  song: { type: Object, required: true },
  tier: { type: String, default: 'guest' },
})
// dock-core / N1: the dock is mounted once by Studio; this surface emits its "sing" tool
// set upward instead of mounting its own <StudioDock>.
const emit = defineEmits(['dock'])

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
  { value: 'roman', label: 'เลขนัชวิลล์ (1 4 5)' },
  { value: 'hidden', label: 'ซ่อนคอร์ด' },
]
const chordSystem = ref('letter')
const showChord = computed(() => displayDef.value.chord && chordSystem.value !== 'hidden')
const showNote = computed(() => displayDef.value.note)
const showLyric = computed(() => displayDef.value.lyric)
const sheetChordSystem = computed(() => (chordSystem.value === 'roman' ? 'roman' : 'letter'))
const sheetMode = computed(() => (showLyric.value && !showNote.value && !showChord.value ? 'lyrics' : 'full'))

const displayKey = ref(props.song?.content?.key || 'C')
const playing = ref(false)
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
// B043 §3a — which ท่อน (by label) are selected. Empty = play the whole song. Local,
// temporary state like key/tempo (decision C = ไม่จำ · cleared when the song changes).
const selectedSecs = ref(new Set())

const resolved = computed(() =>
  props.song ? { ...props.song.content, lines: resolveContent(props.song.content) } : null,
)
const printTitle = computed(() => {
  const s = props.song
  if (!s) return ''
  return (s.number != null ? s.number + '. ' : '') + (s.title_th || 'เพลง')
})
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
const order = computed(() => effectiveOrder(sections.value, selectedSecs.value))
const playNotes = computed(() => (resolved.value ? buildPlayNotes(resolved.value, { order: order.value }) : []))
const totalNotes = computed(() => playNotes.value.length)

// ---------- the TIMELINE axis = the WHOLE song (P'Aim real-use r3) ----------
// The progress bar + section dots ALWAYS show every occurrence of the whole song; selecting
// a ท่อน only tints the chosen dots green (picked) — it never collapses the timeline. The
// playhead is mapped onto this full-song axis so it moves through the selected block(s) in
// place even though playback only schedules the selection.
const fullNotes = computed(() => (resolved.value ? buildPlayNotes(resolved.value, {}) : []))
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
const posFullIndex = computed(() => (order.value ? (playFullIdx.value[posIndex.value] ?? 0) : posIndex.value))
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
// a full-song index → the nearest reachable note in the current play order (identity when
// nothing is selected; snaps into the selection otherwise, so scrub/tap stay inside it)
function fullToPlayIndex(fullIdx) {
  if (!order.value) return fullIdx
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
    selectedSecs.value = new Set()
  },
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
}
// Play the current order (selection, or the whole song) from a note index. All playback
// paths route through here so `order` stays the single source of what plays.
async function startPlay(startIndex = 0) {
  stopPlayback()
  const gen = ++playGen
  playing.value = true
  posIndex.value = startIndex
  await playSong(resolved.value, {
    bpm: Number(tempo.value) || resolved.value.bpm || 92,
    loop: loop.value,
    order: order.value,
    transpose: keyTranspose(props.song.content.key, displayKey.value || props.song.content.key),
    startIndex,
    onNote: (n, idx) => {
      playingSeg.value = { li: n.li, si: n.si }
      if (n.syk != null) playingSyl.value = { li: n.li, si: n.si, syk: n.syk }
      playedIndex.value = idx
      posIndex.value = idx
    },
  })
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
function reachableMarkers() { return markers.value.filter((m) => !order.value || m.picked) }
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
// live key change: re-tune the notes still ahead (seamless, not a restart)
watch(displayKey, (k) => {
  if (playing.value) setTranspose(keyTranspose(props.song.content.key, k || props.song.content.key))
})
// live tempo change: re-schedule the notes ahead at the new bpm, continuing from here
watch(tempo, () => {
  if (playing.value) startPlay(playedIndex.value)
})
function printSheet() { window.print() }
function downloadJson() { if (currentSong.value) downloadSong(currentSong.value) }

// ---------- the ⚙ settings panel controls (§4c) — every control, inline ----------
// icons = Lucide names (rendered via <Icon>), badge = the current value shown on the bar
const CHORD_BADGE = { letter: 'ABC', roman: '145', hidden: '—' }
const settingDescs = computed(() => [
  {
    id: 'display', icon: 'layers', label: 'แสดงผล', kind: 'menu', value: display.value, badge: displayDef.value.short,
    options: DISPLAY_OPTS.map((o) => ({ value: o.value, label: o.label })), onPick: (v) => (display.value = v),
  },
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
  // ขนาดตัวอักษร (font) now lives in the top nav "Aa" tool (FontTool), not the dock — P'Aim.
  { id: 'download', icon: 'download', label: 'ดาวน์โหลด (JSON)', kind: 'action', actionLabel: 'บันทึก', onAction: downloadJson },
  { id: 'print', icon: 'printer', label: 'พิมพ์ / PDF', kind: 'action', actionLabel: 'เปิด', onAction: printSheet },
])

// ---------- the sing dock = one full-width transport (D8 region:'top', dock-core) ----------
const singDockTools = computed(() => [
  {
    id: 'transport',
    type: 'custom',
    region: 'top',
    component: SingTransportRaw,
    props: {
      playing: playing.value,
      loop: loop.value,
      frac: frac.value,
      totalSec: totalSec.value,
      markers: markers.value,
      tags: tags.value,
      selected: selectedSecs.value,
      hasSections: sections.value.length > 0,
      settings: settingDescs.value,
      onTogglePlay: togglePlay,
      onPrev: prevSection,
      onNext: nextSection,
      onToggleLoop: () => (loop.value = !loop.value),
      onSeek: onSeekBar,
      onJump,
      onToggleSection: toggleSection,
      onSetAll: setAll,
    },
  },
])
watch(singDockTools, (tools) => emit('dock', { tools, defaultTools: ['transport'] }), { immediate: true })

onMounted(() => {
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
    <div ref="sheetWrap" class="sheet-scale" :style="{ fontSize: readingFontScale + 'rem' }">
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

    <!-- control bar lives on Studio now (dock-core / N1): one shared <StudioDock> hosting
         the <SingTransport> music player. This surface emits its "sing" tool set via @dock. -->
  </div>
</template>

<style scoped>
/* leave room so the fixed dock (transport band is taller than a plain toolbar) never
   covers the last line of the song */
.sheet-scale { padding-bottom: 150px; }
</style>
