<script setup>
// SingTransport — the ฝึกร้อง page's DockKey ADAPTER (reference #1 of the library).
// It no longer draws chrome itself: it turns the page's song state (props) into the DockKey
// descriptor list `ITEMS_SING` and hands it to <DockKey>, plus fills the three page-drawn
// cells (ไทม์ไลน์ · เลือกท่อน · Aa) via #cell-<id> slots. The engine owns layout / collapse /
// drag / Setting+pin / clamp. So ฝึกร้อง = data + custom cells; แผ่นเพลง/แก้ไข add their own
// ITEMS_* to the SAME engine later. Design SSOT: docs/ds/dockkey-library.md +
// docs/design/dockkey-sing-prototype.html.
//
//   Row 2: [ ไทม์ไลน์ col1-3 ][ คีย์ col4 ][ เลือกท่อน col5-6 ]
//   Row 1: [ Grip ][ Back ][ Play ][ Fwd ][ Aa ][ ⚙ ]
//   ⚙ Setting: วนซ้ำ · คอร์ด · ความเร็ว · แสดงผล · โปร่งใส  (each: ปรับ inline · ▲▼ · 📌)
import { ref, computed } from 'vue'
import Icon from './Icon.vue'
import DockKey from './DockKey.vue'
import { readingFontScale, setFontScale } from '../store.js'

const props = defineProps({
  playing: { type: Boolean, default: false },
  loop: { type: Boolean, default: false },
  frac: { type: Number, default: 0 },
  totalSec: { type: Number, default: 0 },
  // one entry per section OCCURRENCE in play order: { name, frac, startIndex, isHook, active, picked }
  markers: { type: Array, default: () => [] },
  // one row per distinct label for the selector: { name, isHook }
  tags: { type: Array, default: () => [] },
  selected: { type: Object, default: () => new Set() }, // Set<name>
  hasSections: { type: Boolean, default: false },
  // page controls as inline descriptors (from SongViewer.settingDescs): display/chord/key/tempo/…
  //   { id, icon, label, kind:'menu'|'action', value, badge, options:[{value,label}], onPick(v) }
  settings: { type: Array, default: () => [] },
})
const emit = defineEmits(['toggle-play', 'prev', 'next', 'toggle-loop', 'seek', 'jump', 'toggle-section', 'set-all'])

// transparency of the dock — v-model into the engine (persisted there under 'sing')
const alpha = ref(0.96)

// ---------- clock ----------
const two = (n) => String(n).padStart(2, '0')
const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${two(Math.round(Math.max(0, s) % 60))}`
const totalLabel = computed(() => fmt(props.totalSec)) // DS: show total time only
const pct = computed(() => (Math.max(0, Math.min(1, props.frac)) * 100).toFixed(2) + '%')

// ---------- selection summary ----------
const selCountLabel = computed(() => {
  const n = props.selected.size
  if (!n) return '·'
  return n === props.tags.length ? 'ทั้งหมด' : `${n}/${props.tags.length}`
})
const isSelected = (name) => props.selected.has(name)

// ---------- timeline segments (เส้นท่อน — เลือก=น้ำตาล · ไม่เลือก=เทา · หัวอยู่=หนา) ----------
// one bar per occurrence, spanning to the next occurrence's start (DS §3 · reuses markers).
const segments = computed(() => {
  const ms = props.markers
  return ms.map((m, i) => {
    const left = Math.max(0, Math.min(1, m.frac))
    const right = i + 1 < ms.length ? Math.max(left, Math.min(1, ms[i + 1].frac)) : 1
    return { left, width: Math.max(0, right - left), picked: m.picked, active: m.active }
  })
})

// ---------- scrub (tap/drag the bar = วิ่งไปทันที) ----------
const seekEl = ref(null)
let scrubbing = false
function fracAt(e) {
  const r = seekEl.value.getBoundingClientRect()
  return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
}
function onSeekDown(e) {
  scrubbing = true
  try { seekEl.value.setPointerCapture(e.pointerId) } catch { /* capture optional */ }
  emit('seek', fracAt(e))
}
function onSeekMove(e) { if (scrubbing) emit('seek', fracAt(e)) }
function onSeekUp() { scrubbing = false }

// ---------- Aa reader font size (global store) ----------
const fontPct = computed(() => Math.round(readingFontScale.value * 100))

// ---------- map the page's `settings` into ITEMS_SING controls ----------
const findSetting = (id) => props.settings.find((s) => s.id === id)
function menuControl(id) {
  const s = findSetting(id)
  if (!s) return null
  return { options: s.options, value: s.value, badge: s.badge, onPick: s.onPick }
}

// ---------- ITEMS_SING — the descriptor list handed to the engine ----------
const items = computed(() => {
  const keyCtl = menuControl('key')
  const list = [
    { id: 'grip', kind: 'grip', name: 'ย้าย/ย่อ', place: { anchor: 'left', row: 1 } },
    { id: 'back', kind: 'btn', name: 'ท่อนก่อน', icon: 'skip-back', place: { anchor: 'rightOf:grip', row: 1 }, hidden: !props.hasSections, run: () => emit('prev') },
    { id: 'play', kind: 'play', name: 'เล่น/หยุด', place: { anchor: 'rightOf:back', row: 1 }, control: { value: props.playing }, run: () => emit('toggle-play') },
    { id: 'forward', kind: 'btn', name: 'ท่อนถัดไป', icon: 'skip-forward', place: { anchor: 'rightOf:play', row: 1 }, hidden: !props.hasSections, run: () => emit('next') },
    { id: 'scale', kind: 'aa', name: 'ขนาดตัวอักษร', place: { anchor: 'leftOf:setting', row: 1 }, permanent: true },
    { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
    { id: 'timeslide', kind: 'timeline', name: 'ไทม์ไลน์', place: { row: 2, col: 1, span: 3 } },
    { id: 'key', kind: 'menu', name: 'คีย์', icon: 'key-round', place: { row: 2, col: 4, span: 1 }, control: keyCtl },
    { id: 'tuan', kind: 'sel', name: 'เลือกท่อน', icon: 'list-music', place: { row: 2, col: 5, span: 2 }, hidden: !props.hasSections },
    // optional — home is the ⚙ Setting page · ปักขึ้นแถบได้
    { id: 'repeat', kind: 'toggle', name: 'วนซ้ำ', icon: 'repeat', default: 'inSetting', pinnable: true, control: { value: props.loop, onToggle: () => emit('toggle-loop') } },
    { id: 'chord', kind: 'menu', name: 'คอร์ด', icon: 'guitar', default: 'inSetting', pinnable: true, control: menuControl('chord') },
    { id: 'speed', kind: 'menu', name: 'ความเร็ว', icon: 'gauge', default: 'inSetting', pinnable: true, control: menuControl('tempo') },
    { id: 'layer', kind: 'menu', name: 'แสดงผล', icon: 'layers', default: 'inSetting', pinnable: true, control: menuControl('display') },
    { id: 'alpha', kind: 'slider', name: 'โปร่งใส', icon: 'blend', default: 'inSetting', pinnable: true, control: { min: 40, max: 100, value: Math.round(alpha.value * 100), onInput: (v) => (alpha.value = v / 100) } },
  ]
  // drop menu items whose control the page didn't supply (keeps the engine fed with valid data)
  return list.filter((it) => it.kind !== 'menu' || it.control)
})
</script>

<template>
  <DockKey :items="items" store-key="sing" v-model:alpha="alpha">
    <!-- ===== ไทม์ไลน์ (col 1-3) — tap/drag = seek · เส้นท่อนเชื่อม selection · เวลารวม ===== -->
    <template #cell-timeslide>
      <span class="st-seekwrap">
        <span
          ref="seekEl"
          class="st-seek"
          role="slider"
          aria-label="ตำแหน่งการเล่น — แตะเพื่อไป"
          :aria-valuenow="Math.round(frac * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
          @pointerdown="onSeekDown"
          @pointermove="onSeekMove"
          @pointerup="onSeekUp"
          @pointercancel="onSeekUp"
        >
          <span class="st-trk"></span>
          <span
            v-for="(s, i) in segments"
            :key="i"
            class="st-seg"
            :class="{ on: s.picked, cur: s.active }"
            :style="{ left: s.left * 100 + '%', width: `calc(${s.width * 100}% - 3px)` }"
          ></span>
          <span class="st-fill" :style="{ width: pct }"></span>
          <span class="st-kn" :style="{ left: pct }"></span>
        </span>
        <span class="st-time">{{ totalLabel }}</span>
      </span>
    </template>

    <!-- ===== คีย์ (col 4) drawn by the engine (kind menu) ===== -->

    <!-- ===== เลือกท่อน (col 5-6) — trigger + selector panel (one-at-a-time via engine) ===== -->
    <template #cell-tuan="{ open, toggle, close }">
      <button
        class="st-seltrig"
        :class="{ on: open }"
        :aria-expanded="open"
        title="เลือกท่อนที่จะซ้อม"
        @click.stop="toggle"
      ><Icon name="list-music" :size="15" /> ท่อน <b>{{ selCountLabel }}</b></button>
      <div v-if="open" class="dk-pop st-selpanel" role="menu" @click.stop>
        <div class="st-sshead">⠿ เลือกท่อนที่จะซ้อม</div>
        <div class="st-ssall">
          <button class="st-ssallbtn" @click="emit('set-all', true)">☑ ทั้งหมด</button>
          <button class="st-ssallbtn" @click="emit('set-all', false)">☐ ไม่เลือก</button>
          <span class="st-sshint">ไม่เลือก = ทั้งเพลง</span>
        </div>
        <div class="st-sslist">
          <button
            v-for="s in tags"
            :key="s.name"
            class="st-ssrow"
            :class="{ on: isSelected(s.name) }"
            :aria-pressed="isSelected(s.name)"
            @click="emit('toggle-section', s.name)"
          >
            <span class="st-cx"><Icon v-if="isSelected(s.name)" name="check" :size="14" /></span>
            <span class="st-ssname">{{ s.name }}</span>
            <span v-if="s.isHook" class="st-hk">ฮุก</span>
          </button>
        </div>
      </div>
    </template>

    <!-- ===== Aa reader font size — permanent, 1-tap · slider popover (store-driven) ===== -->
    <template #cell-scale="{ open, toggle }">
      <button
        class="st-aa"
        :class="{ on: open }"
        :aria-expanded="open"
        :title="'ขนาดตัวอักษร ' + fontPct + '%'"
        aria-label="ขนาดตัวอักษร"
        @click.stop="toggle"
      ><b class="st-aa-lbl">Aa</b></button>
      <div v-if="open" class="dk-pop st-fontpop" role="menu" aria-label="ขนาดตัวอักษร" @click.stop>
        <div class="st-fonttitle">ขนาดตัวอักษร</div>
        <div class="st-fontrow">
          <span class="st-fonta st-fonta-sm" aria-hidden="true">A</span>
          <input class="st-fontslider" type="range" min="80" max="220" step="10" :value="fontPct" aria-label="ปรับขนาดตัวอักษร" @input="setFontScale(+$event.target.value / 100)" />
          <span class="st-fonta st-fonta-lg" aria-hidden="true">A</span>
        </div>
        <div class="st-fontfoot">
          <span class="st-fontval">{{ fontPct }}%</span>
          <button class="st-fontreset" :disabled="fontPct === 100" @click="setFontScale(1)">↺ 100%</button>
        </div>
      </div>
    </template>
  </DockKey>
</template>

<style scoped>
/* ===== ไทม์ไลน์ ===== */
.st-seekwrap { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; font-size: 10.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
/* min-width gives the fit-content dock a sensible width (dock hugs the timeline row · P'Aim) */
.st-seek { position: relative; flex: 1; min-width: 190px; height: 26px; display: flex; align-items: center; cursor: pointer; touch-action: none; }
.st-time { flex: 0 0 auto; }
.st-trk { position: absolute; left: 0; right: 0; height: 4px; background: var(--line); border-radius: 3px; top: 50%; transform: translateY(-50%); }
.st-fill { position: absolute; left: 0; height: 4px; background: var(--brand); border-radius: 3px; top: 50%; transform: translateY(-50%); pointer-events: none; }
/* section bars: unselected = grey (skipped) · selected = brand (will play) · current = taller */
.st-seg { position: absolute; height: 5px; top: 50%; transform: translateY(-50%); border-radius: 3px; background: var(--line); pointer-events: none; transition: height 0.1s; }
.st-seg.on { background: var(--brand); }
.st-seg.cur { height: 9px; }
.st-kn { position: absolute; width: 16px; height: 16px; background: var(--brand); border: 3px solid #fff; border-radius: 50%; top: 50%; transform: translate(-50%, -50%); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35); pointer-events: none; z-index: 3; }

/* ===== popovers (slot-rendered, so they carry their own position; DockKey clamps them by .dk-pop) ===== */
.st-selpanel, .st-fontpop {
  pointer-events: auto;
  position: absolute; bottom: calc(100% + 8px);
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); z-index: 30;
}

/* ===== เลือกท่อน trigger + panel ===== */
.st-seltrig {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px; width: 100%;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 8px; padding: 0 10px; font: inherit; font-size: 12px; font-weight: 600;
  height: var(--touch-min); min-height: 0; cursor: pointer;
}
@media (hover: hover) { .st-seltrig:hover { border-color: var(--brand); color: var(--brand); } }
.st-seltrig.on { border-color: var(--brand); color: var(--brand); }
.st-seltrig b { color: var(--brand); }
.st-selpanel { left: 0; right: auto; width: 290px; max-width: calc(100vw - 24px); display: flex; flex-direction: column; padding: 0; }
.st-sshead { padding: 10px 12px 6px; font-weight: 700; }
.st-ssall { display: flex; gap: 8px; padding: 0 12px 8px; border-bottom: 1px solid var(--line); flex-wrap: wrap; align-items: center; }
.st-ssallbtn { border: 1px solid var(--line); background: transparent; color: var(--ink); border-radius: 8px; padding: 5px 12px; font: inherit; font-size: 12px; min-height: var(--touch-min); cursor: pointer; }
@media (hover: hover) { .st-ssallbtn:hover { border-color: var(--brand); color: var(--brand); } }
.st-sshint { font-size: 11px; color: var(--muted); }
.st-sslist { padding: 6px; max-height: 52vh; overflow: auto; }
.st-ssrow { display: flex; align-items: center; gap: 12px; width: 100%; padding: 9px 12px; border: 0; background: transparent; border-radius: 10px; cursor: pointer; font: inherit; font-size: 14px; color: var(--ink); text-align: left; min-height: var(--touch-min); }
@media (hover: hover) { .st-ssrow:hover { background: var(--cream); } }
.st-cx { width: 22px; height: 22px; flex: 0 0 22px; border: 1.5px solid var(--muted); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; }
.st-ssrow.on .st-cx { background: var(--ok, #1d7a54); border-color: var(--ok, #1d7a54); }
.st-ssrow.on { color: var(--ok, #1d7a54); font-weight: 600; }
.st-ssname { flex: 1; }
.st-hk { font-size: 10px; color: var(--brand); border: 1px dashed var(--brand); border-radius: 10px; padding: 0 7px; }

/* ===== Aa ===== */
.st-aa {
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 10px; padding: 0 8px; height: var(--touch-min); min-height: 0; min-width: var(--touch-min); cursor: pointer;
}
@media (hover: hover) { .st-aa:hover { border-color: var(--brand); } }
.st-aa.on { border-color: var(--brand); color: var(--brand); }
.st-aa-lbl { font-size: 15px; font-weight: 700; letter-spacing: -0.3px; }
.st-fontpop { left: 0; min-width: 220px; max-width: calc(100vw - 24px); padding: 12px; }
.st-fonttitle { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
.st-fontrow { display: flex; align-items: center; gap: 10px; }
.st-fonta { color: var(--ink); flex: 0 0 auto; line-height: 1; }
.st-fonta-sm { font-size: 13px; }
.st-fonta-lg { font-size: 22px; font-weight: 700; }
.st-fontslider { flex: 1; min-width: 0; accent-color: var(--brand); height: var(--touch-min); }
.st-fontfoot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.st-fontval { font-size: 11px; color: var(--muted); }
.st-fontreset { border: 1px solid var(--line); background: transparent; color: var(--ink); border-radius: 8px; padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer; min-height: 32px; }
.st-fontreset:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); }
.st-fontreset:disabled { opacity: 0.4; cursor: default; }
</style>
