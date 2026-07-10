<script setup>
// Studio = the single song SURFACE (US-01 / US-04). It is a THIN shell: it owns the
// current song + which of the three modes is shown, and mounts one component per mode.
// All editing lives in EditorMode; reading lives in SongViewer / SongSheet. A/B/C/D can
// evolve their own mode file without touching this shell (that is the whole point of
// DS-04's contract: every mode takes { song, tier } and emits change / save).
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase.js'
import { migrateToV2, resolveContent } from '../lib/songModel.js'
import { songHaystack } from '../lib/songSearch.js'
import { songBasename } from '../lib/songName.js'
import { stopPlayback } from '../lib/midi.js'
import { KEYS } from '../lib/chords.js'
import { downloadSong } from '../lib/jsonIO.js'
import { tier, initAuth, shellMenu, currentSong, readingFontScale, setFontScale } from '../store.js'
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
  const { data } = await supabase.from('songs').select('*').eq('id', id).single()
  if (!data) return
  loadedSong.value = data
  const { content } = migrateToV2(data.content)
  liveSong.value = {
    id: data.id,
    number: data.number,
    title_th: data.title_th,
    title_en: data.title_en,
    content,
  }
}

onMounted(async () => {
  initAuth()
  loadSongList()
  if (route.params.id) {
    await loadSong(route.params.id)
    mode.value = 'view' // a routed song opens in a reading view (US-01 AC1)
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
    if (id) await loadSong(id)
  },
)

// Each mode may play audio (ดู listen-along · แก้ preview). The mode components stay
// mounted (v-show), so their own onUnmounted stop never fires on a switch — the shell
// stops any sound when you leave a mode. midi is a single global player, so one call does it.
watch(mode, () => stopPlayback())

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
        book_refs: loadedSong.value?.book_refs,
        scripture: loadedSong.value?.scripture,
      }
    : null,
)
const sheetContent = computed(() => {
  const c = liveSong.value?.content
  if (!c) return { key: 'C', timeSignature: '4/4', lines: [] }
  return { ...c, lines: resolveContent(c) } // SongSheet reads v1-shaped `lines`
})
const titleText = computed(() => {
  const s = liveSong.value
  if (!s) return 'เพลง'
  return (s.number != null ? s.number + '. ' : '') + (s.title_th || 'เพลง')
})

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
  { value: 'roman', label: 'เลขนัชวิลล์ (1 4 5)' },
  { value: 'hidden', label: 'ซ่อนคอร์ด' },
]
const sheetDisplay = ref('all')
const sheetChord = ref('letter')
const sheetBook = ref('songbook') // 'songbook' = ทำนองครั้งเดียว · 'full' = โน้ตทุกเที่ยว
const sheetKey = ref('C')
const printAlpha = ref(0.96)
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
const printBasename = computed(() => (liveSong.value ? songBasename(liveSong.value) : 'song'))

const printItems = computed(() => [
  { id: 'grip', kind: 'grip', name: 'ย้าย/ย่อ', place: { anchor: 'left', row: 1 } },
  { id: 'print', kind: 'btn', name: 'พิมพ์ / บันทึก PDF', icon: 'printer', prime: true, place: { anchor: 'rightOf:grip', row: 1 }, run: printSheet },
  { id: 'export', kind: 'slot', name: 'ดาวน์โหลด', place: { anchor: 'rightOf:print', row: 1 } },
  { id: 'scale', kind: 'aa', name: 'ขนาดตัวอักษร', place: { anchor: 'leftOf:setting', row: 1 }, permanent: true },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'display', kind: 'menu', name: 'แสดงผล', icon: 'layers', default: 'inSetting', pinnable: true, control: { options: DISPLAY_OPTS.map((o) => ({ value: o.value, label: o.label })), value: sheetDisplay.value, onPick: (v) => (sheetDisplay.value = v) } },
  { id: 'book', kind: 'menu', name: 'แบบแผ่น', icon: 'book-open', default: 'inSetting', pinnable: true, control: { options: [{ value: 'songbook', label: 'สมุดเพลง (ทำนองครั้งเดียว)' }, { value: 'full', label: 'เต็ม (โน้ตทุกเที่ยว)' }], value: sheetBook.value, onPick: (v) => (sheetBook.value = v) } },
  { id: 'chord', kind: 'menu', name: 'คอร์ด', icon: 'guitar', default: 'inSetting', pinnable: true, control: { options: CHORD_OPTS, value: sheetChord.value, onPick: (v) => (sheetChord.value = v) } },
  { id: 'key', kind: 'menu', name: 'คีย์', icon: 'key-round', default: 'inSetting', pinnable: true, control: { options: keyOptions.value, value: sheetKey.value, badge: sheetKey.value, onPick: (v) => (sheetKey.value = v) } },
  { id: 'download', kind: 'btn', name: 'ดาวน์โหลด JSON', icon: 'download', default: 'inSetting', pinnable: true, run: () => downloadSong(liveSong.value) },
])

// Aa font popover state for the print dock (mirrors the sing dock's Aa)
const printFontPct = computed(() => Math.round(readingFontScale.value * 100))

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
  const { data } = await supabase
    .from('songs')
    .select('id, number, title_th, title_en, content')
    .order('number', { ascending: true })
  songList.value = data ?? []
}
// searchable options (ชื่อ · เลข · เนื้อร้อง · โน้ต — same haystack as the catalog page)
const pickerOptions = computed(() =>
  songList.value.map((s) => ({
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
// The dock used to be mounted twice (inside EditorMode + SongViewer), so each mode kept
// its own collapsed/position and they drifted apart (P'Aim noticed). Now it is mounted
// ONCE, here. Each mode component emits its dock config up via @dock; the sheet mode's
// print tool is owned here. `activeDock` picks the config for the current mode, and the
// single <StudioDock> stays the same instance across mode switches — so collapse state and
// the dragged position (shared localStorage keys in StudioDock) feel identical everywhere.
// All three modes mount their own DockKey (ฝึกร้อง=SongViewer · แผ่นเพลง=here · แก้ไข=EditorMode);
// the shared StudioDock is gone.
</script>

<template>
  <div>
    <!-- shell chrome teleported into the app-wide ShellBar: static title (ดู/แผ่น) + the
         3-way mode switch (always visible). The editor teleports its own title input +
         เพลง/จัดการ menus while it is the active mode. -->
    <Teleport to="#shell-title">
      <template v-if="mode !== 'edit'">
        <span class="sb-sep" aria-hidden="true"></span>
        <span class="sb-title-static">{{ titleText }}</span>
      </template>
    </Teleport>
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
      <SongViewer v-if="viewerSong" :song="viewerSong" @dock="viewDock = $event" />
      <p v-else class="muted" style="padding: 16px">ยังไม่มีเพลงให้แสดง — ไปที่ “แก้” เพื่อเริ่มสร้างเพลง</p>
    </div>

    <!-- ===== แผ่น — print sheet (WT-B owns SongSheet) · พิมพ์ = the shared dock (N1) ===== -->
    <div v-show="mode === 'sheet'" class="sheet-workspace">
      <div class="card">
        <h2 class="sheet-title no-print">{{ titleText }}</h2>
        <!-- the top-nav "Aa" reader size (store.readingFontScale) scales แผ่นเพลง on screen
             too (B043 · was only wired in ฝึกร้อง). Reset to 1rem for print so the A4 sheet
             keeps its fixed layout regardless of the on-screen reading size. -->
        <div class="sheet-read-scale" :style="{ fontSize: readingFontScale + 'rem' }">
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
            :song-title="titleText"
            :songbook="sheetBook === 'songbook'"
          />
        </div>
      </div>

      <!-- แผ่นเพลง dock — DockKey engine fed ITEMS_PRINT (grip · พิมพ์ · export · Aa · ⚙) -->
      <DockKey :items="printItems" store-key="print" v-model:alpha="printAlpha">
        <template #cell-export="{ open, toggle, close }">
          <ExportTool
            :content="liveSong && liveSong.content"
            :filename-base="printBasename"
            :on-json="() => downloadSong(liveSong)"
            :open="open"
            @toggle="toggle"
            @close="close"
          />
        </template>
        <template #cell-scale="{ open, toggle }">
          <button
            class="st-aa-btn"
            :class="{ on: open }"
            :aria-expanded="open"
            :title="'ขนาดตัวอักษร ' + printFontPct + '%'"
            aria-label="ขนาดตัวอักษร"
            @click.stop="toggle"
          ><b>Aa</b></button>
          <div v-if="open" class="dk-pop st-fontpop" role="menu" aria-label="ขนาดตัวอักษร" @click.stop>
            <div class="st-fonttitle">ขนาดตัวอักษร (พรีวิวบนจอ · กระดาษคงที่)</div>
            <div class="st-fontrow">
              <span class="st-fonta-sm" aria-hidden="true">A</span>
              <input class="st-fontslider" type="range" min="80" max="220" step="10" :value="printFontPct" aria-label="ปรับขนาดตัวอักษร" @input="setFontScale(+$event.target.value / 100)" />
              <span class="st-fonta-lg" aria-hidden="true">A</span>
            </div>
            <div class="st-fontfoot">
              <span class="st-fontval">{{ printFontPct }}%</span>
              <button class="st-fontreset" :disabled="printFontPct === 100" @click="setFontScale(1)">↺ 100%</button>
            </div>
          </div>
        </template>
      </DockKey>
    </div>

    <!-- ===== แก้ — the editor (WT-D owns EditorMode). v-show keeps it mounted so its
         in-progress state survives every mode switch. -->
    <EditorMode
      v-show="mode === 'edit'"
      :key="editorNonce"
      :song="loadedSong"
      :tier="tier"
      :active="mode === 'edit'"
      @change="onChange"
      @save="onSave"
    />
    <!-- each mode now mounts its OWN DockKey (ฝึกร้อง=SongViewer · แผ่นเพลง=above · แก้ไข=EditorMode);
         the shared StudioDock is retired. -->
  </div>
</template>

<style scoped>
/* teleported into #shell-title / #shell-menus — scoped styles still apply to elements
   this component renders, even when they live in the shared ShellBar */
.sb-sep {
  width: 1px;
  align-self: stretch;
  background: var(--line);
  min-height: 22px;
}
.sb-title-static {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--ink);
  padding: 4px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
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
.sheet-title {
  margin: 0 0 var(--sp-3);
  color: var(--brand);
  text-align: center;
  font-size: var(--fs-xl);
}

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
/* Aa scales the sheet on screen; print keeps the fixed A4 size (protect pagination) */
.sheet-read-scale { font-size: inherit; }
@media print {
  .sheet-read-scale { font-size: 1rem !important; }
}

@media (max-width: 760px) {
  .sb-mode-label,
  .sb-open-label {
    display: none;
  }
  .sb-title-static {
    font-size: var(--fs-base);
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

/* ---------- แผ่นเพลง dock: Aa font-size slot (mirrors the sing dock) ---------- */
.st-aa-btn {
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 10px; padding: 0 8px; height: var(--touch-min); min-height: 0; min-width: var(--touch-min); cursor: pointer;
}
.st-aa-btn b { font-size: 15px; font-weight: 700; letter-spacing: -0.3px; }
.st-aa-btn.on { border-color: var(--brand); color: var(--brand); }
/* slot popovers carry their own position; DockKey clamps them by the .dk-pop class */
.st-fontpop {
  pointer-events: auto;
  position: absolute; bottom: calc(100% + 8px); left: 0;
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); z-index: 30;
  min-width: 230px; max-width: calc(100vw - 24px); padding: 12px;
}
.st-fonttitle { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
.st-fontrow { display: flex; align-items: center; gap: 10px; }
.st-fonta-sm { font-size: 13px; flex: 0 0 auto; }
.st-fonta-lg { font-size: 22px; font-weight: 700; flex: 0 0 auto; }
.st-fontslider { flex: 1; min-width: 0; accent-color: var(--brand); height: var(--touch-min); }
.st-fontfoot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.st-fontval { font-size: 11px; color: var(--muted); }
.st-fontreset { border: 1px solid var(--line); background: transparent; color: var(--ink); border-radius: 8px; padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer; min-height: 32px; }
.st-fontreset:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); }
.st-fontreset:disabled { opacity: 0.4; cursor: default; }
</style>
