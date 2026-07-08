<script setup>
// The read/listen surface for one song — same engine as the old SongView (play,
// transpose, tempo, loop, font size, full/lyrics, play-by-section + follow-along
// highlight = the karaoke feel), but a control bar restyled to match the Studio shell.
// Takes a `song` ({ number, title_th, content }) so it can live inside Studio's view
// mode instead of loading by route.
import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import { KEYS } from '../lib/chords.js'
import { playSong, stopPlayback, TEMPO_MARKS } from '../lib/midi.js'
import { resolveContent } from '../lib/songModel.js'
import SongSheet from './SongSheet.vue'
import Icon from './Icon.vue'

const props = defineProps({ song: { type: Object, required: true } })

const mode = ref('full') // full = โน้ต+คอร์ด+เนื้อ · lyrics = เนื้อล้วน (karaoke)
const chordSystem = ref('letter')
const displayKey = ref(props.song?.content?.key || 'C')
const playing = ref(false)
const loop = ref(false)
const tempo = ref(props.song?.content?.bpm || 92)
const playingSeg = ref(null)
const playingSection = ref(null) // 'all' | section index | null
const sheetWrap = ref(null)
const fontScale = ref(1)

const resolved = computed(() =>
  props.song ? { ...props.song.content, lines: resolveContent(props.song.content) } : null,
)
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
const tempoOptions = computed(() => {
  const base = props.song?.content?.bpm
    ? [{ value: props.song.content.bpm, label: `ตามเพลง ♩=${props.song.content.bpm}` }]
    : []
  return [...base, ...TEMPO_MARKS]
})

// re-sync when the song changes (Studio switches songs)
watch(
  () => props.song,
  (s) => {
    if (s?.content) {
      displayKey.value = s.content.key || 'C'
      tempo.value = s.content.bpm || 92
    }
  },
)

// follow-along: keep the sounding segment in view (the karaoke scroll)
watch(playingSeg, async (seg) => {
  if (!seg || !sheetWrap.value) return
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
function stopPlay() {
  playGen++
  stopPlayback()
  playing.value = false
  playingSection.value = null
  playingSeg.value = null
}
let lastRange // remember what is playing so a live key change can re-play the same part
async function startPlay(range, key) {
  stopPlayback()
  const gen = ++playGen
  lastRange = range
  playing.value = true
  playingSection.value = key
  // play in the CHOSEN key (displayKey), not the song's original — otherwise the
  // on-screen chords transpose but the sound stays in the original key (bug).
  await playSong({ ...resolved.value, key: displayKey.value }, {
    bpm: Number(tempo.value) || resolved.value.bpm || 92,
    loop: loop.value,
    range,
    onNote: (n) => {
      playingSeg.value = { li: n.li, si: n.si }
    },
  })
  if (gen === playGen) {
    playing.value = false
    playingSection.value = null
    playingSeg.value = null
  }
}
function togglePlay() {
  if (playing.value) stopPlay()
  else startPlay(undefined, 'all')
}
function playSection(idx) {
  const s = sections.value[idx]
  if (s) startPlay({ fromLi: s.fromLi, toLi: s.toLi }, idx)
}
// live key change: if a new key is picked WHILE playing, re-play the same part in it
// immediately (the "เปลี่ยนคีย์แล้วได้ยินเปลี่ยนทันที" feel). Not playing = next play uses it.
watch(displayKey, () => {
  if (playing.value) startPlay(lastRange, playingSection.value)
})
function printSheet() {
  window.print()
}
onUnmounted(stopPlayback)
</script>

<template>
  <div>
    <!-- control bar (restyled to match the shell) -->
    <div class="vw-bar no-print">
      <button class="vw-play" :class="{ playing }" @click="togglePlay">
        <Icon :name="playing ? 'square' : 'play'" :size="15" />
        {{ playing ? 'หยุด' : 'ฟังเพลง' }}
      </button>
      <span class="vw-field" title="คีย์ (ย้ายคีย์)">
        <Icon name="music" :size="15" />
        <select v-model="displayKey" aria-label="เลือกคีย์">
          <option v-for="k in KEYS" :key="k" :value="k">{{ k }}{{ k === song.content.key ? ' •' : '' }}</option>
        </select>
      </span>
      <span class="vw-field" title="ความเร็ว">
        <span class="vw-note" aria-hidden="true">♩</span>
        <select v-model="tempo" aria-label="ความเร็ว">
          <option v-for="t in tempoOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </span>
      <label class="vw-check"><input v-model="loop" type="checkbox" /> วนซ้ำ</label>
      <span class="vw-seg" role="group" aria-label="ขนาดตัวอักษร">
        <button aria-label="เล็กลง" :disabled="fontScale <= 0.8" @click="bumpFont(-0.1)">ก−</button>
        <button aria-label="ใหญ่ขึ้น" :disabled="fontScale >= 2.2" @click="bumpFont(0.1)">ก+</button>
      </span>
      <span class="vw-seg" role="group" aria-label="รูปแบบ">
        <button :class="{ on: mode === 'full' }" @click="mode = 'full'">เต็ม</button>
        <button :class="{ on: mode === 'lyrics' }" @click="mode = 'lyrics'">เนื้อล้วน</button>
      </span>
      <span v-if="mode === 'full'" class="vw-seg" role="group" aria-label="ระบบคอร์ด">
        <button :class="{ on: chordSystem === 'letter' }" @click="chordSystem = 'letter'">A B C</button>
        <button :class="{ on: chordSystem === 'roman' }" @click="chordSystem = 'roman'">I IV V</button>
      </span>
      <button class="vw-icon" title="พิมพ์" aria-label="พิมพ์" @click="printSheet"><Icon name="printer" :size="17" /></button>
    </div>

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
      <SongSheet :content="resolved" :mode="mode" :chord-system="chordSystem" :display-key="displayKey" :playing-seg="playingSeg" />
    </div>
  </div>
</template>

<style scoped>
.vw-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: #fffdf8;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
  margin-bottom: 14px;
}
.vw-play {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 38px;
}
.vw-play.playing { background: var(--red); }
.vw-field {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 2px 8px;
  min-height: 38px;
}
.vw-field .icn { color: var(--muted); }
.vw-note { color: var(--muted); font-family: Georgia, serif; }
.vw-field select {
  border: none;
  background: transparent;
  padding: 4px 2px;
  min-height: auto;
  font-weight: 600;
  color: var(--brand);
  font-size: 0.95rem;
  cursor: pointer;
}
.vw-check { display: inline-flex; align-items: center; gap: 5px; font-size: 0.9rem; color: var(--muted); }
.vw-seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.vw-seg button {
  background: #fff;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  color: var(--ink);
  min-height: 38px;
  font-size: 0.92rem;
}
.vw-seg button + button { border-left: 1px solid var(--line); }
.vw-seg button.on { background: var(--cream); color: var(--brand); font-weight: 700; }
.vw-seg button:disabled { opacity: 0.4; cursor: default; }
.vw-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--brand);
  border-radius: 8px;
  min-width: 38px;
  min-height: 38px;
  cursor: pointer;
}
@media (hover: hover) {
  .vw-seg button:not(.on):not(:disabled):hover,
  .vw-icon:hover,
  .vw-field:hover { background: var(--cream-hover); }
}
</style>
