<script setup>
// The read/listen surface for one song — same engine as the old SongView (play,
// transpose, tempo, loop, font size, display layers, play-by-section + follow-along
// highlight = the karaoke feel). The control bar is now the shared <StudioDock> in
// "sing" mode (ps3-viewer B024): display / chord / key / tempo are dropdowns, and the
// dock owns the collapse / transparency / customize / overflow engine. Takes a `song`
// ({ number, title_th, content }) so it can live inside Studio's ดู mode.
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { KEYS } from '../lib/chords.js'
import { playSong, stopPlayback, setTranspose, keyTranspose, songToNotes, TEMPO_MARKS } from '../lib/midi.js'
import { resolveContent } from '../lib/songModel.js'
import SongSheet from './SongSheet.vue'

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
// One preset picks which of chord / note / lyric show. Mirrors the ps3-dock prototype's
// 5-way แสดงผล menu; SongSheet takes the three booleans so each preset renders exactly.
// `short` = the current-value badge shown on the dock button (like คีย์ E / ความเร็ว 84)
const DISPLAY_OPTS = [
  { value: 'all', label: 'ครบ (เนื้อ+คอร์ด+โน้ต)', short: 'ครบ', chord: true, note: true, lyric: true },
  { value: 'chord', label: 'เนื้อ+คอร์ด', short: 'คอร์ด', chord: true, note: false, lyric: true },
  { value: 'note', label: 'เนื้อ+โน้ต', short: 'โน้ต', chord: false, note: true, lyric: true },
  { value: 'lyric', label: 'เนื้อล้วน', short: 'เนื้อ', chord: false, note: false, lyric: true },
  { value: 'noteonly', label: 'โน้ตล้วน', short: 'โน้ตล้วน', chord: false, note: true, lyric: false },
]
const display = ref('all')
const displayDef = computed(() => DISPLAY_OPTS.find((o) => o.value === display.value) || DISPLAY_OPTS[0])
// chord system: ตัวอักษร (letter) / เลขนัชวิลล์ (roman) / ซ่อนคอร์ด (hide the whole layer)
const CHORD_OPTS = [
  { value: 'letter', label: 'คอร์ดตัวอักษร (A B C)' },
  { value: 'roman', label: 'เลขนัชวิลล์ (1 4 5)' },
  { value: 'hidden', label: 'ซ่อนคอร์ด' },
]
const chordSystem = ref('letter')
// effective layer visibility handed to SongSheet
const showChord = computed(() => displayDef.value.chord && chordSystem.value !== 'hidden')
const showNote = computed(() => displayDef.value.note)
const showLyric = computed(() => displayDef.value.lyric)
const sheetChordSystem = computed(() => (chordSystem.value === 'roman' ? 'roman' : 'letter'))
// coarse mode kept for SongSheet's lyrics-only layout fallback / compat
const sheetMode = computed(() => (showLyric.value && !showNote.value && !showChord.value ? 'lyrics' : 'full'))

const displayKey = ref(props.song?.content?.key || 'C')
const playing = ref(false)
const loop = ref(false)
const tempo = ref(props.song?.content?.bpm || 92)
const playingSeg = ref(null)
const playingSyl = ref(null) // { li, si, syk } — the syllable+note sounding now (B006)
const playingSection = ref(null) // 'all' | section index | null
const sheetWrap = ref(null)
const fontScale = ref(1)
// pause/resume (US-A01 "เล่นต่อ"): playedIndex = note index currently sounding;
// pausedIndex = where the last stop happened, so the next play continues from there.
const playedIndex = ref(0)
const pausedIndex = ref(0)

const resolved = computed(() =>
  props.song ? { ...props.song.content, lines: resolveContent(props.song.content) } : null,
)
// Title shown as the centered heading when this reading view is printed (Ctrl+P / PDF).
const printTitle = computed(() => {
  const s = props.song
  if (!s) return ''
  return (s.number != null ? s.number + '. ' : '') + (s.title_th || 'เพลง')
})
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
// key options — the original key is marked so the singer can find "home"
const keyOptions = computed(() =>
  KEYS.map((k) => ({ value: k, label: k + (k === props.song?.content?.key ? ' (ต้นฉบับ)' : '') })),
)
const tempoOptions = computed(() => {
  const base = props.song?.content?.bpm
    ? [{ value: props.song.content.bpm, label: `ตามเพลง ♩=${props.song.content.bpm}` }]
    : []
  return [...base, ...TEMPO_MARKS]
})

// Re-sync ONLY when the song IDENTITY changes (a different song loads). Keying the watch
// on the whole object would fire on every edit the editor re-emits (a new object with the
// same song) and wipe the listener's chosen key/tempo mid-practice — a latent bug WT-0
// flagged for WT-A. `number` is the song's identity; edits keep it, a new song changes it.
watch(
  () => props.song?.number,
  () => {
    const c = props.song?.content
    if (!c) return
    stopPlay() // a genuinely different song → don't keep playing the old one's position
    displayKey.value = c.key || 'C'
    tempo.value = c.bpm || 92
    pausedIndex.value = 0 // resume from the new song's start, not the old position
  },
)

// ---------- follow-along scroll (B016) ----------
// Keep the sounding segment in view (the karaoke scroll). When the user scrolls by hand
// (wheel / touch), auto-scroll steps aside for ~3.5s so it doesn't yank the page back —
// programmatic scrollIntoView fires 'scroll' but NOT 'wheel'/'touchmove', so listening to
// those only catches real gestures.
const SCROLL_PAUSE_MS = 3500
let pausedScrollUntil = 0
function onUserScroll() {
  if (playing.value) pausedScrollUntil = Date.now() + SCROLL_PAUSE_MS
}
watch(playingSeg, async (seg) => {
  if (!seg || !sheetWrap.value) return
  if (Date.now() < pausedScrollUntil) return // singer is reading elsewhere — don't snap back
  await nextTick()
  const el = sheetWrap.value.querySelector(`[data-seg="${seg.li}-${seg.si}"]`)
  if (!el) return
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: smooth ? 'smooth' : 'auto' })
})

function bumpFont(d) {
  fontScale.value = Math.min(2.2, Math.max(0.8, Math.round((fontScale.value + d) * 10) / 10))
}
let playGen = 0
let currentRange // the range of the active playback (undefined = whole song) — for live-tempo re-schedule
function stopPlay() {
  playGen++
  stopPlayback()
  playing.value = false
  playingSection.value = null
  playingSeg.value = null
  playingSyl.value = null
}
async function startPlay(range, key, startIndex = 0) {
  stopPlayback()
  const gen = ++playGen
  currentRange = range
  playing.value = true
  playingSection.value = key
  // Play in the chosen key. The melody is scheduled at the ORIGINAL key and shifted
  // by `transpose` semitones via detune, so changing the key while playing re-tunes
  // the upcoming notes live from where you are (see the displayKey watcher below) —
  // not a restart.
  await playSong(resolved.value, {
    bpm: Number(tempo.value) || resolved.value.bpm || 92,
    loop: loop.value,
    range,
    transpose: keyTranspose(props.song.content.key, displayKey.value || props.song.content.key),
    startIndex,
    onNote: (n, idx) => {
      playingSeg.value = { li: n.li, si: n.si }
      // move the per-syllable highlight only on a sung attack (n.syk set); rests and
      // held/melisma notes carry none, so the current word stays lit through the hold.
      if (n.syk != null) playingSyl.value = { li: n.li, si: n.si, syk: n.syk }
      playedIndex.value = idx
    },
  })
  if (gen === playGen) {
    // reached the natural end (not a pause) → next play starts from the top
    playing.value = false
    playingSection.value = null
    playingSeg.value = null
    playingSyl.value = null
    pausedIndex.value = 0
  }
}
function togglePlay() {
  if (playing.value) {
    pausedIndex.value = playedIndex.value // remember position so the next play continues
    stopPlay()
  } else {
    startPlay(undefined, 'all', pausedIndex.value) // resume from where we stopped (0 = fresh)
  }
}
function playSection(idx) {
  pausedIndex.value = 0 // a section is always played from its start
  const s = sections.value[idx]
  if (s) startPlay({ fromLi: s.fromLi, toLi: s.toLi }, idx)
}
// live key change: pick a new key WHILE playing → re-tune the upcoming notes to it
// from the current position (notes already sounding finish in the old key). Not a
// restart — playback continues from where you are. Not playing = next play uses it.
watch(displayKey, (k) => {
  if (playing.value) setTranspose(keyTranspose(props.song.content.key, k || props.song.content.key))
})
// live tempo change (US-A04): unlike key (which rides on detune, seamless), tempo can't be
// re-tuned in place — re-schedule the notes still ahead at the new bpm, continuing from the
// current note (a tiny seam is accepted per DS-A04). NOT a jump back to the top. Not
// playing → the new tempo simply applies to the next play.
watch(tempo, () => {
  if (playing.value) startPlay(currentRange, playingSection.value, playedIndex.value)
})
function printSheet() {
  window.print()
}

// ---------- the shared dock in "sing" mode (B024) ----------
// Each def is data StudioDock renders; menu tools carry their options + onPick so the
// dropdown writes straight back to this component's state. Default order leads with
// play,chord,tempo so mobile shows those three first (B024). key/tempo carry a badge
// (the current คีย์ / BPM) so their value shows without opening the menu.
// default order (P'Aim real-use r4-C): play › วนซ้ำ › คีย์ › ความเร็ว › ขนาดฟอนต์ › แสดงผล › พิมพ์.
// 'chord' is dropped from the default (still in singTools — addable via ตั้งค่าปุ่ม). This
// order is the SSOT for B043's music dock too.
const SING_DEFAULT = ['play', 'loop', 'key', 'tempo', 'fdown', 'fup', 'display', 'print']
const singTools = computed(() => [
  {
    id: 'play',
    icon: playing.value ? 'square' : 'play',
    label: playing.value ? 'หยุด' : 'ฟังเพลง',
    run: togglePlay,
    prime: true,
  },
  {
    id: 'chord',
    icon: 'guitar',
    label: 'คอร์ด',
    menu: true,
    value: chordSystem.value,
    options: CHORD_OPTS,
    onPick: (v) => (chordSystem.value = v),
  },
  {
    id: 'tempo',
    icon: 'gauge',
    label: 'ความเร็ว',
    menu: true,
    badge: String(tempo.value),
    value: tempo.value,
    options: tempoOptions.value,
    onPick: (v) => (tempo.value = v),
  },
  {
    id: 'key',
    icon: 'key-round',
    label: 'คีย์',
    menu: true,
    badge: displayKey.value,
    value: displayKey.value,
    options: keyOptions.value,
    onPick: (v) => (displayKey.value = v),
  },
  {
    id: 'display',
    icon: 'layers',
    label: 'แสดงผล',
    menu: true,
    badge: displayDef.value.short, // show the chosen preset like คีย์/ความเร็ว do (real-use #5)
    value: display.value,
    options: DISPLAY_OPTS,
    onPick: (v) => (display.value = v),
  },
  { id: 'loop', icon: 'repeat', label: 'วนซ้ำ', run: () => (loop.value = !loop.value), prime: loop.value },
  { id: 'fdown', icon: 'a-arrow-down', label: 'ตัวเล็กลง', run: () => bumpFont(-0.1), disabled: fontScale.value <= 0.8 },
  { id: 'fup', icon: 'a-arrow-up', label: 'ตัวใหญ่ขึ้น', run: () => bumpFont(0.1), disabled: fontScale.value >= 2.2 },
  { id: 'print', icon: 'printer', label: 'พิมพ์', run: printSheet },
])
// push the sing tool set up to Studio's single dock whenever it changes (play/loop/key/…)
watch(singTools, (tools) => emit('dock', { tools, defaultTools: SING_DEFAULT }), { immediate: true })

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
// in the (unfiltered) play order and start the whole song from it, in the current key.
function onSeek({ li, si, syk }) {
  const notes = songToNotes(resolved.value)
  let idx = notes.findIndex((n) => n.li === li && n.si === si && n.syk === syk)
  if (idx < 0) idx = notes.findIndex((n) => n.li === li && n.si === si) // rest/blank slot
  if (idx < 0) return
  pausedIndex.value = idx
  startPlay(undefined, 'all', idx)
}
</script>

<template>
  <div>
    <!-- play a single section (ท่อน) — chips -->
    <div v-if="sections.length" class="section-bar no-print" role="group" aria-label="เล่นเป็นท่อน">
      <button class="section-chip" :class="{ active: playingSection === 'all' }" @click="togglePlay">▶ ทั้งเพลง</button>
      <button
        v-for="(s, i) in sections"
        :key="i"
        class="section-chip"
        :class="{ active: playingSection === i }"
        @click="playSection(i)"
      >
        {{ s.name }}
      </button>
    </div>

    <div ref="sheetWrap" class="sheet-scale" :style="{ fontSize: fontScale + 'rem' }">
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

    <!-- control bar lives on Studio now (dock-core / N1): one shared <StudioDock>. This
         surface emits its "sing" tool set via @dock; the sticky ▶⇄⏸ still rides that dock. -->
  </div>
</template>

<style scoped>
.section-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.section-chip {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  color: var(--ink);
  font-size: 0.9rem;
  min-height: 34px;
}
.section-chip.active { background: var(--brand); color: #fff; border-color: var(--brand); }
@media (hover: hover) {
  .section-chip:not(.active):hover { background: var(--cream-hover); }
}
/* leave room so the fixed dock never covers the last line of the song */
.sheet-scale { padding-bottom: 96px; }
</style>
