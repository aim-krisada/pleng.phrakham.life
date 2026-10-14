<script setup>
// DockKey — the ONE reusable dock "core engine" (library กลาง). Every studio page
// (ฝึกร้อง · แผ่นเพลง · แก้ไข) hands it ONLY a list of button descriptors (`items`); the
// engine owns everything else: the bar layout, one-popover-at-a-time + clamp, and the ⚙ Setting
// page with pin/reorder. So the three pages share ONE engine and differ only in DATA, not code.
// Ported from the P'Aim-approved prototype docs/design/dockkey-sing-prototype.html per the DS
// docs/ds/dockkey-library.md.
//
// ใบ v3/pleng#111 — the dock is a BAR fixed to the bottom edge at EVERY width, on all three
// pages: full width, solid background, no drag, no collapse, no transparency (ใบ#108/#109 did
// this for phones only). Its contents sit in a centred column no wider than 1200px. Two
// exceptions keep it from getting in the way:
//   • a short window (< 500px tall — a phone on its side, or the page zoomed to 400%): the bar
//     stops being fixed and sits at the end of the page instead (`dk-flow`), so it never takes
//     a big slice of a small screen (WCAG 1.4.10). Every button is still there.
//   • a touch screen while a text field has focus (the on-screen keyboard is up): the bar steps
//     aside (`dk-kbd`) so it never floats over the keyboard or the field being typed in.
//
// Descriptor (DS §2):
//   { id, name, icon(Lucide), kind, place:{anchor,row,col,span}, default, pinnable,
//     permanent, hidden, run, control:{options,value,onPick,badge | onToggle | min,max,onInput} }
//   anchor: 'left' | 'right' | 'rightOf:<id>' | 'leftOf:<id>'  (row 1 chrome/transport)
//   kind:   'gear'|'play'|'btn'|'toggle'|'menu'|'slider'|'keys' → drawn by the engine
//           'timeline'|'sel'|'aa'|'slot'                        → drawn by the PAGE via a
//           #cell-<id> slot ({ open, toggle, close }); the engine still lays it out, tracks
//           its one-at-a-time popover, and clamps any .dk-pop the slot renders.
//   A leftover 'grip' item, or one flagged `hideOnBar`, is ignored (there is nothing to drag,
//   fold or see through any more).
//
// ใบ v3/pleng#114 — on a phone (narrower than 600px) the bar gives the page more room:
//   • a 'keys' band with `showFor: '<selector>'` shows ONLY while focus is in a matching field
//     (the editor's note keypad: only while a note cell is being edited — like the phone's own
//     keyboard). On a touch screen, where the phone's keyboard is up too, the bar then shows just
//     that band, lifted to sit right on top of the phone's keyboard (`dk-keysonly`).
//   • a `btn` with `phoneIcon: true` drops its text label and shows its icon only (its name stays
//     as the accessible name and tooltip), so every button fits in two rows.
// ใบ v3/pleng#118 — the keypad rule (showFor · dk-keysonly) now covers every screen narrower than
// 1024px (a Fold, a tablet held upright). Measured there, a keypad that stayed up
// all the time took 111px of an 884px-tall screen while no note cell was being edited, and on a touch
// screen the whole bar — keypad included — stepped aside for the keyboard while a note WAS being
// typed, so the keypad was never there when it was needed. Icon-only buttons stay phone-only:
// the medium bar already fits its words in two rows.
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Icon from './Icon.vue'
import { isTextField } from '../lib/focusClear.js'
import { barLayout } from '../lib/dockLayout.js'
import { COMPACT_Q } from '../lib/headerHide.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
  // namespaces the remembered pins so pages don't collide in localStorage
  storeKey: { type: String, default: 'dock' },
  message: { type: String, default: '' }, // transient status line floated above the dock
  // the bar's accessible name (role="toolbar") — each page names its own
  label: { type: String, default: 'แถบเครื่องมือ' },
})

const SLOT_KINDS = ['timeline', 'sel', 'aa', 'slot'] // drawn by the page via #cell-<id>

// E1: full-width keyboard band(s) (e.g. the edit jianpu palette) — laid out above every row.
// ใบ#114: on a phone (ใบ#118: any screen narrower than 1024px) a band with `showFor` shows only while focus is in a matching field — or on
// the band itself (a key that took focus must not make its own keypad disappear).
const keyShown = (band) => !compact.value || !band.showFor || !!focusEl.value?.closest?.(`${band.showFor}, .dk-keys`)
const keysBands = computed(() => visible.value.filter((i) => i.kind === 'keys' && keyShown(i)))

// ---------- registry helpers ----------
const byId = (id) => props.items.find((i) => i.id === id)
const retired = (i) => i.kind === 'grip' || i.hideOnBar
const visible = computed(() => props.items.filter((i) => !i.hidden && !retired(i)))
// items with a home in the ⚙ Setting page: everything not on the bar by default, plus
// anything pinnable (so it can be un-pinned back into its home) — DS I4.
const settingItems = computed(() => visible.value.filter((i) => i.default === 'inSetting' || i.pinnable))

// ---------- persisted pins ----------
const LS_PINS = computed(() => `pleng.dockkey.${props.storeKey}.pins`)
function loadPins() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_PINS.value) || 'null')
    if (Array.isArray(raw)) return raw.filter((id) => typeof id === 'string' && byId(id))
  } catch { /* ignore bad storage */ }
  return []
}
const pins = ref(loadPins())
watch(pins, (v) => { try { localStorage.setItem(LS_PINS.value, JSON.stringify(v)) } catch { /* ignore */ } }, { deep: true })
// ใบ#111 — the floating dock remembered whether it was folded and how see-through it was. Neither
// exists any more: the values are never read, and are cleared once so they can't come back to
// life. (The dragged spot was never saved.)
function forgetOldDock() {
  try {
    localStorage.removeItem(`pleng.dockkey.${props.storeKey}.collapsed`)
    localStorage.removeItem(`pleng.dockkey.${props.storeKey}.alpha`)
  } catch { /* storage blocked — nothing to clear */ }
}

// ---------- the two times the bar steps out of the way ----------
// short window → in the page flow, not fixed (WCAG 1.4.10: at 400% zoom a fixed bar would cover
// most of the screen).
const SHORT_Q = '(max-height: 499px)'
// a touch screen (no mouse) — the one place an on-screen keyboard comes up for a text field
const TOUCH_Q = '(hover: none) and (pointer: coarse)'
const short = ref(false)
const typing = ref(false) // a text field outside the bar has focus on a touch screen
const compact = ref(false) // ใบ#114 · ใบ#118: narrower than 1024px (COMPACT_Q)
const focusEl = shallowRef(null) // what has focus now (the keypad follows it on a phone)
let mqShort = null
const matches = (q) => typeof window.matchMedia === 'function' && !!window.matchMedia(q)?.matches
function syncShort() { short.value = matches(SHORT_Q); compact.value = matches(COMPACT_Q) }
const typingIn = (el) => matches(TOUCH_Q) && isTextField(el) && !el.closest?.('.dk-host')
// a field inside the bar's own popover (e.g. a number box) must not hide the bar under itself
function onFocusIn(e) { typing.value = typingIn(e.target); focusEl.value = e.target }
function onFocusOut() {
  // wait for the next focus to land: moving from one field to the next keeps the bar hidden
  setTimeout(() => { typing.value = typingIn(document.activeElement); focusEl.value = document.activeElement }, 0)
}
// ใบ#114 — phone + touch + a note cell being typed in: the phone's keyboard is up, so the bar shows
// only the note keypad, sitting right on top of that keyboard (like the row of extra keys a phone
// keyboard offers). Any other text field: the whole bar steps aside, as before (ใบ#111).
const keysOnly = computed(() => typing.value && compact.value && keysBands.value.length > 0)
// How high the phone's keyboard reaches into the screen. Most phone browsers now shrink only the
// VISIBLE part of the page for the keyboard and leave the page's own box (where a fixed bar sits)
// as it was, so a bar at the bottom would sit behind the keyboard. The visible part's bottom edge
// (visualViewport) says where the keyboard starts. A browser that shrinks the whole page instead
// gives 0 here, and the bar is already above the keyboard.
const kbLift = ref(0)
function syncLift() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  if (!keysOnly.value || !vv) { kbLift.value = 0; return }
  const pageH = document.documentElement.clientHeight || window.innerHeight
  const lift = Math.round(pageH - (vv.offsetTop + vv.height))
  kbLift.value = lift > 0 ? Math.min(lift, Math.round(pageH * 0.7)) : 0
}
watch(keysOnly, syncLift)

// ---------- one popover at a time (menu · setting · a slot cell) ----------
const openId = ref(null) // item id | 'setting' | null
function toggleOpen(id) { openId.value = openId.value === id ? null : id }
function close() { openId.value = null }
function onEsc(e) {
  if (e.key !== 'Escape' || !openId.value) return
  // Esc closes the popover and, if focus was inside it, hands focus back to its button
  const host = hostEl.value
  const inside = !!host && host.contains(document.activeElement)
  const trigger = host?.querySelector('[aria-expanded="true"]')
  close()
  if (inside && trigger) nextTick(() => trigger.focus?.())
}
function onOutside(e) {
  // click outside the whole dock closes; clicks inside are handled by the triggers
  if (!e.target.closest?.('.dk-host')) close()
}
watch(openId, (v) => {
  if (v) setTimeout(() => document.addEventListener('mousedown', onOutside), 0)
  else document.removeEventListener('mousedown', onOutside)
})

// ---------- ENGINE: order row 1 by anchor, row 2 by column ----------
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
// Only items WITHOUT a home on the bar can be pinned onto it. An item that has a `place` is
// already drawn by row1/row2, so honouring a stale pin for it would draw the same button twice
// (ui-standards §2 single source of action). This also self-heals a saved pin from before an item
// was promoted to the bar — e.g. พี่เปา's pinned 'draft' (issues9) — with no storage migration.
const pinnedItems = computed(() => pins.value.map(byId).filter((i) => i && !i.place && !retired(i)))

// ---------- ใบ v3/pleng#109 → #111 — the bar: seek row on top, the buttons centred below ----------
// Material 3 media-player layout: the seek bar takes the full width of its own row; every
// button (transport, คีย์, ความเร็ว, ท่อน, เสียง, download, Aa, ⚙, anything pinned) sits together
// in one centred group under it, at a 48px touch target with the same 8px spacing at every width —
// the extra room on a wider screen is left at the sides, not spread between buttons. Order = row 1
// up to ⚙, then row 2, then the pinned buttons, then ⚙.
// When that one row is wider than the bar (a phone), the group splits into TWO centred rows at the
// dock's own seam — [ท่อนก่อน เล่น ท่อนถัดไป ดาวน์โหลด Aa] over [คีย์ ความเร็ว ท่อน เสียง … ⚙] —
// so every button stays on the bar (none is hidden in ⚙). เล่น stays on the first row, ⚙ ends the
// last. A row that is still too wide (many pinned buttons) wraps inside itself, never off-screen.
const barHead = computed(() => {
  const r1 = row1.value
  const gi = r1.findIndex((it) => it.kind === 'gear')
  return gi >= 0 ? r1.slice(0, gi) : r1
})
const barTail = computed(() => {
  const r1 = row1.value
  const gi = r1.findIndex((it) => it.kind === 'gear')
  const extra = [...row2.value.filter((i) => i.kind !== 'timeline'), ...pinnedItems.value]
  return gi >= 0 ? [...extra, ...r1.slice(gi)] : extra
})
// ใบ v3/pleng#113 — and where there is room, the seek bar and the buttons share ONE row: the seek
// bar + time on the left, the whole button group on the right (still inside the centred column).
// Only when the seek bar keeps at least 240px (lib/dockLayout.js · Apple HIG sliders) without any
// button or gap getting smaller; otherwise the bar stays as above. The decision is measured on the
// real bar, so it works for every page whatever its buttons.
const layout = ref('stack') // 'one' | 'stack' | 'stack2' — see lib/dockLayout.js
const twoRows = computed(() => layout.value === 'stack2') // the one button row didn't fit → split in two
const seekItems = computed(() => (keysBands.value.length ? [] : row2.value.filter((i) => i.kind === 'timeline')))
const oneRow = computed(() => layout.value === 'one' && seekItems.value.length > 0)
const shownRows = computed(() => {
  const seek = row2.value.filter((i) => i.kind === 'timeline')
  const btns = twoRows.value && barHead.value.length && barTail.value.length
    ? [{ key: 'btns1', cls: 'dk-btnrow', items: barHead.value }, { key: 'btns2', cls: 'dk-btnrow', items: barTail.value }]
    : [{ key: 'btns', cls: 'dk-btnrow', items: [...barHead.value, ...barTail.value] }]
  return [...(seek.length ? [{ key: 'seek', cls: 'dk-seekrow', items: seek }] : []), ...btns]
})

// Measure, then pick the layout. Every width used here is the same in every layout (a button's
// width, the time label), so the choice never flips back and forth.
//   buttons   = every button cell side by side + the 8px gaps between them
//   seekFixed = what sits beside the slider in its row (time label, the gaps, padding) — counted
//               from those pieces, not from the cell, whose box may be squeezed. A label marked
//               `data-dk-shrink` (ท่อนที่เล่นอยู่) gives up its width when room is short, so only its
//               gap counts.
function seekFixedWidth(slider) {
  const box = slider.parentElement
  if (!box) return 0
  const cs = window.getComputedStyle(box)
  const px = (v) => parseFloat(v) || 0
  const kids = [...box.children].filter((el) => window.getComputedStyle(el).display !== 'none')
  const fixed = kids
    .filter((el) => el !== slider && !el.hasAttribute('data-dk-shrink'))
    .reduce((sum, el) => sum + el.getBoundingClientRect().width, 0)
  return px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth) +
    fixed + px(cs.columnGap) * Math.max(0, kids.length - 1)
}
async function refit() {
  await nextTick()
  const inner = hostEl.value?.querySelector('.dk-inner')
  const rows = [...(hostEl.value?.querySelectorAll('.dk-btnrow') || [])]
  if (!inner || !rows.length) return
  const avail = inner.clientWidth
  const gap = parseFloat(window.getComputedStyle(rows[0]).columnGap) || 0
  const cells = rows.flatMap((r) => [...r.querySelectorAll(':scope > [data-cell]')])
  const buttons = cells.reduce((s, el) => s + el.getBoundingClientRect().width, 0) + gap * Math.max(0, cells.length - 1)
  const slider = seekItems.value.length ? hostEl.value.querySelector('.dk-seekrow [role="slider"]') : null
  const next = barLayout({ avail, buttons, hasSeek: !!slider, seekFixed: slider ? seekFixedWidth(slider) : 0 })
  if (next && next !== layout.value) layout.value = next
}
watch(() => [barHead.value.map((i) => i.id).join(), barTail.value.map((i) => i.id).join()], refit, { flush: 'post' })
// a button's width can change with what it shows (ความเร็ว 92 → 120 · คีย์ C → F#)
watch(() => props.items, refit, { flush: 'post' })

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

// ---------- keep every popover on-screen (+8px · DS I5, no exceptions) ----------
const hostEl = ref(null)
function dockEl() { return hostEl.value?.querySelector('.dk-dock') }
// Every popover opens ABOVE the bar, its right edge lined up with the right end of the button
// group (the same spot every time, §A) — on a wide screen that is next to the buttons, not out at
// the screen edge. It may be no taller than the room between the screen top and the bar; a panel
// taller than that scrolls inside itself. Then it is nudged to stay 8px inside the screen.
function clampPops() {
  const host = hostEl.value
  const dock = dockEl()
  if (!host || !dock) return
  const fr = { left: 8, right: window.innerWidth - 8, top: 8, bottom: window.innerHeight - 8 }
  const dr = dock.getBoundingClientRect()
  const groupRight = Math.max(0, ...[...host.querySelectorAll('.dk-btnrow > [data-cell]')].map((c) => c.getBoundingClientRect().right))
  // fixed bar: the room is above it. In-flow bar (short window): the whole screen height.
  const room = short.value ? window.innerHeight - 16 : dr.top - 16
  host.querySelectorAll('.dk-pop').forEach((el) => {
    el.style.transform = ''
    if (groupRight > 0 && dr.width > 0) el.style.right = Math.max(8, Math.round(dr.right - groupRight)) + 'px'
    if (dr.height > 0) {
      el.style.maxHeight = Math.max(120, Math.floor(room)) + 'px'
      el.style.overflowY = 'auto'
    }
    const r = el.getBoundingClientRect()
    let dx = 0, dy = 0
    if (r.right > fr.right) dx = fr.right - r.right
    if (r.left + dx < fr.left) dx = fr.left - (r.left + dx)
    if (r.top < fr.top) dy = fr.top - r.top
    else if (r.bottom > fr.bottom) dy = fr.bottom - r.bottom
    if (dx || dy) el.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`
  })
}
watch(openId, async () => { await nextTick(); clampPops() })

// ---------- lifecycle ----------
let ro = null
function onResize() { syncShort(); refit(); if (openId.value) nextTick(clampPops) }
onMounted(() => {
  forgetOldDock()
  mqShort = typeof window.matchMedia === 'function' ? window.matchMedia(SHORT_Q) : null
  syncShort()
  focusEl.value = document.activeElement
  window.visualViewport?.addEventListener?.('resize', syncLift)
  window.visualViewport?.addEventListener?.('scroll', syncLift)
  mqShort?.addEventListener?.('change', syncShort)
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onEsc)
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  // the bar's width follows the window; the page around it can also hide/show it (Studio keeps
  // all three modes mounted) — re-fit whenever the dock's box changes size
  if (typeof ResizeObserver === 'function' && hostEl.value) {
    ro = new ResizeObserver(() => refit())
    ro.observe(hostEl.value)
  }
  refit()
})
onUnmounted(() => {
  mqShort?.removeEventListener?.('change', syncShort)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onEsc)
  document.removeEventListener('focusin', onFocusIn)
  document.removeEventListener('focusout', onFocusOut)
  document.removeEventListener('mousedown', onOutside)
  window.visualViewport?.removeEventListener?.('resize', syncLift)
  window.visualViewport?.removeEventListener?.('scroll', syncLift)
  ro?.disconnect()
})

// ---------- menu (native dropdown) ----------
function pickMenu(it, value) { it.control?.onPick?.(value); close() }

// column flex weight for a cell. DEFAULT = natural width. A page can opt ONE cell in to shrinking
// by giving its descriptor a `flex` string (ฝึกร้อง gives the timeline `1 1 auto`).
function cellFlex(it) { return it?.flex || '0 0 auto' }
</script>

<template>
  <div
    ref="hostEl"
    class="dk-host dk-bar no-print"
    :class="{ 'dk-flow': short, 'dk-kbd': typing && !keysOnly, 'dk-keysonly': keysOnly, 'dk-lift': kbLift > 0, 'dk-one': oneRow }"
    :style="kbLift > 0 ? { bottom: kbLift + 'px' } : null"
  >
    <p v-if="message" class="dk-msg" role="status">{{ message }}</p>

    <div class="dk-dock" role="toolbar" :aria-label="label">
      <div class="dk-inner">
        <!-- E1: full-width note-key band(s) (edit palette) — above every row -->
        <div v-for="band in keysBands" :key="band.id" class="dk-keys" role="group" :aria-label="band.name || 'แป้นสัญลักษณ์'">
          <div v-for="(krow, kri) in band.rows" :key="kri" class="dk-keyrow">
            <button v-for="k in krow" :key="k" class="dk-key" @mousedown.prevent="band.onInsert?.(k)">{{ k }}</button>
          </div>
        </div>

        <div
          v-for="row in shownRows"
          :key="row.key"
          class="dk-row"
          :class="row.cls"
        >
          <template v-for="it in row.items" :key="it.id">
            <!-- page-drawn cell (timeline · selector · Aa) — engine lays it out + clamps -->
            <span v-if="SLOT_KINDS.includes(it.kind)" class="dk-cell" :style="{ flex: cellFlex(it) }" :data-cell="it.id">
              <slot :name="`cell-${it.id}`" :item="it" :open="openId === it.id" :toggle="() => toggleOpen(it.id)" :close="close" />
            </span>

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
              :class="{ prime: it.prime, danger: it.danger, wide: it.label, 'dk-phoneicon': it.phoneIcon && it.label }"
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

            <!-- slider — inline compact -->
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
      </div>

      <!-- ===== ⚙ Setting page — every item's home · adjust inline · ▲▼ · 📌 (DS §3) ===== -->
      <!-- a settings FORM, not a menu — its rows are controls, not menuitems (a11y 4.1.2) -->
      <div v-if="openId === 'setting'" class="dk-pop dk-panel" role="group" aria-label="ตั้งค่า" @click.stop>
        <div v-for="it in settingItems" :key="it.id" class="dk-prow" :data-setting="it.id">
          <span class="dk-mi"><Icon :name="it.icon" :size="16" /></span>
          <span class="dk-pl">{{ it.name }}</span>
          <span class="dk-pc">
            <!-- issues9: a `btn` row gets a real run button so every row in this panel does what it says -->
            <button
              v-if="it.kind === 'btn'"
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
  </div>
</template>

<style scoped>
/* ---------- ใบ v3/pleng#111: ONE bar at every width, on every page ----------
   Fixed to the bottom edge, edge to edge, solid white. The host lets clicks pass through the
   space around the status line; the bar itself catches them. Its own bottom padding grows by the
   iPhone home-indicator inset, so the buttons sit above that strip while the background still
   reaches the very edge. The contents sit in a centred column at most 1200px wide, so on a big
   screen the buttons stay together in the middle instead of running out to the screen edges. */
.dk-host {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  pointer-events: none;
}
.dk-msg {
  pointer-events: auto;
  align-self: center;
  margin: 0 0 6px;
  background: var(--ink);
  color: #fff;
  padding: 8px 16px;
  border-radius: 10px;
  max-width: 92vw;
  font-size: 13px;
}
.dk-dock {
  pointer-events: auto;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  border-top: 1px solid var(--line);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
}
.dk-inner { max-width: 1200px; margin: 0 auto; }

/* short window (< 500px tall · a phone on its side · 400% zoom): the bar is part of the page,
   at its end, instead of covering a big slice of the screen (WCAG 1.4.10 Reflow) */
.dk-host.dk-flow { position: static; pointer-events: auto; margin-top: 16px; }
.dk-host.dk-flow .dk-dock { box-shadow: none; border-bottom: 1px solid var(--line); }
/* touch screen + a text field has focus (on-screen keyboard up): the bar steps aside so it never
   floats over the keyboard or the field. The status line (บันทึกแล้ว …) still shows. */
.dk-host.dk-kbd .dk-dock { display: none; }
/* ใบ#114 — phone + touch + typing in a note cell: just the note keypad, on top of the phone's
   keyboard (its `bottom` is lifted by the keyboard's height in the script) */
.dk-host.dk-keysonly .dk-row { display: none; }
.dk-host.dk-keysonly .dk-keys { margin-bottom: 0; border-bottom: 0; }

.dk-row { display: flex; align-items: center; }
.dk-cell { display: inline-flex; align-items: center; min-width: 0; }

/* buttons */
.dk-btn {
  width: var(--touch-min); height: var(--touch-min); min-width: var(--touch-min); min-height: 0;
  padding: 0; border: 0; background: transparent; color: var(--ink);
  display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; cursor: pointer; flex: 0 0 auto;
}
@media (hover: hover) { .dk-btn:hover { background: var(--cream); } }
.dk-btn.on { color: var(--brand); background: var(--cream); }
.dk-gear { color: var(--muted); }
.dk-gear.on { color: var(--brand); background: var(--cream); }
.dk-tgl:not(.on) { color: var(--muted); }
.dk-tgl.on { color: var(--brand); background: var(--cream); }
.dk-play {
  min-height: 0; padding: 0; border: 0; background: transparent; color: var(--brand);
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: 0 0 auto;
}
.dk-play:hover { filter: brightness(1.1); }
.dk-btn:disabled { opacity: 0.4; cursor: default; }
/* E2: a labeled action button (บันทึก / ฟังทั้งเพลง) — icon + text pill */
.dk-btn.wide { width: auto; min-width: var(--touch-min); padding: 0 12px; gap: 6px; border: 1px solid var(--line); }
.dk-btn-lbl { font-size: 13px; font-weight: 600; white-space: nowrap; }
/* ใบ v3/pleng#114 — phone (< 600px): a button marked phoneIcon shows its icon only, a plain 48×48
   square like ย้อน / ทำซ้ำ, so every button of the editor fits in two rows. Its name is still its
   aria-label and tooltip. The main action (เผยแพร่ · ส่งตรวจ · อนุมัติ) is not marked: it keeps
   its words. */
@media (max-width: 599px) {
  .dk-bar .dk-btn.wide.dk-phoneicon { width: var(--touch-min); padding: 0; border-color: transparent; }
  .dk-bar .dk-phoneicon .dk-btn-lbl { display: none; }
}
/* prime = the page's main action (พิมพ์ · บันทึก), brand-filled */
.dk-btn.prime { background: var(--brand); color: #fff; border: 1px solid var(--brand); }
.dk-btn.prime:hover { filter: brightness(1.06); background: var(--brand); }
.dk-btn.danger { color: var(--red); }

/* E1: full-width jianpu key band(s) — rows share their line (keys stretch, never wrap) */
.dk-keys { display: flex; flex-direction: column; gap: 4px; padding: 4px 0 8px; margin-bottom: 6px; border-bottom: 1px solid var(--line); }
.dk-keyrow { display: flex; flex-wrap: nowrap; gap: 4px; justify-content: center; }
.dk-key {
  flex: 1 1 0; min-width: 28px; max-width: 56px; height: 44px; min-height: 0; padding: 0;
  border: 1px solid var(--line); border-radius: 8px; background: transparent; color: var(--ink);
  font-family: 'Courier New', monospace; font-weight: 700; font-size: 16px; cursor: pointer;
}
@media (hover: hover) { .dk-key:hover { background: var(--cream); } }

/* menu / slider chips — no position:relative so every popover anchors to the DOCK */
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

/* popovers open ABOVE the bar; clampPops() lines their right edge up with the button group and
   keeps them on-screen +8px (DS I5), scrolling inside when taller than the room above the bar */
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

/* ⚙ Setting page — fits content, even 8px rhythm (§A / B10-B12) */
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
/* run button for a `btn` row — a secondary control in the panel (ui-standards §2) */
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

/* ---------- ใบ v3/pleng#109: the bar = seek row on top + the buttons centred below ----------
   Material 3 touch target: every button on the bar is at least 48×48 with 8px between buttons,
   the same at 360px, on a 700px Fold and on a 1920px desktop. The buttons never spread: the group
   stays centred with the spare room at both sides. When one row does not fit, the group splits
   into two centred rows (refit() in the script); a row that is still too wide wraps inside itself
   rather than running off the screen. */
.dk-bar .dk-dock { --touch-min: 48px; padding: 4px 8px; padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px)); }
.dk-bar .dk-row { gap: 8px; }
.dk-bar .dk-row + .dk-row { margin-top: 2px; }
.dk-bar .dk-btnrow { justify-content: safe center; flex-wrap: wrap; }
.dk-bar .dk-btnrow + .dk-btnrow { margin-top: 8px; }
.dk-bar .dk-seekrow > .dk-cell { min-width: 0; }
.dk-bar .dk-play { width: 48px; height: 48px; }
.dk-bar .dk-pbtn { min-width: var(--touch-min); justify-content: center; }
/* ใบ v3/pleng#113 — ONE row where there is room (refit() + lib/dockLayout.js decide): the seek bar
   and time take the left and grow with the screen, the button group keeps its natural width on the
   right, 16px between the two. The seek slider never gets shorter than 240px here (Apple HIG). */
.dk-bar.dk-one .dk-inner { display: flex; align-items: center; gap: 16px; }
.dk-bar.dk-one .dk-seekrow { flex: 1 1 0; min-width: 0; }
.dk-bar.dk-one .dk-btnrow { flex: 0 0 auto; flex-wrap: nowrap; }
.dk-bar.dk-one .dk-row + .dk-row { margin-top: 0; }
.dk-bar.dk-one .dk-seekrow :deep([role="slider"]) { min-width: 240px; }
/* page-drawn buttons (ท่อน · เสียงดนตรี · download · Aa · ความเร็ว) get the same 48px floor —
   only the button on the bar, never the buttons inside its popover */
.dk-bar .dk-btnrow > .dk-cell > :deep(button),
.dk-bar .dk-btnrow > .dk-cell > :deep(:not(.dk-pop) > button) { min-width: var(--touch-min); min-height: var(--touch-min); }
/* the editor's key band: on the narrowest phones the gap tightens (to 2px at 360px) so all 11
   keys of the longer row fit without running off the screen */
.dk-bar .dk-keyrow { gap: clamp(2px, calc((100vw - 344px) / 10), 4px); }
</style>
