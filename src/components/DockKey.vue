<script setup>
// DockKey — the ONE reusable dock "core engine" (library กลาง). Every studio page
// (ฝึกร้อง · แผ่นเพลง · แก้ไข) hands it ONLY a list of button descriptors (`items`); the
// engine owns everything else: the row/col layout + cap-fill, collapse-in-place, drag,
// one-popover-at-a-time + clamp, the ⚙ Setting page with pin/reorder, and transparency.
// So the three pages share ONE engine and differ only in DATA, not code.
// Ported 1:1 from the P'Aim-approved prototype docs/design/dockkey-sing-prototype.html
// (core = itemHtml/buildRows/render/drag/transitionInPlace/gear-panel) per the DS
// docs/ds/dockkey-library.md. This round wires the ฝึกร้อง page; print/edit plug in later
// with their own ITEMS_* — no engine change.
//
// Descriptor (DS §2):
//   { id, name, icon(Lucide), kind, place:{anchor,row,col,span}, default, pinnable,
//     permanent, hidden, run, control:{options,value,onPick,badge | onToggle | min,max,onInput} }
//   anchor: 'left' | 'right' | 'rightOf:<id>' | 'leftOf:<id>'  (row 1 chrome/transport)
//   kind:   'grip'|'gear'|'play'|'btn'|'toggle'|'menu'|'slider'  → drawn by the engine
//           'timeline'|'sel'|'aa'|'slot'                          → drawn by the PAGE via a
//           #cell-<id> slot ({ open, toggle, close }); the engine still lays it out, tracks
//           its one-at-a-time popover, and clamps any .dk-pop the slot renders.
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  // namespaces the remembered layout (pins · collapsed · transparency) so pages don't
  // collide in localStorage — like StudioDock's per-mode keys.
  storeKey: { type: String, default: 'dock' },
  alpha: { type: Number, default: 0.96 }, // v-model:alpha (transparency of the dock)
  message: { type: String, default: '' }, // transient status line floated above the dock
  // hide-on-scroll: reclaim screen while reading (Material BottomAppBar). OFF by default so
  // the shared phrakham read-aloud island keeps its old behaviour — a host opts IN per page.
  autoHide: { type: Boolean, default: false },
  // free-form resize (แบบ 2 · window-style · P'Pao): the user sets the dock WIDTH → buttons
  // reflow into more/fewer rows (reuse cap=f(width) + .dk-row flex-wrap). Desktop = drag handle;
  // mobile = a width slider in ⚙ (touch-safe · no edge-drag on touch · ux-platform-patterns §1).
  // OFF by default so phrakham (and any host not opting in) is unchanged.
  resizable: { type: Boolean, default: false },
})
const emit = defineEmits(['update:alpha'])

const SLOT_KINDS = ['timeline', 'sel', 'aa', 'slot'] // drawn by the page via #cell-<id>

// E1: full-width keyboard band(s) (e.g. the edit jianpu palette) — laid out above every
// row, exempt from the cap/overflow machinery, hidden when collapsed.
const keysBands = computed(() => visible.value.filter((i) => i.kind === 'keys'))

// ---------- registry helpers ----------
const byId = (id) => props.items.find((i) => i.id === id)
const visible = computed(() => props.items.filter((i) => !i.hidden))
// items with a home in the ⚙ Setting page: everything not on the bar by default, plus
// anything pinnable (so it can be un-pinned back into its home) — DS I4.
const settingItems = computed(() => visible.value.filter((i) => i.default === 'inSetting' || i.pinnable))

// ---------- persisted layout ----------
const LS_PINS = computed(() => `pleng.dockkey.${props.storeKey}.pins`)
const LS_COLLAPSED = computed(() => `pleng.dockkey.${props.storeKey}.collapsed`)
const LS_ALPHA = computed(() => `pleng.dockkey.${props.storeKey}.alpha`)

function loadPins() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_PINS.value) || 'null')
    if (Array.isArray(raw)) return raw.filter((id) => byId(id))
  } catch { /* ignore bad storage */ }
  return []
}
const pins = ref(loadPins())
watch(pins, (v) => { try { localStorage.setItem(LS_PINS.value, JSON.stringify(v)) } catch { /* ignore */ } }, { deep: true })

const collapsed = ref(localStorage.getItem(LS_COLLAPSED.value) === '1')
watch(collapsed, (v) => { try { localStorage.setItem(LS_COLLAPSED.value, v ? '1' : '0') } catch { /* ignore */ } })

// transparency: DockKey owns the persisted value and keeps the parent's v-model in sync,
// so a page can also read/pin it via an `alpha` slider item.
onMounted(() => {
  try {
    const a = parseFloat(localStorage.getItem(LS_ALPHA.value) || '')
    if (a >= 0.4 && a <= 1 && a !== props.alpha) emit('update:alpha', a)
  } catch { /* ignore */ }
})
watch(() => props.alpha, (v) => { try { localStorage.setItem(LS_ALPHA.value, String(v)) } catch { /* ignore */ } })

// ---------- viewport (cap = f(width) · continuous · WCAG 2.2 AA · DS I6 · §4) ----------
// A single binary matchMedia(760) made `cap` jump 7↔14, so an unfolding Fold (690–768) crossed
// 760 and the dock snapped rows. Derive `cap` from the LIVE full width instead (measured off the
// document, NOT the dock — a fixed/auto-width dock would feed its own width back into cap · SA Q4).
// Buttons keep their --touch-min floor (44/42/40 via CSS); a narrow width reflows to MORE rows,
// it never shrinks the target.
const PER_BTN = 50 // ≈ one 44px button + 7px gap; the budget one dock button occupies
const containerWidth = ref(typeof window !== 'undefined' ? (window.innerWidth || 1024) : 1024)
function readWidth() {
  return (typeof window !== 'undefined' &&
    (window.visualViewport?.width || document.documentElement?.clientWidth || window.innerWidth)) || 1024
}
function syncWidth() {
  containerWidth.value = readWidth()
  // rotate/fold to a narrower screen → a persisted width wider than the viewport must shrink so the
  // dock never exceeds the screen (continuity: the layout reflows, the chosen width just re-clamps).
  if (userWidth.value != null) { const c = clampWidth(userWidth.value); if (c !== userWidth.value) userWidth.value = c }
  nextTick(measureDock)
}

// ---------- free-form resize (แบบ 2 · window-style · width→reflow · §resizable prop) ----------
// A user-chosen dock width, persisted per storeKey. null = AUTO (fit-content · cap from the viewport
// as above). When set, `cap` derives from THIS width (not the viewport) so a narrower dock reflows
// to more rows — no feedback loop here because the width is a fixed user input, not the dock's own
// measured size (SA Q4 only forbids feeding the dock's *measured* width back into cap). CSS floors
// the box at min-content (widest single button) and caps it at the viewport, so the number can't
// push a button below its --touch-min floor or past the screen.
const MIN_W = 120 // ≈ 2 buttons; CSS min-width:min-content floors the actual render at the widest item
function maxW() { return Math.min(700, readWidth() - 20) } // never wider than the viewport (matches CSS)
function clampWidth(w) { return Math.max(MIN_W, Math.min(maxW(), Math.round(w))) }
const LS_WIDTH = computed(() => `pleng.dockkey.${props.storeKey}.width`)
function loadWidth() {
  try { const n = parseInt(localStorage.getItem(LS_WIDTH.value) || '', 10); return Number.isFinite(n) && n > 0 ? n : null } catch { return null }
}
const userWidth = ref(props.resizable ? loadWidth() : null)
watch(userWidth, (v) => {
  try { if (v) localStorage.setItem(LS_WIDTH.value, String(v)); else localStorage.removeItem(LS_WIDTH.value) } catch { /* ignore */ }
})
// the width the ⚙ slider shows/edits: the chosen width, or (when AUTO) the current live dock width
// so the slider starts where the eye sees it instead of jumping.
const measuredWidth = ref(0)
const sliderWidth = computed(() => userWidth.value || measuredWidth.value || maxW())

// cap derives from the CHOSEN width when resizing, else the viewport (auto).
const cap = computed(() => Math.max(3, Math.min(14, Math.floor((userWidth.value || containerWidth.value) / PER_BTN))))
// `mobile` (tighter gaps · suppress the wide row-merge · smaller --touch-min) stays tied to the
// VIEWPORT, not the chosen dock width — a narrow dock on a desktop must keep 44px targets, and a
// wide dock on a phone must keep the phone's tighter metrics.
const mobile = computed(() => containerWidth.value <= 760)

// ---------- one popover at a time (menu · setting · a slot cell) ----------
const openId = ref(null) // item id | 'setting' | null
function toggleOpen(id) { openId.value = openId.value === id ? null : id }
function close() { openId.value = null }
function onEsc(e) { if (e.key === 'Escape') close() }
function onOutside(e) {
  // click outside the whole dock closes; clicks inside are handled by the triggers
  if (!e.target.closest?.('.dk-host')) close()
}
watch(openId, (v) => {
  if (v) setTimeout(() => document.addEventListener('mousedown', onOutside), 0)
  else document.removeEventListener('mousedown', onOutside)
})

// A slot cell (soundctl · export) can live INSIDE the ⚙ Setting page once a page moves it to
// `default:'inSetting'`. Its trigger must NOT reuse `openId`: that is 'setting' while the panel
// is open, and toggling it to the item id would close the panel (one-at-a-time). `panelOpenId`
// is a SECOND, panel-local one-at-a-time tracker, so the ⚙ page stays open while the inner
// popover toggles. Reset it whenever the panel itself closes.
const panelOpenId = ref(null)
function togglePanelOpen(id) { panelOpenId.value = panelOpenId.value === id ? null : id }
function closePanel() { panelOpenId.value = null }
watch(openId, (v) => { if (v !== 'setting') panelOpenId.value = null })
watch(panelOpenId, async () => { await nextTick(); clampPops() })

// ---------- hide-on-scroll (§2 · reclaim space while reading · engine · 2-host opt-in) ----------
// The editor scrolls the WINDOW (no overflow wrapper — SA Q1); the preview is position:fixed and
// separate. Scrolling DOWN slides the whole dock off the bottom; a small peek handle stays to
// bring it back; scrolling UP reveals it again. Driven by an rAF-gated DIRECTIONAL delta (not a
// time-debounce, which feels laggy — SA), and never fires while a popover is open, the keyboard
// is up, the dock has focus, or the user is dragging (so the bar never vanishes mid-action).
const autoHidden = ref(false)
const keyboardUp = ref(false) // set by the visualViewport watcher (added in the keyboard phase)
// user override + reduced-motion → auto-hide OFF (Material: hiding chrome hurts AT/低-motion users;
// there is no screen-reader API, so a ⚙ toggle + reduced-motion + focus-guard is the standard).
const LS_AUTOHIDEOFF = computed(() => `pleng.dockkey.${props.storeKey}.autohideoff`)
const autoHideOff = ref(localStorage.getItem(LS_AUTOHIDEOFF.value) === '1')
const reduceMotion = ref(false)
watch(autoHideOff, (v) => {
  try { localStorage.setItem(LS_AUTOHIDEOFF.value, v ? '1' : '0') } catch { /* ignore */ }
  if (v) autoHidden.value = false
})
const autoHideEnabled = computed(() => props.autoHide && !autoHideOff.value && !reduceMotion.value)

// Pure reducer (unit-tested in jsdom, which has no layout): decide the next hidden state from a
// scroll delta. Down past +8px hides; any upward past -4px reveals immediately; a guard (popover
// open · keyboard up · focus/drag in dock) or being near the very top never hides.
function nextHidden(dy, hidden, { guarded = false, atTop = false } = {}) {
  if (dy < -4) return false
  if (dy > 8 && !guarded && !atTop) return true
  return hidden
}
function focusInsideDock() { return !!hostEl.value?.contains(document.activeElement) }
function isGuarded() {
  return openId.value !== null || panelOpenId.value !== null || keyboardUp.value || gp !== null || focusInsideDock()
}
let lastY = 0, rafPending = false
function onScroll() {
  if (!autoHideEnabled.value || rafPending) return
  rafPending = true
  requestAnimationFrame(() => {
    rafPending = false
    const y = window.scrollY || window.pageYOffset || 0
    autoHidden.value = nextHidden(y - lastY, autoHidden.value, { guarded: isGuarded(), atTop: y <= 40 })
    lastY = y
  })
}
function revealDock() { autoHidden.value = false }

// ---------- keyboard-aware (§3 · mobile soft-keyboard occludes the dock → hide it) ----------
// On a phone the keyboard covers the bottom dock; hide it so the page's contextual toolbox (which
// the PAGE floats above the keyboard) is unobstructed. Detect via visualViewport height drop >150px
// — URL-bar collapse is only ~60-100px, so 150 cleanly separates the two (SA Q2). No meta change
// (`interactive-widget=resizes-content` would stop visualViewport from shrinking · SA). Fallback:
// focusin/out on a text field, used only when visualViewport is absent.
let vv = null
function syncKeyboard() {
  if (!vv) return
  const up = (window.innerHeight - vv.height) > 150
  if (up === keyboardUp.value) return
  keyboardUp.value = up
  if (props.autoHide && !autoHideOff.value) autoHidden.value = up // reduced-motion just skips the anim
}
function isTextTarget(t) { return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) }
function onFocusIn(e) {
  if (vv || !isTextTarget(e.target)) return // visualViewport is authoritative when present
  keyboardUp.value = true
  if (props.autoHide && !autoHideOff.value) autoHidden.value = true
}
function onFocusOut() {
  if (vv) return
  keyboardUp.value = false
  if (props.autoHide && !autoHideOff.value) autoHidden.value = false
}

// ---------- ENGINE: order row 1 by anchor, row 2 by column, pinned → rows on top ----------
// rank a row-1 item from its anchor so [grip … leftOf:setting][setting] lays out in order.
function rankOf(it) {
  const a = it.place?.anchor
  if (a === 'left') return 0
  if (a === 'right') return 1000
  if (typeof a === 'string' && a.startsWith('rightOf:')) { const t = byId(a.slice(8)); return t ? rankOf(t) + 0.01 : 1 }
  if (typeof a === 'string' && a.startsWith('leftOf:')) { const t = byId(a.slice(7)); return t ? rankOf(t) - 0.01 : 999 }
  return 500
}
const row1 = computed(() =>
  visible.value.filter((i) => i.place?.row === 1).slice().sort((a, b) => rankOf(a) - rankOf(b)),
)
const row2 = computed(() =>
  visible.value.filter((i) => i.place?.row === 2).slice().sort((a, b) => (a.place.col || 0) - (b.place.col || 0)),
)
// Only items WITHOUT a home on the bar can occupy a pinned row. An item that has a `place` is
// already rendered by row1/row2, so honouring a stale pin for it would draw the same button twice
// (ui-standards §2 single source of action). This also self-heals a saved pin from before an item
// was promoted to the bar — e.g. พี่เปา's pinned 'draft' (issues9) — with no storage migration.
const pinnedItems = computed(() => pins.value.map(byId).filter((i) => i && !i.place))
// a "plain button row" = no wide/special cells (timeline · selector · key band). Only these
// can be merged with a neighbour (a timeline/selector must keep its own row).
const isPackable = (row) => row.length > 0 && !row.some((it) => ['timeline', 'sel', 'keys'].includes(it.kind))
// bottom → top: [row1][row2][pinned rows]; rendered top → bottom (reverse) so the pinned
// rows sit ABOVE row 2 (DS §3) and fill `cap` per row before wrapping.
const rows = computed(() => {
  const top = []
  for (let i = 0; i < pinnedItems.value.length; i += cap.value) top.push(pinnedItems.value.slice(i, i + cap.value))
  let r2 = row2.value, r1 = row1.value
  // §D2 smart row-pack: on a WIDE (desktop/tablet) dock, if row 2 and row 1 are BOTH plain
  // button rows and fit within the cap together, merge them into ONE row (no half-empty row
  // · e.g. แก้ไข). row 2's items slot in just before the ⚙ so grip stays left-most and ⚙
  // right-most. Skipped on mobile — a merged labeled row would overflow the narrow viewport.
  if (!mobile.value && isPackable(r2) && isPackable(r1) && r2.length + r1.length <= cap.value) {
    const gi = r1.findIndex((it) => it.kind === 'gear')
    r1 = gi >= 0 ? [...r1.slice(0, gi), ...r2, ...r1.slice(gi)] : [...r1, ...r2]
    r2 = []
  }
  return [...top, r2, r1].filter((r) => r.length)
})
const rowIsChrome = (row) => row.some((it) => it.id === 'setting') // the core bottom row → spread

// ---------- pin / reorder (the Setting page · DS §3) ----------
function togglePin(id) {
  pins.value = pins.value.includes(id) ? pins.value.filter((x) => x !== id) : [...pins.value, id]
}
function movePin(id, delta) {
  const a = pins.value.slice()
  const i = a.indexOf(id), j = i + delta
  if (i < 0 || j < 0 || j >= a.length) return
  ;[a[i], a[j]] = [a[j], a[i]]
  pins.value = a
}
const isPinned = (id) => pins.value.includes(id)
const pinIndex = (id) => pins.value.indexOf(id)

// ---------- collapse-in-place + drag (DS I7 · grip stays put, dock never jumps) ----------
const hostEl = ref(null)
const pos = ref(null) // {x,y} transform offset, null = natural centered spot
function gripEl() { return hostEl.value?.querySelector('[data-grip]') }
function dockEl() { return hostEl.value?.querySelector('.dk-dock') }

async function transition(toCollapsed) {
  const g = gripEl()
  const og = g ? g.getBoundingClientRect() : null
  collapsed.value = toCollapsed
  openId.value = null
  pos.value = null
  await nextTick()
  if (!og) return
  const d = dockEl(), ng = gripEl()?.getBoundingClientRect()
  if (!d || !ng) return
  pos.value = { x: og.left - ng.left, y: og.top - ng.top } // keep the new grip over the old
  d.style.transform = `translate(${pos.value.x}px, ${pos.value.y}px)`
  clampDock()
  clampPops()
}
function clampDock() {
  const d = dockEl()
  if (!d) return
  const r = d.getBoundingClientRect(), m = 6
  let dx = 0, dy = 0
  if (r.left < m) dx = m - r.left
  if (r.right > window.innerWidth - m) dx = window.innerWidth - m - r.right
  if (r.top < m) dy = m - r.top
  if (r.bottom > window.innerHeight - m) dy = window.innerHeight - m - r.bottom
  if (dx || dy) { pos.value = { x: (pos.value?.x || 0) + dx, y: (pos.value?.y || 0) + dy }; d.style.transform = `translate(${pos.value.x}px, ${pos.value.y}px)` }
}

// drag the whole dock by the grip (tap = collapse/expand in place · drag = move · both states)
let gp = null
function gripDown(e) {
  const d = dockEl()
  if (!d) return
  const r = d.getBoundingClientRect()
  gp = { sx: e.clientX, sy: e.clientY, moved: false, bx: pos.value?.x || 0, by: pos.value?.y || 0, natL: r.left - (pos.value?.x || 0), natT: r.top - (pos.value?.y || 0), w: r.width, h: r.height }
  try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer still tracks */ }
  e.preventDefault()
}
function gripMove(e) {
  if (!gp) return
  const dx = e.clientX - gp.sx, dy = e.clientY - gp.sy
  if (!gp.moved && dx * dx + dy * dy > 25) gp.moved = true
  if (gp.moved) {
    const m = 6
    const nx = Math.max(m - gp.natL, Math.min(window.innerWidth - m - gp.w - gp.natL, gp.bx + dx))
    const ny = Math.max(m - gp.natT, Math.min(window.innerHeight - m - gp.h - gp.natT, gp.by + dy))
    pos.value = { x: nx, y: ny }
    const d = dockEl(); if (d) d.style.transform = `translate(${nx}px, ${ny}px)`
    e.preventDefault()
  }
}
function gripUp() {
  if (!gp) return
  const moved = gp.moved
  gp = null
  if (!moved) transition(!collapsed.value) // a clean tap → collapse/expand in place
}

// ---------- resize: drag the handle to set the dock WIDTH (desktop pointer · §resizable) ----------
// The dock stays centred (host is align-items:center), so the intuitive window-from-centre model is
// "half-width follows the pointer": width = 2 × |pointerX − dockCentreX|, clamped [MIN_W, viewport].
// Buttons never shrink (CSS keeps --touch-min + min-content); only the row count changes. Touch has
// no reliable edge-drag (finger can't aim · §1) so the handle is pointer-only (CSS @media hover) and
// the ⚙ width slider is the touch/keyboard path. Double-click (or Esc) → back to AUTO (fit-content).
let rz = null
function resizeDown(e) {
  const d = dockEl(); if (!d) return
  const r = d.getBoundingClientRect()
  rz = { cx: r.left + r.width / 2 }
  try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer still tracks */ }
  e.preventDefault(); e.stopPropagation()
}
function resizeMove(e) {
  if (!rz) return
  userWidth.value = clampWidth(Math.abs(e.clientX - rz.cx) * 2)
  nextTick(clampPops)
  e.preventDefault()
}
function resizeUp() { rz = null }
function resizeAuto() { userWidth.value = null } // double-click handle → AUTO width again
// keep a live read of the actual rendered dock width (so the ⚙ slider starts at what the eye sees
// while AUTO, and so a persisted width that no longer fits the viewport is re-clamped on resize).
function measureDock() {
  const d = dockEl()
  if (d) measuredWidth.value = Math.round(d.getBoundingClientRect().width)
  if (userWidth.value != null) { const c = clampWidth(userWidth.value); if (c !== userWidth.value) userWidth.value = c }
}

// ---------- keep every popover on-screen (+8px · DS I5, no exceptions) ----------
function clampPops() {
  const host = hostEl.value
  if (!host) return
  const fr = { left: 8, right: window.innerWidth - 8, top: 8, bottom: window.innerHeight - 8 }
  host.querySelectorAll('.dk-pop').forEach((el) => {
    el.style.transform = ''
    const r = el.getBoundingClientRect()
    let dx = 0, dy = 0
    if (r.right > fr.right) dx = fr.right - r.right
    if (r.left + dx < fr.left) dx = fr.left - (r.left + dx)
    if (r.top + dy < fr.top) dy = fr.top - (r.top + dy)
    if (r.bottom + dy > fr.bottom) dy = fr.bottom - r.bottom
    if (dx || dy) el.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`
  })
}
watch(openId, async () => { await nextTick(); clampPops() })

// ---------- lifecycle ----------
let ro = null
let rmq = null // prefers-reduced-motion media query
function syncReduce() { reduceMotion.value = rmq ? rmq.matches : false }
onMounted(() => {
  // cap = f(width): observe the DOCUMENT width (the full-width ref) — never the dock itself, or
  // cap→button count→dock width→cap would form a feedback loop (SA Q4). visualViewport.width also
  // reflects pinch-zoom; window resize covers rotate/fold; RO covers layout-driven width changes.
  syncWidth()
  ro = typeof ResizeObserver === 'function' ? new ResizeObserver(syncWidth) : null
  ro?.observe(document.documentElement)
  window.addEventListener('resize', syncWidth)
  window.visualViewport?.addEventListener('resize', syncWidth)
  window.addEventListener('keydown', onEsc)
  // keyboard-aware: visualViewport shrinks when the soft keyboard opens; focus is the fallback.
  vv = window.visualViewport || null
  vv?.addEventListener('resize', syncKeyboard)
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  // hide-on-scroll: reduced-motion forces auto-hide off; the window is the scroll container.
  rmq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  syncReduce()
  rmq?.addEventListener?.('change', syncReduce)
  lastY = window.scrollY || window.pageYOffset || 0
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => {
  rmq?.removeEventListener?.('change', syncReduce)
  window.removeEventListener('resize', syncWidth)
  window.visualViewport?.removeEventListener('resize', syncWidth)
  vv?.removeEventListener('resize', syncKeyboard)
  document.removeEventListener('focusin', onFocusIn)
  document.removeEventListener('focusout', onFocusOut)
  window.removeEventListener('keydown', onEsc)
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('mousedown', onOutside)
  ro?.disconnect()
})

// ---------- menu (native dropdown) ----------
function pickMenu(it, value) { it.control?.onPick?.(value); close() }

// column flex weight for a row-2 cell — the stretchy cells (timeline/selector) fill the
// slack so the row uses the full width; fixed controls (คีย์) keep their natural size.
// Every slot cell keeps its NATURAL width so the dock hugs its content and no cell can be
// squeezed under its min-content (which made the timeline's total-time overflow into คีย์ · B1).
function cellFlex() { return '0 0 auto' }

// expanded-dock inline style: the drag-move transform (if any) + the chosen resize width (if any).
const dockStyle = computed(() => {
  const s = {}
  if (pos.value) s.transform = `translate(${pos.value.x}px, ${pos.value.y}px)`
  if (userWidth.value) s['--dk-w'] = userWidth.value + 'px'
  return s
})
</script>

<template>
  <div ref="hostEl" class="dk-host no-print" :style="{ '--a': alpha }">
    <p v-if="message" class="dk-msg" role="status">{{ message }}</p>

    <!-- hide-on-scroll shifts the WHOLE dock (mini + full) off-screen as one; it wraps both
         states so the translateY never fights the per-dock drag transform on .dk-dock (§2). -->
    <div class="dk-shift" :class="{ hidden: autoHidden }">
    <!-- collapsed → mini [grip][⚙] in place (DS I7). grip tap = expand · drag = move -->
    <div v-if="collapsed" class="dk-dock dk-mini" :style="pos ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : {}">
      <button
        class="dk-btn dk-grip"
        data-grip
        aria-label="กางแถบ · ลากเพื่อย้าย"
        title="แตะเพื่อกาง · ลากเพื่อย้าย"
        @pointerdown="gripDown"
        @pointermove="gripMove"
        @pointerup="gripUp"
        @pointercancel="gripUp"
      ><Icon name="grip-vertical" :size="22" /></button>
      <button class="dk-btn dk-gear" aria-label="กางเพื่อตั้งค่า" title="กางเพื่อตั้งค่า" @click="transition(false)"><Icon name="settings" :size="20" /></button>
    </div>

    <!-- expanded → the full dock: keys band(s) · pinned rows · row 2 · row 1 (core) -->
    <div v-else class="dk-dock" :class="{ 'dk-m': mobile, 'dk-sized': userWidth != null, 'dk-rz': resizable }" :style="dockStyle">
      <!-- resize handle (แบบ 2 · desktop pointer only · CSS @media hover) — drag to set the dock
           WIDTH → rows reflow · double-click → AUTO. Touch uses the ⚙ width slider instead. -->
      <button
        v-if="resizable"
        class="dk-resize"
        aria-label="ลากปรับความกว้างแถบ · ดับเบิลคลิกคืนอัตโนมัติ"
        title="ลากปรับความกว้าง · ดับเบิลคลิก = อัตโนมัติ"
        @pointerdown="resizeDown"
        @pointermove="resizeMove"
        @pointerup="resizeUp"
        @pointercancel="resizeUp"
        @dblclick="resizeAuto"
      ><Icon name="grip-vertical" :size="14" /></button>
      <!-- E1: full-width note-key band(s) (edit palette) — above every row, no overflow -->
      <div v-for="band in keysBands" :key="band.id" class="dk-keys" role="toolbar" :aria-label="band.name || 'แป้นสัญลักษณ์'">
        <div v-for="(krow, kri) in band.rows" :key="kri" class="dk-keyrow">
          <button v-for="k in krow" :key="k" class="dk-key" @mousedown.prevent="band.onInsert?.(k)">{{ k }}</button>
        </div>
      </div>

      <div
        v-for="(row, ri) in rows"
        :key="ri"
        class="dk-row"
        :class="{ spread: rowIsChrome(row) }"
      >
        <template v-for="it in row" :key="it.id">
          <!-- page-drawn cell (timeline · selector · Aa) — engine lays it out + clamps -->
          <span v-if="SLOT_KINDS.includes(it.kind)" class="dk-cell" :style="{ flex: cellFlex(it) }" :data-cell="it.id">
            <slot :name="`cell-${it.id}`" :item="it" :open="openId === it.id" :toggle="() => toggleOpen(it.id)" :close="close" />
          </span>

          <!-- grip -->
          <button
            v-else-if="it.kind === 'grip'"
            class="dk-btn dk-grip"
            data-grip
            :data-cell="it.id"
            aria-label="ย้าย/ย่อแถบ"
            title="แตะเพื่อย่อ · ลากเพื่อย้าย"
            @pointerdown="gripDown"
            @pointermove="gripMove"
            @pointerup="gripUp"
            @pointercancel="gripUp"
          ><Icon name="grip-vertical" :size="22" /></button>

          <!-- ⚙ setting -->
          <button
            v-else-if="it.kind === 'gear'"
            class="dk-btn dk-gear"
            :class="{ on: openId === 'setting' }"
            :data-cell="it.id"
            :aria-expanded="openId === 'setting'"
            aria-label="ตั้งค่า"
            title="ตั้งค่า"
            @click.stop="toggleOpen('setting')"
          ><Icon name="settings" :size="20" /></button>

          <!-- play / pause (icon-only) -->
          <button
            v-else-if="it.kind === 'play'"
            class="dk-play"
            :data-cell="it.id"
            :aria-label="it.control?.value ? 'พัก' : 'เล่น'"
            :title="it.control?.value ? 'พัก' : 'เล่น'"
            @click="it.run?.()"
          ><Icon :name="it.control?.value ? 'pause' : 'play'" :size="28" /></button>

          <!-- plain action button — E2 prime (brand fill) · danger (red) · optional label -->
          <button
            v-else-if="it.kind === 'btn'"
            class="dk-btn"
            :class="{ prime: it.prime, danger: it.danger, wide: it.label }"
            :data-cell="it.id"
            :disabled="it.disabled"
            :aria-label="it.name"
            :title="it.name"
            @click="it.run?.()"
          ><Icon :name="it.icon" :size="20" /><span v-if="it.label" class="dk-btn-lbl">{{ it.label }}</span></button>

          <!-- toggle (e.g. วนซ้ำ) — bar style: on = brand -->
          <button
            v-else-if="it.kind === 'toggle'"
            class="dk-btn dk-tgl"
            :class="{ on: it.control?.value }"
            :data-cell="it.id"
            role="switch"
            :aria-checked="!!it.control?.value"
            :aria-label="it.name"
            :title="it.name + (it.control?.value ? ' (เปิด)' : ' (ปิด)')"
            @click="it.control?.onToggle?.()"
          ><Icon :name="it.icon" :size="19" /></button>

          <!-- menu (dropdown of options + optional badge) -->
          <span v-else-if="it.kind === 'menu'" class="dk-pinwrap" :data-cell="it.id">
            <button
              class="dk-pbtn"
              :class="{ on: openId === it.id }"
              :aria-expanded="openId === it.id"
              :aria-label="it.name"
              :title="it.name"
              @click.stop="toggleOpen(it.id)"
            >
              <Icon :name="it.icon" :size="17" />
              <b v-if="it.control?.badge" class="dk-badge">{{ it.control.badge }}</b>
            </button>
            <div v-if="openId === it.id" class="dk-pop dk-dd" role="menu" @click.stop>
              <button
                v-for="o in it.control.options"
                :key="o.value"
                class="dk-ddrow"
                role="menuitemradio"
                :aria-checked="o.value === it.control.value"
                :disabled="o.disabled"
                @click="pickMenu(it, o.value)"
              ><span class="dk-ddck">{{ o.value === it.control.value ? '●' : '' }}</span>{{ o.label }}</button>
            </div>
          </span>

          <!-- slider (e.g. โปร่งใส) — inline compact -->
          <span v-else-if="it.kind === 'slider'" class="dk-pinwrap dk-slidewrap" :data-cell="it.id" :title="it.name">
            <Icon :name="it.icon" :size="16" />
            <input
              class="dk-slider"
              type="range"
              :min="it.control?.min ?? 40"
              :max="it.control?.max ?? 100"
              :value="it.control?.value"
              :aria-label="it.name"
              @input="it.control?.onInput?.(+$event.target.value)"
            />
          </span>
        </template>
      </div>

      <!-- ===== ⚙ Setting page — every item's home · adjust inline · ▲▼ · 📌 (DS §3) ===== -->
      <!-- a settings FORM, not a menu — its rows are controls, not menuitems (a11y 4.1.2) -->
      <div v-if="openId === 'setting'" class="dk-pop dk-panel" role="group" aria-label="ตั้งค่า" @click.stop>
        <!-- a11y: let the user turn OFF hide-on-scroll (persisted). Shown only when the page opts
             into auto-hide; disabled + forced off under reduced-motion (no screen-reader API · §6). -->
        <div v-if="autoHide" class="dk-prow dk-prow-ah" data-setting="__autohide">
          <span class="dk-mi"><Icon name="chevrons-down-up" :size="16" /></span>
          <span class="dk-pl">ซ่อนแถบเมื่อเลื่อนอ่าน</span>
          <span class="dk-pc">
            <button
              class="dk-switch"
              :class="{ on: !autoHideOff && !reduceMotion }"
              role="switch"
              :aria-checked="!autoHideOff && !reduceMotion"
              :disabled="reduceMotion"
              aria-label="ซ่อนแถบเมื่อเลื่อนอ่าน"
              @click.stop="autoHideOff = !autoHideOff"
            ><span class="dk-switch-k"></span></button>
          </span>
        </div>
        <!-- free-form width (แบบ 2): the touch/keyboard path for resize (the drag handle is pointer
             -only). Slider sets the dock width → rows reflow; ↺ returns to AUTO (hug content). Shown
             only when the host opts into :resizable (phrakham has no width control). -->
        <div v-if="resizable" class="dk-prow dk-prow-rz" data-setting="__width">
          <span class="dk-mi"><Icon name="move-horizontal" :size="16" /></span>
          <span class="dk-pl">ความกว้างแถบ</span>
          <span class="dk-pc">
            <input
              class="dk-prange"
              type="range"
              :min="MIN_W"
              :max="maxW()"
              step="8"
              :value="sliderWidth"
              aria-label="ความกว้างแถบ"
              @input="userWidth = clampWidth(+$event.target.value)"
            />
            <span class="dk-slval">{{ userWidth ? userWidth + 'px' : 'อัตโนมัติ' }}</span>
            <button
              class="dk-mv"
              :disabled="userWidth == null"
              aria-label="คืนความกว้างอัตโนมัติ"
              title="คืนอัตโนมัติ (กว้างตามเนื้อหา)"
              @click.stop="resizeAuto"
            >↺</button>
          </span>
        </div>
        <div v-for="it in settingItems" :key="it.id" class="dk-prow" :data-setting="it.id">
          <span class="dk-mi"><Icon :name="it.icon" :size="16" /></span>
          <span class="dk-pl">{{ it.name }}</span>
          <span class="dk-pc">
            <!-- a page-drawn cell (soundctl · export) moved into ⚙ (default:'inSetting'): the
                 engine lays out the row, the PAGE renders the control via #cell-<id>. Uses the
                 panel-local open state so opening it keeps the ⚙ page open (see panelOpenId). -->
            <slot
              v-if="SLOT_KINDS.includes(it.kind)"
              :name="`cell-${it.id}`"
              :item="it"
              :open="panelOpenId === it.id"
              :toggle="() => togglePanelOpen(it.id)"
              :close="closePanel"
            />
            <!-- issues9: a `btn` row used to render an EMPTY control cell — icon, name, pin, and
                 nothing to press — so the only way to run the command was to pin it onto the bar
                 first. Give it a real run button so every row in this panel does what it says. -->
            <button
              v-else-if="it.kind === 'btn'"
              class="dk-prun"
              :disabled="it.disabled"
              :aria-label="it.name"
              @click="it.run?.(); close()"
            >{{ it.label || it.name }}</button>
            <select
              v-else-if="it.kind === 'menu'"
              class="dk-select"
              :value="it.control?.value"
              :aria-label="it.name"
              @change="it.control?.onPick?.($event.target.value)"
            ><option v-for="o in it.control.options" :key="o.value" :value="o.value" :disabled="o.disabled">{{ o.label }}</option></select>
            <button
              v-else-if="it.kind === 'toggle'"
              class="dk-switch"
              :class="{ on: it.control?.value }"
              role="switch"
              :aria-checked="!!it.control?.value"
              :aria-label="it.name"
              @click="it.control?.onToggle?.()"
            ><span class="dk-switch-k"></span></button>
            <template v-else-if="it.kind === 'slider'">
              <input
                class="dk-prange"
                type="range"
                :min="it.control?.min ?? 40"
                :max="it.control?.max ?? 100"
                :value="it.control?.value"
                :aria-label="it.name"
                @input="it.control?.onInput?.(+$event.target.value)"
              />
              <span class="dk-slval">{{ it.control?.value }}%</span>
            </template>
          </span>
          <!-- ▲▼ reorder only for PINNED items (meaningless otherwise · reclaims row width so
               the panel fits a 375px phone without h-scroll · B10) -->
          <button v-if="isPinned(it.id)" class="dk-mv" :disabled="pinIndex(it.id) === 0" aria-label="เลื่อนขึ้น" @click.stop="movePin(it.id, -1)">▲</button>
          <button v-if="isPinned(it.id)" class="dk-mv" :disabled="pinIndex(it.id) === pins.length - 1" aria-label="เลื่อนลง" @click.stop="movePin(it.id, 1)">▼</button>
          <button
            class="dk-pin"
            :class="{ on: isPinned(it.id) }"
            :aria-pressed="isPinned(it.id)"
            :aria-label="(isPinned(it.id) ? 'ถอน' : 'ปัก') + it.name"
            title="ปัก/ถอนขึ้นแถบ"
            @click.stop="togglePin(it.id)"
          >📌</button>
        </div>
      </div>
    </div>
    </div><!-- /.dk-shift -->

    <!-- peek handle — the only thing left when the dock hid on scroll; tap to bring it back
         (always reachable so AT/keyboard users can recover the bar · §6). -->
    <button
      v-if="autoHidden"
      class="dk-peek"
      aria-label="แสดงแถบเครื่องมือ"
      title="แสดงแถบเครื่องมือ"
      @click="revealDock"
    ><Icon name="chevron-up" :size="20" /></button>
  </div>
</template>

<style scoped>
/* fixed bottom-center; the host lets clicks pass through the gutter, the dock catches them */
.dk-host {
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
.dk-msg {
  pointer-events: auto;
  margin: 0;
  background: var(--ink);
  color: #fff;
  padding: 8px 16px;
  border-radius: 10px;
  max-width: 92vw;
  font-size: 13px;
}
/* hide-on-scroll: the shift wrapper carries the whole dock down off-screen (its own translateY,
   kept off .dk-dock so the drag transform is never overwritten). Layout box stays in flow. */
.dk-shift {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: transform 0.22s ease;
  will-change: transform;
}
.dk-shift.hidden { transform: translateY(calc(100% + 24px)); }
/* peek handle — out of flow (fixed) so it stays put while the shift slides away; always tappable */
.dk-peek {
  pointer-events: auto;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  width: 56px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 13px 13px 6px 6px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--muted);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}
@media (hover: hover) { .dk-peek:hover { color: var(--brand); border-color: var(--brand); } }
@media (prefers-reduced-motion: reduce) { .dk-shift { transition: none; } }
.dk-dock {
  pointer-events: auto;
  position: relative;
  background: rgba(255, 255, 255, var(--a, 0.96));
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(max(0px, calc((var(--a, 0.96) - 0.4) / 0.6 * 6px)));
  -webkit-backdrop-filter: blur(max(0px, calc((var(--a, 0.96) - 0.4) / 0.6 * 6px)));
  padding: 10px; /* D1: comfortable breathing room around the button rows */
}
/* The dock is a FLOATING TOOLBOX (P'Aim): it hugs its content on EVERY side — width = the
   widest row's natural button width, never the screen. AUTO = fit-content; free-form resize sets
   `--dk-w` (แบบ 2). `- 20px` = the host's 10px L/R padding. `min-width: min-content` floors BOTH
   modes at the widest single button (with .dk-row flex-wrap that is one button, not a whole row) so
   the chosen width can never squeeze a button below its --touch-min or clip it; max-width keeps the
   dock inside the viewport (the 344 fix + the resize ceiling in one). */
.dk-dock { width: var(--dk-w, fit-content); min-width: min-content; max-width: min(700px, calc(100vw - 20px)); }
.dk-dock.dk-mini { width: auto; min-width: 0; max-width: none; display: inline-flex; gap: 8px; padding: 7px 9px; }
/* resize handle — a vertical grip that floats just OUTSIDE the dock's right edge (in the host's
   gutter · vertically centred) so it never overlaps a button or the keys band. A vertical dot-bar
   reads as a horizontal drag affordance (like a column resizer). Pointer-only (touch can't
   edge-drag · §1 → the ⚙ slider is the touch path); `@media (hover: hover)` reveals it.
   touch-action:none so a stray touch-drag isn't stolen by page scroll. */
.dk-resize {
  position: absolute; top: 50%; right: -16px; transform: translateY(-50%); z-index: 2;
  width: 16px; height: 34px; min-height: 0; padding: 0; border: 0; border-radius: 6px;
  display: none; align-items: center; justify-content: center;
  background: transparent; color: var(--muted); cursor: ew-resize; touch-action: none;
}
@media (hover: hover) {
  .dk-resize { display: inline-flex; }
  .dk-resize:hover { color: var(--brand); background: var(--cream); }
  /* reserve the handle's 16px overhang (+ margin) so a max-width dock on a NARROW hover window
     can never poke the handle past the viewport. Only on hover devices (the handle is hidden on
     touch, so mobile keeps the full 100vw-20 cap). */
  .dk-dock.dk-rz { max-width: min(700px, calc(100vw - 44px)); }
}
.dk-sized { transition: width 0.03s linear; } /* width edits stay near-instant, just un-janked */

/* rows pack left-to-right at each button's natural size (grip first · ⚙ at the end of the
   cluster). No justify/space-between — the buttons stay grouped, not pinned to both edges.
   flex-wrap: a row whose natural width exceeds the (clamped) dock REFLOWS to more lines instead
   of overflowing the viewport — the last button (⚙) was clipped ~+23px past a 344 Fold-cover when
   a wide pill (▶ ฟังบทความ) + menu chip pushed the nowrap row past min(700, 100vw). Buttons keep
   their --touch-min floor; only the row count grows (the cap=f(width) intent, guaranteed in CSS
   so it holds for ANY host/font/glyph width — pleng editor AND the phrakham island · 2-host). */
.dk-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.dk-row + .dk-row { margin-top: 9px; }
.dk-cell { display: inline-flex; align-items: center; min-width: 0; }

/* buttons (44px tap target · WCAG 2.2 AA) */
.dk-btn {
  width: var(--touch-min); height: var(--touch-min); min-width: var(--touch-min); min-height: 0;
  padding: 0; border: 0; background: transparent; color: var(--ink);
  display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; cursor: pointer; flex: 0 0 auto;
}
@media (hover: hover) { .dk-btn:hover { background: var(--cream); } }
.dk-btn.on { color: var(--brand); background: var(--cream); }
.dk-grip { color: var(--muted); cursor: grab; touch-action: none; }
.dk-grip:active { cursor: grabbing; }
.dk-gear { color: var(--muted); }
.dk-gear.on { color: var(--brand); background: var(--cream); }
.dk-tgl:not(.on) { color: var(--muted); }
.dk-tgl.on { color: var(--brand); background: var(--cream); }
.dk-play {
  width: 50px; height: 50px; min-height: 0; padding: 0; border: 0; background: transparent; color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: 0 0 auto;
}
.dk-play:hover { filter: brightness(1.1); }
.dk-btn:disabled { opacity: 0.4; cursor: default; }
/* E2: a labeled action button (row-2 บันทึก / ฟังทั้งเพลง) — icon + text pill */
.dk-btn.wide { width: auto; min-width: var(--touch-min); padding: 0 12px; gap: 6px; border: 1px solid var(--line); }
.dk-btn-lbl { font-size: 13px; font-weight: 600; white-space: nowrap; }
/* prime = the page's main action (พิมพ์ · บันทึก), brand-filled */
.dk-btn.prime { background: var(--brand); color: #fff; border: 1px solid var(--brand); }
.dk-btn.prime:hover { filter: brightness(1.06); background: var(--brand); }
.dk-btn.danger { color: var(--red); }

/* E1: full-width jianpu key band(s) — rows share their line (keys stretch, never wrap) */
.dk-keys { display: flex; flex-direction: column; gap: 4px; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid var(--line); }
.dk-keyrow { display: flex; flex-wrap: nowrap; gap: 4px; justify-content: center; }
.dk-key {
  flex: 1 1 0; min-width: 30px; max-width: 56px; height: var(--touch-min); min-height: 0; padding: 0;
  border: 1px solid var(--line); border-radius: 8px; background: transparent; color: var(--ink);
  font-family: 'Courier New', monospace; font-weight: 700; font-size: 16px; cursor: pointer;
}
@media (hover: hover) { .dk-key:hover { background: var(--cream); } }

/* menu / slider chips — no position:relative so every popover anchors to the DOCK (all
   popups open at the SAME spot: right edge, from the dock's top · §A) */
.dk-pinwrap { display: inline-flex; align-items: center; gap: 3px; flex: 0 0 auto; }
.dk-pbtn {
  display: inline-flex; align-items: center; gap: 4px;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 10px; padding: 0 10px; height: var(--touch-min); min-height: 0; font: inherit; cursor: pointer; flex: 0 0 auto;
}
@media (hover: hover) { .dk-pbtn:hover { border-color: var(--brand); } }
.dk-pbtn.on { border-color: var(--brand); color: var(--brand); }
.dk-badge { font-size: 12.5px; font-weight: 700; }
.dk-slidewrap { padding: 0 8px; border: 1px solid var(--line); border-radius: 10px; height: var(--touch-min); color: var(--muted); }
.dk-slider { width: 74px; accent-color: var(--brand); }

/* popovers open ABOVE the dock, RIGHT-aligned to it, at the same spot every time (§A).
   They FIT their content — no v/h scroll (clampPops keeps them on-screen +8px · DS I5). */
.dk-pop {
  pointer-events: auto;
  position: absolute; bottom: calc(100% + 8px); right: 8px; left: auto;
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); z-index: 30;
  width: max-content; max-width: calc(100vw - 24px); padding: 6px;
}
.dk-dd { min-width: 160px; }
.dk-ddrow {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 10px; border: 0; background: transparent;
  border-radius: 8px; cursor: pointer; text-align: left; color: var(--ink); font: inherit; font-size: 13px; white-space: nowrap; min-height: 0;
}
@media (hover: hover) { .dk-ddrow:not(:disabled):hover { background: var(--cream); } }
.dk-ddrow[aria-checked='true'] { color: var(--brand); font-weight: 700; }
.dk-ddrow:disabled { opacity: 0.42; cursor: default; }
.dk-ddck { flex: 0 0 14px; text-align: center; color: var(--brand); }

/* ⚙ Setting page — fits content, no scroll, even 8px rhythm (§A / B10-B12) */
.dk-panel { min-width: 260px; padding: 8px; }
.dk-prow { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-radius: 8px; }
.dk-prow + .dk-prow { border-top: 1px solid var(--line); }
@media (hover: hover) { .dk-prow:hover { background: var(--cream); } }
.dk-mi { width: 20px; display: inline-flex; justify-content: center; color: var(--brand); flex: 0 0 20px; }
.dk-mi :deep(svg) { width: 16px; height: 16px; }
.dk-pl { font-size: 13px; flex: 1; min-width: 56px; white-space: nowrap; }
.dk-pc { display: flex; align-items: center; gap: 6px; }
.dk-select { font: inherit; font-size: 12.5px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--ink); cursor: pointer; max-width: 190px; min-height: 34px; }
.dk-switch { width: 42px; height: 24px; min-height: 0; border-radius: 12px; border: 0; background: #c9c0b3; position: relative; cursor: pointer; padding: 0; flex: 0 0 auto; transition: background 0.15s; }
.dk-switch.on { background: var(--brand); }
.dk-switch-k { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); transition: left 0.15s; }
.dk-switch.on .dk-switch-k { left: 20px; }
/* run button for a `btn` row — same treatment as .dk-select (a secondary control in the panel,
   not a primary: ui-standards §2 button hierarchy). 34px matches the other panel controls. */
.dk-prun { font: inherit; font-size: 12.5px; padding: 6px 12px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--ink); cursor: pointer; min-height: 34px; white-space: nowrap; }
.dk-prun:disabled { opacity: 0.4; cursor: default; }
@media (hover: hover) { .dk-prun:not(:disabled):hover { border-color: var(--brand); color: var(--brand); } }
.dk-prange { width: 60px; accent-color: var(--brand); }
.dk-slval { font-size: 11px; color: var(--muted); min-width: 32px; }
.dk-mv { border: 1px solid var(--line); background: transparent; color: var(--muted); border-radius: 6px; padding: 2px 6px; font-size: 11px; cursor: pointer; min-height: 0; flex: 0 0 auto; }
.dk-mv:disabled { opacity: 0.35; cursor: default; }
@media (hover: hover) { .dk-mv:not(:disabled):hover { border-color: var(--brand); color: var(--brand); } }
.dk-pin { border: 0; background: transparent; font-size: 14px; filter: grayscale(1); opacity: 0.4; cursor: pointer; padding: 2px 4px; flex: 0 0 auto; }
.dk-pin.on { filter: none; opacity: 1; }

/* ---------- mobile: full-width bottom bar ---------- */
@media (max-width: 760px) {
  .dk-host { padding: 0 5px calc(8px + env(safe-area-inset-bottom, 0px)); }
  /* A real ~360px Android must fit ALL 7 buttons of the transport row + the top row (P'Aim: ปุ่มขวา
     หลุดขอบ). Shrinking --touch-min cascades to EVERY dock button (incl. the slotted ท่อน / เสียงดนตรี
     / Aa cells, since CSS vars ignore scoped-style boundaries), and tighter gap/padding buys the rest.
     42px is still a comfortable tap target; the row now hugs ~318px so it fits a 360px viewport. */
  .dk-dock { --touch-min: 42px; padding: 6px; }
  .dk-row { gap: 4px; }
  .dk-play { width: 42px; height: 42px; }
}
/* narrowest phones (~≤360px) — trim one more notch so nothing clips */
@media (max-width: 380px) {
  .dk-dock { --touch-min: 40px; padding: 5px; }
  .dk-row { gap: 3px; }
  .dk-play { width: 40px; height: 40px; }
}
</style>
