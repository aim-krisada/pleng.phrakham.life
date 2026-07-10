<script setup>
// SingTransport — the reusable "music-player" band for the studio dock (B043).
// It is a CORE dock control: dropped into <StudioDock> as a full-width D8 custom control
// ({ type:'custom', region:'top', component: SingTransport, props }). The dock stays blind;
// the PAGE (SongViewer) owns all song state and wires it through `props`, while the dock
// injects its own chrome hooks (หุบ + ความโปร่ง) via dock-collapsed / dock-alpha so those
// affordances live INSIDE the player, not on a separate dock row (P'Aim art-direction).
//
// Layout = a real 2-row music player (ref docs/pm/realuse-assets/ref-music-player-play.jpg):
//   row 1 (framed): [หุบ grip] + progress bar + section dots + time  (+ ☰ เลือกท่อน)
//   row 2:          [⚙ ตั้งค่า] + ⏮ ▶/⏸ ⏭ + 🔁 + pinned quick controls (คีย์/ความเร็ว/แสดงผล)
//   ⚙ panel: every control adjustable inline (คอร์ด/ฟอนต์/ดาวน์โหลด/พิมพ์/ความโปร่ง) + 📌 pin
// The play/pause button is icon-only (no background) — P'Aim directive.
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import Icon from './Icon.vue'
import { readingFontScale, setFontScale } from '../store.js'

const props = defineProps({
  playing: { type: Boolean, default: false },
  loop: { type: Boolean, default: false },
  frac: { type: Number, default: 0 },
  totalSec: { type: Number, default: 0 },
  // timeline dots — one per section OCCURRENCE, in play order:
  //   { name, frac, startIndex, isHook, active, picked }
  markers: { type: Array, default: () => [] },
  // selector rows — one per distinct label: { name, isHook }
  tags: { type: Array, default: () => [] },
  selected: { type: Object, default: () => new Set() }, // Set<name>
  hasSections: { type: Boolean, default: false },
  // every other control, as inline descriptors (§4c). Each:
  //   { id, icon(Lucide), label, kind:'menu'|'stepper'|'action'|'slider',
  //     menu:    value, badge, options:[{value,label}], onPick(v)
  //     stepper: display?, onPrev(), onNext(), prevDisabled?, nextDisabled?, prevLabel?, nextLabel?
  //     action:  actionLabel, onAction()
  //     slider:  min, max, value, onInput(v), display? }
  settings: { type: Array, default: () => [] },
  // dock-chrome hooks injected by StudioDock (top-region contract): the grip drives the
  // dock's own collapse/drag machinery (tap = หุบ, press-drag = ย้ายทั้งแถบ · B037) so the
  // whole player moves as one, and transparency rides dock-alpha.
  dockCollapsed: { type: Boolean, default: false },
  dockAlpha: { type: Number, default: 0.92 },
  gripDown: { type: Function, default: null },
  gripMove: { type: Function, default: null },
  gripUp: { type: Function, default: null },
})
const emit = defineEmits([
  'toggle-play', 'prev', 'next', 'toggle-loop', 'seek', 'jump', 'toggle-section', 'set-all',
  'dock-collapse', 'dock-alpha',
])

// ---------- clock ----------
const two = (n) => String(n).padStart(2, '0')
const fmt = (s) => `${Math.floor(s / 60)}:${two(Math.round(s % 60))}`
const pct = computed(() => (Math.max(0, Math.min(1, props.frac)) * 100).toFixed(2) + '%')
const curLabel = computed(() => fmt(props.frac * props.totalSec))
const totalLabel = computed(() => fmt(props.totalSec))

// ---------- selection summary ----------
const selCountLabel = computed(() => {
  const n = props.selected.size
  if (!n) return '·'
  return n === props.tags.length ? 'ทั้งหมด' : `${n}/${props.tags.length}`
})
const isSelected = (name) => props.selected.has(name)

// ---------- scrub (H = drag the bar) ----------
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

// ---------- ⚙ settings panel · ☰ selector · pinned dropdowns — one open at a time ----------
const openPanel = ref(null) // 'settings' | 'select' | null
const openMenu = ref(null) // id of the pinned menu whose dropdown is open
function togglePanel(which) { openPanel.value = openPanel.value === which ? null : which; openMenu.value = null }
function closeAll() { openPanel.value = null; openMenu.value = null }
function toggleMenu(id) { openMenu.value = openMenu.value === id ? null : id; openPanel.value = null }
function pickMenu(s, o) { s.onPick(o.value); openMenu.value = null }
function onKey(e) { if (e.key === 'Escape') closeAll() }

// viewport: desktop grip drags the dock (pointer handlers from StudioDock); mobile grip
// just taps to หุบ (dragging the sheet on a phone fights page scroll — B037 kept it off).
const mobile = ref(false)
let mq = null
function syncMobile() { mobile.value = mq ? mq.matches : false }
function onOutside(e) {
  if (e.target.closest?.('.mp-panel') || e.target.closest?.('.mp-dd') || e.target.closest?.('.mp-more') || e.target.closest?.('.mp-pbtn') || e.target.closest?.('.mp-seltrig') || e.target.closest?.('.mp-sheet')) return
  closeAll()
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.addEventListener('mousedown', onOutside)
  mq = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 760px)') : null
  syncMobile()
  mq?.addEventListener?.('change', syncMobile)
  // matchMedia 'change' can be missed on programmatic viewport resizes (same guard as
  // StudioDock), so also re-sync on plain resize.
  window.addEventListener('resize', syncMobile)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('mousedown', onOutside)
  mq?.removeEventListener?.('change', syncMobile)
  window.removeEventListener('resize', syncMobile)
})

// ---------- 📌 pin (§4c) — key/ความเร็ว/แสดงผล are on the bar by default so it isn't empty ----------
const PIN_KEY = 'pleng.dock.sing.pins'
const DEFAULT_PINS = ['key', 'tempo', 'display']
const pins = ref(loadPins())
function loadPins() {
  try {
    const raw = JSON.parse(localStorage.getItem(PIN_KEY) || 'null')
    if (Array.isArray(raw)) return raw
  } catch { /* ignore */ }
  return DEFAULT_PINS.slice()
}
function isPinned(id) { return pins.value.includes(id) }
function savePins() { try { localStorage.setItem(PIN_KEY, JSON.stringify(pins.value)) } catch { /* ignore */ } }
function togglePin(id) {
  pins.value = isPinned(id) ? pins.value.filter((x) => x !== id) : [...pins.value, id]
  savePins()
}
// reorder a pinned control on the bar (D6-style ▲▼ · the pin order IS the bar order)
const pinIndex = (id) => pins.value.indexOf(id)
function movePin(id, delta) {
  const a = pins.value.slice()
  const i = a.indexOf(id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= a.length) return
  ;[a[i], a[j]] = [a[j], a[i]]
  pins.value = a
  savePins()
}

// transparency (ความโปร่ง) is dock chrome, not a song setting — SingTransport owns its
// descriptor and drives the dock's alpha via the injected hook. It lives in the ⚙ panel
// (P'Aim) and can be pinned like any other control.
const alphaSetting = computed(() => ({
  id: 'alpha', icon: 'blend', label: 'ความโปร่งแถบ', kind: 'slider',
  min: 40, max: 100, value: Math.round(props.dockAlpha * 100),
  onInput: (v) => emit('dock-alpha', v / 100),
}))
const allSettings = computed(() => [...props.settings, alphaSetting.value])

// ---------- Aa reader font size (B045) ----------
// A permanent 1-tap control in the player (moved off the top bar). It drives the GLOBAL
// reader scale (store.readingFontScale) — page-independent, like ความโปร่ง above — so the
// player owns it directly without the page wiring a descriptor. It rides the same
// openMenu('fontsize') / .mp-dd popover + on-screen clamp as the pinned menus, but is NOT a
// pinnable setting (never in allSettings/pins) so it can't be customized away from a reader.
const fontPct = computed(() => Math.round(readingFontScale.value * 100))
// order the bar controls by the PIN order (คีย์ → ความเร็ว → แสดงผล), not the panel order
const pinnedSettings = computed(() => pins.value.map((id) => allSettings.value.find((s) => s.id === id)).filter(Boolean))

// ---------- keep every popup fully on-screen (reuse dock-polish clamp · P'Aim req A) ----------
// The ⚙ panel / pinned dropdown / selector open UPWARD from the bottom dock and can spill off
// the top or a side edge. After one opens, measure it and translate it back inside the
// viewport + 8px so it is never cut off (same idea StudioDock uses for its own popovers).
const rootEl = ref(null)
function clampOffset(el) {
  const r = el.getBoundingClientRect()
  const m = 8
  let dx = 0, dy = 0
  if (r.right > window.innerWidth - m) dx = window.innerWidth - m - r.right
  if (r.left + dx < m) dx = m - (r.left + dx)
  if (r.bottom > window.innerHeight - m) dy = window.innerHeight - m - r.bottom
  if (r.top + dy < m) dy = m - (r.top + dy)
  return { x: dx, y: dy }
}
// a small dropdown keeps the old imperative clamp (never dragged)
function clampEl(el) {
  if (!el) return
  el.style.transform = ''
  const o = clampOffset(el)
  el.style.transform = o.x || o.y ? `translate(${o.x}px, ${o.y}px)` : ''
}

// the big popups (⚙ panel · selector) are DRAGGABLE (P'Aim real-use r3 #1): a reactive
// offset both clamps them on-screen when they open AND lets the user drag them by the
// header out of the way. Desktop only; the mobile selector stays a bottom sheet.
const popOffset = ref({ x: 0, y: 0 })
const popStyle = computed(() => ({ transform: `translate(${popOffset.value.x}px, ${popOffset.value.y}px)` }))
let popDrag = false, pdX = 0, pdY = 0, poX = 0, poY = 0
function popDown(e) {
  if (mobile.value) return
  popDrag = true; pdX = e.clientX; pdY = e.clientY; poX = popOffset.value.x; poY = popOffset.value.y
  try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer still tracks */ }
}
function popMove(e) { if (popDrag) popOffset.value = { x: poX + (e.clientX - pdX), y: poY + (e.clientY - pdY) } }
function popUp() { popDrag = false }
watch([openPanel, openMenu], async () => {
  popOffset.value = { x: 0, y: 0 } // reset so we measure the natural position
  await nextTick()
  const root = rootEl.value
  if (!root) return
  clampEl(root.querySelector('.mp-dd'))
  const big = root.querySelector('.mp-panel') || (!mobile.value ? root.querySelector('.mp-sheet') : null)
  if (big) popOffset.value = clampOffset(big)
})
</script>

<template>
  <div ref="rootEl" class="mp">
    <!-- ===== row 1: grip (OUTSIDE the frame) + [ progress + dots + time (+ ☰) ] ===== -->
    <div class="mp-r1">
      <!-- desktop: tap = หุบ, press-drag = ย้ายทั้งแถบ (dock machinery via injected handlers) -->
      <button
        v-if="!mobile"
        class="mp-grip mp-grip-drag"
        aria-label="ลากเพื่อย้าย · แตะเพื่อหุบ"
        title="ลากเพื่อย้าย · แตะเพื่อหุบ"
        @pointerdown="gripDown && gripDown($event)"
        @pointermove="gripMove && gripMove($event)"
        @pointerup="gripUp && gripUp($event)"
        @pointercancel="gripUp && gripUp($event)"
      ><Icon name="dock-grip-collapse" :size="22" /></button>
      <!-- mobile: tap = หุบ (no drag) -->
      <button
        v-else
        class="mp-grip"
        aria-label="หุบแถบ"
        title="หุบแถบเครื่องเล่น"
        @click="emit('dock-collapse')"
      ><Icon name="dock-grip-collapse" :size="22" /></button>
      <div class="mp-tl mp-framed">
        <div class="mp-seekrow">
          <span class="mp-t">{{ curLabel }}</span>
          <div
            ref="seekEl"
            class="mp-seek"
            role="slider"
            aria-label="ตำแหน่งการเล่น — ลากเพื่อหา"
            :aria-valuenow="Math.round(frac * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
            @pointerdown="onSeekDown"
            @pointermove="onSeekMove"
            @pointerup="onSeekUp"
            @pointercancel="onSeekUp"
          >
            <div class="mp-track"></div>
            <div class="mp-fill" :style="{ width: pct }"></div>
            <div class="mp-dot" :style="{ left: pct }"></div>
            <span class="mp-markers">
              <button
                v-for="(m, i) in markers"
                :key="i"
                class="mp-mk"
                :class="{ hook: m.isHook, active: m.active, picked: m.picked }"
                :style="{ left: (m.frac * 100).toFixed(2) + '%' }"
                :title="m.name + ' — แตะกระโดด'"
                :aria-label="'ไปที่ ' + m.name"
                @click.stop="emit('jump', m.startIndex)"
                @pointerdown.stop
              ></button>
            </span>
          </div>
          <span class="mp-t">{{ totalLabel }}</span>
          <button
            v-if="hasSections"
            class="mp-seltrig"
            :class="{ on: openPanel === 'select' }"
            :aria-expanded="openPanel === 'select'"
            title="เลือกท่อนที่จะซ้อม"
            @click.stop="togglePanel('select')"
          >
            <Icon name="list-music" :size="15" /> เลือกท่อน <b>{{ selCountLabel }}</b>
          </button>
        </div>
      </div>
    </div>

    <!-- ===== row 2: ⚙ + transport + pinned quick controls ===== -->
    <div class="mp-r2">
      <button
        class="mp-more"
        :class="{ on: openPanel === 'settings' }"
        :aria-expanded="openPanel === 'settings'"
        aria-label="ตั้งค่า"
        title="ตั้งค่า (บ้านของทุกปุ่ม)"
        @click.stop="togglePanel('settings')"
      ><Icon name="settings" :size="20" /></button>

      <span class="mp-transport" role="group" aria-label="ควบคุมการเล่น">
        <button v-if="hasSections" class="mp-btn" aria-label="ท่อนก่อน" title="ท่อนก่อน" @click="emit('prev')">
          <Icon name="skip-back" :size="20" />
        </button>
        <!-- icon-only play/pause (no background) — P'Aim directive -->
        <button
          class="mp-btn mp-play"
          :aria-label="playing ? 'พัก' : 'เล่น'"
          :title="playing ? 'พัก' : 'เล่น'"
          @click="emit('toggle-play')"
        ><Icon :name="playing ? 'pause' : 'play'" :size="28" /></button>
        <button v-if="hasSections" class="mp-btn" aria-label="ท่อนถัดไป" title="ท่อนถัดไป" @click="emit('next')">
          <Icon name="skip-forward" :size="20" />
        </button>
        <button
          class="mp-btn"
          :class="{ on: loop }"
          :aria-pressed="loop"
          aria-label="วนซ้ำ"
          title="วนซ้ำ (เปิด/ปิด)"
          @click="emit('toggle-loop')"
        ><Icon name="repeat" :size="19" /></button>
      </span>

      <!-- Aa reader font size (B045) — permanent 1-tap control (moved off the top bar). Sits
           OUTSIDE .mp-pins (not a pinnable setting) so a reader can never lose it. Tap = a
           popover with a live slider; sliding resizes the song text in real time. -->
      <span class="mp-fontwrap" data-font="fontsize">
        <button
          class="mp-pbtn mp-fontbtn"
          :class="{ on: openMenu === 'fontsize' }"
          :aria-expanded="openMenu === 'fontsize'"
          aria-label="ขนาดตัวอักษร"
          title="ขนาดตัวอักษร"
          @click.stop="toggleMenu('fontsize')"
        >
          <b class="mp-aa">Aa</b>
          <b class="mp-pbadge">{{ fontPct }}%</b>
          <Icon name="chevron-down" :size="13" class="mp-pcaret" />
        </button>
        <div v-if="openMenu === 'fontsize'" class="mp-dd mp-fontdd" role="menu" aria-label="ขนาดตัวอักษร" @click.stop>
          <div class="mp-fonttitle">ขนาดตัวอักษร</div>
          <div class="mp-fontrow">
            <span class="mp-fonta mp-fonta-sm" aria-hidden="true">A</span>
            <input
              class="mp-fontslider"
              type="range"
              min="80"
              max="220"
              step="10"
              :value="fontPct"
              aria-label="ปรับขนาดตัวอักษร"
              @input="setFontScale(+$event.target.value / 100)"
            />
            <span class="mp-fonta mp-fonta-lg" aria-hidden="true">A</span>
          </div>
          <div class="mp-fontval">{{ fontPct }}%</div>
        </div>
      </span>

      <!-- pinned quick controls — compact icon+badge, matching the dock convention -->
      <span class="mp-pins">
        <template v-for="s in pinnedSettings" :key="s.id">
          <!-- menu → compact button + dropdown -->
          <span v-if="s.kind === 'menu'" class="mp-pinwrap" :data-setting="s.id">
            <button
              class="mp-pbtn"
              :class="{ on: openMenu === s.id }"
              :aria-expanded="openMenu === s.id"
              :aria-label="s.label"
              :title="s.label"
              @click.stop="toggleMenu(s.id)"
            >
              <Icon :name="s.icon" :size="17" />
              <b v-if="s.badge" class="mp-pbadge">{{ s.badge }}</b>
              <Icon name="chevron-down" :size="13" class="mp-pcaret" />
            </button>
            <div v-if="openMenu === s.id" class="mp-dd" role="menu" @click.stop>
              <button
                v-for="o in s.options"
                :key="o.value"
                class="mp-ddrow"
                role="menuitemradio"
                :aria-checked="o.value === s.value"
                @click="pickMenu(s, o)"
              >
                <span class="mp-ddck">{{ o.value === s.value ? '●' : '' }}</span>{{ o.label }}
              </button>
            </div>
          </span>
          <!-- stepper → compact ◀ value ▶ -->
          <span v-else-if="s.kind === 'stepper'" class="mp-pinwrap mp-pstep" :data-setting="s.id" :title="s.label">
            <button class="mp-pstepbtn" :disabled="s.prevDisabled" :aria-label="s.prevLabel || (s.label + ' ลด')" @click="s.onPrev()">{{ s.prevLabel || '◀' }}</button>
            <b v-if="s.display" class="mp-pbadge">{{ s.display }}</b>
            <button class="mp-pstepbtn" :disabled="s.nextDisabled" :aria-label="s.nextLabel || (s.label + ' เพิ่ม')" @click="s.onNext()">{{ s.nextLabel || '▶' }}</button>
          </span>
          <!-- slider → compact range (e.g. ความโปร่ง) -->
          <span v-else-if="s.kind === 'slider'" class="mp-pinwrap" :data-setting="s.id" :title="s.label">
            <Icon :name="s.icon" :size="16" />
            <input class="mp-pslider" type="range" :min="s.min" :max="s.max" :value="s.value" :aria-label="s.label" @input="s.onInput(+$event.target.value)" />
          </span>
          <!-- action → icon button -->
          <button v-else class="mp-pbtn" :data-setting="s.id" :aria-label="s.label" :title="s.label" @click="s.onAction()">
            <Icon :name="s.icon" :size="17" />
          </button>
        </template>
      </span>
    </div>

    <!-- ===== ⚙ settings panel — every control, adjustable inline even unpinned (§4c) ===== -->
    <div v-if="openPanel === 'settings'" class="mp-panel" :style="popStyle" @click.stop>
      <div
        class="mp-ptitle mp-drag"
        title="ลากเพื่อย้ายแผง"
        @pointerdown="popDown"
        @pointermove="popMove"
        @pointerup="popUp"
        @pointercancel="popUp"
      >⠿ ตั้งค่า — ปรับได้ที่นี่เลย · 📌 = ปักขึ้นแถบ</div>
      <div v-for="s in allSettings" :key="s.id" class="mp-prow" :data-setting="s.id">
        <span class="mp-mi"><Icon :name="s.icon" :size="16" /></span>
        <span class="mp-pl">{{ s.label }}</span>
        <span class="mp-pc">
          <template v-if="s.kind === 'menu'">
            <select class="mp-sel" :value="s.value" :aria-label="s.label" @change="s.onPick($event.target.value)">
              <option v-for="o in s.options" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </template>
          <template v-else-if="s.kind === 'stepper'">
            <button class="mp-stp" :disabled="s.prevDisabled" :aria-label="s.prevLabel || 'ลด'" @click="s.onPrev()">{{ s.prevLabel || '◀' }}</button>
            <b v-if="s.display" class="mp-stpv">{{ s.display }}</b>
            <button class="mp-stp" :disabled="s.nextDisabled" :aria-label="s.nextLabel || 'เพิ่ม'" @click="s.onNext()">{{ s.nextLabel || '▶' }}</button>
          </template>
          <template v-else-if="s.kind === 'slider'">
            <input class="mp-prange" type="range" :min="s.min" :max="s.max" :value="s.value" :aria-label="s.label" @input="s.onInput(+$event.target.value)" />
            <span class="mp-slval">{{ s.value }}%</span>
          </template>
          <template v-else-if="s.kind === 'action'">
            <button class="mp-stp" @click="s.onAction()">{{ s.actionLabel || 'เปิด' }}</button>
          </template>
        </span>
        <!-- reorder on the bar (only for pinned controls · the pin order = bar order) -->
        <button
          v-if="isPinned(s.id)"
          class="mp-mv"
          :disabled="pinIndex(s.id) === 0"
          aria-label="เลื่อนซ้ายบนแถบ"
          title="เลื่อนไปทางซ้าย"
          @click.stop="movePin(s.id, -1)"
        >▲</button>
        <button
          v-if="isPinned(s.id)"
          class="mp-mv"
          :disabled="pinIndex(s.id) === pins.length - 1"
          aria-label="เลื่อนขวาบนแถบ"
          title="เลื่อนไปทางขวา"
          @click.stop="movePin(s.id, 1)"
        >▼</button>
        <button
          class="mp-pin"
          :class="{ on: isPinned(s.id) }"
          :aria-pressed="isPinned(s.id)"
          :aria-label="(isPinned(s.id) ? 'ถอด' : 'ปัก') + s.label + 'จากแถบ'"
          title="ปัก/ถอนขึ้นแถบ"
          @click.stop="togglePin(s.id)"
        >📌</button>
      </div>
    </div>

    <!-- ===== ☰ section selector — Gmail list + All/None (mobile = bottom sheet) ===== -->
    <div v-if="openPanel === 'select'" class="mp-selmask" @click="closeAll"></div>
    <div v-if="openPanel === 'select'" class="mp-sheet" :style="popStyle" @click.stop>
      <div
        class="mp-sshead mp-drag"
        title="ลากเพื่อย้ายรายการ"
        @pointerdown="popDown"
        @pointermove="popMove"
        @pointerup="popUp"
        @pointercancel="popUp"
      >
        <b>⠿ เลือกท่อนที่จะซ้อม</b>
        <button class="mp-ssclose" aria-label="ปิด" @click="closeAll" @pointerdown.stop><Icon name="x" :size="16" /></button>
      </div>
      <div class="mp-ssall">
        <button class="mp-ssallbtn" @click="emit('set-all', true)">☑ ทั้งหมด</button>
        <button class="mp-ssallbtn" @click="emit('set-all', false)">☐ ไม่เลือก</button>
        <span class="mp-sshint">ไม่เลือก = เล่นทั้งเพลง</span>
      </div>
      <div class="mp-sslist">
        <button
          v-for="s in tags"
          :key="s.name"
          class="mp-ssrow"
          :class="{ on: isSelected(s.name) }"
          :aria-pressed="isSelected(s.name)"
          @click="emit('toggle-section', s.name)"
        >
          <span class="mp-cx"><Icon v-if="isSelected(s.name)" name="check" :size="14" /></span>
          <span class="mp-ssname">{{ s.name }}</span>
          <span v-if="s.isHook" class="mp-hk">ฮุก</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mp { width: 100%; position: relative; }

/* ===== row 1: grip (outside the frame) + framed timeline ===== */
.mp-r1 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.mp-grip {
  flex: 0 0 auto;
  width: 28px;
  height: var(--touch-min); /* 44 tap target (was 40) */
  min-height: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
}
.mp-grip-drag { cursor: grab; touch-action: none; }
.mp-grip-drag:active { cursor: grabbing; }
@media (hover: hover) { .mp-grip:hover { color: var(--ink); background: var(--cream); } }
/* the frame lives on the timeline itself now, so the grip sits OUTSIDE it (P'Aim) */
.mp-framed { border: 1px solid var(--line); border-radius: 10px; padding: 5px 9px 3px; }
.mp-tl { flex: 1; min-width: 0; }
.mp-seltrig {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 8px; padding: 4px 10px; font: inherit; font-size: 12px; font-weight: 600;
  min-height: var(--touch-min); cursor: pointer;
}
.mp-seltrig b { color: var(--brand); }
.mp-seltrig.on, .mp-seltrig:hover { border-color: var(--brand); color: var(--brand); }
.mp-seekrow { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 8px; font-size: 10.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.mp-t { flex: 0 0 auto; }
/* narrower slider (P'Aim): base 200px, may shrink; leaves room for เลือกท่อน on the same row */
.mp-seek { position: relative; flex: 0 1 200px; height: 24px; display: flex; align-items: center; cursor: pointer; touch-action: none; }
.mp-seekrow .mp-seltrig { margin-left: auto; }
.mp-track { position: absolute; left: 0; right: 0; height: 4px; background: var(--line); border-radius: 3px; top: 50%; transform: translateY(-50%); }
.mp-fill { position: absolute; left: 0; height: 4px; background: var(--brand); border-radius: 3px; top: 50%; transform: translateY(-50%); }
.mp-dot { position: absolute; width: 13px; height: 13px; background: var(--brand); border: 2px solid #fff; border-radius: 50%; top: 50%; transform: translate(-50%, -50%); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); pointer-events: none; }
.mp-markers { position: absolute; left: 0; right: 0; top: 0; bottom: 0; }
.mp-mk {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  /* box-sizing + min-height:0 so the global button min-height can't stretch the dot into
     an ellipse — it must stay a true circle (width === height · P'Aim real-use r2 #4) */
  box-sizing: border-box; width: 12px; height: 12px; min-height: 0; border-radius: 50%;
  background: #fff; border: 1.5px solid var(--brand); padding: 0; cursor: pointer; z-index: 2;
}
.mp-mk.hook { background: var(--cream); }
.mp-mk.active { background: var(--brand); }
.mp-mk.picked { border-color: var(--ok, #1d7a54); background: var(--ok, #1d7a54); }

/* ===== row 2: ⚙ + transport + pins ===== */
.mp-r2 { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.mp-more {
  flex: 0 0 auto; width: var(--touch-min); height: var(--touch-min); min-height: 0; padding: 0;
  border: 0; background: transparent; color: var(--muted);
  display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; cursor: pointer;
}
@media (hover: hover) { .mp-more:hover { background: var(--cream); color: var(--ink); } }
.mp-more.on { color: var(--brand); background: var(--cream); }
.mp-transport { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.mp-btn {
  width: var(--touch-min); height: var(--touch-min); min-height: 0; padding: 0;
  border: 0; background: transparent; color: var(--ink);
  display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; cursor: pointer;
}
@media (hover: hover) { .mp-btn:hover { background: var(--cream); } }
.mp-btn.on { color: var(--brand); background: var(--cream); }
/* play/pause = icon-only, no background circle (P'Aim directive) */
.mp-play { width: 50px; height: 50px; color: var(--brand); }
.mp-play:hover { background: transparent; filter: brightness(1.1); }

/* pinned quick controls — compact */
.mp-pins { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.mp-pinwrap { position: relative; display: inline-flex; align-items: center; gap: 3px; }
.mp-pbtn {
  display: inline-flex; align-items: center; gap: 3px;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 10px; padding: 0 8px; height: var(--touch-min); min-height: 0; font: inherit; cursor: pointer;
}
@media (hover: hover) { .mp-pbtn:hover { border-color: var(--brand); } }
.mp-pbtn.on { border-color: var(--brand); color: var(--brand); }
.mp-pbadge { font-size: 12.5px; font-weight: 700; }
.mp-pcaret { color: var(--muted); }

/* ===== Aa reader font size (B045) — a pinned-style button + slider popover ===== */
.mp-fontwrap { position: relative; display: inline-flex; align-items: center; flex: 0 0 auto; }
.mp-aa { font-size: 15px; font-weight: 700; line-height: 1; letter-spacing: -0.3px; }
.mp-fontdd {
  /* wider than a menu so the slider has room; the popup clamp keeps it on-screen */
  min-width: 210px; padding: 10px;
}
.mp-fonttitle { font-size: 12px; color: var(--muted); padding: 0 2px 8px; }
.mp-fontrow { display: flex; align-items: center; gap: 10px; }
.mp-fonta { color: var(--ink); flex: 0 0 auto; line-height: 1; }
.mp-fonta-sm { font-size: 13px; }
.mp-fonta-lg { font-size: 22px; font-weight: 700; }
.mp-fontslider { flex: 1; min-width: 0; accent-color: var(--brand); height: var(--touch-min); }
.mp-fontval { font-size: 11px; color: var(--muted); text-align: center; margin-top: 6px; font-variant-numeric: tabular-nums; }
.mp-pstep { border: 1px solid var(--line); border-radius: 10px; padding: 0 3px; height: var(--touch-min); }
.mp-pstepbtn { border: 0; background: transparent; color: var(--ink); font: inherit; font-size: 13px; padding: 0 5px; height: 100%; cursor: pointer; }
.mp-pstepbtn:disabled { opacity: 0.4; cursor: default; }
.mp-pslider { width: 80px; accent-color: var(--brand); }
/* dropdown for a pinned menu control (opens ABOVE the bar) */
.mp-dd {
  position: absolute; bottom: calc(100% + 6px); left: 0; z-index: 30;
  background: #fff; border: 1px solid var(--line); border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); padding: 5px;
  /* width fits the longest option (no mid-word wrap); the popup clamp keeps it on-screen */
  width: max-content; min-width: 150px; max-width: calc(100vw - 24px); max-height: 50vh; overflow: auto;
}
.mp-ddrow { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 8px; border: 0; background: transparent; border-radius: 8px; cursor: pointer; text-align: left; color: var(--ink); font: inherit; font-size: 13px; min-height: 0; white-space: nowrap; }
@media (hover: hover) { .mp-ddrow:hover { background: var(--cream); } }
.mp-ddrow[aria-checked='true'] { color: var(--brand); font-weight: 700; }
.mp-ddck { flex: 0 0 14px; text-align: center; color: var(--brand); }

/* ===== ⚙ settings panel ===== */
.mp-panel {
  position: absolute; bottom: calc(100% + 8px); left: 0;
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  padding: 8px; min-width: 280px; max-width: calc(100vw - 24px); max-height: 60vh; overflow: auto; z-index: 25;
}
.mp-ptitle { font-size: 11px; color: var(--muted); padding: 2px 4px 7px; }
/* draggable popup headers (desktop) — a grab handle to move the panel/sheet out of the way */
.mp-drag { touch-action: none; }
@media (hover: hover) { .mp-drag { cursor: move; } }
.mp-prow { display: flex; align-items: center; gap: 8px; padding: 5px 4px; border-radius: 8px; }
@media (hover: hover) { .mp-prow:hover { background: var(--cream); } }
.mp-mi { width: 20px; display: inline-flex; justify-content: center; color: var(--brand); flex: 0 0 20px; }
.mp-pl { font-size: 13px; flex: 1; min-width: 70px; }
.mp-pc { display: flex; align-items: center; gap: 5px; }
.mp-sel { font: inherit; font-size: 12.5px; padding: 3px 6px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--ink); max-width: 150px; }
.mp-stp { border: 1px solid var(--line); background: transparent; color: var(--ink); border-radius: 6px; padding: 3px 8px; font: inherit; font-size: 12.5px; min-height: 0; cursor: pointer; }
.mp-stp:disabled { opacity: 0.4; cursor: default; }
@media (hover: hover) { .mp-stp:not(:disabled):hover { border-color: var(--brand); color: var(--brand); } }
.mp-stpv { min-width: 22px; text-align: center; font-size: 13px; }
.mp-prange { width: 110px; accent-color: var(--brand); }
.mp-slval { font-size: 11px; color: var(--muted); min-width: 30px; }
.mp-pin { border: 0; background: transparent; cursor: pointer; font-size: 14px; filter: grayscale(1); opacity: 0.4; flex: 0 0 auto; border-radius: 6px; padding: 2px 4px; }
.mp-pin.on { filter: none; opacity: 1; }
.mp-mv { border: 1px solid var(--line); background: transparent; color: var(--ink); border-radius: 6px; min-height: 0; padding: 1px 5px; font-size: 11px; cursor: pointer; flex: 0 0 auto; }
.mp-mv:disabled { opacity: 0.35; cursor: default; }
@media (hover: hover) { .mp-mv:not(:disabled):hover { border-color: var(--brand); color: var(--brand); } }

/* ===== ☰ selector (desktop popover; mobile bottom sheet) ===== */
.mp-selmask { position: fixed; inset: 0; background: transparent; z-index: 24; }
.mp-sheet {
  position: absolute; bottom: calc(100% + 8px); left: 0;
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  width: 300px; max-width: calc(100vw - 24px); display: flex; flex-direction: column; z-index: 26; max-height: 60vh;
}
.mp-sshead { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 6px; font-size: 14px; }
.mp-ssclose { border: 0; background: transparent; color: var(--muted); cursor: pointer; display: inline-flex; padding: 4px; }
.mp-ssall { display: flex; align-items: center; gap: 8px; padding: 0 12px 8px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.mp-ssallbtn { border: 1px solid var(--line); background: transparent; color: var(--ink); border-radius: 8px; padding: 5px 12px; font: inherit; font-size: 12.5px; min-height: var(--touch-min); cursor: pointer; }
@media (hover: hover) { .mp-ssallbtn:hover { border-color: var(--brand); color: var(--brand); } }
.mp-sshint { font-size: 11px; color: var(--muted); margin-left: auto; }
.mp-sslist { overflow-y: auto; padding: 6px; }
.mp-ssrow { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; border: 0; background: transparent; border-radius: 10px; cursor: pointer; font: inherit; font-size: 14px; color: var(--ink); text-align: left; min-height: var(--touch-min); }
@media (hover: hover) { .mp-ssrow:hover { background: var(--cream); } }
.mp-cx { width: 22px; height: 22px; flex: 0 0 22px; border: 1.5px solid var(--muted); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; }
.mp-ssrow.on .mp-cx { background: var(--ok, #1d7a54); border-color: var(--ok, #1d7a54); }
.mp-ssrow.on { color: var(--ok, #1d7a54); font-weight: 600; }
.mp-ssname { flex: 1; }
.mp-hk { font-size: 10.5px; color: var(--brand); border: 1px dashed var(--brand); border-radius: 10px; padding: 0 7px; }

@media (max-width: 760px) {
  .mp-selmask { background: rgba(0, 0, 0, 0.28); }
  .mp-sheet {
    position: fixed; left: 0; right: 0; bottom: 0; top: auto;
    width: auto; max-width: none; border-radius: 16px 16px 0 0; max-height: 72vh;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
}
</style>
