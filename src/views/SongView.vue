<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase.js'
import { SAMPLE_SONGS } from '../data/sample-songs.js'
import { KEYS } from '../lib/chords.js'
import SongSheet from '../components/SongSheet.vue'

const route = useRoute()
const song = ref(null)
const notFound = ref(false)

const mode = ref('full') // full | lyrics
const chordSystem = ref('letter') // letter | number
const displayKey = ref('')

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

function printSheet() {
  window.print()
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
        <option value="number">คอร์ดตัวเลข</option>
      </select>
      <label v-if="chordSystem === 'letter' && mode === 'full'">
        คีย์:
        <select v-model="displayKey">
          <option v-for="k in KEYS" :key="k" :value="k">
            {{ k }}{{ k === song.content.key ? ' (ต้นฉบับ)' : '' }}
          </option>
        </select>
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
