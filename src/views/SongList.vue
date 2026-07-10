<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabase.js'
import { SAMPLE_SONGS } from '../data/sample-songs.js'
import { filterSongs, snippet } from '../lib/songSearch.js'
import { bookRefLabels } from '../lib/bookCodes.js'

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

// a song is "flagged" when DA's review_flags array has entries (codes: repeat / lint /
// words). Kept defensive (Array.isArray) so an older row without the column just shows
// no ⚠️ badge. The tooltip spells out which kinds so the reviewer knows what to look for.
const FLAG_LABEL = { repeat: 'ตั้งจุดซ้ำ (repeat)', lint: 'โน้ตอาจผิด (lint)', words: 'เนื้อ≠โน้ต' }
function flagCount(s) {
  return Array.isArray(s.review_flags) ? s.review_flags.length : 0
}
function flagTitle(s) {
  const kinds = (s.review_flags || []).map((f) => FLAG_LABEL[f] || f)
  return kinds.length ? 'ต้องตรวจ: ' + kinds.join(' · ') : ''
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
    .select('id, number, title_th, title_en, content, theme, verified, book_refs, scripture, review_flags')
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
    <div class="no-print search-block">
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
      <p v-if="dbError" class="muted db-note">
        ยังเชื่อมต่อฐานข้อมูลไม่ได้ — แสดงเพลงตัวอย่างไปก่อน
      </p>
    </div>

    <p v-if="loading" class="muted">กำลังโหลด…</p>

    <div class="song-grid">
      <router-link v-for="s in filtered" :key="s.id" :to="`/song/${s.id}`" class="card song-card">
        <div class="song-card-head">
          <strong class="song-title">{{ s.number != null ? s.number + '. ' : '' }}{{ s.title_th }}</strong>
          <span class="head-tags">
            <span v-if="flagCount(s)" class="badge warn" :title="flagTitle(s)">⚠️ ต้องตรวจ</span>
            <span v-if="s.verified" class="badge ok" title="ตรวจแล้ว">✓ ตรวจแล้ว</span>
            <span class="key-chip">Key {{ s.content.key }}</span>
          </span>
        </div>
        <div v-if="s.title_en" class="muted">{{ s.title_en }}</div>
        <div v-if="snippet(s.content)" class="muted">{{ snippet(s.content) }}…</div>
        <div v-if="s.theme" class="theme-tag muted">{{ s.theme }}</div>
        <div v-if="bookRefLabels(s.book_refs).length" class="src-tag muted">
          แหล่งเพลง: {{ bookRefLabels(s.book_refs).join(' · ') }}
        </div>
        <div v-if="s.scripture" class="scripture-tag muted">📖 {{ s.scripture }}</div>
      </router-link>
    </div>

    <p v-if="!loading && filtered.length === 0" class="muted">ไม่พบเพลงที่ค้นหา</p>
  </div>
</template>

<style scoped>
/* All spacing/type/radius use the S0 design tokens (--sp-* / --fs-* / --lh-* /
   --touch-min from styles.css). No hard-coded px for rhythm; focusable form
   controls stay >= --fs-base (16.96px) so iOS Safari never zoom-on-focus, and
   every control is >= --touch-min (44px) tall (WCAG 2.5.5). */

.search-block { margin-bottom: var(--sp-4); }
.db-note { margin: var(--sp-2) 0 0; }

/* single, full-width search field — no wrapping card */
.song-search {
  width: 100%;
  min-height: var(--touch-min);
  font-size: var(--fs-base);
  padding: var(--sp-3) var(--sp-4);
  border-radius: 10px;
}
/* facet row under the search: unverified toggle + theme picker + count */
.facet-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  margin-top: var(--sp-3);
}
.facet-chip {
  min-height: var(--touch-min);
  padding: var(--sp-2) var(--sp-4);
  border-radius: 22px;
  border: 1px solid var(--line);
  background: var(--cream);
  color: var(--ink);
  cursor: pointer;
  font-size: var(--fs-base);
}
.facet-chip:hover { background: var(--cream-hover); }
.facet-chip.on {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.facet-select {
  min-height: var(--touch-min);
  padding: var(--sp-2) var(--sp-3);
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--cream);
  color: var(--ink);
  font-size: var(--fs-base);
}
.facet-count { margin-left: auto; font-size: var(--fs-sm); }

/* responsive card grid: 1 column on phones, 2 from tablet up (container caps
   at 900px so 2 keeps each card readable) — reflows without horizontal scroll */
.song-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-3);
}
@media (min-width: 640px) {
  .song-grid { grid-template-columns: repeat(2, 1fr); }
}

/* whole card is the link: no underlines, hover tint signals clickability.
   margin-bottom cleared — the grid gap owns vertical rhythm now. */
.song-card {
  display: block;
  text-decoration: none;
  color: var(--ink);
  margin-bottom: 0;
}
.song-card:hover { background: var(--cream-hover); }
.song-card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--sp-2);
}
.song-title { color: var(--brand); font-size: var(--fs-lg); line-height: var(--lh-snug); }
.head-tags {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.badge {
  border-radius: 12px;
  padding: 1px var(--sp-2);
  font-size: var(--fs-xs);
  white-space: nowrap;
}
/* semantic status colours (warn/ok) — not theme tokens; kept as-is from the
   catalog merge. If tokenised, needs a PM-approved --warn/--ok pair. */
.badge.warn { background: #fdecea; color: #9c3b2e; border: 1px solid #f0b8ae; }
.badge.ok { background: #e7f4e9; color: #2e6b3b; border: 1px solid #b7ddbf; }
.key-chip {
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1px var(--sp-3);
  font-size: var(--fs-xs);
  color: var(--muted);
  white-space: nowrap;
  flex: 0 0 auto;
}
.theme-tag {
  margin-top: var(--sp-1);
  font-size: var(--fs-xs);
  display: inline-block;
}
/* B053 — source book(s) + scripture reference, small caption lines under the snippet.
   Same muted caption weight as the theme tag; each on its own row so long ref lists wrap
   cleanly on a phone-width card. */
.src-tag,
.scripture-tag {
  margin-top: var(--sp-1);
  font-size: var(--fs-xs);
}
</style>
