<script setup>
// Studio = the single song SURFACE (US-01 / US-04). It is a THIN shell: it owns the
// current song + which of the three modes is shown, and mounts one component per mode.
// All editing lives in EditorMode; reading lives in SongViewer / SongSheet. A/B/C/D can
// evolve their own mode file without touching this shell (that is the whole point of
// DS-04's contract: every mode takes { song, tier } and emits change / save).
import { ref, computed, watch, watchEffect, onMounted, onUnmounted, nextTick } from 'vue'
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
import { downloadSong } from '../lib/jsonIO.js'
import { tier, initAuth, shellMenu, currentSong, readingFontScale, sheetLyricJoin } from '../store.js'
import { songBookRefs } from '../lib/bookCodes.js'
import Icon from '../components/Icon.vue'
import ComboSelect from '../components/ComboSelect.vue'
import SongViewer from '../components/SongViewer.vue'
import SongSheet from '../components/SongSheet.vue'
import EditorMode from '../components/EditorMode.vue'
import DockKey from '../components/DockKey.vue'
import ExportTool from '../components/ExportTool.vue'

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
const leaveAsk = ref(false)
function openEditor() {
  mode.value = 'edit'
  nextTick(() => window.scrollTo({ top: 0 }))
}
function backToSing() {
  if (editorRef.value?.isDirty) {
    leaveAsk.value = true
    nextTick(() => keepBtn.value?.focus())
    return
  }
  mode.value = 'view'
}
function keepEditing() {
  leaveAsk.value = false
  nextTick(() => backBtn.value?.focus())
}
function discardAndBack() {
  leaveAsk.value = false
  if (loadedSong.value) liveSong.value = liveFromRow(loadedSong.value)
  editorNonce.value++ // a fresh editor from the saved song — the unsaved edits are gone
  mode.value = 'view'
}

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

// ---------- แผ่นเพลง (print) dock — DockKey fed ITEMS_PRINT (DS dockkey-print-edit §1) ----------
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
const printBasename = computed(() => (liveSong.value ? songBasename(liveSong.value) : 'song'))

const printItems = computed(() => [
  { id: 'print', kind: 'btn', name: 'พิมพ์ / บันทึก PDF', icon: 'printer', prime: true, place: { anchor: 'left', row: 1 }, run: printSheet },
  { id: 'export', kind: 'slot', name: 'ดาวน์โหลด', place: { anchor: 'rightOf:print', row: 1 } },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'display', kind: 'menu', name: 'แสดงผล', icon: 'layers', default: 'inSetting', pinnable: true, control: { options: DISPLAY_OPTS.map((o) => ({ value: o.value, label: o.label })), value: sheetDisplay.value, onPick: (v) => (sheetDisplay.value = v) } },
  { id: 'book', kind: 'menu', name: 'แบบแผ่น', icon: 'book-open', default: 'inSetting', pinnable: true, control: { options: [{ value: 'songbook', label: 'สมุดเพลง (ทำนองครั้งเดียว)' }, { value: 'full', label: 'เต็ม (โน้ตทุกเที่ยว)' }], value: sheetBook.value, onPick: (v) => (sheetBook.value = v) } },
  // ใบ#101 — only while the sheet has lyrics-only lines to write that way
  ...(sheetHasLyricLines.value ? [{ id: 'lyricjoin', kind: 'menu', name: 'เนื้อร้อง', icon: 'file-text', default: 'inSetting', pinnable: true, control: { options: LYRIC_JOIN_OPTS, value: sheetLyricJoin.value, onPick: (v) => (sheetLyricJoin.value = v) } }] : []),
  { id: 'chord', kind: 'menu', name: 'คอร์ด', icon: 'guitar', default: 'inSetting', pinnable: true, control: { options: CHORD_OPTS, value: sheetChord.value, onPick: (v) => (sheetChord.value = v) } },
  { id: 'key', kind: 'menu', name: 'คีย์', icon: 'key-round', default: 'inSetting', pinnable: true, control: { options: keyOptions.value, value: sheetKey.value, badge: sheetKey.value, onPick: (v) => (sheetKey.value = v) } },
  { id: 'download', kind: 'btn', name: 'ดาวน์โหลด JSON', icon: 'download', default: 'inSetting', pinnable: true, run: () => downloadSong(liveSong.value) },
])

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
// S2: create-new from the panel → a blank editor. Remount EditorMode (nonce) so it
// resets cleanly, drop the loaded song, and switch to แก้ไข. Navigate to a bare /studio
// when we were on /song/:id so the URL matches "no song open".
function createNew() {
  openMenu.value = null
  loadedSong.value = null
  liveSong.value = null
  editorNonce.value++
  mode.value = 'edit'
  if (route.params.id) router.push('/studio')
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
  window.print()
}

// ---------- the ONE shared dock (dock-core / N1) ----------
// Each of the three modes mounts its OWN DockKey — ฝึกร้อง in SongViewer, แผ่นเพลง here
// (ITEMS_PRINT), แก้ไข in EditorMode (ITEMS_EDIT). They share the DockKey ENGINE (one file),
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
      <!-- "เพลง ▾" (S2) — one panel: สร้างเพลงใหม่ (top) + ค้นหา/เปิด. Shown in อ่าน/แผ่น
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
          <button class="sb-song-new" @click="createNew">
            <Icon name="file-plus" :size="18" /> สร้างเพลงใหม่
          </button>
          <div class="sb-song-sep"><span>หรือเปิดเพลงที่มีอยู่</span></div>
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
      <SongViewer v-if="viewerSong" :song="viewerSong" @dock="viewDock = $event" @set="viewSet = $event" @edit="openEditor" />
      <p v-else class="muted" style="padding: 16px">ยังไม่มีเพลงให้แสดง — ไปที่ “แก้” เพื่อเริ่มสร้างเพลง</p>
    </div>

    <!-- ===== แผ่น — print sheet (WT-B owns SongSheet) · พิมพ์ = the shared dock (N1) ===== -->
    <div v-show="mode === 'sheet'" class="sheet-workspace">
      <div class="card">
        <!-- the top-bar "Aa" size (store.readingFontScale · ใบ#142) scales แผ่นเพลง on screen
             too (B043 · was only wired in ฝึกร้อง). It now rides on a custom property because
             ใบ#130 gives the sheet itself a paper-sized font (see .sheet-read-scale in <style>);
             print still pins everything to 1rem so the A4 layout never follows the reading size. -->
        <div class="sheet-read-scale" :style="{ '--sheet-aa': readingFontScale }">
          <!-- ใบ v3/pleng#105 — ตามต้นฉบับ: say plainly when the book has no phrasing for this
               song, so the reader knows the spacing fell back to the tune. Never printed. -->
          <p v-if="sheetBookNote" class="book-note no-print" role="status">{{ sheetBookNote }}</p>
                    <!-- B059: แผ่นเพลง prints like a hymn book — each melody once, reused verses as
               lyrics only (songbook). The DockKey ITEMS_PRINT controls tune what prints. -->
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
          />
        </div>
      </div>

      <!-- แผ่นเพลง dock — DockKey engine fed ITEMS_PRINT (พิมพ์ · export · ⚙) · Aa is on the top bar (ใบ#142) -->
      <!-- ใบ#111 — a fixed full-width bar at the bottom at every width -->
      <DockKey :items="printItems" store-key="print" label="แถบแผ่นเพลง">
        <template #cell-export="{ open, toggle, close }">
          <ExportTool
            :content="sheetSetContent"
            :filename-base="printBasename"
            :on-json="() => downloadSong(liveSong)"
            :open="open"
            @toggle="toggle"
            @close="close"
          />
        </template>
      </DockKey>
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
        <p id="ed-leave-d" class="ed-leave-d">ถ้ากลับไปฝึกร้องตอนนี้ ที่แก้ไว้จะหาย</p>
        <div class="ed-leave-btns">
          <button type="button" class="ed-leave-b" @click="discardAndBack">ทิ้งแล้วกลับ</button>
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
    <!-- each mode now mounts its OWN DockKey (ฝึกร้อง=SongViewer · แผ่นเพลง=above · แก้ไข=EditorMode);
         the shared StudioDock is retired. -->
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
/* ＋สร้างเพลงใหม่ — the prominent primary action at the top of the panel */
.sb-song-new {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
  font-weight: 700;
  min-height: 40px;
  cursor: pointer;
}
.sb-song-new:hover {
  filter: brightness(1.05);
}
.sb-song-new .icn {
  color: #fff;
}
/* "หรือเปิดเพลงที่มีอยู่" divider */
.sb-song-sep {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.85rem;
  margin: 2px 0;
}
.sb-song-sep::before,
.sb-song-sep::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line);
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
/* Aa scales the sheet on screen; print keeps the fixed A4 size (protect pagination) */
/* ใบ v3/pleng#130 — แผ่นเพลง on screen IS the page, not a web page.
   พี่เปา 20 ต.ค. 2569: "บางเพลงแสดงหน้าจอไม่ตกแต่ปริ้นแล้วตก".
   Where the lines break depends on one number: how many font-sizes wide the text box is.
   On paper that number is fixed — A4 (210mm) minus the 16mm margins @page gives each side
   leaves 178mm, and print pins the sheet's font to 1rem (16px), so the page is exactly
   178mm / 16px = 42.0472 font-sizes wide, every time. On screen the box was the window
   instead, so a wide window fitted more per line and the paper broke somewhere else.
   Give the sheet that same 42.0472em and the two agree at any reading size: both the width
   and the font scale together, so the ratio — the only thing wrapping cares about — holds.
   A window narrower than that shrinks the font to fit rather than re-wrapping, down to a
   floor of 11px; below that the sheet scrolls sideways instead of becoming unreadable
   (ฝึกร้อง stays the mode built for reading on a phone). */
.sheet-read-scale { font-size: inherit; }
@media screen {
  .sheet-read-scale {
    --paper-em: 42.0472; /* 178mm ÷ 16px — the A4 text box, in font-sizes */
    font-size: calc(var(--sheet-aa, 1) * 1rem);
    container-type: inline-size; /* so the sheet below can size itself from THIS box */
    overflow-x: auto;
  }
  .sheet-read-scale :deep(.sheet-root) {
    width: calc(var(--paper-em) * 1em);
    margin-inline: auto;
    font-size: clamp(
      0.6875rem,
      calc(100cqw / var(--paper-em)),
      calc(var(--sheet-aa, 1) * 1rem)
    );
  }
}
/* ใบ#105 — the "the book has no phrasing for this song" notice above the sheet (screen only) */
.book-note {
  margin: 0 auto 0.6rem; max-width: 42rem; padding: 0.4rem 0.7rem; border-radius: 8px;
  font-size: 0.8rem; line-height: 1.5; text-align: center;
  color: var(--muted, #6b7280); background: var(--surface-2, rgba(127, 127, 127, 0.08));
}
@media print {
  .sheet-read-scale { font-size: 1rem !important; }
}

@media (max-width: 760px) {
  .sb-mode-label,
  .sb-open-label {
    display: none;
  }
  /* the mode switch (ฝึกร้อง·แผ่นเพลง·แก้ไข) goes icon-only on a phone — give each
     a full 44px touch target so the three are comfortably tappable */
  .sb-mode-btn { min-height: var(--touch-min); min-width: var(--touch-min); justify-content: center; }
  /* ＋สร้างเพลงใหม่ is the panel's primary action — 44px on touch */
  .sb-song-new { min-height: var(--touch-min); }
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
