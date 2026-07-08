<script setup>
// StudioDock — the ONE shared bottom toolbar ("dock") used by every studio mode
// (แก้ไข · ฝึกร้อง · พิมพ์). Its "engine" (collapse · transparency · pick-your-buttons ·
// dynamic overflow · drag) is identical across modes; only the BUTTON SET differs, and
// that is data the parent hands in via `tools`. Ported from docs/design/ps3-dock-prototype.html
// (verified by P'Aim) — see docs/ds/ps3-dock.md.
//
// Contract (DS ps3-dock):
//   mode         : 'edit' | 'sing' | 'print' — namespaces the saved layout + shows keys on edit
//   tools        : the FULL registry for this mode — array of tool defs (see below)
//   defaultTools : ids shown by default (order matters) · omit = every tool, in given order
//   paletteKeys  : jianpu note symbols (edit only) — the fixed keyboard row
//   message      : a transient status line floated above the dock (e.g. save result)
// A tool def: { id, label, icon, run, disabled?, visible?, danger?, prime?, badge? }
//   visible=false hides it right now (e.g. "หยุด" only while playing) — a saved layout
//   still only ever renders what applies.
// Menu tools (D7, wave 2): a def may instead carry
//   { menu:true, options:[{value,label}]|['label',…], value, badge?, onPick(value),
//     multi?:true, selected?:[value,…] }
//   — clicking opens a dropdown of `options`; single-select marks `value` and calls
//   onPick then closes; multi marks each of `selected` and calls onPick per toggle (stays
//   open). The button shows a caret; `badge` (e.g. คีย์/BPM) rides beside the icon.
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  mode: { type: String, required: true },
  tools: { type: Array, default: () => [] },
  defaultTools: { type: Array, default: null },
  paletteKeys: { type: Array, default: () => [] },
  message: { type: String, default: '' },
})
const emit = defineEmits(['insert'])

// ---------- persisted layout ----------
// Tool ORDER is per-mode (each mode offers a different button set). Everything about the
// dock's "body" — collapsed, transparency, and the dragged position of both the bar and
// the floating button — is SHARED across modes (dock-core / N1): one dock instance, one
// remembered spot, so collapse/expand + position feel identical in ทำนอง/ฝึกร้อง/พิมพ์.
const LS_ORDER = computed(() => `pleng.dock.${props.mode}.tools`)
const LS_COLLAPSED = 'pleng.dock.collapsed'
const LS_ALPHA = 'pleng.dock.alpha'
const LS_BARPOS = 'pleng.dock.barpos'
const LS_FABPOS = 'pleng.dock.fabpos'

const allIds = computed(() => props.tools.map((t) => t.id))
const byId = computed(() => Object.fromEntries(props.tools.map((t) => [t.id, t])))
const defaultOrder = computed(() => (props.defaultTools ? props.defaultTools.slice() : allIds.value.slice()))

function loadOrder() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_ORDER.value) || 'null')
    if (Array.isArray(raw) && raw.length) return raw.filter((id) => allIds.value.includes(id))
  } catch {
    /* ignore bad/absent storage */
  }
  return defaultOrder.value
}
const order = ref([])
// (re)load the saved order whenever the mode changes — each mode keeps its own layout
watch(() => props.mode, () => { order.value = loadOrder() }, { immediate: true })
watch(order, (v) => {
  try { localStorage.setItem(LS_ORDER.value, JSON.stringify(v)) } catch { /* storage may be unavailable */ }
}, { deep: true })

// ---------- collapse (D4) · transparency (D5) ----------
// collapsed is shared across modes now (single instance), so it loads ONCE and no longer
// re-reads on every mode switch — switching ทำนอง⇄ฝึกร้อง keeps the dock as you left it.
const collapsed = ref(localStorage.getItem(LS_COLLAPSED) === '1')
watch(collapsed, (v) => {
  try { localStorage.setItem(LS_COLLAPSED, v ? '1' : '0') } catch { /* ignore */ }
})

const alpha = ref(0.92)
try {
  const a = parseFloat(localStorage.getItem(LS_ALPHA) || '')
  if (a >= 0.4 && a <= 1) alpha.value = a
} catch { /* ignore */ }
watch(alpha, (v) => {
  try { localStorage.setItem(LS_ALPHA, String(v)) } catch { /* ignore */ }
})

// ---------- viewport ----------
const mobile = ref(false)
let mq = null
function syncMobile() { mobile.value = mq ? mq.matches : false }

// ---------- which buttons show ----------
// the saved order, minus anything not applicable right now (visible===false)
const shown = computed(() =>
  order.value.map((id) => byId.value[id]).filter((t) => t && t.icon && t.visible !== false),
)
const addable = computed(() => props.tools.filter((t) => !order.value.includes(t.id)))
// B033: paletteKeys may be a flat array (one row) OR an array of rows. Edit mode sends
// 2 rows so the 21 jianpu keys aren't crammed onto one line (tiny/untappable on mobile).
const keyRows = computed(() => {
  const p = props.paletteKeys
  if (!p.length) return []
  return Array.isArray(p[0]) ? p : [p]
})
const showKeys = computed(() => props.mode === 'edit' && keyRows.value.length > 0 && !collapsed.value)

// ---------- dynamic overflow (D3) — priority+ ----------
// Measure the real row: buttons that don't fit fold into a ⋯ popover (never wrap, never
// push content). We render all as primary, measure, then trim the tail one at a time.
const overflowCount = ref(0)
const primary = computed(() => shown.value.slice(0, Math.max(0, shown.value.length - overflowCount.value)))
const overflow = computed(() => shown.value.slice(Math.max(0, shown.value.length - overflowCount.value)))

const toolsEl = ref(null)
const dockEl = ref(null)

function requiredWidth() {
  const el = toolsEl.value
  if (!el) return 0
  const gap = parseFloat(getComputedStyle(el).gap) || 6
  const kids = el.children
  let total = 0
  for (const k of kids) total += k.offsetWidth
  if (kids.length > 1) total += gap * (kids.length - 1)
  return total
}
let fitting = false
async function fit() {
  if (fitting || !toolsEl.value || collapsed.value) return
  fitting = true
  overflowCount.value = 0
  await nextTick()
  // the component can unmount during the await (fast mode switches / test teardown) —
  // bail rather than dereference a now-null ref
  if (!toolsEl.value) { fitting = false; return }
  const rowW = toolsEl.value.clientWidth
  // guard: width 0 / not laid out yet → show all; the ResizeObserver re-runs once real
  // width arrives (the original "measured at width 0 → hid everything" bug)
  if (rowW > 50) {
    let guard = 0
    while (requiredWidth() > rowW + 1 && primary.value.length > 0 && guard++ < 40) {
      overflowCount.value++
      await nextTick()
    }
  }
  fitting = false
}
watch([shown, mobile, collapsed], () => { nextTick(fit) })

let ro = null
onMounted(() => {
  // jsdom (unit tests) has no matchMedia — degrade to desktop rather than throw
  mq = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 760px)') : null
  syncMobile()
  mq?.addEventListener?.('change', onViewportChange)
  // matchMedia 'change' can be missed on programmatic viewport resizes, so also watch
  // plain resize (cheap: syncMobile only flips a bool when the breakpoint is crossed)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('keydown', onEsc)
  if (window.ResizeObserver && dockEl.value) {
    let lastW = 0
    ro = new ResizeObserver(() => {
      const w = Math.round(toolsEl.value?.clientWidth || 0)
      if (w && w !== lastW) { lastW = w; fit() }
    })
    ro.observe(dockEl.value)
  }
  nextTick(fit)
})
onUnmounted(() => {
  mq?.removeEventListener?.('change', onViewportChange)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('keydown', onEsc)
  ro?.disconnect()
})
function onViewportChange() { syncMobile(); nextTick(fit) }

// ---------- collapse / expand ----------
function collapse() { collapsed.value = true; closePop() }
function expand() { collapsed.value = false; nextTick(clampBarPos) }
// B034: the collapse control gangs both ways — collapse when open, expand when collapsed.
// On desktop this is the fused grip+chevron button (tap); on mobile the sd-ctl / sd-tab.
function toggleCollapse() { collapsed.value ? expand() : collapse() }

// ---------- popovers (overflow · transparency · customize · menu) — one at a time ----------
const pop = ref(null) // 'overflow' | 'trans' | 'cust' | 'menu' | null
function togglePop(kind) { pop.value = pop.value === kind ? null : kind }
function closePop() { pop.value = null; menuId.value = null }
function onEsc(e) { if (e.key === 'Escape') closePop() }
function onOutside(e) {
  // a menu tool button (.sd-tbtn) is neither .sd-pop nor .sd-ctl; keep the open menu when
  // the click lands on ITS button (that button's own handler toggles it) so it doesn't
  // close-then-reopen on every re-click
  if (e.target.closest?.('.sd-pop') || e.target.closest?.('.sd-ctl')) return
  if (menuId.value && e.target.closest?.(`[data-menu-btn="${menuId.value}"]`)) return
  closePop()
}

// ---------- menu / dropdown tools (D7) ----------
// Hold the tool ID, not the object: the parent's tool list is a computed that rebuilds a
// fresh def on every state change, so an open menu must re-read the LIVE def (its value /
// selected / badge) by id rather than pin a stale snapshot.
const menuId = ref(null)
const menuTool = computed(() => (menuId.value ? byId.value[menuId.value] : null))
const menuOptions = computed(() =>
  (menuTool.value?.options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
)
function isMenu(t) { return !!t?.menu }
function isPicked(v) {
  const t = menuTool.value
  if (!t) return false
  return t.multi ? (t.selected || []).includes(v) : t.value === v
}
function openMenu(t) {
  if (menuId.value === t.id && pop.value === 'menu') { closePop(); return }
  menuId.value = t.id
  pop.value = 'menu'
}
function pickOption(o) {
  const t = menuTool.value
  t?.onPick?.(o.value)
  if (!t?.multi) closePop()
}
watch(pop, (v) => {
  if (v) setTimeout(() => document.addEventListener('mousedown', onOutside), 0)
  else document.removeEventListener('mousedown', onOutside)
})
onUnmounted(() => document.removeEventListener('mousedown', onOutside))

// ---------- customize (D6) ----------
function move(id, d) {
  const a = order.value.slice()
  const i = a.indexOf(id)
  const j = i + d
  if (i < 0 || j < 0 || j >= a.length) return
  ;[a[i], a[j]] = [a[j], a[i]]
  order.value = a
}
function remove(id) { order.value = order.value.filter((x) => x !== id) }
function add(id) { if (!order.value.includes(id)) order.value = [...order.value, id] }
function reset() { order.value = defaultOrder.value }

// ---------- fused grip+collapse button: tap toggles, press-drag moves (desktop) ----------
// ONE control (the grip+chevron glyph) serves both states, iOS-AssistiveTouch style:
//   expanded  → it is the in-dock handle: tap = หุบ, drag = move the whole bar
//   collapsed → it IS the only thing on screen: a round floating button (FAB); tap = กาง,
//               drag = move the button anywhere
// pointer down→up with < DRAG_THRESHOLD px of travel = a tap (toggle); past the threshold
// it becomes a drag (no toggle) — so a move never accidentally gaps/collapses the dock.
const DRAG_THRESHOLD = 5 // px
const fabEl = ref(null)

// dragged positions (viewport coords, top-left). null = default CSS spot. BOTH are shared
// across modes (persisted) so the dock/button stay put when you switch view.
const dockPos = ref(loadPos(LS_BARPOS)) // the whole bar (expanded)
const fabPos = ref(loadPos(LS_FABPOS))  // the floating button (collapsed)
function loadPos(key) {
  try {
    const p = JSON.parse(localStorage.getItem(key) || 'null')
    if (p && typeof p.left === 'number' && typeof p.top === 'number') return p
  } catch { /* ignore */ }
  return null
}
watch(dockPos, (v) => { try { v ? localStorage.setItem(LS_BARPOS, JSON.stringify(v)) : localStorage.removeItem(LS_BARPOS) } catch { /* ignore */ } }, { deep: true })
watch(fabPos, (v) => { try { v ? localStorage.setItem(LS_FABPOS, JSON.stringify(v)) : localStorage.removeItem(LS_FABPOS) } catch { /* ignore */ } }, { deep: true })

// position: fixed is REQUIRED — .sd-dock is otherwise static (positioned by the fixed
// .sd-wrap), so left/top alone would not move it. Coords come from getBoundingClientRect,
// which fixed positioning matches exactly.
const dockStyle = computed(() =>
  dockPos.value && !mobile.value
    ? { position: 'fixed', left: dockPos.value.left + 'px', top: dockPos.value.top + 'px', right: 'auto', bottom: 'auto', transform: 'none' }
    : {},
)
const fabStyle = computed(() =>
  fabPos.value
    ? { left: fabPos.value.left + 'px', top: fabPos.value.top + 'px', right: 'auto', bottom: 'auto', transform: 'none' }
    : {},
)

function clampToViewport(pos, w, h) {
  return {
    left: Math.max(4, Math.min(window.innerWidth - w - 4, pos.left)),
    top: Math.max(4, Math.min(window.innerHeight - h - 4, pos.top)),
  }
}
// after expanding, the wide bar may not fit where the small FAB sat — pull it back on-screen
function clampBarPos() {
  if (!dockPos.value || mobile.value || !dockEl.value) return
  const r = dockEl.value.getBoundingClientRect()
  dockPos.value = clampToViewport(dockPos.value, r.width, r.height)
}

let pdown = false, moved = false, sX = 0, sY = 0, oX = 0, oY = 0, dW = 0, dH = 0, startLeft = 0, startTop = 0
function combinedDown(e) {
  if (mobile.value) return
  e.preventDefault()
  pdown = true; moved = false
  sX = e.clientX; sY = e.clientY
  // Capture the grab offset + the element's box NOW (at press), not after the threshold —
  // otherwise the grab point jumps by the first move's distance when the drag kicks in.
  const el = collapsed.value ? fabEl.value : dockEl.value
  if (el) {
    const r = el.getBoundingClientRect()
    oX = sX - r.left; oY = sY - r.top; dW = r.width; dH = r.height; startLeft = r.left; startTop = r.top
  }
  try { e.target.setPointerCapture(e.pointerId) } catch { /* no capture — pointer still tracks */ }
}
function combinedMove(e) {
  if (!pdown) return
  const dx = e.clientX - sX, dy = e.clientY - sY
  if (!moved && dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
    moved = true
    // pin the element to explicit fixed coords at its current spot, then track the pointer
    ;(collapsed.value ? fabPos : dockPos).value = { left: startLeft, top: startTop }
  }
  if (moved) { e.preventDefault(); doDrag(e) }
}
function combinedUp() {
  if (!pdown) return
  pdown = false
  if (!moved) toggleCollapse() // a clean tap (no drag) → กาง/หุบ
  moved = false
}
function doDrag(e) {
  const target = collapsed.value ? fabPos : dockPos
  target.value = clampToViewport({ left: e.clientX - oX, top: e.clientY - oY }, dW, dH)
}

// a tool button was pressed: a menu tool opens its dropdown, a plain tool runs
function runTool(t) {
  if (t.disabled) return
  if (t.menu) openMenu(t)
  else t.run?.()
}
</script>

<template>
  <div class="sd-wrap no-print">
    <p v-if="message" class="sd-msg" role="status">{{ message }}</p>

    <!-- collapsed on desktop → the dock becomes ONE round floating button (FAB). Tap to
         กาง; press-drag to move it anywhere. Mobile keeps the slide-off + pull-up tab. -->
    <button
      v-if="collapsed && !mobile"
      ref="fabEl"
      class="sd-fab"
      :style="fabStyle"
      aria-label="กางแถบเครื่องมือ"
      title="แตะเพื่อกางแถบ · ลากเพื่อย้าย"
      @pointerdown="combinedDown"
      @pointermove="combinedMove"
      @pointerup="combinedUp"
      @pointercancel="combinedUp"
    ><Icon name="dock-grip-expand" :size="26" /></button>

    <div
      v-show="!(collapsed && !mobile)"
      ref="dockEl"
      class="sd-dock"
      :class="{ 'sd-m': mobile, 'sd-collapsed': collapsed }"
      :style="[dockStyle, { '--dock-alpha': alpha }]"
    >
      <!-- fixed jianpu keyboard (edit only) — one or more rows; each row shares its line
           (keys stretch/shrink, never wrap) so more keys just mean a bigger tap target -->
      <div v-if="showKeys" class="sd-keys" role="toolbar" aria-label="สัญลักษณ์โน้ต">
        <div v-for="(row, ri) in keyRows" :key="ri" class="sd-key-row">
          <button
            v-for="k in row"
            :key="k"
            class="sd-key"
            @mousedown.prevent="emit('insert', k)"
          >{{ k }}</button>
        </div>
      </div>

      <div ref="toolsEl" class="sd-tools" role="toolbar" aria-label="เครื่องมือ">
        <!-- fused grip+collapse handle (desktop): tap = หุบ, drag = ย้ายทั้งแถบ (B037) -->
        <button
          v-if="!mobile"
          class="sd-combined hideoncol"
          aria-label="หุบแถบเครื่องมือ"
          title="แตะเพื่อหุบแถบ · ลากเพื่อย้าย"
          @pointerdown="combinedDown"
          @pointermove="combinedMove"
          @pointerup="combinedUp"
          @pointercancel="combinedUp"
        ><Icon name="dock-grip-collapse" :size="24" /></button>

        <button
          v-for="t in primary"
          :key="t.id"
          class="sd-tbtn hideoncol"
          :class="{ danger: t.danger, prime: t.prime, wide: t.badge || t.menu }"
          :disabled="t.disabled"
          :title="t.label"
          :aria-label="t.label"
          :data-tool="t.id"
          :aria-haspopup="t.menu ? 'menu' : undefined"
          :aria-expanded="t.menu ? (menuId === t.id) : undefined"
          :data-menu-btn="t.menu ? t.id : undefined"
          @click.stop="runTool(t)"
        >
          <Icon :name="t.icon" :size="18" />
          <b v-if="t.badge" class="sd-badge">{{ t.badge }}</b>
          <Icon v-if="t.menu" name="chevron-down" :size="14" class="sd-caret" />
        </button>

        <!-- right-hand controls: overflow · transparency · customize · collapse -->
        <span class="sd-rc">
          <button
            v-if="overflow.length"
            class="sd-tbtn sd-ctl hideoncol"
            :aria-expanded="pop === 'overflow'"
            aria-label="ดูปุ่มเพิ่มเติม"
            title="ดูเพิ่ม"
            @click.stop="togglePop('overflow')"
          ><Icon name="ellipsis" :size="18" /></button>
          <button
            class="sd-tbtn sd-ctl hideoncol"
            :aria-expanded="pop === 'trans'"
            aria-label="ปรับความโปร่งของแถบ"
            title="ความโปร่ง"
            @click.stop="togglePop('trans')"
          ><Icon name="blend" :size="18" /></button>
          <button
            v-if="!mobile"
            class="sd-tbtn sd-ctl hideoncol"
            :aria-expanded="pop === 'cust'"
            aria-label="ตั้งค่าปุ่มบนแถบ (เพิ่ม/เอาออก/เลื่อน)"
            title="ตั้งค่าปุ่ม"
            @click.stop="togglePop('cust')"
          ><Icon name="sliders-horizontal" :size="18" /></button>
          <!-- mobile keeps a tap-only collapse control; desktop uses the fused handle -->
          <button
            v-if="mobile"
            class="sd-tbtn sd-ctl"
            :aria-label="collapsed ? 'กางแถบเครื่องมือ' : 'หุบแถบเครื่องมือ'"
            :title="collapsed ? 'กางแถบ' : 'หุบแถบ'"
            @click.stop="toggleCollapse"
          ><Icon :name="collapsed ? 'panel-bottom-open' : 'panel-top-close'" :size="18" /></button>
        </span>
      </div>

      <!-- ===== popovers ===== -->
      <!-- overflow: the buttons that didn't fit, as a floating sheet over content (no push) -->
      <div v-if="pop === 'overflow'" class="sd-pop" role="menu" @click.stop>
        <h4>ปุ่มเพิ่มเติม</h4>
        <div class="sd-ov">
          <button
            v-for="t in overflow"
            :key="t.id"
            class="sd-tbtn"
            :class="{ danger: t.danger, prime: t.prime, wide: t.badge }"
            :disabled="t.disabled"
            :aria-label="t.label"
            :title="t.label"
            :data-tool="t.id"
            :data-menu-btn="t.menu ? t.id : undefined"
            @click.stop="t.menu ? runTool(t) : (runTool(t), closePop())"
          >
            <Icon :name="t.icon" :size="18" />
            <b v-if="t.badge" class="sd-badge">{{ t.badge }}</b>
            <span class="sd-ov-label">{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- transparency: a full-width slider -->
      <div v-if="pop === 'trans'" class="sd-pop sd-pop-wide" @click.stop>
        <h4>ความโปร่งของแถบ</h4>
        <input
          class="sd-range"
          type="range"
          min="40"
          max="100"
          step="1"
          :value="Math.round(alpha * 100)"
          aria-label="ความโปร่งของแถบเครื่องมือ"
          @input="alpha = $event.target.value / 100"
        />
        <div class="sd-mini">{{ Math.round(alpha * 100) }}%</div>
      </div>

      <!-- customize: add / remove / reorder -->
      <div v-if="pop === 'cust'" class="sd-pop sd-pop-cust" @click.stop>
        <h4>เลือกปุ่มที่จะโชว์บนแถบ</h4>
        <div class="sd-cust-group">แสดงอยู่</div>
        <div v-for="(id, i) in order" :key="id" class="sd-crow">
          <Icon :name="byId[id]?.icon || 'square'" :size="15" />
          <span class="sd-crow-name">{{ byId[id]?.label || id }}</span>
          <span class="sd-crow-btns">
            <button class="sd-mini-btn" aria-label="เลื่อนขึ้น" :disabled="i === 0" @click="move(id, -1)">▲</button>
            <button class="sd-mini-btn" aria-label="เลื่อนลง" :disabled="i === order.length - 1" @click="move(id, 1)">▼</button>
            <button class="sd-mini-btn" aria-label="เอาออก" @click="remove(id)">✕</button>
          </span>
        </div>
        <template v-if="addable.length">
          <div class="sd-cust-group">เพิ่มได้</div>
          <div v-for="t in addable" :key="t.id" class="sd-crow">
            <Icon :name="t.icon" :size="15" />
            <span class="sd-crow-name">{{ t.label }}</span>
            <span class="sd-crow-btns"><button class="sd-mini-btn" aria-label="เพิ่ม" @click="add(t.id)">＋</button></span>
          </div>
        </template>
        <div class="sd-cust-foot">
          <button class="sd-foot-btn secondary" @click="reset">คืนค่าเริ่มต้น</button>
          <button class="sd-foot-btn" @click="closePop">เสร็จ</button>
        </div>
      </div>

      <!-- menu (D7): a tool's dropdown of options — single-select closes, multi stays open -->
      <div v-if="pop === 'menu' && menuTool" class="sd-pop sd-pop-menu" role="menu" :aria-label="menuTool.label" @click.stop>
        <h4>{{ menuTool.label }}</h4>
        <button
          v-for="o in menuOptions"
          :key="o.value"
          class="sd-menu-row"
          :role="menuTool.multi ? 'menuitemcheckbox' : 'menuitemradio'"
          :aria-checked="isPicked(o.value)"
          @click.stop="pickOption(o)"
        >
          <span class="sd-menu-ck" aria-hidden="true">{{ isPicked(o.value) ? (menuTool.multi ? '✓' : '●') : '' }}</span>
          <span class="sd-menu-lb">{{ o.label }}</span>
        </button>
      </div>
    </div>

    <!-- mobile: when collapsed the dock slides off-screen, leaving a small pull-up tab -->
    <button
      v-if="mobile && collapsed"
      class="sd-tab"
      aria-label="เปิดแถบเครื่องมือ"
      title="เปิดแถบเครื่องมือ"
      @click="expand"
    ><Icon name="panel-bottom-open" :size="20" /></button>
  </div>
</template>

<style scoped>
/* the dock floats fixed at the bottom-center; the wrap lets clicks pass through the gutter */
.sd-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0 10px 12px;
  pointer-events: none;
}
.sd-msg {
  pointer-events: auto;
  background: var(--ink);
  color: #fff;
  padding: 8px 16px;
  border-radius: 10px;
  max-width: 92vw;
  margin: 0;
}
.sd-dock {
  --dock-bg: 255, 255, 255;
  pointer-events: auto;
  background: rgba(var(--dock-bg), var(--dock-alpha, 0.92));
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(6px);
  padding: 8px;
  max-width: 640px;
  width: 100%;
  transition: transform 0.22s ease;
}
/* jianpu keyboard: stacked rows; within a row keys share the line (no wrap, no scroll) */
.sd-keys {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--line);
}
.sd-key-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  justify-content: center;
}
.sd-key {
  flex: 1 1 0;
  min-width: 0;
  max-width: 56px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: transparent;
  color: var(--ink);
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 16px;
  min-height: 0;
  cursor: pointer;
}
@media (hover: hover) { .sd-key:hover { background: var(--cream); } }
.sd-tools { display: flex; align-items: center; gap: 6px; }
.sd-tbtn {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  min-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  position: relative;
  padding: 0;
}
@media (hover: hover) { .sd-tbtn:hover:not(:disabled) { background: var(--cream); border-color: var(--brand); } }
.sd-tbtn:disabled { opacity: 0.4; cursor: default; }
.sd-tbtn.danger { color: var(--red); }
.sd-tbtn.prime { background: var(--brand); color: #fff; border-color: var(--brand); }
.sd-tbtn.wide { flex: 0 0 auto; width: auto; min-width: 44px; padding: 0 9px; gap: 3px; }
.sd-badge { font-size: 12px; font-weight: 700; }
.sd-caret { color: var(--muted); margin-left: -1px; }
.sd-ctl { color: var(--muted); }
/* fused grip+collapse handle inside the expanded bar (desktop) */
.sd-combined {
  flex: 0 0 auto;
  height: 44px;
  min-height: 0;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: grab;
  touch-action: none;
}
.sd-combined:active { cursor: grabbing; }
@media (hover: hover) { .sd-combined:hover { color: var(--ink); } }
/* the collapsed FAB — one round floating button, iOS-AssistiveTouch style */
.sd-fab {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: 48px;
  height: 48px;
  min-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: #fff;
  color: var(--ink);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  cursor: grab;
  touch-action: none;
}
.sd-fab:active { cursor: grabbing; }
@media (hover: hover) { .sd-fab:hover { border-color: var(--brand); color: var(--brand); } }
.sd-rc { margin-left: auto; display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }

/* collapsed: hide keys + everything but the (re-open) bar */
.sd-collapsed { padding: 6px 8px; cursor: pointer; }
.sd-collapsed .sd-keys { display: none; }
.sd-collapsed .hideoncol { display: none; }
.sd-collapsed .sd-rc { margin-left: 0; }

/* popovers float ABOVE the dock so they never push the page content */
.sd-pop {
  pointer-events: auto;
  position: absolute;
  bottom: calc(100% + 8px);
  right: 8px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 12px;
  font-size: 13px;
  z-index: 20;
  max-width: calc(100vw - 24px);
}
.sd-pop h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: var(--muted); }
.sd-pop-wide { left: 8px; right: 8px; }
.sd-pop-cust { min-width: 250px; max-height: 56vh; overflow: auto; }
.sd-ov { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.sd-ov .sd-tbtn { width: 100%; flex-direction: column; height: auto; padding: 8px 4px; gap: 3px; }
.sd-ov-label { font-size: 11px; color: var(--muted); }
.sd-range { width: 100%; }
.sd-mini { font-size: 11px; color: var(--muted); text-align: center; margin-top: 4px; }
/* menu (D7): a plain option list; the current pick is ● (single) / ✓ (multi) */
.sd-pop-menu { min-width: 200px; max-width: min(300px, calc(100vw - 24px)); max-height: 60vh; overflow: auto; }
.sd-menu-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 8px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  color: var(--ink);
  font: inherit;
  min-height: 36px;
}
@media (hover: hover) { .sd-menu-row:hover { background: var(--cream); } }
.sd-menu-row[aria-checked='true'] { color: var(--brand); font-weight: 700; }
.sd-menu-ck { flex: 0 0 16px; text-align: center; color: var(--brand); }
.sd-menu-lb { flex: 1; }
.sd-cust-group { font-size: 12px; color: var(--brand); font-weight: 700; margin: 8px 0 4px; }
.sd-crow { display: flex; align-items: center; gap: 8px; padding: 6px 2px; border-bottom: 1px solid var(--line); }
.sd-crow:last-of-type { border-bottom: none; }
.sd-crow-name { flex: 1; }
.sd-crow-btns { display: flex; gap: 4px; }
.sd-mini-btn {
  min-width: 30px;
  min-height: 30px;
  padding: 4px 8px;
  background: var(--cream);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
  cursor: pointer;
}
.sd-mini-btn:disabled { opacity: 0.4; cursor: default; }
.sd-cust-foot { display: flex; gap: 8px; margin-top: 12px; }
.sd-foot-btn { min-height: 36px; }
.sd-foot-btn.secondary { background: var(--cream); color: var(--ink); border: 1px solid var(--line); }
.sd-cust-foot .sd-foot-btn:last-child { margin-left: auto; }

/* ---------- mobile ---------- */
.sd-dock.sd-m { max-width: 100%; border-radius: 14px 14px 0 0; }
.sd-dock.sd-m .sd-keys { gap: 3px; }
.sd-dock.sd-m .sd-key-row { gap: 3px; }
.sd-dock.sd-m .sd-key { height: 40px; font-size: 16px; max-width: none; }
.sd-dock.sd-m .sd-tools { gap: 5px; }
.sd-dock.sd-m .sd-tbtn { flex: 0 0 40px; width: 40px; height: 40px; }
.sd-dock.sd-m .sd-tbtn.wide { flex: 0 0 auto; width: auto; padding: 0 8px; }
.sd-wrap:has(.sd-dock.sd-m) { padding: 0; }
.sd-dock.sd-m { padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)); }
.sd-dock.sd-m.sd-collapsed { transform: translateY(130%); }
.sd-tab {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 14px;
  width: 54px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  color: var(--muted);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
  min-height: 0;
  cursor: pointer;
}
</style>
