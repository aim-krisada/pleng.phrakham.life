<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase.js'
import { SAMPLE_SONGS } from '../data/sample-songs.js'
import { KEYS } from '../lib/chords.js'
import { playSong, stopPlayback, TEMPO_MARKS } from '../lib/midi.js'
import { resolveContent } from '../lib/songModel.js'
import { currentSong } from '../store.js'
import SongSheet from '../components/SongSheet.vue'
import ComboSelect from '../components/ComboSelect.vue'

const route = useRoute()
const song = ref(null)
const notFound = ref(false)

const mode = ref('full') // full | lyrics
const chordSystem = ref('letter') // letter | roman
const displayKey = ref('')
const playing = ref(false)
const loop = ref(false)
const tempo = ref(92)

// follow-along: which segment is sounding + a text-size control (bug 014)
const playingSeg = ref(null)
const playingSection = ref(null) // 'all' | section index | null (feature 003)
const sheetWrap = ref(null)

// Resolve v1 (content.lines) or v2 (stanzas + arrangement) into renderable content.
// Both the sheet and playback read this, so v2 songs render and play like v1.
const resolved = computed(() =>
  song.value ? { ...song.value.content, lines: resolveContent(song.value.content) } : null,
)

// Sections from the resolved content: each line that begins with a {type:'section'}
// item starts a section spanning to the line before the next section (feature 003).
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
const fontScale = ref(1) // rem multiplier for the sheet
function bumpFont(d) {
  fontScale.value = Math.min(2.2, Math.max(0.8, Math.round((fontScale.value + d) * 10) / 10))
}

// Keep the sounding segment in view without the user scrolling (the real ask:
// big text stays usable because the page follows playback).
watch(playingSeg, async (seg) => {
  if (!seg || !sheetWrap.value) return
  await nextTick()
  const el = sheetWrap.value.querySelector(`[data-seg="${seg.li}-${seg.si}"]`)
  if (!el) return
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: smooth ? 'smooth' : 'auto' })
})

const tempoOptions = computed(() => {
  const base = song.value?.content?.bpm
    ? [{ value: song.value.content.bpm, label: `ตามเพลง ♩=${song.value.content.bpm}` }]
    : []
  return [...base, ...TEMPO_MARKS]
})

onMounted(async () => {
  const id = route.params.id
  const sample = SAMPLE_SONGS.find((s) => s.id === id)
  if (sample) {
    song.value = sample
  } else {
    const { data, error } = await supabase.from('songs').select('*').eq('id', id).single()
    if (error || !data) {
      notFound.value = true
      return
    }
    song.value = data
  }
  displayKey.value = song.value.content.key
  tempo.value = song.value.content.bpm || 92
  currentSong.value = song.value // enables the navbar download tool
})

onUnmounted(() => {
  stopPlayback()
  currentSong.value = null
})

let playGen = 0
function stopPlay() {
  playGen++
  stopPlayback()
  playing.value = false
  playingSection.value = null
  playingSeg.value = null
}
async function startPlay(range, key) {
  stopPlayback() // stop any current playback first
  const gen = ++playGen
  playing.value = true
  playingSection.value = key
  await playSong(resolved.value, {
    bpm: Number(tempo.value) || resolved.value.bpm || 92,
    loop: loop.value,
    range,
    onNote: (n) => { playingSeg.value = { li: n.li, si: n.si } },
  })
  if (gen === playGen) { // still the active play (not superseded/stopped)
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
</script>

<template>
  <p v-if="notFound">ไม่พบเพลงนี้ — <router-link to="/">กลับหน้ารายการเพลง</router-link></p>
  <div v-else-if="song">
    <div class="card no-print" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center">
      <select v-model="mode" aria-label="รูปแบบการแสดงเพลง">
        <option value="full">เนื้อ + คอร์ด + โน้ต</option>
        <option value="lyrics">เนื้อร้องล้วน</option>
      </select>
      <select v-model="chordSystem" :disabled="mode === 'lyrics'" aria-label="ระบบคอร์ด">
        <option value="letter">คอร์ดตัวอักษร</option>
        <option value="roman">คอร์ดโรมัน (I ii V7)</option>
      </select>
      <label v-if="chordSystem === 'letter' && mode === 'full'" style="display: inline-flex; align-items: center; gap: 4px">
        คีย์:
        <ComboSelect
          v-model="displayKey"
          :options="KEYS.map((k) => ({ value: k, label: k + (k === song.content.key ? ' (ต้นฉบับ)' : '') }))"
          aria-label="เลือกคีย์เพลง"
          width="120px"
        />
      </label>
      <button :class="playing ? 'danger' : ''" @click="togglePlay">
        {{ playing ? '⏹ หยุด' : '▶ ฟังทำนอง' }}
      </button>
      <label style="display: inline-flex; align-items: center; gap: 4px">
        ความเร็ว:
        <ComboSelect v-model="tempo" :options="tempoOptions" allow-custom aria-label="เลือกความเร็ว" width="210px" />
      </label>
      <label style="display: inline-flex; align-items: center; gap: 4px">
        <input v-model="loop" type="checkbox" /> วนซ้ำ
      </label>
      <span class="font-ctl" role="group" aria-label="ขนาดตัวอักษร">
        <button class="secondary tiny" aria-label="ตัวอักษรเล็กลง" :disabled="fontScale <= 0.8" @click="bumpFont(-0.1)">ก−</button>
        <button class="secondary tiny" aria-label="ตัวอักษรใหญ่ขึ้น" :disabled="fontScale >= 2.2" @click="bumpFont(0.1)">ก+</button>
      </span>
      <router-link class="pk-info" :to="{ path: '/guide', hash: '#howto-song' }" aria-label="วิธีใช้หน้านี้">i</router-link>
    </div>

    <div class="card">
      <h2 style="margin-top: 0; color: var(--brand)">
        {{ song.number != null ? song.number + '. ' : '' }}{{ song.title_th }}
      </h2>
      <p class="muted">
        Key {{ song.content.key }}
        <template v-if="displayKey && displayKey !== song.content.key"> → {{ displayKey }}</template>
        · {{ song.content.timeSignature }}
        <template v-if="song.content.bpm"> · ♩= {{ song.content.bpm }}</template>
      </p>
      <div v-if="sections.length" class="section-bar no-print" role="group" aria-label="เล่นเป็นท่อน">
        <button class="section-chip" :class="{ active: playingSection === 'all' }" @click="togglePlay">
          ▶ ทั้งเพลง
        </button>
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
          :mode="mode"
          :chord-system="chordSystem"
          :display-key="displayKey"
          :playing-seg="playingSeg"
        />
      </div>
    </div>
  </div>
</template>
