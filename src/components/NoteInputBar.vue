<script setup>
// The contextual toolbar of SPECIAL controls — only the things the device keyboard can't type
// (octave dots, ♯ ♭, แทรก/ทับ), plus arrow keys on mobile (on-screen keyboards have no arrows).
// Digits + Thai text come from the native keyboard (see SongViewer's capture input). Two forms,
// chosen by viewport width (never hover/pointer — a touch laptop reports coarse with a mouse):
//   • variant "popup" (desktop) — floats by the selected note; fades while typing.
//   • variant "bar" (mobile) — a keyboard-accessory that rides ABOVE the on-screen keyboard
//     (positioned via visualViewport) and adds the ← ↑ ↓ → keys.
// Buttons use @mousedown.prevent so tapping one never blurs the capture input → the keyboard
// stays open on a phone.
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'bar' }, // 'bar' | 'popup'
  anchor: { type: Object, default: null }, // selected-cell rect {top,bottom,left,width} (popup)
  dimmed: { type: Boolean, default: false }, // fade + click-through while typing (popup)
  mode: { type: String, default: 'overwrite' }, // 'insert' | 'overwrite' — the แทรก/ทับ state
})
const emit = defineEmits(['octave', 'accidental', 'toggle-mode', 'nav'])

// ---- popup positioning (desktop): float above the note's line, else below; clamp on-screen ----
const rootEl = ref(null)
const pos = ref({ top: 0, left: 0 })
function place() {
  if (props.variant !== 'popup' || !props.anchor || !rootEl.value) return
  const el = rootEl.value
  const w = el.offsetWidth || 240
  const h = el.offsetHeight || 48
  const a = props.anchor
  const gap = 10
  let top = a.top - h - gap
  if (top < 8) top = a.bottom + gap
  let left = a.left + a.width / 2 - w / 2
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
  pos.value = { top: Math.round(top), left: Math.round(left) }
}
// ---- keyboard-accessory positioning (mobile): sit just above the on-screen keyboard ----
const kbInset = ref(0)
function onVV() {
  const vv = window.visualViewport
  kbInset.value = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0
}
watch(() => props.anchor, () => nextTick(place), { deep: true })
watch(() => props.variant, () => nextTick(place))
onMounted(() => {
  nextTick(place)
  window.addEventListener('resize', place)
  const vv = window.visualViewport
  if (vv) { vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV); onVV() }
})
onUnmounted(() => {
  window.removeEventListener('resize', place)
  const vv = window.visualViewport
  if (vv) { vv.removeEventListener('resize', onVV); vv.removeEventListener('scroll', onVV) }
})
</script>

<template>
  <div
    ref="rootEl"
    class="nib no-print"
    :class="[variant === 'popup' ? 'nib-pop' : 'nib-bar', { dimmed: variant === 'popup' && dimmed }]"
    :style="variant === 'popup' ? { top: pos.top + 'px', left: pos.left + 'px' } : { bottom: kbInset + 'px' }"
    role="toolbar"
    aria-label="เครื่องมือแก้โน้ต"
    @mousedown.prevent
  >
    <div class="nib-scroll">
      <!-- arrows — mobile only (on-screen keyboards have none; desktop uses the physical keys) -->
      <template v-if="variant === 'bar'">
        <button class="nib-key nib-nav" aria-label="ซ้าย" title="ซ้าย" @click="emit('nav', 'left')">←</button>
        <button class="nib-key nib-nav" aria-label="ขึ้น" title="ขึ้น" @click="emit('nav', 'up')">↑</button>
        <button class="nib-key nib-nav" aria-label="ลง" title="ลง" @click="emit('nav', 'down')">↓</button>
        <button class="nib-key nib-nav" aria-label="ขวา" title="ขวา" @click="emit('nav', 'right')">→</button>
        <span class="nib-sep" aria-hidden="true"></span>
      </template>

      <button class="nib-key" title="สูงขึ้นหนึ่งช่วง (จุดบนโน้ต)" aria-label="สูงขึ้นหนึ่งช่วง" @click="emit('octave', 1)"><b>สูง</b> ↑</button>
      <button class="nib-key" title="ต่ำลงหนึ่งช่วง (จุดล่างโน้ต)" aria-label="ต่ำลงหนึ่งช่วง" @click="emit('octave', -1)"><b>ต่ำ</b> ↓</button>
      <button class="nib-key nib-acc" title="ครึ่งเสียงขึ้น (ชาร์ป)" aria-label="ชาร์ป" @click="emit('accidental', '#')">♯</button>
      <button class="nib-key nib-acc" title="ครึ่งเสียงลง (แฟลต)" aria-label="แฟลต" @click="emit('accidental', 'b')">♭</button>
      <span class="nib-sep" aria-hidden="true"></span>

      <button
        class="nib-key nib-mode" :class="{ ins: mode === 'insert' }"
        :aria-label="mode === 'insert' ? 'โหมดแทรก (แตะเปลี่ยนเป็นทับ)' : 'โหมดทับ (แตะเปลี่ยนเป็นแทรก)'"
        :title="mode === 'insert' ? 'แทรก — พิมพ์แล้วเพิ่มโน้ต ดันตัวอื่นไปขวา' : 'ทับ — พิมพ์แล้วเปลี่ยนเฉพาะโน้ตที่เลือก'"
        @click="emit('toggle-mode')"
      >{{ mode === 'insert' ? 'แทรก' : 'ทับ' }}</button>
    </div>
  </div>
</template>

<style scoped>
.nib {
  background: var(--surface, #fff);
  border: 1px solid var(--line, #d9d0c4);
  box-shadow: 0 -3px 12px rgba(0, 0, 0, 0.12);
  z-index: 45;
}
/* mobile — keyboard-accessory pinned to the bottom (bottom offset = keyboard height, inline) */
.nib-bar {
  position: fixed;
  left: 0;
  right: 0;
  border-left: none;
  border-right: none;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
}
/* desktop — a small floating popup by the selected note (top/left inline) */
.nib-pop {
  position: fixed;
  width: max-content;
  max-width: calc(100vw - 16px);
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.22);
  padding: 6px;
  transition: opacity 0.15s ease;
}
.nib-pop.dimmed { opacity: 0.12; pointer-events: none; }
.nib-scroll {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.nib-key {
  flex: 0 0 auto;
  min-width: var(--touch-min, 44px);
  height: var(--touch-min, 44px);
  padding: 0 10px;
  border: 1px solid var(--line, #d9d0c4);
  border-radius: 10px;
  background: var(--cream, #faf6ef);
  color: var(--ink, #0f172a);
  font: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  white-space: nowrap;
}
.nib-key:active { transform: translateY(1px); }
.nib-key:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.5); outline-offset: 2px; }
.nib-key b { font-size: 12px; font-weight: 700; }
.nib-nav { font-size: 20px; font-weight: 700; min-width: 40px; }
.nib-acc { font-size: 20px; }
.nib-mode {
  font-size: 13px; font-weight: 700;
  border-color: var(--brand, #8b4513); color: var(--brand, #8b4513);
}
.nib-mode.ins { background: var(--brand, #8b4513); color: #fff; }
.nib-sep { flex: 0 0 auto; width: 1px; align-self: stretch; background: var(--line, #d9d0c4); margin: 4px 2px; }
</style>
