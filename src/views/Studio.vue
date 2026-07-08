<script setup>
// Studio = the single song SURFACE (US-01 / US-04). It is a THIN shell: it owns the
// current song + which of the three modes is shown, and mounts one component per mode.
// All editing lives in EditorMode; reading lives in SongViewer / SongSheet. A/B/C/D can
// evolve their own mode file without touching this shell (that is the whole point of
// DS-04's contract: every mode takes { song, tier } and emits change / save).
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase.js'
import { migrateToV2, resolveContent } from '../lib/songModel.js'
import { songHaystack } from '../lib/songSearch.js'
import { stopPlayback } from '../lib/midi.js'
import { tier, initAuth, shellMenu } from '../store.js'
import Icon from '../components/Icon.vue'
import ComboSelect from '../components/ComboSelect.vue'
import SongViewer from '../components/SongViewer.vue'
import SongSheet from '../components/SongSheet.vue'
import EditorMode from '../components/EditorMode.vue'

const route = useRoute()
const router = useRouter()

// three views on one surface: ดู (ร้องตาม) · แผ่น (พิมพ์) · แก้ (แก้ไข)
const mode = ref('view')

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

// the editor pushes every edit up here → previews follow + no work is lost on a switch
function onChange(song) {
  liveSong.value = song
}
// save persistence stays inside the editor (it owns the editing state + Supabase writes);
// this is the contract's observability hook, kept so the shell can react later if needed
function onSave() {}

// each reading surface wants the song in a slightly different shape
const viewerSong = computed(() =>
  liveSong.value
    ? { number: liveSong.value.number, title_th: liveSong.value.title_th, content: liveSong.value.content }
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

// B002 (P'Aim-approved names): ฝึกร้อง · แผ่นเพลง · แก้ไข (ids stay view/sheet/edit)
const MODES = [
  { id: 'view', label: 'ฝึกร้อง', icon: 'eye', title: 'ฝึกร้อง (ร้องตาม)' },
  { id: 'sheet', label: 'แผ่นเพลง', icon: 'file-text', title: 'แผ่นเพลง (ไว้พิมพ์)' },
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

// the open-song menu shares the app-wide one-menu-at-a-time state (shellMenu)
const openMenu = shellMenu
const pendingPick = ref('') // the song chosen in the picker, opened only on "เปิดเพลง"
// B018: on a phone the panel is a viewport-inset sheet (see CSS) anchored just under
// the shell bar. The bar height varies (the login button wraps when logged out), so we
// read its real bottom on open instead of hard-coding a value that would overlap or gap.
const panelTop = ref(56)
function toggleOpenMenu() {
  openMenu.value = openMenu.value === 'open-song' ? null : 'open-song'
  if (openMenu.value === 'open-song') {
    pendingPick.value = liveSong.value?.id ?? ''
    nextTick(() => {
      const bar = document.querySelector('.shell-bar')
      if (bar) panelTop.value = Math.round(bar.getBoundingClientRect().bottom)
    })
  }
}
function openPicked() {
  const id = pendingPick.value
  openMenu.value = null
  if (!id || id === liveSong.value?.id) return
  router.push('/song/' + id) // watcher loads it + preserves the current mode
}

// ---------- print (US-06) ----------
// The 🖨 button in the แผ่น toolbar just triggers the browser print dialog; the printed
// page layout (A4 · footer) is owned by SongSheet's @media print (WT-B / US-B02).
function printSheet() {
  window.print()
}
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
      <!-- เปิด/เลือกเพลง — on the shell so it works in every mode (US-05) -->
      <div class="sb-menu">
        <button
          class="sb-text sb-open-btn"
          :aria-expanded="openMenu === 'open-song'"
          aria-haspopup="true"
          @click.stop="toggleOpenMenu"
        >
          <Icon name="folder-open" :size="16" /><span class="sb-open-label">เปิดเพลง</span>
        </button>
        <div
          v-if="openMenu === 'open-song'"
          class="sb-dropdown sb-open-panel"
          :style="{ '--sb-panel-top': panelTop + 'px' }"
          @click.stop
        >
          <ComboSelect
            v-model="pendingPick"
            :options="pickerOptions"
            placeholder="พิมพ์ค้นหา: ชื่อ เลข เนื้อร้อง โน้ต…"
            aria-label="ค้นหาเพลงเพื่อเปิด"
            width="100%"
          />
          <button class="sb-open-go" @click="openPicked">เปิดเพลง</button>
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
      <SongViewer v-if="viewerSong" :song="viewerSong" />
      <p v-else class="muted" style="padding: 16px">ยังไม่มีเพลงให้แสดง — ไปที่ “แก้” เพื่อเริ่มสร้างเพลง</p>
    </div>

    <!-- ===== แผ่น — print sheet (WT-B owns SongSheet) ===== -->
    <div v-show="mode === 'sheet'" class="sheet-workspace">
      <div class="sheet-toolbar no-print">
        <button class="sheet-print-btn" title="พิมพ์แผ่นเพลง" @click="printSheet">
          <Icon name="printer" :size="16" /><span>พิมพ์</span>
        </button>
      </div>
      <div class="card">
        <h2 class="sheet-title">{{ titleText }}</h2>
        <SongSheet :content="sheetContent" mode="full" chord-system="letter" :display-key="sheetContent.key" />
      </div>
    </div>

    <!-- ===== แก้ — the editor (WT-D owns EditorMode). v-show keeps it mounted so its
         in-progress state survives every mode switch. -->
    <EditorMode
      v-show="mode === 'edit'"
      :song="loadedSong"
      :tier="tier"
      :active="mode === 'edit'"
      @change="onChange"
      @save="onSave"
    />
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
  margin: 0 0 8px;
  color: var(--brand);
}

/* shell song picker (US-05) — teleported into the shared ShellBar */
.sb-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sb-open-panel {
  min-width: 300px;
  gap: 8px;
}
.sb-open-go {
  align-self: flex-end;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font: inherit;
  font-weight: 700;
  min-height: 36px;
  cursor: pointer;
}
.sb-open-go:hover {
  filter: brightness(1.05);
}

/* print toolbar in โหมดแผ่น (US-06) — the button itself never prints */
.sheet-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
.sheet-print-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: var(--brand);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 7px 14px;
  font: inherit;
  font-weight: 700;
  min-height: 36px;
  cursor: pointer;
}
.sheet-print-btn:hover {
  background: var(--cream);
}

@media (max-width: 760px) {
  .sb-mode-label,
  .sb-open-label {
    display: none;
  }
  .sb-title-static {
    font-size: 1rem;
  }
  /* B018: the 300px panel left-anchored at a mid-bar button overflowed the right edge.
     On a phone, break it out to a viewport-inset sheet under the bar — it can no longer
     run off either edge, whatever the button's x position. */
  .sb-open-panel {
    position: fixed;
    top: var(--sb-panel-top, 56px);
    left: 8px;
    right: 8px;
    min-width: 0;
    max-width: none;
    width: auto;
  }
}
</style>
