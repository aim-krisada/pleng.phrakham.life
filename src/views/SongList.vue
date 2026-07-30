<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase.js'
import { SAMPLE_SONGS } from '../data/sample-songs.js'
import { filterSongs, searchSnippet, normalize } from '../lib/songSearch.js'
import { lyricSetName } from '../lib/songModel.js'
import { bookRefLabels } from '../lib/bookCodes.js'
import {
  orderedBooks,
  songsInBook,
  visibleSongs,
  showVerifiedBadge,
  showUnverifiedBadge,
  verifiedProgress,
  unfinishedCount,
  FALLBACK_KEY,
} from '../lib/bookshelf.js'
import { pendingReview } from '../lib/reviewQueue.js'
import { WORK_WORDS } from '../i18n/workWords.js'
import { session, canApprove } from '../store.js'

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

// ⭐ พี่เปาขอเพิ่มเอง 30 ก.ค. ("กด 'ยังทำไม่เสร็จ' แล้วคัดมาให้ด้วย แค่นั้น"):
// รายการแบนราบข้ามเล่มของ v1 เปิดได้เฉพาะตอน "พิมพ์" ค้นหา ⇒ สวิตช์คัดกรอง `onlyUnverified`
// ที่ v1 มีอยู่แล้วจึงเอื้อมไม่ถึงเลยถ้าไม่พิมพ์อะไร · เปิดประตูที่สองให้มันแค่บานเดียว คือ
// เปิดรายการเมื่อ "พิมพ์ค้นหา" *หรือ* "สวิตช์คัดกรองถูกเปิด"
// ⛔ ไม่ได้เขียนตัวคัดกรองใหม่ ⛔ ไม่ได้สร้างหน้าใหม่ — ทั้งตัวคัดกรอง (`results`) และการ
// จำกัดขอบเขตตามเล่ม (`searchBase`) เป็นของ v1 เดิม ไม่แตะแม้บรรทัดเดียว · และ `filterSongs`
// คืนรายการทั้งหมดเมื่อคำค้นว่างอยู่แล้ว (`src/lib/songSearch.js` → `if (!q) return songs`)
// ⇒ ได้ "เฉพาะที่ยังทำไม่เสร็จ" ฟรี ๆ โดยไม่ต้องเพิ่มตรรกะการคัดใด ๆ
const showList = computed(() => searching.value || onlyUnverified.value)

// กดเลข "ยังทำไม่เสร็จ" แล้วคัดมาให้ — code = null คือทุกเล่ม · code = รหัสเล่ม คือเฉพาะเล่มนั้น
// เคลียร์คำค้นทิ้งด้วย เพราะถ้ามีคำค้นค้างอยู่ รายการจะถูกคัดสองชั้นแล้วเลขไม่ตรงกับที่กด
function showUnfinished(code) {
  query.value = ''
  theme.value = ''            // ธีมที่ค้างอยู่ก็คัดซ้อนได้เหมือนกัน
  activeBook.value = code || null
  // ตั้งชั้นไว้ให้ "ปิดสวิตช์แล้วกลับไปที่ที่ควรกลับ": เฉพาะเล่ม → กลับเข้าเล่มนั้น · ทุกเล่ม → กลับหน้าแรก
  level.value = code ? 'songs' : 'books'
  onlyUnverified.value = true
  window.scrollTo(0, 0)
}

// ปิดการคัดกรอง แล้วกลับไปที่ชั้นที่ showUnfinished ตั้งไว้ (เข้าเล่มนั้น หรือหน้าแรก)
function clearUnfinished() {
  onlyUnverified.value = false
  window.scrollTo(0, 0)
}

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

// 717 multi-lyric — this song has more than one set of words under one melody, so the card's
// single preview line cannot be the whole story.
//
// A COUNT, not a list of names (26 ก.ค.): the sets are captioned by position now, so listing them
// would print "เนื้อร้องที่ 1 · เนื้อร้องที่ 2" and tell the reader nothing they can act on. The
// count is the same fact the reader's collapsed switcher already leads with ("2 ชุด").
function lyricSetCount(s) {
  const sets = s?.content?.lyricSets
  return Array.isArray(sets) && sets.length > 1 ? sets.length : 0
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

// ---- approver review queue (พี่เปา) — "มีอะไรเข้ามารอให้ฉันอนุมัติ" from the landing ----
// The question this chip answers is a WORK question: someone pressed "ส่งตรวจ" and is waiting
// for an answer. That inbox is `song_drafts` with status `pending` — not `songs.verified`, which
// answers the unrelated "which songs in the library has nobody ticked yet" and cannot even
// shrink when a draft is approved (see lib/reviewQueue.js). So the chip reads the drafts table.
//
// APPROVER ONLY — bound to `canApprove` (store.js, the permission SSOT), never to a name or to
// "logged in": publishing is the approver's gate, so the queue that feeds it is too. An editor
// or an anon visitor sees nothing at all, and RLS (db/002:58) would not hand them the rows
// anyway. When the queue reaches 0 the chip disappears entirely rather than saying "(0)".
const reviewQueue = ref([])

// ---- แถบ "งานของฉัน" (พี่เปา 30 ก.ค. บรรทัด 227) — เห็นเฉพาะเมื่อล็อกอินแล้ว ----
//
// เขาขอไว้ 3 อย่างพอดี: พิมพ์ค้นหาได้ทันที · เข้าหลังบ้านได้เลยจากหน้าแรก · และ "ควรจะโชว์ว่า
// มันมีงานรอตรวจอยู่เท่าไหร่ แล้วก็ในแต่ละเล่มอ่ะ มีที่ยังไม่เสร็จอ่ะ ... เท่าไหร่".
//
// ⚠️ สองเลขนี้เป็นคนละกอง เขายืนยันเอง (บรรทัด 198-211) ⛔ ห้ามบวกรวมกัน:
//   รอตรวจ        = งานที่คนอื่นส่งมาให้เขาอนุมัติ → ตาราง song_drafts แถวที่ status='pending'
//   ยังทำไม่เสร็จ  = เพลงของเขาเองที่ยังไม่เสร็จ    → ตาราง songs แถวที่ verified=false
// คำที่ใช้มาจากรายการคำกลางไฟล์เดียว `src/i18n/workWords.js` (มาตรฐาน ฌ-04 · ก-04).
//
// ⛔ อ่านอย่างเดียวทั้งแถบ — ไม่มีปุ่มไหนในนี้แตะธง verified (ธงนั้นคือประตูเปิดสู่สาธารณะ
// `lib/bookshelf.js` visibleSongs ⇒ ติ๊กให้อัตโนมัติ = ปล่อยเพลงที่ยังไม่เสร็จออกสาธารณะ)
const W = WORK_WORDS
const unfinishedTotal = computed(() => unfinishedCount(shownSongs.value))

// เลข "รอตรวจ" ยังผูกกับ canApprove เหมือนเดิม (คิวของผู้อนุมัติ · RLS db/002 ก็ไม่ส่งแถวให้คนอื่นอยู่แล้ว)
// เลข "ยังทำไม่เสร็จ" นับจากรายการเพลงที่ผู้ใช้คนนี้มองเห็นจริง ๆ (shownSongs) จึงตรงกับสิ่งที่เขาเห็นเสมอ
const showWorkBar = computed(() => loggedIn.value)

// เดิมชิปหายไปเลยเมื่อคิวเป็น 0 ⇒ แยกไม่ออกว่า "ไม่มีงานค้าง" หรือ "โหลดไม่ขึ้น".
// ตอนนี้โชว์เลขเสมอรวมทั้งเลข 0 ตามมาตรฐาน ก-01 (ทุกช่องต้องแสดงจำนวนเป็นเลข เห็นได้ไม่ต้องกดเข้าไปนับ)
// + ก-08 (ช่องที่ว่างต้องบอกว่าว่าง ⛔ ห้ามปล่อยเป็นที่โล่ง)
const reviewCount = computed(() => reviewQueue.value.length)

// ทางเข้าหลังบ้าน 1 คลิกจากหน้าแรก — ปลายทางเดียวกับชิปเดิม (แผง "งานร่าง / รอตรวจ" ในหน้าแก้ไข)
// ⛔ ไม่ทำรายการงานร่างซ้ำอีกชุดที่หน้านี้ เพราะแผงนั้นเป็นเจ้าของการเปิด/ส่งกลับ/อนุมัติอยู่แล้ว
function openManage() {
  router.push('/studio?panel=drafts')
}

// ✏️ ที่ท้ายแถวเพลง → เปิดเพลงนั้นในหน้าแก้ไขทันที (ไม่ต้องแวะหน้าฝึกร้องแล้วกดแก้ไขอีกที)
function openEdit(id) {
  router.push(`/song/${id}?mode=edit`)
}

// ---- ① ช่องค้นหาพร้อมพิมพ์ทันที (พี่เปา บรรทัด 227: "กดเว็บปุ๊บ ถ้ามันไปลอยอยู่ตรง search ก็ดี") ----
//
// จำกัดขอบเขตไว้ 2 ชั้น เพราะการย้ายโฟกัสเองมีราคาที่ต้องจ่าย:
//   ก) เฉพาะจอกว้าง ≥768px — บนมือถือคีย์บอร์ดจะเด้งขึ้นมาบังครึ่งจอทันทีที่เปิดเว็บ
//      คนที่เข้ามาแค่จะ "เปิดดูเพลง" ต้องกดปิดคีย์บอร์ดก่อนทุกครั้ง
//   ข) เฉพาะคนที่ล็อกอินแล้ว — คนทั่วไปที่เข้ามาอ่านเพลงไม่ได้มาพิมพ์ค้นหาเสมอไป
//      และหน้าของคนที่ยังไม่ล็อกอินต้องเหมือนเดิมทุกตัวอักษร
// preventScroll: true = ไม่ให้หน้าเลื่อนตามโฟกัส · ทำครั้งเดียวต่อการเปิดหน้า (autoFocused)
// และทำเฉพาะตอนที่ยังไม่มีอะไรถูกโฟกัส (ผู้ใช้อาจกดช่องอื่นไปแล้วระหว่างรอ session โหลด)
const searchEl = ref(null)
const FOCUS_MIN_WIDTH = 768
let autoFocused = false
// ⚠️ วัดจริงแล้วเจอ: การสั่งโฟกัสด้วยโค้ด "ไม่" ทำให้กรอบโฟกัสของเบราว์เซอร์ขึ้น
// (:focus-visible เป็นเท็จ · outline-style = none) ⇒ ช่องถูกโฟกัสอยู่แต่ไม่มีอะไรบอกสายตาเลย
// พี่เปาจะไม่รู้ว่าพิมพ์ได้แล้ว และเป็นข้อบังคับ WCAG 2.2 · 2.4.7 (ต้องเห็นว่าโฟกัสอยู่ตรงไหน)
// จึงติดคลาสเองเพื่อวาดกรอบชุดเดียวกับที่ทั้งเว็บใช้ (styles.css:117) แล้วเอาออกเมื่อ
// ผู้ใช้เริ่มพิมพ์หรือย้ายไปที่อื่น — กรอบมีหน้าที่บอกว่า "เราย้ายโฟกัสมาให้" เท่านั้น
const autoRing = ref(false)
function dropRing() { autoRing.value = false }
function focusSearchOnce() {
  if (autoFocused || !loggedIn.value) return
  if (typeof window === 'undefined' || window.innerWidth < FOCUS_MIN_WIDTH) return
  const el = searchEl.value
  if (!el) return
  const active = document.activeElement
  if (active && active !== document.body && active !== el) return
  autoFocused = true
  el.focus({ preventScroll: true })
  autoRing.value = document.activeElement === el
}
// session ถูกโหลดแบบไม่พร้อมกัน (App.vue เรียก initAuth()) ⇒ ตอนหน้านี้ mount อาจยังไม่รู้ว่าล็อกอินอยู่
// จึงต้องรอค่าเปลี่ยนด้วย ไม่ใช่เช็คแค่ตอน mount
watch(loggedIn, () => nextTick(focusSearchOnce))

// Fetched, not derived: drafts live in their own table, so this is a second query — run only
// for an approver (nobody else may see the chip) and re-run on login/logout so the count is
// right for whoever is actually signed in.
async function loadReviewQueue() {
  if (!canApprove.value) {
    reviewQueue.value = []
    return
  }
  const { data, error } = await supabase
    .from('song_drafts')
    .select('id, title_th, number, status, updated_at, author_id')
    .order('updated_at', { ascending: false })
  // a missing drafts table (a bare Supabase) or any error must leave the landing page alone —
  // no chip is the honest answer when we cannot read the queue.
  reviewQueue.value = error ? [] : pendingReview(data)
}
watch(canApprove, loadReviewQueue)

// (ทางเข้าแผง "งานร่าง / รอตรวจ" ย้ายไปอยู่ที่ openManage() ข้างบน — ปุ่ม ⚙ จัดการงาน
//  ในแถบ "งานของฉัน" ใช้ปลายทางเดียวกันกับที่ชิปเดิมใช้ `?panel=drafts` จึงมีฟังก์ชันเดียว)

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
// Scope-by-book (พี่เปา): while a เล่ม is open, search stays INSIDE it — the base list is that
// book's songs, not the whole catalog, so typing a title that also exists in another book no
// longer surfaces the other book's copy. On the landing (no book open) the base is the whole
// catalog, so an un-drilled search is unchanged; leaving a book (backToBooks nulls activeBook)
// restores the full-catalog scope automatically. `inBook` is already songsInBook(shown, active).
const searchBase = computed(() => (activeBook.value ? inBook.value : shownSongs.value))
const results = computed(() => {
  let list = filterSongs(searchBase.value, query.value)
  if (onlyUnverified.value) list = list.filter((s) => !s.verified)
  if (theme.value) list = list.filter((s) => s.theme === theme.value)
  return list
})

// The search box announces its scope: inside the open เล่ม (so a reader is not puzzled when a
// song from another book does not come up), or the whole catalog on the landing.
const searchPlaceholder = computed(() =>
  activeBook.value && activeBookMeta.value
    ? `ค้นในเล่ม ${activeBookMeta.value.name}…`
    : 'ค้นหา: ชื่อเพลง หมายเลข เนื้อร้อง คีย์ หรือโน้ตตัวเลข (เช่น 5 5 6 1)',
)

// 717 — the preview line, and WHICH set of words it was taken from.
//
// The card used to preview the FIRST set always, while search reads EVERY set — so typing a
// line from set 2 returned a card containing none of the words typed, and nothing on it to
// explain why. searchSnippet previews the set that actually carries the query; `set > 0` is
// what earns the "พบใน เนื้อร้องที่ N" label.
//
// Computed once per song per query rather than once per template mention: the template needs
// the text and the set index in three places, and this keeps those call sites plain.
const snips = computed(() => {
  const q = query.value
  const m = new Map()
  for (const s of results.value) m.set(s.id, searchSnippet(s.content, q))
  return m
})
const EMPTY_SNIP = { text: '', set: 0, sets: 0 }
function snip(s) {
  return snips.value.get(s.id) || EMPTY_SNIP
}

// "พบใน เนื้อร้องที่ 2". The caption comes from lyricSetName — the ONE place that names a set —
// so the card can never disagree with the reader tabs, the print heading or the editor.
function foundInLabel(s) {
  const i = snip(s).set
  return 'พบใน ' + lyricSetName(s.content?.lyricSets?.[i], i)
}

function openBook(code) {
  activeBook.value = code
  level.value = 'songs'
  window.scrollTo(0, 0)
}
function backToBooks() {
  level.value = 'books'
  activeBook.value = null
  onlyUnverified.value = false // leaving the queue drops its filter (else a later search stays narrowed)
  window.scrollTo(0, 0)
}

onMounted(async () => {
  const { data, error } = await supabase
    .from('songs')
    .select('id, number, title_th, title_en, content, category, theme, verified, book_refs, scripture, review_flags')
    .is('deleted_at', null) // db/012: trashed songs never show in the catalog
    .order('number', { ascending: true })
  if (error || !data || data.length === 0) {
    dbError.value = !!error
    songs.value = SAMPLE_SONGS
  } else {
    songs.value = data
  }
  loading.value = false
  loadReviewQueue()
  focusSearchOnce() // session อาจพร้อมอยู่แล้วตอนนี้ (เข้าหน้าซ้ำ) — watch ข้างบนคุมกรณีที่ยังไม่พร้อม
})
</script>

<template>
  <div>
    <!-- search: always on top, overrides the drill from any level (US-AC5) -->
    <div class="no-print search-block">
      <input
        ref="searchEl"
        v-model="query"
        type="search"
        class="song-search"
        :class="{ 'auto-ring': autoRing }"
        :aria-label="searchPlaceholder"
        :placeholder="searchPlaceholder"
        @input="dropRing"
        @blur="dropRing"
      />
      <p v-if="dbError" class="muted db-note">
        ยังเชื่อมต่อฐานข้อมูลไม่ได้ — แสดงเพลงตัวอย่างไปก่อน
      </p>
      <!-- ===== แถบ "งานของฉัน" — เห็นเฉพาะเมื่อล็อกอินแล้ว (พี่เปา 30 ก.ค. บรรทัด 227) =====
           หน้าของคนที่ยังไม่ล็อกอินไม่เปลี่ยนแม้แต่ตัวอักษรเดียว: ทั้งบล็อกนี้ v-if="showWorkBar".
           ซ่อนตอนกำลังค้นหา เพราะตอนนั้นสายตาอยู่ที่ผลการค้นหา ไม่ใช่ยอดงานค้าง.

           แยกเป็น 2 ชั้นตามที่ G ท้วงไว้รอบก่อน (ใบส่งงาน 2026-07-30-home-loggedin-mockup.md):
             ชั้นบน = ตัวเลข (ข้อมูล อ่านอย่างเดียว ⛔ ไม่ใช่ปุ่ม)
             ชั้นล่าง = ปุ่ม (การกระทำ)
           เหตุ: เลขที่กดได้กับเลขที่กดไม่ได้หน้าตาเหมือนกัน = คนกดแล้วไม่เกิดอะไร (Web Bloopers) -->
      <div v-if="showWorkBar && !searching" class="work-bar">
        <!-- กองที่ 1 · รอตรวจ — งานที่คนอื่นส่งมาให้อนุมัติ (song_drafts status='pending')
             ⭐ ใช้ชิป .review-chip ของ v1 เดิม "ตัวเดียวกัน" ⛔ ไม่สร้างหน้าตาใหม่ — v1 วางชิปนี้
             ลอยใต้ช่องค้นหาอยู่แล้ว และชิปนี้เองคือทางเข้าหลังบ้าน 1 คลิก (กดแล้วไปแผงงานร่าง)
             ⇒ เลข "รอตรวจ" กับปุ่มเข้าหลังบ้าน เป็นของชิ้นเดียวกันแบบที่ v1 เป็นอยู่.
             เดิมชิปหายไปทั้งใบเมื่อคิวเป็น 0 ⇒ แยกไม่ออกว่า "ไม่มีงานค้าง" หรือ "โหลดไม่ขึ้น"
             และพี่เปาก็จะไม่มีทางเข้าหลังบ้านเลยในวันที่ไม่มีงานค้าง · ตอนนี้อยู่เสมอเมื่อล็อกอิน
             พร้อมเลข 0 (มาตรฐาน ก-01 · ก-08) · คนที่ล็อกอินแต่ไม่ใช่ผู้อนุมัติไม่มีคิวเป็นของตัวเอง
             (RLS db/002 ไม่ส่งแถวให้) ชิปจึงอ่านว่า "จัดการงาน" แทน แต่เป็นชิปใบเดียวกันและไปที่เดียวกัน -->
        <button type="button" class="review-chip" @click="openManage">
          <span aria-hidden="true">{{ canApprove ? '📨' : '⚙' }}</span>
          <span class="rc-label">{{ canApprove ? W.awaitingReview : 'จัดการงาน' }}</span>
          <span v-if="canApprove" class="rc-count">{{ reviewCount }}</span>
          <span class="sr-only">
            {{ canApprove ? `${W.awaitingReview} ${reviewCount} รายการ (งานที่คนอื่นส่งมาให้อนุมัติ) — ` : '' }}เปิดรายการงานร่างที่รอตรวจ
          </span>
        </button>
        <!-- กองที่ 2 · ยังทำไม่เสร็จ — เพลงของเราเองที่ยังไม่เสร็จ (songs verified=false)
             หน่วยเป็น "เพลง" ⛔ ไม่ใช่ "รายการ" เหมือนกองบน — พี่เปายืนยันเองว่าคนละกองกัน
             ⭐ กดได้แล้ว (พี่เปาขอเพิ่ม) → คัดเฉพาะเพลงที่ยังทำไม่เสร็จ ทุกเล่ม
             ใช้ชิป `.facet-chip` ของ v1 เอง ซึ่งเป็นชิปที่ v1 ใช้กับสวิตช์คัดกรองตัวนี้อยู่แล้ว
             ⛔ ไม่สร้างหน้าตาใหม่ · กดอยู่ = คลาส `on` ของ v1 ทำให้เป็นสีแบรนด์เหมือนเดิม -->
        <button
          type="button"
          class="facet-chip wb-stat"
          :class="{ on: onlyUnverified && !searching }"
          :aria-pressed="onlyUnverified && !searching"
          @click="onlyUnverified && !searching ? clearUnfinished() : showUnfinished(null)"
        >
          <span aria-hidden="true">✏️</span>
          <span class="wb-lbl">{{ W.unfinished }}</span>
          <span class="wb-count">{{ unfinishedTotal }}</span>
          <span class="sr-only">เพลง — กดเพื่อดูเฉพาะเพลงที่ยังทำไม่เสร็จ ทุกเล่ม</span>
        </button>
      </div>
    </div>

    <p v-if="loading" class="muted">กำลังโหลด…</p>

    <!-- ===== SEARCH · flat results across every book (overrides levels) =====
         เปิดได้ 2 ทางแล้ว: พิมพ์ค้นหา (เหมือนเดิม) หรือกดเลข "ยังทำไม่เสร็จ" (พี่เปาขอเพิ่ม) -->
    <section v-else-if="showList">
      <div class="level-head">
        <!-- หัวข้อบอกตรง ๆ ว่ากำลังดูอะไรอยู่: ค้นหา / เฉพาะที่ยังทำไม่เสร็จ (+ ชื่อเล่มถ้าจำกัดเล่ม)
             ⛔ ห้ามค้างคำว่า "ผลการค้นหา" ตอนที่ไม่มีใครค้นอะไร — คนจะไม่รู้ว่าทำไมได้รายการนี้มา -->
        <h2 v-if="searching">ผลการค้นหา</h2>
        <h2 v-else>{{ W.unfinished }}{{ activeBookMeta ? ' · ' + activeBookMeta.name : ' · ทุกเล่ม' }}</h2>
        <span class="count muted" aria-live="polite">{{ results.length }} เพลง</span>
        <!-- ทางออก: กลับไปหน้าแรก/เข้าเล่ม โดยไม่ต้องไปงมปิดสวิตช์เอง (ปิดสวิตช์ก็ยังทำได้อยู่) -->
        <button v-if="!searching" type="button" class="crumb" @click="clearUnfinished">
          ← {{ activeBookMeta ? 'ดูทั้งเล่ม' : 'เล่มทั้งหมด' }}
        </button>
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
          ⚠️ เฉพาะที่{{ W.unfinished }}
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
              <span v-if="showVerifiedBadge(s, loggedIn)" class="badge ok" :title="W.done">✓ {{ W.done }}</span>
              <span v-else-if="showUnverifiedBadge(s, loggedIn)" class="badge pending" :title="W.unfinished">{{ W.unfinished }}</span>
              <span class="key-chip">Key {{ s.content.key }}</span>
            </span>
          </div>
          <div v-if="s.title_en" class="muted">{{ s.title_en }}</div>
          <!-- 717 — the plain "this song has N sets" line, and the sharper "your words are in
               set N" label. Only one of them ever shows: the label already implies the song has
               more than one set, so printing the count beside it is noise. -->
          <div v-if="lyricSetCount(s) && !snip(s).set" class="lset-tag muted">
            ♪ ทำนองเดียวกัน · {{ lyricSetCount(s) }} ชุดเนื้อร้อง
          </div>
          <div v-if="snip(s).set" class="found-in">{{ foundInLabel(s) }}</div>
          <div v-if="snip(s).text" class="muted">{{ snip(s).text }}…</div>
          <div v-if="s.theme" class="theme-tag muted">{{ s.theme }}</div>
          <div v-if="bookRefLabels(s.book_refs).length" class="src-tag muted">
            แหล่งเพลง: {{ bookRefLabels(s.book_refs).join(' · ') }}
          </div>
          <div v-if="s.scripture" class="scripture-tag muted">📖 {{ s.scripture }}</div>
        </router-link>
      </div>
      <p v-if="results.length === 0" class="muted empty" aria-live="polite">ไม่พบเพลงที่ค้นหา</p>
    </section>

    <!-- The old in-catalog "ยังไม่ตรวจ" queue section lived here. It listed published songs
         whose `verified` flag was falsy — the wrong pile for an approver's inbox, and it is now
         unreachable: the chip goes to the editor's งานร่าง / รอตรวจ panel, which lists the
         actual pending drafts and can open them. The `verified` flag itself still shows as a
         per-row badge and as the "เฉพาะที่ยังไม่ตรวจ" search facet, which is where a
         library-completeness filter belongs. -->

    <!-- ===== LEVEL 2 · songs in the selected book, ordered by in-book number ===== -->
    <section v-else-if="level === 'songs'">
      <button type="button" class="crumb" @click="backToBooks">← เล่มทั้งหมด</button>
      <div class="level-head">
        <h2>{{ activeBookMeta ? activeBookMeta.name : '' }}</h2>
        <span class="count muted">{{ inBook.length }} เพลง</span>
        <span v-if="loggedIn" class="count progress" aria-live="polite">
          ✓ {{ W.done }} {{ bookProgress.verified }} / {{ bookProgress.total }}
        </span>
      </div>
      <div class="song-list">
        <!-- ② ปุ่ม ✏️ ต้องอยู่ "ข้างนอก" ลิงก์ ไม่ใช่ข้างใน — ปุ่มซ้อนในลิงก์เป็นโครงที่ผิดกติกา
             (ตัวช่วยอ่านจอจะประกาศซ้อนกัน และการกดจะไปโดนลิงก์ด้วย) · G ท้วงข้อนี้ไว้รอบก่อน
             จึงห่อทั้งคู่ด้วย .song-row-wrap แล้ววางลิงก์กับปุ่มเป็นพี่น้องกัน -->
        <div v-for="s in inBook" :key="s.id" class="song-row-wrap">
          <router-link :to="`/song/${s.id}`" class="song-row">
            <span class="no">{{ s.number != null ? s.number : '–' }}</span>
            <span class="ttl">{{ s.title_th }}</span>
            <span v-if="showVerifiedBadge(s, loggedIn)" class="badge ok row-status" :title="W.done">✓ {{ W.done }}</span>
            <span v-else-if="showUnverifiedBadge(s, loggedIn)" class="badge pending row-status" :title="W.unfinished">{{ W.unfinished }}</span>
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
          <!-- เห็นเฉพาะเมื่อล็อกอิน · เปิดเพลงนี้ในหน้าแก้ไขทันที (ไม่ต้องแวะหน้าฝึกร้อง)
               ป้ายชื่อบอกชื่อเพลงด้วย เพราะในรายการมีปุ่มนี้เป็นสิบ ๆ ปุ่มที่หน้าตาเหมือนกัน
               ⛔ ไม่ซ่อนด้วย @media (hover) — เครื่องพี่เอมเป็นจอสัมผัสที่ต่อเมาส์ ปุ่มจะหายไป -->
          <button
            v-if="loggedIn"
            type="button"
            class="row-edit"
            :aria-label="`แก้ไข ${s.title_th}`"
            :title="`แก้ไข ${s.title_th}`"
            @click="openEdit(s.id)"
          ><span aria-hidden="true">✏️</span></button>
        </div>
      </div>
      <p v-if="inBook.length === 0" class="muted empty">ยังไม่มีเพลงในเล่มนี้</p>
    </section>

    <!-- ===== LEVEL 1 · bookshelf (landing) — one vertical list, same as the songs ===== -->
    <section v-else>
      <!-- แถวเล่ม = การ์ด 1 ใบที่มีปุ่ม 2 ปุ่มอยู่ข้างใน "เป็นพี่น้องกัน"
           ⛔ ไม่ใช่ปุ่มซ้อนปุ่ม (ผิดกติกา + แป้นพิมพ์กดปุ่มข้างในไม่ได้เลย)
           หน้าตาไม่เปลี่ยน: ย้าย กรอบ/สันสีน้ำตาล/ความโค้ง/พื้น ไปไว้ที่ตัวการ์ด `.book-row-wrap`
           แล้วให้ปุ่มทั้งสองใสไม่มีพื้นของตัวเอง ⇒ ตายังเห็นแถวเดียวแบบ v1 เดิมทุกประการ -->
      <div class="book-list">
        <div
          v-for="b in shelf"
          :key="b.code"
          class="book-row-wrap"
          :class="{ fallback: b.fallback }"
        >
          <button type="button" class="book-row" @click="openBook(b.code)">
            <span class="bk-name">{{ b.name }}</span>
            <span class="bk-count">{{ b.count }} เพลง</span>
            <span class="chev" aria-hidden="true">›</span>
          </button>
          <!-- ③ "ในแต่ละเล่มอ่ะ มีที่ยังไม่เสร็จอ่ะ ... เท่าไหร่" (พี่เปา บรรทัด 227).
               โชว์เสมอเมื่อล็อกอิน รวมทั้งเลข 0 — เล่มที่เสร็จครบต้องอ่านออกว่า "เสร็จครบแล้ว"
               ⛔ ไม่ใช่ปล่อยว่างจนแยกไม่ออกจาก "ยังไม่ได้นับ" (มาตรฐาน ก-01 · ก-08).
               คลาส .done เปลี่ยนแค่สี ⛔ ข้อมูลยังอยู่ในตัวหนังสือ ไม่ได้อยู่ในสีอย่างเดียว
               (WCAG 2.2 · 1.4.1 Use of Color)
               ⭐ กดได้แล้ว (พี่เปาขอเพิ่ม) → คัดเฉพาะเพลงที่ยังทำไม่เสร็จ *ของเล่มนี้*
               เล่มที่เสร็จครบ (0) ปิดปุ่มไว้ เพราะกดแล้วจะได้รายการว่าง = ทางตัน -->
          <button
            v-if="loggedIn"
            type="button"
            class="bk-todo"
            :class="{ done: b.unfinished === 0 }"
            :disabled="b.unfinished === 0"
            :aria-label="`ดูเฉพาะเพลงที่${W.unfinished}ในเล่ม ${b.name} · ${b.unfinished} เพลง`"
            @click="showUnfinished(b.code)"
          >{{ W.unfinished }} {{ b.unfinished }}</button>
        </div>
      </div>
      <p v-if="shelf.length === 0" class="muted empty">{{ booksEmptyMsg }}</p>
    </section>
  </div>
</template>

<style scoped>
/* All spacing/type/radius use the S0 design tokens (--sp-* / --fs-* / --lh-* /
   --touch-min from styles.css). No hard-coded px for rhythm; focusable form
   controls stay >= --fs-base so iOS Safari never zoom-on-focus, and every
   interactive target is >= --touch-min (44px) tall (WCAG 2.5.5 / 2.5.8). */

.search-block { margin-bottom: var(--sp-5); }
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
/* กรอบตอนที่ "เราย้ายโฟกัสมาให้เอง" — ชุดเดียวกับกรอบโฟกัสของทั้งเว็บเป๊ะ ๆ
   (src/styles.css:117 · outline 2px solid var(--brand) · offset 2px) ⛔ ไม่สร้างหน้าตาใหม่ */
.song-search.auto-ring { outline: 2px solid var(--brand); outline-offset: 2px; }

/* ---- แถบงานของทีม (ล็อกอินแล้วเท่านั้น) — ชิปของ v1 เดิม + ตัวเลขอีกกองหนึ่ง ----
   ⛔ ไม่มีกล่อง ไม่มีกรอบ ไม่มีพื้นหลัง: v1 วางชิปนี้ "ลอย" ใต้ช่องค้นหาอยู่แล้ว
   ตัวแถบจึงเป็นแค่แถวจัดเรียง ⛔ ไม่ใช่การ์ดใบใหม่. */
.work-bar {
  display: flex;
  flex-wrap: wrap;   /* จอแคบ: ตัวเลขตกลงบรรทัดใหม่เอง ⛔ ไม่ล้นขอบจอ */
  align-items: center;
  gap: var(--sp-2) var(--sp-4);
}

/* ---- ชิปของผู้อนุมัติ (พี่เปา) — ของ v1 เดิม คงไว้ทุกค่า: สีแบรนด์ที่หน้านี้ใช้กับชิปตัวกรอง
   ที่กำลังเปิดอยู่ ⛔ ไม่ใช่สีใหม่ · สูง ≥44px · ยืนได้ด้วยตัวเองไม่พึ่งรายการเล่มข้างล่าง ---- */
.review-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
  min-height: var(--touch-min);
  padding: var(--sp-2) var(--sp-4);
  border-radius: 22px;
  border: 1px solid var(--brand);
  background: var(--brand);
  color: #fff;
  font: inherit;
  font-size: var(--fs-base);
  font-weight: 600;
  cursor: pointer;
}
.review-chip:hover { filter: brightness(1.08); }
.review-chip .rc-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6em;
  padding: 0 var(--sp-1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.24);
  font-variant-numeric: tabular-nums;
}
/* คำอยู่ครบทุกความกว้าง — ชิปนี้ครองแถวของตัวเอง คำเต็มจึงพอแม้ที่ 320px และไม่มีอะไรถูกตัด
   ⛔ ไม่ยุบเหลือไอคอน+เลขเปล่า ซึ่งจะทำให้พี่เปาเสียความหมายไปฟรี ๆ · ไม่หักคำกลางคำ */
.review-chip .rc-label { white-space: nowrap; }

/* ตัวเลขกองที่ 2 — เป็นปุ่มแล้ว (กดเพื่อคัดเฉพาะเพลงที่ยังทำไม่เสร็จ ทุกเล่ม)
   ตัวชิปเองใช้ `.facet-chip` ของ v1 ทั้งดุ้น (สวิตช์คัดกรองตัวนี้ v1 ใช้ชิปนี้อยู่แล้ว)
   ที่นี่จึงเติมเฉพาะการจัดวางภายใน ⛔ ไม่ทับค่าหน้าตาของ `.facet-chip` */
.wb-stat {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  margin-top: var(--sp-3);   /* ตรงกับ margin-top ของชิปรอตรวจ เพื่อให้อยู่แนวเดียวกัน */
  white-space: nowrap;
}
.wb-stat .wb-lbl { color: var(--muted); }
.wb-stat .wb-count {
  font-weight: 700;
  color: var(--brand);
  font-variant-numeric: tabular-nums;   /* เลขไม่ขยับเวลาค่าเปลี่ยน */
}
/* ตอนกดค้างอยู่ ชิปเป็นสีแบรนด์ (คลาส `on` ของ v1) ⇒ ตัวหนังสือข้างในต้องกลับเป็นสีขาวด้วย
   ไม่งั้นน้ำตาลบนน้ำตาลจะอ่านไม่ออก */
.wb-stat.on .wb-lbl,
.wb-stat.on .wb-count { color: #fff; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
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
/* ---- LEVEL 1 · one row per book — the SAME vertical list as the songs (song-row),
   single column at every width (desktop + mobile). The 5px brown left spine stays: it
   marks the book category (P'Aim: keep). ---- */
/* full-width rows, aligned to the search box above (P'Aim: กล่องยาวเท่าช่อง search) */
.book-list { display: flex; flex-direction: column; gap: var(--sp-2); width: 100%; }
/* การ์ดของแถวเล่ม — ค่าทั้งหมด (กรอบ · สันสีน้ำตาล 5px · ความโค้ง · พื้น · ระยะขอบใน · ความสูงต่ำสุด)
   ยกมาจาก `.book-row` ของ v1 เดิมทุกค่า เพียงย้ายที่อยู่จากตัวปุ่มมาไว้ที่ตัวการ์ด
   เพื่อให้ข้างในมีปุ่มได้ 2 ปุ่มโดยไม่ต้องซ้อนปุ่มในปุ่ม ⇒ หน้าตาเหมือนเดิม โครงถูกกติกา */
.book-row-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;   /* 360px: "ยังทำไม่เสร็จ N" ตกลงบรรทัดใหม่ ⛔ ไม่ดันแถวจนล้นขอบจอ */
  gap: var(--sp-2) var(--sp-3);
  background: var(--bg);
  border: 1px solid var(--line);
  border-left: 5px solid var(--brand);
  border-radius: 10px;
  padding: var(--sp-3) var(--sp-4);
  min-height: var(--touch-min);
  width: 100%;
}
.book-row-wrap:hover { background: var(--cream-hover); }
/* ปุ่มเปิดเล่ม = ใส ไม่มีพื้นไม่มีกรอบของตัวเอง (การ์ดข้างบนเป็นคนวาดให้) */
.book-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex: 1 1 auto;
  min-width: 0;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  color: var(--ink);
  font: inherit;
  min-height: var(--touch-min);
}
.book-row .bk-name { flex: 1 1 auto; min-width: 0; font-weight: 700; color: var(--brand); }
.book-row .bk-count { flex: 0 0 auto; color: var(--muted); font-size: var(--fs-sm); }
/* "ยังทำไม่เสร็จ N" ต่อเล่ม (ล็อกอินแล้วเท่านั้น) — สีชุดเดียวกับป้าย .badge.pending
   ที่ใช้บอกสถานะเดียวกันในแถวเพลง จึงเป็นคำเดียว "และ" สีเดียวกันทั้งเว็บ (มาตรฐาน ก-04).
   เป็นปุ่มจริง (กดแล้วคัดเฉพาะเพลงที่ยังทำไม่เสร็จของเล่มนี้) จึงมีมือชี้ + สีตอบตอนชี้
   เพื่อไม่ให้เป็นปุ่มที่ซ่อนตัวว่ากดได้ · สูงอย่างน้อย 24px ตามขั้นบังคับ WCAG 2.2 · 2.5.8 (AA) */
.bk-todo {
  flex: 0 0 auto;
  border-radius: 12px;
  padding: 1px var(--sp-2);
  min-height: 24px;
  font: inherit;
  font-size: var(--fs-xs);
  white-space: nowrap;
  cursor: pointer;
  background: #eef0f2;
  color: #4a4f57;
  border: 1px solid #cfd4da;
}
.bk-todo:hover:not(:disabled) { border-color: var(--brand); }
/* เล่มที่เสร็จครบ = เขียวแบบเดียวกับป้าย ✓ ตรวจแล้ว · ปิดปุ่มเพราะกดแล้วได้รายการว่าง = ทางตัน
   ข้อมูลอยู่ที่ตัวเลข "0" ไม่ได้อยู่ที่สี ⇒ คนตาบอดสีก็ยังอ่านออก (WCAG 2.2 · 1.4.1) */
.bk-todo.done { background: #e7f4e9; color: #2e6b3b; border-color: #b7ddbf; }
.bk-todo:disabled { cursor: default; }
.book-row .chev { flex: 0 0 auto; color: var(--muted); font-size: var(--fs-lg); }
.book-row-wrap.fallback { border-left-color: var(--line); }
.book-row-wrap.fallback .bk-name { color: var(--muted); }

/* ---- LEVEL 2 · one row per song: number (tabular, right) + title (wraps) + key ---- */
/* Width = fit-content, capped at 100%. The list is exactly as wide as its longest row
   needs and every row stretches to that one width — "ยาวพออันยาวสุด · เท่ากันทุกอัน".
   (Dropped the old `contain: inline-size`, which pinned this to a thin ~306px column
   stranded in a wide screen. It existed to stop a long nowrap title pushing <main> past
   the viewport; titles now wrap — .ttl white-space:normal + overflow-wrap:anywhere — so a
   long title grows taller, never wider, and max-width:100% keeps it inside a phone: no
   horizontal scroll at any width.) */
/* fills the stable content column (same as .book-list) so every row aligns to the search
   box above and the width never reflows with title length — the Google/Material pattern of a
   fixed-width centred column (P'Aim). Was fit-content, which shrank the list to its longest
   title and left it out of line with the search box. */
.song-list { display: flex; flex-direction: column; gap: var(--sp-2); width: 100%; }
/* ห่อ "ลิงก์แถว + ปุ่มแก้ไข" ให้เป็นพี่น้องกัน ⛔ ไม่ใช่ปุ่มซ้อนในลิงก์ (โครงที่ผิดกติกา).
   ตัวห่อไม่มีหน้าตาของตัวเอง — กรอบและพื้นยังเป็นของ .song-row เหมือนเดิมทุกประการ */
.song-row-wrap { display: flex; align-items: center; gap: var(--sp-2); width: 100%; min-width: 0; }
.song-row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  flex: 1 1 auto;
  min-width: 0;
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
/* ✏️ เปิดเพลงนี้ในหน้าแก้ไขทันที (ล็อกอินแล้วเท่านั้น).
   กว้าง 44px สูงเท่าแถว — เกินขั้นบังคับ WCAG 2.2 · 2.5.8 (AA = 24px · 44px คือขั้น AAA).
   ⛔ ไม่ซ่อนด้วย @media (hover: hover) — เครื่องพี่เอมเป็นจอสัมผัสที่ต่อเมาส์แล้วรายงานว่า
   hover:none ⇒ ปุ่มจะหายไปทั้งที่มีเมาส์อยู่ (บทเรียนเดิมของโปรเจกต์นี้) */
.row-edit {
  flex: 0 0 auto;
  width: var(--touch-min);
  /* ความสูงคงที่ ⛔ ไม่ยืดตามความสูงแถว — แถวที่ชื่อยาวจะสูงถึง 400px ที่จอ 360px และปุ่มดินสอ
     ที่สูง 400px อ่านไม่ออกว่าเป็นปุ่ม (G ท้วงข้อเดียวกันนี้ไว้รอบก่อน) · วัดจริงแล้วที่ 360px:
     ยืดได้ = สูง 84-400px · ล็อกไว้ = 44px ทุกแถว */
  height: var(--touch-min);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink);
  font: inherit;
  font-size: var(--fs-base);
  cursor: pointer;
}
.row-edit:hover { background: var(--cream-hover); border-color: var(--brand); }
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
/* ป้ายสถานะในแถวเพลง (ทีมเท่านั้น · v-if loggedIn) — ซ่อนบนจอแคบ แสดงตั้งแต่ 640px ขึ้นไป
   ตามแบบเดียวกับป้ายอ้างอิง .ref ข้างบน ("แสดงเฉพาะที่แถวกว้างพอ").
   ⭐ ทำไมต้องซ่อน — วัดจริงที่จอ 360px เล่มใหญ่ 152 เพลง (ความสูงรวมของรายการ):
      ของเดิมวันนี้ (มีป้าย ไม่มีปุ่ม ✏️)      = 17,744px
      ใส่ปุ่ม ✏️ เข้าไปโดยยังคงป้ายไว้           = 33,381px  (ยาวขึ้นเกือบเท่าตัว ⛔)
      ใส่ปุ่ม ✏️ แล้วซ่อนป้ายบนจอแคบ (แบบนี้)  = 14,922px  (สั้นกว่าของเดิม)
   เหตุ: ปุ่มกินความกว้างแถวไป 52px จาก 336 เหลือ 284 ⇒ ชื่อเพลงตัดบรรทัดถี่ขึ้นมาก.
   ข้อมูลที่หายไปบนจอแคบยังหาได้: เลข "ยังทำไม่เสร็จ N" ต่อเล่มที่หน้าแรก ซึ่งเป็นสิ่งที่
   พี่เปาขอไว้ตรง ๆ (บรรทัด 227) และป้ายกลับมาเองตั้งแต่ 640px ขึ้นไป. */
.song-row .row-status { display: none; }
@media (min-width: 640px) {
  .song-row .row-status { display: inline; flex: 0 0 auto; }
}

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
/* 717 — the other lyric set's name; wraps rather than widening the card on a phone */
.lset-tag { margin-top: var(--sp-1); font-size: var(--fs-xs); overflow-wrap: anywhere; }
/* 717 — "พบใน เนื้อร้องที่ N": which set of words carried the phrase that was typed. Shown only
   when that is NOT the set previewed by default, so an ordinary card never grows a chip that
   says nothing. inline-block = the chip is only as wide as its text, on its own line above the
   preview it explains.
   Colour: --ink on --cream, with --brand carrying the emphasis as the OUTLINE. Brand text on
   cream was measured live at 6.59:1 here but only 4.18:1 in the /v2 theme (--brand #b45309 on
   --cream #f4e9d7) — under the 4.5:1 WCAG 2.2 AA floor for text this size. ink/cream measures
   13.3:1 and 11.0:1, and the two tokens move together in any future dark theme, so the chip
   stays AA wherever the palette goes; the brand border is decorative and still clears the 3:1
   non-text floor. Nothing is colour-only either way: the fact is in the words. */
.found-in {
  display: inline-block;
  margin-top: var(--sp-1);
  font-size: var(--fs-xs);
  color: var(--ink);
  background: var(--cream);
  border: 1px solid var(--brand);
  border-radius: 12px;
  padding: 1px var(--sp-2);
  overflow-wrap: anywhere;
}

.empty { padding: var(--sp-4) 0; }
</style>
