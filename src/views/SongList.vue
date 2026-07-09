<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabase.js'
import { SAMPLE_SONGS } from '../data/sample-songs.js'
import { filterSongs, snippet } from '../lib/songSearch.js'

const songs = ref([])
const query = ref('')
const loading = ref(true)
const dbError = ref(false)

// review facets (B053/B054) — layered on TOP of the text search so songSearch.js is
// untouched (สาย B058 owns it). `onlyUnverified` powers "เพลงที่ยังไม่ตรวจ"; `theme`
// filters by the imported อนุชน theme. Both narrow whatever the search already returned.
const onlyUnverified = ref(false)
const theme = ref('')

// theme choices are derived from the loaded songs (distinct, sorted) so the list stays
// correct even if DA adjusts the theme set — no hard-coded list to drift out of sync.
const themes = computed(() =>
  [...new Set(songs.value.map((s) => s.theme).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')),
)

// a song is "flagged" when DA's review_flags array has entries. The column is added by
// the DA stream; until then it is simply absent (undefined) → no ⚠️ badge shows. When
// the field lands, add `review_flags` to the select below and the badges light up.
function flagCount(s) {
  return Array.isArray(s.review_flags) ? s.review_flags.length : 0
}

const filtered = computed(() => {
  let list = filterSongs(songs.value, query.value)
  if (onlyUnverified.value) list = list.filter((s) => !s.verified)
  if (theme.value) list = list.filter((s) => s.theme === theme.value)
  return list
})

onMounted(async () => {
  const { data, error } = await supabase
    .from('songs')
    .select('id, number, title_th, title_en, content, theme, verified, book_refs')
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
      <div class="facet-row">
        <button
          type="button"
          class="facet-chip"
          :class="{ on: onlyUnverified }"
          :aria-pressed="onlyUnverified"
          @click="onlyUnverified = !onlyUnverified"
        >
          ⚠️ เฉพาะที่ยังไม่ตรวจ
        </button>
        <select v-model="theme" class="facet-select" aria-label="กรองตามธีม">
          <option value="">ทุกธีม</option>
          <option v-for="t in themes" :key="t" :value="t">{{ t }}</option>
        </select>
        <span v-if="!loading" class="facet-count muted">{{ filtered.length }} เพลง</span>
      </div>
      <p v-if="dbError" class="muted" style="margin: 6px 0 0">
        ยังเชื่อมต่อฐานข้อมูลไม่ได้ — แสดงเพลงตัวอย่างไปก่อน
      </p>
    </div>

    <p v-if="loading" class="muted">กำลังโหลด…</p>

    <router-link v-for="s in filtered" :key="s.id" :to="`/song/${s.id}`" class="card song-card">
      <div class="song-card-head">
        <strong class="song-title">{{ s.number != null ? s.number + '. ' : '' }}{{ s.title_th }}</strong>
        <span class="head-tags">
          <span v-if="flagCount(s)" class="badge warn" title="มีจุดที่ต้องตรวจ (DA ติดธง)">⚠️ ต้องตรวจ</span>
          <span v-if="s.verified" class="badge ok" title="ตรวจแล้ว">✓ ตรวจแล้ว</span>
          <span class="key-chip">Key {{ s.content.key }}</span>
        </span>
      </div>
      <div v-if="s.title_en" class="muted">{{ s.title_en }}</div>
      <div v-if="snippet(s.content)" class="muted">{{ snippet(s.content) }}…</div>
      <div v-if="s.theme" class="theme-tag muted">{{ s.theme }}</div>
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
/* facet row under the search: unverified toggle + theme picker + count */
.facet-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.facet-chip {
  min-height: 40px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--line);
  background: var(--cream);
  color: var(--ink);
  cursor: pointer;
  font-size: 0.92rem;
}
.facet-chip:hover { background: var(--cream-hover); }
.facet-chip.on {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.facet-select {
  min-height: 40px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--cream);
  color: var(--ink);
  font-size: 0.92rem;
}
.facet-count { margin-left: auto; font-size: 0.88rem; }
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
.head-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.badge {
  border-radius: 12px;
  padding: 1px 9px;
  font-size: 0.78rem;
  white-space: nowrap;
}
.badge.warn { background: #fdecea; color: #9c3b2e; border: 1px solid #f0b8ae; }
.badge.ok { background: #e7f4e9; color: #2e6b3b; border: 1px solid #b7ddbf; }
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
.theme-tag {
  margin-top: 4px;
  font-size: 0.8rem;
  display: inline-block;
}
</style>
