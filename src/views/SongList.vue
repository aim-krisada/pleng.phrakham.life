<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabase.js'
import { SAMPLE_SONGS } from '../data/sample-songs.js'

import { filterSongs, snippet } from '../lib/songSearch.js'

const songs = ref([])
const query = ref('')
const loading = ref(true)
const dbError = ref(false)

const filtered = computed(() => filterSongs(songs.value, query.value))

onMounted(async () => {
  const { data, error } = await supabase
    .from('songs')
    .select('id, number, title_th, title_en, content')
    .order('number', { ascending: true })
  if (error || !data || data.length === 0) {
    dbError.value = !!error
    songs.value = SAMPLE_SONGS
  } else {
    songs.value = data
  }
  loading.value = false
})
</script>

<template>
  <div>
    <div class="card no-print">
      <input
        v-model="query"
        style="width: 100%"
        placeholder="ค้นหา: ชื่อเพลง หมายเลข เนื้อร้อง คีย์ หรือโน้ตตัวเลข (เช่น 5 5 6 1)"
      />
      <p v-if="dbError" class="muted" style="margin: 8px 0 0">
        ยังเชื่อมต่อฐานข้อมูลไม่ได้ — แสดงเพลงตัวอย่างไปก่อน
      </p>
    </div>

    <p v-if="loading" class="muted">กำลังโหลด…</p>

    <router-link
      v-for="s in filtered"
      :key="s.id"
      :to="`/song/${s.id}`"
      class="card"
      style="display: block"
    >
      <strong>{{ s.number != null ? s.number + '. ' : '' }}{{ s.title_th }}</strong>
      <span v-if="s.title_en" class="muted"> — {{ s.title_en }}</span>
      <span class="muted" style="float: right">Key {{ s.content.key }}</span>
      <div class="muted">{{ snippet(s.content) }}…</div>
    </router-link>

    <p v-if="!loading && filtered.length === 0" class="muted">ไม่พบเพลงที่ค้นหา</p>
  </div>
</template>
