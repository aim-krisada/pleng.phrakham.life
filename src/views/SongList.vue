<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase.js'
import { SAMPLE_SONGS } from '../data/sample-songs.js'
import { filterSongs, snippet, normalize } from '../lib/songSearch.js'
import { bookRefLabels } from '../lib/bookCodes.js'
import {
  orderedBooks,
  songsInBook,
  visibleSongs,
  showVerifiedBadge,
  showUnverifiedBadge,
  verifiedProgress,
  FALLBACK_KEY,
} from '../lib/bookshelf.js'
import { session } from '../store.js'

const router = useRouter()

// public (anon) vs logged-in team. Drives the verified-only gate + the QA badge visibility.
const loggedIn = computed(() => !!session.value)

const songs = ref([])
const query = ref('')
const loading = ref(true)
const dbError = ref(false)

// B087 — the home is now a 2-level "bookshelf": land on a grid of เล่ม (real books =
// `category`) → tap one → its songs by number → tap a song → the existing /song/:id page.
// `book_refs` are demoted to reference TAGS on each song (taxonomy revised 11 ก.ค. — one
// song lives in one category). A non-empty search box OVERRIDES both levels and shows flat
// results across every book (US-AC5), so the search path (songSearch.js) is untouched.
// `level` tracks which drill state we're in when NOT searching; `activeBook` is the
// selected category code (or the fallback sentinel).
const level = ref('books') // 'books' | 'songs'
const activeBook = ref(null)

// searching = query has content → search view overrides the drill (mockup behaviour).
const searching = computed(() => normalize(query.value) !== '')

// review facets (B053/B054) narrow the flat search results; they only make sense over a
// list, so they ride ALONG with the search view (the clean landing has no facets — the
// approved mockup shows search + book grid only). `onlyUnverified` powers "ยังไม่ตรวจ";
// `theme` filters by the imported อนุชน theme.
const onlyUnverified = ref(false)
const theme = ref('')

const themes = computed(() =>
  [...new Set(songs.value.map((s) => s.theme).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')),
)

// a song is "flagged" when DA's review_flags array has entries (repeat / lint / words).
const FLAG_LABEL = { repeat: 'ตั้งจุดซ้ำ (repeat)', lint: 'โน้ตอาจผิด (lint)', words: 'เนื้อ≠โน้ต' }
function flagCount(s) {
  return Array.isArray(s.review_flags) ? s.review_flags.length : 0
}
function flagTitle(s) {
  const kinds = (s.review_flags || []).map((f) => FLAG_LABEL[f] || f)
  return kinds.length ? 'ต้องตรวจ: ' + kinds.join(' · ') : ''
}

// public visibility gate — the whole page derives from THIS, so counts, in-book lists and
// search all agree (public sees only verified songs; team sees all). Separate layer from
// the grouping (can ship independently).
const shownSongs = computed(() => visibleSongs(songs.value, loggedIn.value))

// review progress (team only) — "ตรวจแล้ว X / ทั้งหมด Y". Overall across the library for the
// landing; per-book for the in-book view. Public never sees these (they see only verified),
// so the templates gate the display on loggedIn.
const progress = computed(() => verifiedProgress(shownSongs.value))
const bookProgress = computed(() => verifiedProgress(inBook.value))

// ---- bookshelf derivations (pure logic in lib/bookshelf.js, unit-tested there) ----
// grouped by `category` (real books); each entry = { code, name, count, fallback }.
const shelf = computed(() => orderedBooks(shownSongs.value)) // ordered เล่ม, empties hidden
const inBook = computed(() => (activeBook.value ? songsInBook(shownSongs.value, activeBook.value) : []))
const activeBookMeta = computed(() => shelf.value.find((b) => b.code === activeBook.value) || null)

// empty landing message: distinguish "no songs at all" from "songs exist but the public
// gate hid them all (none verified yet)" — else a public visitor sees "ยังไม่มีเพลงในระบบ"
// while 100+ songs sit unverified. (Wording is a suggestion — PM/P'Aim can adjust.)
const booksEmptyMsg = computed(() =>
  !loggedIn.value && songs.value.length
    ? 'เพลงกำลังอยู่ระหว่างตรวจทาน จะเปิดให้ชมเร็วๆ นี้'
    : 'ยังไม่มีเพลงในระบบ',
)

// ---- search results (existing flat list, narrowed by the review facets) ----
const results = computed(() => {
  let list = filterSongs(shownSongs.value, query.value)
  if (onlyUnverified.value) list = list.filter((s) => !s.verified)
  if (theme.value) list = list.filter((s) => s.theme === theme.value)
  return list
})

function openBook(code) {
  activeBook.value = code
  level.value = 'songs'
  window.scrollTo(0, 0)
}
function backToBooks() {
  level.value = 'books'
  activeBook.value = null
  window.scrollTo(0, 0)
}

onMounted(async () => {
  const { data, error } = await supabase
    .from('songs')
    .select('id, number, title_th, title_en, content, category, theme, verified, book_refs, scripture, review_flags')
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
    <!-- search: always on top, overrides the drill from any level (US-AC5) -->
    <div class="no-print search-block">
      <input
        v-model="query"
        type="search"
        class="song-search"
        aria-label="ค้นหาเพลง"
        placeholder="ค้นหา: ชื่อเพลง หมายเลข เนื้อร้อง คีย์ หรือโน้ตตัวเลข (เช่น 5 5 6 1)"
      />
      <p class="search-hint muted">พิมพ์แล้วเจอทันที — ค้นข้ามทุกเล่ม ไม่ต้องเข้าเล่มก่อน</p>
      <p v-if="dbError" class="muted db-note">
        ยังเชื่อมต่อฐานข้อมูลไม่ได้ — แสดงเพลงตัวอย่างไปก่อน
      </p>
    </div>

    <p v-if="loading" class="muted">กำลังโหลด…</p>

    <!-- ===== SEARCH · flat results across every book (overrides levels) ===== -->
    <section v-else-if="searching">
      <div class="level-head">
        <h2>ผลการค้นหา</h2>
        <span class="count muted" aria-live="polite">{{ results.length }} เพลง</span>
      </div>
      <!-- review facets = team QA tools → logged-in only (public sees only verified songs,
           so an "unverified" filter would be meaningless for them) -->
      <div v-if="loggedIn" class="facet-row">
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
      </div>

      <div class="song-grid">
        <router-link v-for="s in results" :key="s.id" :to="`/song/${s.id}`" class="card song-card">
          <div class="song-card-head">
            <strong class="song-title">{{ s.number != null ? s.number + '. ' : '' }}{{ s.title_th }}</strong>
            <span class="head-tags">
              <span v-if="loggedIn && flagCount(s)" class="badge warn" :title="flagTitle(s)">⚠️ ต้องตรวจ</span>
              <span v-if="showVerifiedBadge(s, loggedIn)" class="badge ok" title="ตรวจแล้ว">✓ ตรวจแล้ว</span>
              <span v-else-if="showUnverifiedBadge(s, loggedIn)" class="badge pending" title="ยังไม่ตรวจ">ยังไม่ตรวจ</span>
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
      <p v-if="results.length === 0" class="muted empty" aria-live="polite">ไม่พบเพลงที่ค้นหา</p>
    </section>

    <!-- ===== LEVEL 2 · songs in the selected book, ordered by in-book number ===== -->
    <section v-else-if="level === 'songs'">
      <button type="button" class="crumb" @click="backToBooks">← เล่มทั้งหมด</button>
      <div class="level-head">
        <h2>{{ activeBookMeta ? activeBookMeta.name : '' }}</h2>
        <span class="count muted">{{ inBook.length }} เพลง</span>
        <span v-if="loggedIn" class="count progress" aria-live="polite">
          ✓ ตรวจแล้ว {{ bookProgress.verified }} / {{ bookProgress.total }}
        </span>
      </div>
      <div class="song-list">
        <router-link
          v-for="s in inBook"
          :key="s.id"
          :to="`/song/${s.id}`"
          class="song-row"
        >
          <span class="no">{{ s.number != null ? s.number : '–' }}</span>
          <span class="ttl">{{ s.title_th }}</span>
          <span v-if="showVerifiedBadge(s, loggedIn)" class="badge ok row-status" title="ตรวจแล้ว">✓ ตรวจแล้ว</span>
          <span v-else-if="showUnverifiedBadge(s, loggedIn)" class="badge pending row-status" title="ยังไม่ตรวจ">ยังไม่ตรวจ</span>
          <!-- book_refs = reference tag ("เล่มเล็ก 282"). Kept title-first: shown only where
               the row is wide enough (≥640px) so it never crushes the title into a sliver on
               a phone. Full list also lives on the search card + the song page. -->
          <span
            v-if="bookRefLabels(s.book_refs).length"
            class="ref"
            :title="'อ้างอิง: ' + bookRefLabels(s.book_refs).join(' · ')"
          >{{ bookRefLabels(s.book_refs).join(' · ') }}</span>
          <span v-if="s.content && s.content.key" class="key">คีย์ {{ s.content.key }}</span>
        </router-link>
      </div>
      <p v-if="inBook.length === 0" class="muted empty">ยังไม่มีเพลงในเล่มนี้</p>
    </section>

    <!-- ===== LEVEL 1 · bookshelf (landing) ===== -->
    <section v-else>
      <div class="level-head">
        <h2>เลือกเล่ม</h2>
        <span class="count muted">{{ shelf.length }} เล่ม</span>
        <span v-if="loggedIn" class="count progress" aria-live="polite">
          ✓ ตรวจแล้ว {{ progress.verified }} / ทั้งหมด {{ progress.total }}
        </span>
      </div>
      <div class="book-grid">
        <button
          v-for="b in shelf"
          :key="b.code"
          type="button"
          class="book-card"
          :class="{ fallback: b.fallback }"
          @click="openBook(b.code)"
        >
          <span class="bk-body">
            <span class="bk-name">{{ b.name }}</span>
            <span class="bk-count">{{ b.count }} เพลง</span>
          </span>
          <span class="chev" aria-hidden="true">›</span>
        </button>
      </div>
      <p v-if="shelf.length === 0" class="muted empty">{{ booksEmptyMsg }}</p>
      <div class="note-banner muted">
        เล่ม = เหมือน “หนังสือ” · เพลง = เหมือน “ข้อ” — เลือกเล่มเพื่อดูเพลงเรียงตามเลขในเล่มนั้น
      </div>
    </section>
  </div>
</template>

<style scoped>
/* All spacing/type/radius use the S0 design tokens (--sp-* / --fs-* / --lh-* /
   --touch-min from styles.css). No hard-coded px for rhythm; focusable form
   controls stay >= --fs-base so iOS Safari never zoom-on-focus, and every
   interactive target is >= --touch-min (44px) tall (WCAG 2.5.5 / 2.5.8). */

.search-block { margin-bottom: var(--sp-5); }
.search-hint { margin: var(--sp-2) 0 0; font-size: var(--fs-sm); }
.db-note { margin: var(--sp-2) 0 0; }

/* single, full-width search field — no wrapping card */
.song-search {
  width: 100%;
  min-height: var(--touch-min);
  /* phrakham parity: cream fill (#faf6f0) + 16px text — its search box uses the cream control
     fill, not white, and 16px (was pleng white #fff + 18px). 16px = iOS zoom-safe floor. */
  font-size: 16px;
  padding: var(--sp-3) var(--sp-4);
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--cream);
  color: var(--ink);
  font-family: inherit;
}

/* level heading + result/book count + breadcrumb */
.level-head {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  flex-wrap: wrap;
  margin: 0 0 var(--sp-4);
}
.level-head h2 { font-size: var(--fs-xl); color: var(--brand); line-height: var(--lh-snug); }
.level-head .count { font-size: var(--fs-sm); }
/* review-progress tally (team only) — green to echo the ✓ ตรวจแล้ว badge */
.level-head .progress { color: #2e6b3b; font-weight: 600; }
.crumb {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  background: none;
  border: none;
  color: var(--brand);
  font: inherit;
  font-size: var(--fs-base);
  cursor: pointer;
  padding: var(--sp-2) var(--sp-2) var(--sp-2) 0;
  min-height: var(--touch-min);
}
.crumb:hover { text-decoration: underline; }

/* facet row (search view only): unverified toggle + theme picker */
.facet-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  margin: 0 0 var(--sp-4);
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

/* ---- LEVEL 1 · bookshelf grid: 1 col (phone) → 2 (>=480) → 3 (>=768, PC) ---- */
.book-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-3);
}
@media (min-width: 480px) { .book-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 768px) { .book-grid { grid-template-columns: repeat(3, 1fr); } }
.book-card {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  background: var(--bg);
  /* phrakham .hl-card parity: 14px radius + border #e7dcca (was 10px + --line #e0d6c8).
     #e7dcca is a literal — it's phrakham's card-border warm cream, distinct from pleng's
     --line #e0d6c8 (kept for every other border). The 5px brown left stripe stays: it marks
     the book category (P'Aim: keep) — phrakham has no equivalent card, so it's pleng-only. */
  border: 1px solid #e7dcca;
  border-left: 5px solid var(--brand);
  border-radius: 14px;
  padding: var(--sp-4);
  cursor: pointer;
  text-align: left;
  color: var(--ink);
  font: inherit;
  min-height: var(--touch-min);
  width: 100%;
}
.book-card:hover { background: var(--cream-hover); }
.book-card .bk-body { flex: 1; min-width: 0; }
.book-card .bk-name { display: block; font-weight: 700; color: var(--brand); font-size: var(--fs-lg); }
.book-card .bk-count { display: block; color: var(--muted); font-size: var(--fs-sm); }
.book-card .chev { color: var(--muted); font-size: var(--fs-lg); }
/* the 5px coloured left border IS the spine (no per-book code/icon — P'Aim: keep simple) */
.book-card.fallback { border-left-color: var(--line); }
.book-card.fallback .bk-name { color: var(--muted); }

/* ---- LEVEL 2 · one row per song: number (tabular, right) + title (wraps) + key ---- */
/* Width = fit-content, capped at 100%. The list is exactly as wide as its longest row
   needs and every row stretches to that one width — "ยาวพออันยาวสุด · เท่ากันทุกอัน".
   (Dropped the old `contain: inline-size`, which pinned this to a thin ~306px column
   stranded in a wide screen. It existed to stop a long nowrap title pushing <main> past
   the viewport; titles now wrap — .ttl white-space:normal + overflow-wrap:anywhere — so a
   long title grows taller, never wider, and max-width:100% keeps it inside a phone: no
   horizontal scroll at any width.) */
.song-list { display: flex; flex-direction: column; gap: var(--sp-1); width: fit-content; max-width: 100%; }
.song-row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: var(--sp-3) var(--sp-4);
  cursor: pointer;
  color: var(--ink);
  text-decoration: none;
  min-height: var(--touch-min);
}
.song-row:hover { background: var(--cream-hover); }
/* number/key/status hold the FIRST line when a long title wraps (2c) */
.song-row .no,
.song-row .ref,
.song-row .key,
.song-row .row-status { align-self: flex-start; }
.song-row .no {
  min-width: 2.4em;
  text-align: right;
  color: var(--brand);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex: 0 0 auto;
}
.song-row .ttl {
  flex: 1 1 auto;
  min-width: 0;
  white-space: normal;      /* was nowrap — show the whole name, wrap instead of clip (2c) */
  overflow-wrap: anywhere;  /* an over-long unbroken token wraps rather than pushing width */
}
/* book_refs reference tag ("เล่มเล็ก 282") — the paper-book number people know. Secondary
   to the title: hidden on phones (would crush the title into a sliver — the ref is on the
   search card + song page there) and shown from 640px up, where the row is wide enough. */
.song-row .ref { display: none; }
@media (min-width: 640px) {
  .song-row .ref {
    display: inline;
    flex: 0 4 auto;
    min-width: 0;
    max-width: 45%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: var(--fs-xs);
  }
}
.song-row .key {
  color: var(--muted);
  font-size: var(--fs-xs);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1px var(--sp-2);
  white-space: nowrap;
  flex: 0 0 auto;
}
/* verified/pending marker on an in-book row — never shrinks, so it stays whole at 360px
   while the title (flex 1, wraps) takes the extra height. Team-only (v-if loggedIn). */
.song-row .row-status { flex: 0 0 auto; }

/* ---- SEARCH results: reuse the existing card treatment (refine, not rewrite) ---- */
.song-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-3);
}
@media (min-width: 640px) { .song-grid { grid-template-columns: repeat(2, 1fr); } }
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
/* semantic status colours (warn/ok) — not theme tokens; kept as-is from the catalog merge */
.badge.warn { background: #fdecea; color: #9c3b2e; border: 1px solid #f0b8ae; }
.badge.ok { background: #e7f4e9; color: #2e6b3b; border: 1px solid #b7ddbf; }
/* "ยังไม่ตรวจ" = neutral grey (not alarming red — a song simply awaits review, it isn't
   broken). Slate on a light-grey chip; contrast ≥ 7:1 so it reads on the warm cream page. */
.badge.pending { background: #eef0f2; color: #4a4f57; border: 1px solid #cfd4da; }
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
.theme-tag { margin-top: var(--sp-1); font-size: var(--fs-xs); display: inline-block; }
.src-tag,
.scripture-tag { margin-top: var(--sp-1); font-size: var(--fs-xs); }

.empty { padding: var(--sp-4) 0; }
.note-banner {
  background: var(--cream);
  border: 1px dashed var(--line);
  border-radius: 10px;
  padding: var(--sp-3) var(--sp-4);
  margin-top: var(--sp-5);
  font-size: var(--fs-sm);
}
</style>
