<script setup>
// ═══════════════════════════════════════════════════════════════════════════════════
// SongMaker — MOCKUP host (ก้าว 3). Composes the 10 IA surfaces on REAL components so
// P'Aim can see the UI/layout BEFORE dev logic (STOP-gate). Reuses:
//   • ShellBar teleports (#shell-title / #shell-menus)  → S1 app bar + contextual action bar
//   • SongSheet render (real)                           → S5 inline edit canvas
//   • DockKey engine + ITEMS_EDIT (ratified descriptor)  → S4 dock (keys band + save prime)
//   • NoteAccessory / StructureDrawer / ImportVerify     → S6 / S7 / S10 (new dev-ready files)
//
// ⛔ MOCKUP SCOPE: layout + progressive disclosure + surface coverage only. Handlers are
// placeholders (log). Real typing/caret/model/import wiring = ก้าว 4. See
// docs/ds/songmaker-mockup-plan.md for the ~65-function → placement map (no orphan).
// ═══════════════════════════════════════════════════════════════════════════════════
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import SongSheet from '../components/SongSheet.vue'
import DockKey from '../components/DockKey.vue'
import NoteAccessory from '../components/NoteAccessory.vue'
import StructureDrawer from '../components/StructureDrawer.vue'
import ImportVerify from '../components/ImportVerify.vue'

// ---------- mock song (feeds the REAL SongSheet — content.lines are v1-shaped) ----------
const song = {
  key: 'C',
  timeSignature: '4/4',
  lines: [
    [
      { type: 'section', name: 'ข้อ 1' },
      { type: 'segment', chord: 'C', note: '1', lyric: 'พระ' },
      { type: 'segment', chord: '', note: '2', lyric: 'เจ้า' },
      { type: 'segment', chord: 'G', note: '3', lyric: 'ทรง' },
      { type: 'bar' },
      { type: 'segment', chord: '', note: '3', lyric: 'เลี้ยง' },
      { type: 'segment', chord: 'Am', note: '2', lyric: 'ดู' },
      { type: 'segment', chord: '', note: '1', lyric: 'ข้า' },
    ],
    [
      { type: 'segment', chord: 'F', note: '4', lyric: 'ไม่' },
      { type: 'segment', chord: '', note: '4', lyric: 'ขัด' },
      { type: 'segment', chord: 'C', note: '5', lyric: 'สน' },
      { type: 'bar' },
      { type: 'segment', chord: 'G', note: '5', lyric: 'ใด' },
      { type: 'segment', chord: '', note: '-', lyric: '' },
    ],
    [
      { type: 'section', name: 'ร้องรับ' },
      { type: 'segment', chord: 'C', note: '5', lyric: 'สรร' },
      { type: 'segment', chord: '', note: '5', lyric: 'เสริญ' },
      { type: 'segment', chord: 'F', note: '6', lyric: 'พระ' },
      { type: 'bar' },
      { type: 'segment', chord: 'G', note: '5', lyric: 'องค์' },
      { type: 'segment', chord: 'C', note: '3', lyric: 'เจ้า' },
    ],
  ],
}
const sheetContent = computed(() => song)

// ---------- mockup controls (help P'Aim/tester read the mockup) ----------
// query presets (?map=&power=&view=&sub=&acc=&drawer=&sel=&conflict=) let each scenario
// render as a distinct URL for headless screenshot capture — mockup reading aid only.
const q = useRoute().query
const on = (k, dflt) => (q[k] != null ? q[k] === '1' : dflt)
const showMap = ref(on('map', true))       // surface-map legend (S1–S10 labels)
const powerMode = ref(on('power', false))  // pre-expand advanced disclosure (musician / power path)
const view = ref(q.view === 'import' ? 'import' : 'edit') // 'edit' | 'import' (S10 batch)
const subMode = ref(q.sub === 'read' ? 'read' : 'edit')   // 'read' shows ✏️ FAB (S3) · 'edit' shows dock (S4)

// ---------- surface open state ----------
const accessoryOpen = ref(on('acc', false)) // S6
const drawerOpen = ref(on('drawer', false)) // S7
const multiSelect = ref(on('sel', false))   // S5 → S1 contextual action bar
const conflictBanner = ref(on('conflict', false)) // S9 cross-device conflict
const saveState = ref('saved')   // 'saved' | 'dirty' | 'offline'
const SAVE_LABEL = { saved: 'บันทึกแล้ว ✓', dirty: 'กำลังพิมพ์…', offline: 'ออฟไลน์ · คิวส่ง' }

function log(...a) { /* mockup placeholder — real logic = ก้าว 4 */ console.log('[mock]', ...a) }
function selectNote() { accessoryOpen.value = true; saveState.value = 'dirty' }

// ---------- S4 · DockKey ITEMS_EDIT (ratified — dockkey-print-edit.md §2) ----------
const alpha = ref(0.98)
const keysBasic = [['1', '2', '3', '4', '5', '6', '7', '0', '-', '~'], ['.', "'", '_', '|', '(', ')', '#', 'b', 'n', '⌫']]
const editItems = computed(() => [
  { id: 'keys', kind: 'keys', name: 'แป้นโน้ตตัวเลข', rows: keysBasic, onInsert: (k) => log('insert', k) },
  { id: 'grip', kind: 'grip', name: 'ย้าย/ย่อ', place: { anchor: 'left', row: 1 } },
  { id: 'undo', kind: 'btn', name: 'ย้อน', icon: 'undo-2', place: { anchor: 'rightOf:grip', row: 1 }, run: () => log('undo') },
  { id: 'redo', kind: 'btn', name: 'ทำซ้ำ', icon: 'redo-2', place: { anchor: 'rightOf:undo', row: 1 }, run: () => log('redo') },
  { id: 'play', kind: 'play', name: 'ฟังท่อน (ที่กำลังแก้)', icon: 'play', place: { anchor: 'rightOf:redo', row: 1 }, run: () => log('play-section') },
  { id: 'scale', kind: 'aa', name: 'ขนาดตัวอักษร', place: { anchor: 'leftOf:setting', row: 1 }, permanent: true },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'save', kind: 'btn', name: 'ส่งตรวจ', icon: 'send', prime: true, label: 'ส่งตรวจ', place: { row: 2, col: 1, span: 2 }, run: () => log('submit') },
  { id: 'playAll', kind: 'btn', name: 'ฟังทั้งเพลง', icon: 'circle-play', label: 'ฟังทั้งเพลง', place: { row: 2, col: 3 }, run: () => log('play-all') },
  // S8 overflow (⚙) — rare / setup (song settings · delete · preview · share · JSON · my-works)
  { id: 'settings', kind: 'btn', name: 'ตั้งค่าเพลง (ชื่อ/คีย์/อัตราจังหวะ/ความเร็ว/เล่ม)', icon: 'sliders-horizontal', default: 'inSetting', pinnable: true, run: () => log('song-settings') },
  { id: 'transpose', kind: 'menu', name: 'คีย์ (ทั้งเพลง)', icon: 'key-round', default: 'inSetting', pinnable: true, control: { options: [{ value: 'C', label: 'C (ต้นฉบับ)' }, { value: 'D', label: 'D' }, { value: 'G', label: 'G' }], value: 'C', badge: 'C', onPick: (v) => log('transpose', v) } },
  { id: 'preview', kind: 'btn', name: 'พรีวิว (ต่อเนื่อง ↔ ประหยัดกระดาษ)', icon: 'picture-in-picture-2', default: 'inSetting', pinnable: true, run: () => log('preview') },
  { id: 'print', kind: 'btn', name: 'พิมพ์ A4', icon: 'printer', default: 'inSetting', pinnable: true, run: () => log('print') },
  { id: 'share', kind: 'btn', name: 'แชร์ลิงก์/QR', icon: 'share-2', default: 'inSetting', pinnable: true, run: () => log('share') },
  { id: 'download', kind: 'btn', name: 'ดาวน์โหลด JSON', icon: 'download', default: 'inSetting', pinnable: true, run: () => log('json') },
  { id: 'draft', kind: 'btn', name: 'บันทึกร่าง', icon: 'save', default: 'inSetting', pinnable: true, run: () => log('draft') },
  { id: 'listenAll', kind: 'btn', name: 'ฟังทั้งเพลง (demote)', icon: 'circle-play', default: 'inSetting', pinnable: true, run: () => log('listen-all') },
  { id: 'mywork', kind: 'btn', name: 'งานของฉัน (ร่าง/รอตรวจ/ส่งกลับ)', icon: 'folder-open', default: 'inSetting', pinnable: true, run: () => log('my-work') },
  { id: 'delete', kind: 'btn', name: 'ลบเพลง (ยืนยัน+กู้คืน)', icon: 'trash-2', default: 'inSetting', pinnable: true, run: () => log('delete-song') },
])

// which surface each map badge points at (legend)
const SURFACES = [
  ['S1', 'App bar + contextual action bar'],
  ['S2', 'Nav drawer (☰)'],
  ['S3', '✏️ FAB (โหมดดู)'],
  ['S4', 'DockKey (แป้นโน้ต + บันทึก)'],
  ['S5', 'แผ่นเพลง inline (แก้ตรงจุด)'],
  ['S6', 'Note accessory (คอร์ด/สัญลักษณ์)'],
  ['S7', 'Structure drawer (ท่อน/กระโดด)'],
  ['S8', 'Overflow ⚙ (ตั้งค่า/พิมพ์/แชร์)'],
  ['S9', 'Ambient (lint/บันทึก/ไฮไลต์)'],
  ['S10', 'Import & Verify (งานเป็นชุด)'],
]
</script>

<template>
  <div class="sm-root" :class="{ 'sm-map': showMap }">
    <!-- ══════════ S1 · teleported chrome into the shared ShellBar ══════════ -->
    <Teleport to="#shell-title">
      <span class="sb-sep" aria-hidden="true"></span>
      <span class="sm-s1-title" data-s="S1">
        <Icon name="pencil" :size="15" /> แก้: พระเจ้าทรงเลี้ยงดู
      </span>
      <span class="sm-save" :class="saveState" data-s="S9">{{ SAVE_LABEL[saveState] }}</span>
    </Teleport>
    <Teleport to="#shell-menus">
      <!-- during multi-select the bar's normal actions step aside — the contextual action
           bar (teleported into #shell-title) owns the bar (Material 3 CAB replaces actions) -->
      <template v-if="!multiSelect">
      <!-- S2 nav + view switch + S7 structure entry -->
      <button class="sm-icon" data-s="S2" title="เมนู/นำทาง" aria-label="เมนู" @click="log('nav-drawer')"><Icon name="menu" :size="18" /></button>
      <span class="sm-switch" role="group" aria-label="โหมดทำงาน">
        <button :class="{ on: view === 'edit' }" @click="view = 'edit'"><Icon name="pencil" :size="15" /><span>แก้เพลง</span></button>
        <button :class="{ on: view === 'import' }" @click="view = 'import'" data-s="S10"><Icon name="inbox" :size="15" /><span>นำเข้า/ตรวจ</span></button>
      </span>
      <button v-if="view === 'edit'" class="sm-struct" data-s="S7" @click="drawerOpen = true"><Icon name="list-tree" :size="16" /><span>โครงสร้าง</span></button>
      </template>
    </Teleport>

    <!-- S1·CAB — multi-select contextual action bar (Material 3). On the shared ShellBar the
         global cluster can't be removed from this view, so the CAB renders as a full-width strip
         directly under the bar (step 4: transform the real bar, suppressing global chrome). -->
    <div v-if="multiSelect && view === 'edit'" class="sm-cab-strip" data-s="S1·CAB" role="toolbar" aria-label="แถบคำสั่งช่วงที่เลือก">
      <button class="sm-cab-x" @click="multiSelect = false" aria-label="ยกเลิกเลือก"><Icon name="x" :size="18" /></button>
      <b>เลือก 3 ห้อง</b>
      <span class="sm-cab-acts">
        <button @click="log('move-range')"><Icon name="move" :size="16" /> ย้าย</button>
        <button @click="log('copy-range')"><Icon name="copy" :size="16" /> คัดลอก</button>
        <button class="danger" @click="log('del-range')"><Icon name="trash-2" :size="16" /> ลบ</button>
      </span>
    </div>

    <!-- ══════════ mockup control strip (not part of the product — reading aid) ══════════ -->
    <div class="sm-controls no-print">
      <span class="sm-controls-t"><Icon name="eye" :size="14" /> ตัวช่วยดู mockup:</span>
      <label class="sm-chk"><input type="checkbox" v-model="showMap" /> ผังชั้น (S1–S10)</label>
      <label class="sm-chk"><input type="checkbox" v-model="powerMode" /> โหมดคนรู้ดนตรี (เปิดขั้นสูง)</label>
      <label class="sm-chk"><input type="checkbox" v-model="conflictBanner" /> จำลอง: ฉบับใหม่กว่าอีกเครื่อง</label>
      <span class="sm-sub" v-if="view === 'edit'">โหมดย่อย:
        <button class="sm-mini" :class="{ on: subMode === 'read' }" @click="subMode = 'read'">ดู (✏️ FAB)</button>
        <button class="sm-mini" :class="{ on: subMode === 'edit' }" @click="subMode = 'edit'">แก้ (dock)</button>
      </span>
    </div>

    <!-- surface-map legend -->
    <div v-if="showMap" class="sm-legend no-print">
      <span v-for="[s, label] in SURFACES" :key="s" class="sm-leg"><b>{{ s }}</b> {{ label }}</span>
    </div>

    <!-- ══════════════════════════ EDIT view ══════════════════════════ -->
    <template v-if="view === 'edit'">
      <!-- S9 · cross-device conflict banner -->
      <div v-if="conflictBanner" class="sm-conflict" data-s="S9" role="alert">
        <Icon name="alert-triangle" :size="16" />
        มีฉบับที่ใหม่กว่าบนอีกเครื่อง — เลือกฉบับก่อนบันทึกทับ
        <span class="sm-conflict-acts">
          <button @click="conflictBanner = false">ใช้ของเครื่องนี้</button>
          <button class="ghost" @click="conflictBanner = false">เปิดฉบับใหม่กว่า</button>
        </span>
      </div>

      <!-- S5 · the inline edit canvas = the REAL SongSheet with an edit overlay -->
      <div class="sm-canvas" :class="{ 'has-dock': subMode === 'edit' }">
        <div class="sm-s5-tag" v-if="showMap" data-s="S5">S5 · แผ่นเพลง inline</div>

        <!-- contextual per-bar / per-line insert chips (IA §4 — point-anchored → inline S5) -->
        <div class="sm-inline-tools" v-if="subMode === 'edit'">
          <button @click="log('add-bar')"><Icon name="plus" :size="14" /> ห้อง</button>
          <button @click="log('add-line')"><Icon name="corner-down-left" :size="14" /> บรรทัด</button>
          <button @click="log('repeat')" title="ซ้ำท่อน">‖: :‖</button>
          <button @click="log('volta')" title="กล่องจบต่างรอบ (1./2.)">1. 2.</button>
          <button @click="multiSelect = true"><Icon name="box-select" :size="14" /> เลือกช่วง</button>
        </div>

        <!-- REAL render — interactive tap → S6 accessory. A lint ⚠ + selected caret are overlaid. -->
        <div class="sm-sheet-wrap" @click="selectNote">
          <div class="sm-lint" data-s="S9" title="จังหวะในห้องนี้ไม่ครบ (ไม่นับห้องยก)"><Icon name="alert-circle" :size="15" /> ห้อง 2 จังหวะไม่ครบ</div>
          <SongSheet
            :content="sheetContent"
            mode="full"
            chord-system="letter"
            display-key="C"
            :playing-seg="{ li: 0, si: 1 }"
            interactive
            song-title=""
          />
          <p class="sm-caret-hint" v-if="subMode === 'edit'"><Icon name="mouse-pointer-click" :size="13" /> แตะโน้ต/คำ = cursor ไปตรงนั้น → เปิดเครื่องมือ (S6)</p>
        </div>
      </div>

      <!-- S3 · ✏️ FAB — ONLY in read sub-mode (morphs away in edit; dock holds primary) -->
      <button v-if="subMode === 'read'" class="sm-fab" data-s="S3" @click="subMode = 'edit'" aria-label="เข้าโหมดแก้">
        <Icon name="pencil" :size="22" />
      </button>

      <!-- S4 · DockKey (real engine, ITEMS_EDIT) — only in edit sub-mode -->
      <div v-if="subMode === 'edit'" class="sm-s4-wrap">
        <div class="sm-s4-tag" v-if="showMap" data-s="S4">S4 · DockKey</div>
        <DockKey :items="editItems" store-key="songmaker-mock" v-model:alpha="alpha" />
      </div>
    </template>

    <!-- ══════════════════════════ IMPORT view (S10) ══════════════════════════ -->
    <template v-else>
      <div class="sm-import-wrap">
        <ImportVerify @open-editor="view = 'edit'; subMode = 'edit'" @close="view = 'edit'" />
      </div>
    </template>

    <!-- ══════════ S6 · Note accessory (popup desktop / bottom-sheet mobile) ══════════ -->
    <div v-if="accessoryOpen && view === 'edit'" class="sm-accessory-anchor">
      <NoteAccessory :open="accessoryOpen" :advanced="powerMode" target="โน้ต 3 · ห้อง 1 · “ทรง”" @act="log" @close="accessoryOpen = false" />
    </div>

    <!-- ══════════ S7 · Structure drawer (side-sheet desktop / bottom-sheet mobile) ══════════ -->
    <div v-if="drawerOpen" class="sm-scrim" @click="drawerOpen = false"></div>
    <StructureDrawer :open="drawerOpen" @act="log" @close="drawerOpen = false" />
  </div>
</template>

<style scoped>
.sm-root { max-width: var(--container-wide); margin: 0 auto; padding: var(--sp-3) var(--sp-4) 0; }

/* ---- S1 teleported chrome ---- */
.sb-sep { width: 1px; align-self: stretch; background: var(--line); min-height: 22px; }
.sm-s1-title { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: var(--ink); font-size: var(--fs-md); white-space: nowrap; }
.sm-save { font-size: var(--fs-xs); border-radius: 999px; padding: 2px 9px; border: 1px solid var(--line); color: var(--muted); white-space: nowrap; }
.sm-save.saved { color: #2e7d32; border-color: #b7dbb9; }
.sm-save.dirty { color: #b45309; border-color: #f0c48a; }
.sm-save.offline { color: var(--red); border-color: #eab3ad; }
/* S1·CAB strip — full-width contextual action bar under the shell bar */
.sm-cab-strip { display: flex; align-items: center; gap: 12px; background: var(--brand); color: #fff; border-radius: 12px; padding: 8px 12px; margin-bottom: var(--sp-2); }
.sm-cab-strip b { font-size: var(--fs-md); }
.sm-cab-x { border: none; background: rgba(255, 255, 255, 0.16); color: #fff; cursor: pointer; padding: 6px; border-radius: 8px; min-height: 40px; min-width: 40px; display: inline-flex; align-items: center; justify-content: center; }
.sm-cab-x:hover { background: rgba(255, 255, 255, 0.28); }
.sm-cab-acts { display: inline-flex; gap: 4px; margin-left: auto; }
.sm-cab-acts button { display: inline-flex; align-items: center; gap: 5px; border: none; background: rgba(255, 255, 255, 0.14); color: #fff; font: inherit; font-size: var(--fs-sm); padding: 8px 12px; border-radius: 8px; cursor: pointer; min-height: 40px; }
.sm-cab-acts button:hover { background: rgba(255, 255, 255, 0.26); }
.sm-cab-acts button.danger:hover { background: rgba(192, 57, 43, 0.9); }

.sm-icon { border: 1px solid var(--line); background: #fff; color: var(--ink); border-radius: 10px; padding: 0 9px; height: 40px; min-width: 40px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.sm-icon:hover { border-color: var(--brand); color: var(--brand); }
.sm-switch { display: inline-flex; gap: 2px; background: var(--cream); border: 1px solid var(--line); border-radius: 10px; padding: 2px; }
.sm-switch button { display: inline-flex; align-items: center; gap: 5px; border: none; background: transparent; color: var(--muted); font: inherit; font-size: var(--fs-sm); padding: 6px 10px; border-radius: 8px; min-height: 34px; cursor: pointer; }
.sm-switch button.on { background: #fff; color: var(--brand); font-weight: 700; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
.sm-struct { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line); background: #fff; color: var(--ink); border-radius: 10px; padding: 0 11px; height: 40px; font: inherit; font-size: var(--fs-sm); cursor: pointer; }
.sm-struct:hover { border-color: var(--brand); color: var(--brand); }

/* ---- mockup reading aids ---- */
.sm-controls { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-3); background: var(--cream); border: 1px solid var(--line); border-radius: 10px; padding: var(--sp-2) var(--sp-3); font-size: var(--fs-sm); margin-bottom: var(--sp-2); }
.sm-controls-t { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; color: var(--brand); }
.sm-chk { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.sm-sub { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); }
.sm-mini { border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 4px 10px; font: inherit; font-size: var(--fs-sm); cursor: pointer; min-height: 32px; }
.sm-mini.on { border-color: var(--brand); color: var(--brand); font-weight: 600; }
.sm-legend { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.sm-leg { font-size: var(--fs-xs); color: var(--muted); background: #fff; border: 1px dashed var(--line); border-radius: 8px; padding: 3px 8px; }
.sm-leg b { color: var(--brand); }

/* ---- S9 conflict banner ---- */
.sm-conflict { display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap; background: #fff4e6; border: 1px solid #f0b667; color: #8a5a12; border-radius: 10px; padding: var(--sp-2) var(--sp-3); font-size: var(--fs-sm); margin-bottom: var(--sp-3); }
.sm-conflict-acts { margin-left: auto; display: inline-flex; gap: var(--sp-2); }
.sm-conflict-acts button { border: 1px solid #d99a3f; background: #fff; color: #8a5a12; border-radius: 8px; padding: 5px 11px; font: inherit; font-size: var(--fs-sm); cursor: pointer; min-height: 34px; }
.sm-conflict-acts button.ghost { background: transparent; }

/* ---- S5 canvas ---- */
.sm-canvas { position: relative; }
.sm-canvas.has-dock { padding-bottom: 210px; } /* clear the fixed dock */
.sm-s5-tag, .sm-s4-tag { position: absolute; top: -9px; left: 8px; z-index: 2; font-size: 10px; font-weight: 700; color: #fff; background: var(--brand); border-radius: 6px; padding: 1px 7px; }
.sm-inline-tools { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin: var(--sp-2) 0 var(--sp-3); }
.sm-inline-tools button { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--line); background: #fff; color: var(--ink); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: var(--fs-sm); cursor: pointer; min-height: 36px; }
.sm-inline-tools button:hover { border-color: var(--brand); color: var(--brand); }
.sm-sheet-wrap { position: relative; border: 1px solid var(--line); border-radius: 12px; padding: var(--sp-4); background: #fff; }
.sm-lint { position: absolute; top: 8px; right: 8px; z-index: 2; display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-xs); color: var(--red); background: #fff; border: 1px solid #eab3ad; border-radius: 999px; padding: 3px 9px; }
.sm-caret-hint { display: flex; align-items: center; gap: 5px; font-size: var(--fs-xs); color: var(--muted); margin: var(--sp-3) 0 0; }

/* ---- S3 FAB ---- */
.sm-fab { position: fixed; right: 22px; bottom: 26px; z-index: 60; width: 60px; height: 60px; border-radius: 18px; border: none; background: var(--brand); color: #fff; box-shadow: 0 8px 24px rgba(139, 69, 19, 0.4); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.sm-fab:hover { filter: brightness(1.06); }

/* ---- S6 accessory anchor (desktop = floating near a note; mobile = the component pins itself bottom) ---- */
.sm-accessory-anchor { position: fixed; right: 24px; bottom: 220px; z-index: 70; }
@media (max-width: 600px) { .sm-accessory-anchor { position: static; } }

/* ---- S7 scrim ---- */
.sm-scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.32); z-index: 79; }

.sm-import-wrap { margin-top: var(--sp-2); }

@media (max-width: 760px) {
  .sm-switch button span { display: none; }
  .sm-struct span { display: none; }
  .sm-root { padding: var(--sp-2) var(--sp-3) 0; }
}
</style>
