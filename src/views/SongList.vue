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
    <div class="no-print" style="margin-bottom: 14px">
      <input
        v-model="query"
        type="search"
        class="song-search"
        aria-label="ค้นหาเพลง"
        placeholder="ค้นหา: ชื่อเพลง หมายเลข เนื้อร้อง คีย์ หรือโน้ตตัวเลข (เช่น 5 5 6 1)"
      />
      <p v-if="dbError" class="muted" style="margin: 6px 0 0">
        ยังเชื่อมต่อฐานข้อมูลไม่ได้ — แสดงเพลงตัวอย่างไปก่อน
      </p>
    </div>

    <p v-if="loading" class="muted">กำลังโหลด…</p>

    <router-link v-for="s in filtered" :key="s.id" :to="`/song/${s.id}`" class="card song-card">
      <div class="song-card-head">
        <strong class="song-title">{{ s.number != null ? s.number + '. ' : '' }}{{ s.title_th }}</strong>
        <span class="key-chip">Key {{ s.content.key }}</span>
      </div>
      <div v-if="s.title_en" class="muted">{{ s.title_en }}</div>
      <div v-if="snippet(s.content)" class="muted">{{ snippet(s.content) }}…</div>
    </router-link>

    <p v-if="!loading && filtered.length === 0" class="muted">ไม่พบเพลงที่ค้นหา</p>
  </div>
</template>

<style scoped>
/* single, full-width search field — no wrapping card */
.song-search {
  width: 100%;
  min-height: 48px;
  font-size: 1.02rem;
  padding: 10px 14px;
  border-radius: 10px;
}
/* whole card is the link: no underlines, hover tint signals clickability */
.song-card {
  display: block;
  text-decoration: none;
  color: var(--ink);
}
.song-card:hover { background: var(--cream-hover); }
.song-card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}
.song-title { color: var(--brand); font-size: 1.05rem; }
.key-chip {
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1px 10px;
  font-size: 0.8rem;
  color: var(--muted);
  white-space: nowrap;
  flex: 0 0 auto;
}
</style>
