<script setup>
// Studio = the single song SURFACE (US-01 / US-04). It is a THIN shell: it owns the
// current song + which of the three modes is shown, and mounts one component per mode.
// All editing lives in EditorMode; reading lives in SongViewer / SongSheet. A/B/C/D can
// evolve their own mode file without touching this shell (that is the whole point of
// DS-04's contract: every mode takes { song, tier } and emits change / save).
import { ref, computed, watch, watchEffect, onMounted, onUnmounted, nextTick } from 'vue'
import { pageBreaks } from '../lib/printPages.js'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase.js'
import { migrateToV2, resolveContent, lyricSetName, inLyricSet } from '../lib/songModel.js'
import { songHaystack } from '../lib/songSearch.js'
import { visibleSongs } from '../lib/bookshelf.js'
import { sortSongs } from '../lib/songSort.js'
import { CATALOG_COLUMNS, readCatalog, readSong, saveCatalog, isNetworkFailure } from '../lib/offlineSongs.js'
import { songBasename } from '../lib/songName.js'
import { loadBookPhrases, bookPhraseMap, bookPhraseNotice } from '../lib/bookPhrases.js'
import { stopPlayback } from '../lib/midi.js'
import { KEYS } from '../lib/chords.js'
import { tier, initAuth, shellMenu, currentSong, sheetLyricJoin, newSongRequest } from '../store.js'
import { songBookRefs } from '../lib/bookCodes.js'
import Icon from '../components/Icon.vue'
import ComboSelect from '../components/ComboSelect.vue'
import SongViewer from '../components/SongViewer.vue'
import SongSheet from '../components/SongSheet.vue'
import EditorMode from '../components/EditorMode.vue'

const route = useRoute()
const router = useRouter()

// three views on one surface: ดู (ร้องตาม) · แผ่น (พิมพ์) · แก้ (แก้ไข)
const mode = ref('view')
// 717 — the lyric set the reader is on in ดู, carried across to แก้ไข so switching mode keeps
// the set you were looking at. 0 for every ordinary song (they never emit).
const viewSet = ref(0)
// bumped to force a fresh (blank) EditorMode when "สร้างเพลงใหม่" is used from the
// "เพลง ▾" panel — remounting is the clean way to reset the editor from the shell
// without reaching into its internal state (S2 create-new).
const editorNonce = ref(0)

// central song state — lifted to the shell so switching modes never loses work (US-01).
//   loadedSong : the raw DB row · changes only on load · hands the editor a song to (re)load
//   liveSong   : the current song incl. unsaved edits (editor emits `change`) · feeds ดู/แผ่น
const loadedSong = ref(null)
const liveSong = ref(null)

async function loadSong(id) {
  // Offline (lib/offlineSongs.js): the copy saved on this device stands in ONLY when the database
  // could not be reached at all — never when it answered "no such song", so a song deleted or
  // hidden since the copy was saved does not come back from it.
  const saved = await readSong(id)
  let data = null
  if (saved && navigator.onLine === false) {
    data = saved
  } else {
    let q = supabase.from('songs').select('*').eq('id', id)
    if (saved) q = q.retry(false) // a copy is on hand → no ~7 s of retries before using it
    const res = await q.single()
    data = res.data
    if (!data && saved && isNetworkFailure(res)) data = saved
  }
  // db/012: a trashed song is "gone" — do not render it as a live song. Anon never even
  // receives the row (RLS); this also covers a team member following a stale link. The
  // song is recoverable from จัดการ ▸ ถังขยะ, not from its public URL.
  if (!data || data.deleted_at) {
    loadedSong.value = null
    liveSong.value = null
    return
  }
  loadedSong.value = data
  liveSong.value = liveFromRow(data)
}
// the song as ดู/แผ่น read it, straight from a DB row (no unsaved edits)
function liveFromRow(data) {
  const { content } = migrateToV2(data.content)
  return {
    id: data.id,
    number: data.number,
    title_th: data.title_th,
    title_en: data.title_en,
    category: data.category, // ใบ#105 — which printed book the ตามต้นฉบับ phrasing comes from
    content,
  }
}

// ---------- ใบ v3/pleng#145 — in and out of แก้ไข: ✎ on the ฝึกร้อง bar · ← กลับไปฝึกร้อง ----------
// In: the ✎ on the ฝึกร้อง bar opens the SAME song in แก้ไข. Out: the "← กลับไปฝึกร้อง" row at the top
// left of แก้ไข (พี่เอม picked ข้อเสนอ ก, 2 พ.ย. 2569 — the same corner as ใบ#146's "← ก่อนพิมพ์").
// Leaving with unsaved work never drops it silently: a dialog asks first, "แก้ต่อ" being the safe,
// default answer. "ทิ้งแล้วกลับ" really throws the edits away — the editor is rebuilt from the saved
// song and ฝึกร้อง shows the saved version, not half-finished work. Nothing changed → straight back.
const editorRef = ref(null)
const backBtn = ref(null)
const keepBtn = ref(null)
// what the "ยังไม่ได้บันทึก" question is about: null (closed) · 'back' (← กลับไปฝึกร้อง) · 'new' (สร้างเพลงใหม่)
const leaveAsk = ref(null)
const LEAVE_TEXT = {
  back: { what: 'ถ้ากลับไปฝึกร้องตอนนี้ ที่แก้ไว้จะหาย', go: 'ทิ้งแล้วกลับ' },
  new: { what: 'ถ้าเริ่มเพลงใหม่ตอนนี้ ที่แก้ไว้จะหาย', go: 'ทิ้งแล้วเริ่มใหม่' },
}
function openEditor() {
  mode.value = 'edit'
  nextTick(() => window.scrollTo({ top: 0 }))
}
function backToSing() {
  if (editorRef.value?.isDirty) return ask('back')
  mode.value = 'view'
}
function ask(what) {
  leaveAsk.value = what
  nextTick(() => keepBtn.value?.focus())
}
function keepEditing() {
  const was = leaveAsk.value
  leaveAsk.value = null
  if (was === 'back') nextTick(() => backBtn.value?.focus())
}
function discardAndGo() {
  const what = leaveAsk.value
  leaveAsk.value = null
  if (what === 'new') return startNew()
  if (loadedSong.value) liveSong.value = liveFromRow(loadedSong.value)
  editorNonce.value++ // a fresh editor from the saved song — the unsaved edits are gone
  mode.value = 'view'
}

// ใบ v3/pleng#147 — สร้างเพลงใหม่ from the top bar / ☰ while this surface is open. Unsaved work in the editor
// (whichever mode is showing — the editor stays mounted) is never dropped silently: same question as ←.
watch(newSongRequest, () => {
  if (editorRef.value?.isDirty) return ask('new')
  startNew()
})

onMounted(async () => {
  initAuth()
  loadSongList()
  if (route.params.id) {
    await loadSong(route.params.id)
    // A routed song opens in a reading view (US-01 AC1) — UNLESS the link asked for the editor.
    // `?mode=edit` is the ONE way in: it lets the landing page's ✏️ open a song straight in แก้ไข
    // (พี่เปา 30 ก.ค. บรรทัด 307 — "ล็อกอินแล้วมันก็ควรจะขึ้นให้มันเข้าไปได้เลยจากหน้าแรก ...
    // รวมไปถึงกดแก้ไขได้ด้วย"), instead of landing in ฝึกร้อง and making him press แก้ไข again.
    // Nothing else changes: a plain /song/:id link is byte-for-byte the old behaviour, and the
    // editor's own login/permission gates are untouched — this only picks which tab is showing.
    mode.value = route.query.mode === 'edit' ? 'edit' : 'view'
  } else {
    // a bare /studio is a brand-new song → straight to the editor
    loadedSong.value = null
    liveSong.value = null
    mode.value = 'edit'
  }
})
// Switching songs while the shell stays mounted (the "เปิดเพลง" picker, or browser
// back/forward) keeps the CURRENT mode — US-05: a reader in ดู/แผ่น must not be
// bounced out, and picking a song must not jump into แก้. A fresh routed entry from a
// link still opens in ดู via onMounted above (that component mounts anew).
watch(
  () => route.params.id,
  async (id) => {
    if (!id) return
    await loadSong(id)
    // picking another song while already in ฝึกร้อง must land at its top too (same rule as
    // a mode switch above); a route change also fires the router's scrollBehavior, so this is
    // just the belt-and-braces for the async-load timing.
    if (mode.value === 'view') nextTick(() => window.scrollTo({ top: 0 }))
  },
)

// Each mode may play audio (ดู listen-along · แก้ preview). The mode components stay
// mounted (v-show), so their own onUnmounted stop never fires on a switch — the shell
// stops any sound when you leave a mode. midi is a single global player, so one call does it.
// Entering ฝึกร้อง always opens at the very top of the song, never wherever the previous
// mode/song was scrolled to (พี่เปา, 2026-07-27). Mode-switch isn't a route change, so the
// router's scrollBehavior({top:0}) can't cover it — reset here on every switch INTO view.
watch(mode, (m) => { stopPlayback(); if (m === 'view') nextTick(() => window.scrollTo({ top: 0 })) })

// Name the browser tab after the open song, so ANY print path (our button OR Ctrl+P)
// gets the right PDF filename — the print dialog suggests document.title. Restore the
// site's own title when leaving the surface. (US-I2: same "เพลง.พระคำ.ชีวิต - ชื่อ" base.)
const SITE_TITLE = document.title
watch(
  liveSong,
  (s) => {
    document.title = s ? songBasename(s) : SITE_TITLE
    // I1: the open song is the store SSOT for the navbar (title + DownloadTool) — every
    // mode + the editor feed liveSong, so this stays in sync as the song/title changes.
    currentSong.value = s
  },
  { immediate: true },
)
onUnmounted(() => {
  document.title = SITE_TITLE
  currentSong.value = null
})

// the editor pushes every edit up here → previews follow + no work is lost on a switch
function onChange(song) {
  liveSong.value = song
}
// save persistence stays inside the editor (it owns the editing state + Supabase writes);
// this is the contract's observability hook, kept so the shell can react later if needed
function onSave() {}

// each reading surface wants the song in a slightly different shape
// B053 — carry the song's source books (book_refs) + scripture reference through to the
// reading view so ฝึกร้อง shows the same "แหล่งเพลง"/📖 captions as the catalog card. These
// live on the raw DB row (loadedSong), not on liveSong, so read them from there.
const viewerSong = computed(() =>
  liveSong.value
    ? {
        number: liveSong.value.number,
        title_th: liveSong.value.title_th,
        content: liveSong.value.content,
        category: liveSong.value.category ?? loadedSong.value?.category, // ใบ#105 — which printed book this is
        book_refs: loadedSong.value?.book_refs,
        scripture: loadedSong.value?.scripture,
      }
    : null,
)
// 717 — แผ่นเพลง has no set switcher of its own, so it prints the set the reader last chose in
// ดู (viewSet · the first set until they pick one). Printing the raw song instead ran the sets
// together as ข้อ 1..13 — one sheet of words nobody sings in that order.
const sheetSetContent = computed(() => {
  const c = liveSong.value?.content
  if (!c) return null
  const sets = Array.isArray(c.lyricSets) && c.lyricSets.length > 1
  if (!sets || !Array.isArray(c.arrangement)) return c
  return { ...c, arrangement: c.arrangement.filter((e) => inLyricSet(e, viewSet.value)) }
})
const sheetContent = computed(() => {
  const c = sheetSetContent.value
  if (!c) return { key: 'C', timeSignature: '4/4', lines: [] }
  return { ...c, lines: resolveContent(c) } // SongSheet reads v1-shaped `lines`
})
// The name of the set on the paper. Two printouts of the same song number otherwise carry
// different words under an identical heading — same reason ฝึกร้อง stamps it (SongViewer).
// `titleText` is the plain name (number + title) the set name is added to.
const sheetSetName = computed(() => {
  const ls = liveSong.value?.content?.lyricSets
  return Array.isArray(ls) && ls.length > 1 ? lyricSetName(ls[viewSet.value], viewSet.value) : ''
})
const titleText = computed(() => {
  const s = liveSong.value
  if (!s) return 'เพลง'
  return (s.number != null ? s.number + '. ' : '') + (s.title_th || 'เพลง')
})
const sheetPrintTitle = computed(() =>
  sheetSetName.value ? titleText.value + ' — ' + sheetSetName.value : titleText.value,
)

// ---------- ก่อนพิมพ์ — the sheet's settings (ใบ v3/pleng#146; were the แผ่นเพลง dock, DS dockkey-print-edit §1) ----------
// The sheet used to be locked to ครบ · สมุดเพลง · ตัวอักษร · คีย์เดิม. These controls let the
// user tune what the paper prints; defaults keep the old locked behavior.
const DISPLAY_OPTS = [
  { value: 'all', label: 'ครบ (เนื้อ+คอร์ด+โน้ต)', chord: true, note: true, lyric: true },
  { value: 'chord', label: 'เนื้อ+คอร์ด', chord: true, note: false, lyric: true },
  { value: 'note', label: 'เนื้อ+โน้ต', chord: false, note: true, lyric: true },
  { value: 'lyric', label: 'เนื้อล้วน', chord: false, note: false, lyric: true },
  { value: 'noteonly', label: 'โน้ตล้วน', chord: false, note: true, lyric: false },
]
const CHORD_OPTS = [
  { value: 'letter', label: 'คอร์ดตัวอักษร (A B C)' },
  { value: 'roman', label: 'คอร์ดโรมัน (I IV V)' },
  { value: 'hidden', label: 'ซ่อนคอร์ด' },
]
const sheetDisplay = ref('all')
const sheetChord = ref('letter')
const sheetBook = ref('songbook') // 'songbook' = ทำนองครั้งเดียว · 'full' = โน้ตทุกเที่ยว
const sheetKey = ref('C')
watch(() => liveSong.value?.content?.key, (k) => { if (k) sheetKey.value = k }, { immediate: true })

const printDisplayDef = computed(() => DISPLAY_OPTS.find((o) => o.value === sheetDisplay.value) || DISPLAY_OPTS[0])
const printShowChord = computed(() => printDisplayDef.value.chord && sheetChord.value !== 'hidden')
const printShowNote = computed(() => printDisplayDef.value.note)
const printShowLyric = computed(() => printDisplayDef.value.lyric)
const sheetPrintChordSystem = computed(() => (sheetChord.value === 'roman' ? 'roman' : 'letter'))
const sheetPrintMode = computed(() => (printShowLyric.value && !printShowNote.value && !printShowChord.value ? 'lyrics' : 'full'))
const keyOptions = computed(() =>
  KEYS.map((k) => ({ value: k, label: k + (k === liveSong.value?.content?.key ? ' (ต้นฉบับ)' : '') })),
)
// ใบ v3/pleng#101 — the lyrics-only lines of the sheet (เนื้อล้วน, and in สมุดเพลง every verse after the first that
// reuses the melody) can be written "ติดกันเป็นวรรค" like the songbook, the same way and with the same breaks
// as ฝึกร้อง (ใบ#100 · lib/lyricPhrase.js). Lines with notes above stay split — each syllable under its note.
// Remembered on this device for แผ่นเพลง alone (store.sheetLyricJoin — พี่เอม 5 ต.ค. 2569: each page keeps its own),
// so a new song opens the same way and a pick here never changes ฝึกร้อง.
// ใบ v3/pleng#105 — a third way: ตามต้นฉบับ, the breaks the printed songbook itself drew
// (lib/bookPhrases.js). Where the book has nothing for a line, that line keeps the tune's breaks
// and the page says so above the sheet.
const LYRIC_JOIN_OPTS = [
  { value: 'split', label: 'แยกพยางค์' },
  { value: 'join', label: 'ติดกันเป็นวรรคตามทำนอง' },
  { value: 'book', label: 'ตามต้นฉบับ (วรรคในหนังสือ)' },
]
const sheetHasLyricLines = computed(() => printShowLyric.value && (sheetDisplay.value === 'lyric' || sheetBook.value === 'songbook'))
// ใบ#105 — an unsaved edit replaces liveSong with the editor's own object, which carries no
// category, so read the book off the loaded row as well: the sheet keeps its phrasing while editing.
const bookSong = computed(() => (liveSong.value
  ? { number: liveSong.value.number, category: liveSong.value.category ?? loadedSong.value?.category }
  : null))
const sheetBookMap = computed(() => (sheetLyricJoin.value === 'book' ? bookPhraseMap(bookSong.value) : null))
const sheetBookNote = computed(() => (sheetLyricJoin.value === 'book' && sheetHasLyricLines.value
  ? bookPhraseNotice(bookSong.value, sheetBookMap.value, sheetContent.value.lines)
  : ''))
watchEffect(() => { if (sheetLyricJoin.value === 'book' && bookSong.value) loadBookPhrases(bookSong.value) })
// ใบ#128 — อ้างอิงเล่มอื่น on the printed head. ONE read point for every surface (lib/bookCodes
// songBookRefs), so the paper can never disagree with the catalog card or ฝึกร้อง.
// The `book_refs` fallback is load-bearing, not defensive: liveSong is built field by field above
// (and again by the editor on every keystroke), and `book_refs` is not one of those fields — so the
// refs DA imported live only on the loaded row. Drop the fallback and an imported song prints no
// อ้างอิง at all. Refs an author typed travel inside `content`, so those come through liveSong.
const sheetBookRefs = computed(() => (liveSong.value
  ? songBookRefs({ ...liveSong.value, book_refs: liveSong.value.book_refs ?? loadedSong.value?.book_refs })
  : []))

// ใบ v3/pleng#146 — every setting the แผ่นเพลง dock had, now a row in the ก่อนพิมพ์ panel (nothing taken away).
// ดาวน์โหลด (JSON · MP3) stays in ฝึกร้อง's ดาวน์โหลด button (ใบ#146 Notes 2).
const printSettings = computed(() => [
  { id: 'book', name: 'แบบแผ่น', value: sheetBook.value, set: (v) => (sheetBook.value = v), options: [{ value: 'songbook', label: 'สมุดเพลง (ทำนองครั้งเดียว)' }, { value: 'full', label: 'เต็ม (โน้ตทุกเที่ยว)' }] },
  { id: 'key', name: 'คีย์', value: sheetKey.value, set: (v) => (sheetKey.value = v), options: keyOptions.value },
  // ใบ#101 — only while the sheet has lyrics-only lines to write that way
  ...(sheetHasLyricLines.value ? [{ id: 'lyricjoin', name: 'เนื้อร้อง', value: sheetLyricJoin.value, set: (v) => (sheetLyricJoin.value = v), options: LYRIC_JOIN_OPTS }] : []),
  { id: 'display', name: 'แสดงผล', value: sheetDisplay.value, set: (v) => (sheetDisplay.value = v), options: DISPLAY_OPTS.map((o) => ({ value: o.value, label: o.label })) },
  { id: 'chord', name: 'คอร์ด', value: sheetChord.value, set: (v) => (sheetChord.value = v), options: CHORD_OPTS },
])

// ---------- ใบ v3/pleng#146 — the paper at its real size, the picture shrunk to fit · ซูม ----------
// The paper is laid out at real A4 size on every screen (210mm wide, the print font) and only its
// picture is scaled (transform) — so the lines break, the sheet fits them, and the pages count exactly
// as on paper, whatever the window or the zoom (lib/layoutRect.js says why it cannot be laid out small).
// It opens เต็มแผ่น — the whole width of the page in the column, never bigger than real size — and
// − / + step through ZOOMS (พี่เอม 3 พ.ย. 2569: "แสดงเป็น full ก่อน แล้วก็ zoom in zoom out ได้").
const PAPER_PX = (210 / 25.4) * 96
const ZOOMS = [0.25, 0.5, 0.75, 1, 1.5, 2]
const frameEl = ref(null)
const frameW = ref(0)
const paperH = ref(0)
const zoom = ref(null) // null = เต็มแผ่น
const fitZoom = computed(() => (frameW.value > 0 ? Math.min(1, frameW.value / PAPER_PX) : 1))
const scale = computed(() => zoom.value ?? fitZoom.value)
const canZoomIn = computed(() => scale.value < ZOOMS.at(-1) - 1e-3)
const canZoomOut = computed(() => scale.value > ZOOMS[0] + 1e-3)
function zoomIn() {
  const z = ZOOMS.find((v) => v > scale.value + 1e-3)
  if (z) zoom.value = z
}
function zoomOut() {
  const z = [...ZOOMS].reverse().find((v) => v < scale.value - 1e-3)
  if (z) zoom.value = z
}
function measureFrame() {
  frameW.value = frameEl.value?.clientWidth || 0
  paperH.value = paperEl.value?.offsetHeight || 0
}

// ---------- ใบ v3/pleng#146 — where page 2 (3, …) starts, drawn on the preview ----------
// The paper is A4 at its real size (see above), so the printable height is known: 297mm minus the
// @page margins 15 + 16mm. lib/printPages.js walks the sheet's lines the way the printer does (a ท่อน is
// kept whole when it fits on a page, else it breaks between lines) and returns where each new page
// begins; the preview draws a "หน้า 2" line there, so a long song never gets its end cut off unseen.
const paperEl = ref(null)
const breaks = ref([])
function measurePages() {
  const paper = paperEl.value
  const root = paper?.querySelector('.sheet-root')
  if (!root || mode.value !== 'sheet') return
  breaks.value = pageBreaks(paper, root)
}
let pagesRO = null
let pagesTimer = null
function schedulePages() {
  measureFrame()
  clearTimeout(pagesTimer)
  pagesTimer = setTimeout(measurePages, 60) // after the sheet's own fit-lines pass has settled
}
onMounted(() => {
  if (typeof ResizeObserver === 'function') {
    pagesRO = new ResizeObserver(schedulePages)
    watch([paperEl, frameEl], ([el, fr]) => {
      pagesRO.disconnect()
      if (el) pagesRO.observe(el)
      if (fr) pagesRO.observe(fr)
    }, { immediate: true })
  }
  document.fonts?.ready?.then(schedulePages)
})
onUnmounted(() => { pagesRO?.disconnect(); clearTimeout(pagesTimer) })
watch([mode, sheetContent, sheetBook, sheetKey, sheetDisplay, sheetChord, sheetLyricJoin], () => nextTick(schedulePages))
const pageCount = computed(() => breaks.value.length + 1)
// ← back from ก่อนพิมพ์ = the same song in ฝึกร้อง (ใบ#146 ข้อ 5)
function openPreview() {
  mode.value = 'sheet'
  zoom.value = null // always opens เต็มแผ่น
  nextTick(() => { measureFrame(); window.scrollTo({ top: 0 }) })
}

// B002 (P'Aim-approved names): ฝึกร้อง · แผ่นเพลง · แก้ไข (ids stay view/sheet/edit)
// S1 icons (Lucide): ฝึกร้อง=mic · แผ่นเพลง=music · แก้ไข=pencil
const MODES = [
  { id: 'view', label: 'ฝึกร้อง', icon: 'mic', title: 'ฝึกร้อง (ร้องตาม)' },
  { id: 'sheet', label: 'แผ่นเพลง', icon: 'music', title: 'แผ่นเพลง (ไว้พิมพ์)' },
  { id: 'edit', label: 'แก้ไข', icon: 'pencil', title: 'แก้ไข' },
]

// ---------- shell song picker (US-05) ----------
// "เปิด/เลือกเพลง" lives on the shell (not inside the editor) so it works in EVERY mode:
// a reader in ดู/แผ่น can jump to another song without first entering แก้. Picking a song
// navigates to /song/:id — the route watcher above loads it while KEEPING the current mode.
const songList = ref([])
async function loadSongList() {
  const cached = await readCatalog()
  let data = null
  if (!(cached && navigator.onLine === false)) {
    let q = supabase
      .from('songs')
      .select(CATALOG_COLUMNS) // the same columns as the home page, so this fetch fills the offline copy too
      .is('deleted_at', null) // db/012: trashed songs never appear in the picker
      .order('number', { ascending: true })
    if (cached) q = q.retry(false)
    ;({ data } = await q)
    if (data && data.length) saveCatalog(data)
  }
  if (!data && cached) data = cached.rows // offline: pick from the songs saved on this device
  // B131: the DB `.order` leaves the blank-number rows unordered, so the picker could list the
  // same songs differently on two loads. sortSongs (songSort.js) is the app's one ordering rule.
  songList.value = sortSongs(data ?? [])
}
// searchable options (ชื่อ · เลข · เนื้อร้อง · โน้ต — same haystack as the catalog page).
// GATE (reuse bookshelf.visibleSongs — same source SongList + EditorMode use): anon sees only
// verified songs, team sees all. computed on tier so it re-filters on login/logout without
// reloading the list. Without this the shell's "เปิดเพลงที่มีอยู่" picker leaks unverified
// songs to the public — a separate code path from EditorMode's own picker (round-24 leak #2).
const pickerOptions = computed(() =>
  visibleSongs(songList.value, tier.value !== 'anon').map((s) => ({
    value: s.id,
    label: (s.number != null ? s.number + '. ' : '') + s.title_th,
    search: songHaystack(s),
  })),
)

// the "เพลง ▾" menu shares the app-wide one-menu-at-a-time state (shellMenu)
const openMenu = shellMenu
// B018: on a phone the panel is a viewport-inset sheet (see CSS) anchored just under
// the shell bar. The bar height varies (2-row on mobile · login wraps), so we read its
// real bottom on open instead of hard-coding a value that would overlap or gap.
const panelTop = ref(56)
function toggleSongMenu() {
  openMenu.value = openMenu.value === 'song' ? null : 'song'
  if (openMenu.value === 'song') {
    nextTick(() => {
      const bar = document.querySelector('.shell-bar')
      if (bar) panelTop.value = Math.round(bar.getBoundingClientRect().bottom)
    })
  }
}
// A blank editor: remount EditorMode (nonce) so it resets cleanly, drop the loaded song, switch to แก้ไข.
// Go to a bare /studio when the URL still names a song or a draft, so it matches "no song open" — AFTER the
// old editor is gone, so its own leave-guard cannot ask a second time about work already settled.
async function startNew() {
  openMenu.value = null
  loadedSong.value = null
  liveSong.value = null
  editorNonce.value++
  mode.value = 'edit'
  await nextTick()
  if (route.fullPath !== '/studio') router.push('/studio')
  window.scrollTo({ top: 0 })
}
// S2: จิ้มเพลง = เปิดเลย (no OK button). ComboSelect emits the id on click/Enter; we open
// it right away, keeping the current mode (US-05). Same-song pick just closes the panel.
function openSong(id) {
  openMenu.value = null
  if (!id || id === liveSong.value?.id) return
  router.push('/song/' + id)
}

// ---------- print (US-06 / US-I3) ----------
// Just open the print dialog. The filename comes from document.title (set to the song
// on load, above); the page layout — centered title + running footer — is owned by
// SongSheet + lib/printChrome.js. Tell users to switch off the browser's own headers.
function printSheet() {
  // the browser suggests document.title as the PDF's name — the song's (see the liveSong watcher)
  window.print()
}

// ---------- the ONE shared dock (dock-core / N1) ----------
// ฝึกร้อง (SongViewer) and แก้ไข (EditorMode) each mount their OWN DockKey (ITEMS_SING · ITEMS_EDIT);
// ก่อนพิมพ์ has a settings panel instead of a bar (ใบ v3/pleng#146). They share the DockKey ENGINE (one file),
// so the bar and its Setting page feel identical across modes while each keeps its own
// descriptor list. The old single shared <StudioDock> has been removed.
</script>

<template>
  <div>
    <!-- shell chrome teleported into the app-wide ShellBar: the 3-way mode switch (always visible). The
         editor teleports its own title input + เพลง/จัดการ menus while it is the active mode.
         ใบ v3/pleng#144 — no song title in the top bar any more: ฝึกร้อง and แผ่นเพลง open with the full
         title + คีย์ · จังหวะ · อ้างอิง at the top of the page (SongHead), never cut to fit the bar. -->
    <Teleport to="#shell-menus">
      <!-- "เพลง ▾" (S2) — one panel: ค้นหา/เปิด (สร้างเพลงใหม่ moved to the top bar / ☰ · ใบ#147). Shown in อ่าน/แผ่น
           modes; in แก้ไข the editor teleports its own richer "เพลง"/"จัดการ" menus, so this
           button steps aside (no duplicate — moves toward B003). -->
      <div v-if="mode !== 'edit'" class="sb-menu">
        <button
          class="sb-text sb-open-btn"
          :aria-expanded="openMenu === 'song'"
          aria-haspopup="true"
          @click.stop="toggleSongMenu"
        >
          <Icon name="file-music" :size="16" /><span class="sb-open-label">เพลง</span><Icon name="chevron-down" :size="14" class="chev" />
        </button>
        <div
          v-if="openMenu === 'song'"
          class="sb-dropdown sb-song-panel"
          :style="{ '--sb-panel-top': panelTop + 'px' }"
          role="menu"
          @click.stop
          @keydown.esc="openMenu = null"
        >
          <ComboSelect
            :model-value="''"
            :options="pickerOptions"
            placeholder="พิมพ์ค้นหา: ชื่อ เลข เนื้อร้อง โน้ต…"
            aria-label="ค้นหาเพลงเพื่อเปิด — จิ้มเพลงเพื่อเปิดทันที"
            width="100%"
            autofocus
            @update:model-value="openSong"
          />
        </div>
      </div>
      <span class="sb-modes" role="group" aria-label="เลือกมุมมอง">
        <button
          v-for="m in MODES"
          :key="m.id"
          class="sb-mode-btn"
          :class="{ on: mode === m.id }"
          :aria-pressed="mode === m.id"
          :title="m.title"
          @click="mode = m.id"
        >
          <Icon :name="m.icon" :size="16" /><span class="sb-mode-label">{{ m.label }}</span>
        </button>
      </span>
    </Teleport>

    <!-- ===== ดู — reading / sing-along view (WT-A owns SongViewer) ===== -->
    <div v-show="mode === 'view'">
      <SongViewer v-if="viewerSong" :song="viewerSong" @dock="viewDock = $event" @set="viewSet = $event" @edit="openEditor" @print="openPreview" />
      <p v-else class="muted" style="padding: 16px">ยังไม่มีเพลงให้แสดง — ไปที่ “แก้” เพื่อเริ่มสร้างเพลง</p>
    </div>

    <!-- ===== ก่อนพิมพ์ (ใบ v3/pleng#146) — the A4 sheet as it will print + its settings. Opened from ฝึกร้อง's
         ดาวน์โหลด › พิมพ์. Desktop: paper left, settings right · phone: paper on top, settings below. ===== -->
    <div v-show="mode === 'sheet'" class="sheet-workspace">
      <div class="pv-top no-print">
        <button type="button" class="ed-back-btn pv-back" aria-label="กลับไปฝึกร้อง" @click="mode = 'view'">
          <Icon name="arrow-left" :size="20" /> ก่อนพิมพ์
        </button>
        <div class="pv-zoom" role="group" aria-label="ซูมแผ่นเพลง">
          <button type="button" class="pv-zbtn" aria-label="ย่อ" :disabled="!canZoomOut" @click="zoomOut"><Icon name="minus" :size="18" /></button>
          <span class="pv-zval" aria-live="polite">{{ Math.round(scale * 100) }}%</span>
          <button type="button" class="pv-zbtn" aria-label="ขยาย" :disabled="!canZoomIn" @click="zoomIn"><Icon name="plus" :size="18" /></button>
          <button type="button" class="pv-zfit" :aria-pressed="zoom === null ? 'true' : 'false'" @click="zoom = null">เต็มแผ่น</button>
        </div>
      </div>
      <div class="pv-body">
        <!-- the paper: A4 to scale on screen; on paper the same rules as ever (print pins the sheet to 1rem) -->
        <div ref="frameEl" class="pv-frame">
          <!-- the sizer takes the room the SHRUNK picture needs; the paper inside is real size -->
          <div class="pv-sizer" :style="{ width: PAPER_PX * scale + 'px', height: paperH * scale + 'px' }">
          <div ref="paperEl" class="card pv-paper" data-layout-scale :style="{ transform: `scale(${scale})`, '--k': scale }">
            <!-- ใบ v3/pleng#105 — ตามต้นฉบับ: say plainly when the book has no phrasing for this
                 song, so the reader knows the spacing fell back to the tune. Never printed. -->
            <p v-if="sheetBookNote" class="book-note no-print" role="status">{{ sheetBookNote }}</p>
            <!-- B059: แผ่นเพลง prints like a hymn book — each melody once, reused verses as
                 lyrics only (songbook). The settings beside it tune what prints. -->
            <SongSheet
              :content="sheetContent"
              :mode="sheetPrintMode"
              :chord-system="sheetPrintChordSystem"
              :show-chord="printShowChord"
              :show-note="printShowNote"
              :show-lyric="printShowLyric"
              :display-key="sheetKey"
              :song-title="sheetPrintTitle"
              song-head
              screen-title
              fit-lines
              :book-refs="sheetBookRefs"
              :songbook="sheetBook === 'songbook'"
              :lyric-join="sheetLyricJoin !== 'split'"
              :book-phrases="sheetBookMap"
              @measured="schedulePages"
            />
            <!-- ใบ#146 ข้อ 6 — where each new page starts (screen only) -->
            <div v-for="(y, i) in breaks" :key="i" class="pv-break no-print" :style="{ top: y + 'px' }" aria-hidden="true">
              <span>หน้า {{ i + 2 }}</span>
            </div>
          </div>
          </div>
        </div>
        <aside class="pv-set no-print" aria-label="ตั้งค่าแผ่นเพลง">
          <label v-for="s in printSettings" :key="s.id" class="pv-row" :data-setting="s.id">
            <span class="pv-lbl">{{ s.name }}</span>
            <select class="pv-sel" :value="s.value" @change="s.set($event.target.value)">
              <option v-for="o in s.options" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
          <p class="pv-pages" role="status">ทั้งหมด {{ pageCount }} หน้า A4</p>
          <button type="button" class="pv-print" @click="printSheet">
            <Icon name="printer" :size="20" /> พิมพ์ / บันทึก PDF
          </button>
        </aside>
      </div>
    </div>

    <!-- ===== แก้ — the editor (WT-D owns EditorMode). v-show keeps it mounted so its
         in-progress state survives every mode switch. -->
    <!-- ใบ v3/pleng#145 — ← กลับไปฝึกร้อง, top left of แก้ไข (ข้อเสนอ ก). Only when there IS a song to go back
         to: a brand-new song (/studio) has no ฝึกร้อง page yet. -->
    <div v-if="mode === 'edit' && loadedSong" class="ed-back no-print">
      <button ref="backBtn" type="button" class="ed-back-btn" @click="backToSing">
        <Icon name="arrow-left" :size="20" /> กลับไปฝึกร้อง
      </button>
    </div>
    <div v-if="leaveAsk" class="ed-leave-scrim no-print" @click.self="keepEditing" @keydown.esc="keepEditing">
      <div class="ed-leave" role="alertdialog" aria-modal="true" aria-labelledby="ed-leave-t" aria-describedby="ed-leave-d">
        <b id="ed-leave-t" class="ed-leave-t">ยังไม่ได้บันทึก</b>
        <p id="ed-leave-d" class="ed-leave-d">{{ LEAVE_TEXT[leaveAsk].what }}</p>
        <div class="ed-leave-btns">
          <button type="button" class="ed-leave-b" @click="discardAndGo">{{ LEAVE_TEXT[leaveAsk].go }}</button>
          <button ref="keepBtn" type="button" class="ed-leave-b primary" @click="keepEditing">แก้ต่อ</button>
        </div>
      </div>
    </div>
    <EditorMode
      ref="editorRef"
      v-show="mode === 'edit'"
      :key="editorNonce"
      :song="loadedSong"
      :tier="tier"
      :active="mode === 'edit'"
      :initial-set="viewSet"
      @change="onChange"
      @save="onSave"
    />
    <!-- ฝึกร้อง (SongViewer) and แก้ไข (EditorMode) mount their OWN DockKey; ก่อนพิมพ์ has its settings
         panel (ใบ#146). The shared StudioDock is retired. -->
  </div>
</template>

<style scoped>
/* teleported into #shell-menus — scoped styles still apply to elements
   this component renders, even when they live in the shared ShellBar */
.sb-modes {
  display: inline-flex;
  gap: 2px;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 2px;
}
.sb-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  color: var(--muted);
  font: inherit;
  font-size: 0.95rem;
  padding: 6px 10px;
  border-radius: 8px;
  min-height: 34px;
  cursor: pointer;
}
.sb-mode-btn.on {
  background: #fff;
  color: var(--brand);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
@media (hover: hover) {
  .sb-mode-btn:not(.on):hover {
    color: var(--ink);
  }
}
/* ใบ#145 — ← กลับไปฝึกร้อง: a plain text button at the top left, like ใบ#146's "← ก่อนพิมพ์" */
.ed-back { margin: 0 0 var(--sp-2); }
.ed-back-btn {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: var(--touch-min); padding: 0 12px 0 6px;
  border: 1px solid transparent; border-radius: 10px; background: transparent;
  color: var(--brand); font: inherit; font-weight: 700; font-size: var(--fs-md); cursor: pointer;
}
@media (hover: hover) { .ed-back-btn:hover { border-color: var(--line); background: var(--cream); } }
/* the "ยังไม่ได้บันทึก" question — a small centered card over a dimmed page */
.ed-leave-scrim {
  position: fixed; inset: 0; z-index: 200; background: rgba(0, 0, 0, 0.42);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.ed-leave { width: 100%; max-width: 340px; background: #fff; border-radius: 14px; padding: 18px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25); }
.ed-leave-t { font-size: var(--fs-md); }
.ed-leave-d { margin: 6px 0 0; color: var(--ink); line-height: 1.5; }
.ed-leave-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.ed-leave-b {
  min-height: var(--touch-min); padding: 0 16px; border-radius: 10px; font: inherit; font-weight: 700; cursor: pointer;
  border: 1px solid var(--line); background: #fff; color: var(--ink);
}
.ed-leave-b.primary { background: var(--brand); border-color: var(--brand); color: #fff; }

/* "เพลง ▾" panel (S2) — teleported into the shared ShellBar */
.sb-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sb-song-panel {
  min-width: 300px;
  gap: 8px;
}

/* โหมดแผ่น (US-06): พิมพ์ is now the shared dock's print tool (N1). Leave room so the
   fixed dock never covers the last staff line. */
.sheet-workspace {
  padding-bottom: 88px;
}
/* ใบ v3/pleng#108 — on a phone the dock is a bar glued to the bottom and the footer sits right
   on top of it (App.vue measures the bar), so only a small gap is needed below the sheet.
   (Kept as it was: printing reads these rules too, so the printed page count stays the same.) */
@media (max-width: 760px) {
  .sheet-workspace { padding-bottom: 24px; }
}
/* ใบ v3/pleng#111 — on screen the bar is glued to the bottom at EVERY width, so the same small
   gap applies everywhere. Screen only: print keeps the rules above, page count unchanged. */
@media screen {
  .sheet-workspace { padding-bottom: 24px; }
}
/* ใบ v3/pleng#146 — ก่อนพิมพ์: the sheet on the A4 page it will print on.
   ใบ#130 found that where lines break depends only on how many font-sizes wide the text box is: on paper
   that is 178mm (A4 210mm − 16mm margins each side) at the print size 1rem. So the paper here IS that
   page — 210mm wide, the @page margins as padding, 1rem type — laid out at real size on every screen, and
   only its picture is scaled (the inline transform, worked out in the script) to เต็มแผ่น or the zoom.
   The sizer around it takes the room the scaled picture needs. The top-bar Aa does not enlarge it: this
   page shows the paper, and the paper's size is fixed (ใบ#140). Print ignores the picture (see below). */
.pv-top { display: flex; align-items: center; flex-wrap: wrap; gap: var(--sp-2); margin: 0 0 var(--sp-2); }
.pv-zoom { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; }
.pv-zbtn, .pv-zfit {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: var(--touch-min); min-height: var(--touch-min); padding: 0 10px;
  border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--ink);
  font: inherit; font-size: var(--fs-sm); cursor: pointer;
}
.pv-zbtn:disabled { opacity: 0.4; cursor: default; }
.pv-zfit[aria-pressed='true'] { border-color: var(--brand); color: var(--brand); font-weight: 700; }
.pv-zval { min-width: 3.2em; text-align: center; font-size: var(--fs-sm); font-variant-numeric: tabular-nums; color: var(--muted); }
.pv-body { display: flex; gap: var(--sp-4); align-items: flex-start; }
.pv-frame { flex: 1 1 auto; min-width: 0; }
.pv-set {
  flex: 0 0 300px; position: sticky; top: calc(var(--sp-4) + 64px);
  display: flex; flex-direction: column; gap: 10px;
  border: 1px solid var(--line); border-radius: 12px; background: #fff; padding: 14px;
}
.pv-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: var(--touch-min); border-bottom: 1px solid var(--line); }
.pv-lbl { font-size: var(--fs-sm); color: var(--ink); flex: 0 0 auto; }
.pv-sel {
  min-width: 0; max-width: 62%; min-height: 36px; border: 1px solid var(--line); border-radius: 8px;
  background: #fff; color: var(--brand); font: inherit; font-size: var(--fs-sm); font-weight: 700; padding: 0 6px;
}
.pv-pages { margin: 2px 0 0; font-size: var(--fs-xs); color: var(--muted); text-align: center; }
.pv-print {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; border: 0; border-radius: 12px; background: var(--brand); color: #fff;
  font: inherit; font-weight: 700; font-size: var(--fs-md); cursor: pointer;
}
@media (hover: hover) { .pv-print:hover { filter: brightness(1.06); } }
/* phone (ใบ#146 ข้อ 4): paper on top, settings below */
@media (max-width: 760px) {
  .pv-body { flex-direction: column; gap: var(--sp-3); }
  .pv-frame { width: 100%; }
  .pv-set { flex: 0 0 auto; width: 100%; position: static; }
}
@media screen {
  .pv-frame { overflow-x: auto; }
  .pv-sizer { position: relative; margin: 0 auto; }
  .pv-paper {
    position: absolute; top: 0; left: 0;
    box-sizing: border-box; width: 210mm; min-height: 297mm;
    margin: 0; padding: 15mm 16mm 16mm; /* the @page margins, 15mm 16mm 16mm */
    transform-origin: 0 0;
    background: #fff; border: 0; border-radius: 2px;
    /* the paper's edge is a shadow, not a border: a border would take width from the text box */
    box-shadow: 0 0 0 calc(1px / var(--k, 1)) var(--line), 0 2px 10px rgba(0, 0, 0, 0.12);
    font-size: 1rem; /* the print size */
  }
  .pv-paper :deep(.sheet-root) { width: 100%; font-size: inherit; }
  /* title and head exactly as print draws them (SongHead's @media print) */
  .pv-paper :deep(.sheet-print-title.on-screen) {
    display: block; text-align: center; color: #000; line-height: normal;
    font-size: 16pt; font-weight: 700; margin: 0 0 6mm;
  }
  .pv-paper :deep(.sheet-print-title.on-screen.has-head) { margin-bottom: 0.5mm; }
  .pv-paper :deep(.sheet-head) {
    font-size: 10pt; line-height: 4mm; height: 4mm;
    white-space: nowrap; color: #000; margin: 0 0 1.5mm;
  }
  /* the page-start line and its label keep their on-screen size whatever the picture's scale */
  .pv-break {
    position: absolute; left: 0; right: 0; height: 0;
    border-top: calc(2px / var(--k, 1)) dashed var(--red, #c0392b); pointer-events: none;
  }
  .pv-break span {
    position: absolute; right: calc(6px / var(--k, 1)); bottom: 0;
    transform: scale(calc(1 / var(--k, 1))); transform-origin: right bottom;
    font-size: 12px; font-weight: 700; white-space: nowrap;
    color: var(--red, #c0392b); background: #fff; padding: 0 6px; border-radius: 6px;
  }
}
/* ใบ#105 — the "the book has no phrasing for this song" notice above the sheet (screen only) */
.book-note {
  margin: 0 auto 0.6rem; max-width: 42rem; padding: 0.4rem 0.7rem; border-radius: 8px;
  font-size: 0.8rem; line-height: 1.5; text-align: center;
  color: var(--muted, #6b7280); background: var(--surface-2, rgba(127, 127, 127, 0.08));
}
@media print {
  .pv-body, .pv-frame, .pv-sizer { display: block; }
  /* the picture's size and scale are screen-only (inline styles, hence !important) */
  .pv-sizer { width: auto !important; height: auto !important; }
  .pv-paper { transform: none !important; }
  /* the paper's font is 1rem whatever the screen did (ใบ#130 · ใบ#140), so the page count never moves */
  .pv-paper { font-size: 1rem !important; }
}

@media (max-width: 760px) {
  .sb-mode-label,
  .sb-open-label {
    display: none;
  }
  /* the mode switch (ฝึกร้อง·แผ่นเพลง·แก้ไข) goes icon-only on a phone — give each
     a full 44px touch target so the three are comfortably tappable */
  .sb-mode-btn { min-height: var(--touch-min); min-width: var(--touch-min); justify-content: center; }
  /* B008/B018: on a phone the panel is a viewport-inset sheet under the bar — full-width,
     can't run off either edge, whatever the button's x position. */
  .sb-song-panel {
    position: fixed;
    top: var(--sb-panel-top, 56px);
    left: var(--sp-2);
    right: var(--sp-2);
    min-width: 0;
    max-width: none;
    width: auto;
  }
}

</style>
