<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase.js'
import { SAMPLE_SONGS } from '../data/sample-songs.js'
import { KEYS } from '../lib/chords.js'
import { playSong, stopPlayback } from '../lib/midi.js'
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
})

onUnmounted(stopPlayback)

function printSheet() {
  window.print()
}

async function togglePlay() {
  if (playing.value) {
    stopPlayback()
    playing.value = false
    return
  }
  playing.value = true
  await playSong(song.value.content, {
    bpm: song.value.content.bpm || 80,
    loop: loop.value,
  })
  playing.value = false
}
</script>

<template>
  <p v-if="notFound">ไม่พบเพลงนี้ — <router-link to="/">กลับหน้ารายการเพลง</router-link></p>
  <div v-else-if="song">
    <div class="card no-print" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center">
      <select v-model="mode">
        <option value="full">เนื้อ + คอร์ด + โน้ต</option>
        <option value="lyrics">เนื้อร้องล้วน</option>
      </select>
      <select v-model="chordSystem" :disabled="mode === 'lyrics'">
        <option value="letter">คอร์ดตัวอักษร</option>
        <option value="roman">คอร์ดโรมัน (I IV V)</option>
      </select>
      <label v-if="chordSystem === 'letter' && mode === 'full'" style="display: inline-flex; align-items: center; gap: 4px">
        คีย์:
        <ComboSelect
          v-model="displayKey"
          :options="KEYS.map((k) => ({ value: k, label: k + (k === song.content.key ? ' (ต้นฉบับ)' : '') }))"
          width="120px"
        />
      </label>
      <button :class="playing ? 'danger' : ''" @click="togglePlay">
        {{ playing ? '⏹ หยุด' : '▶ ฟังทำนอง' }}
      </button>
      <label style="display: inline-flex; align-items: center; gap: 4px">
        <input v-model="loop" type="checkbox" /> วนซ้ำ
      </label>
      <button class="secondary" @click="printSheet">🖨️ พิมพ์ A4</button>
    </div>

    <div class="card">
      <h2 style="margin-top: 0; color: var(--blue)">
        {{ song.number != null ? song.number + '. ' : '' }}{{ song.title_th }}
      </h2>
      <p class="muted">
        Key {{ song.content.key }}
        <template v-if="displayKey && displayKey !== song.content.key"> → {{ displayKey }}</template>
        · {{ song.content.timeSignature }}
        <template v-if="song.content.bpm"> · ♩= {{ song.content.bpm }}</template>
      </p>
      <SongSheet
        :content="song.content"
        :mode="mode"
        :chord-system="chordSystem"
        :display-key="displayKey"
      />
    </div>
  </div>
</template>
