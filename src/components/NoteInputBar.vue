<script setup>
// The contextual note-input surface (EPIC C · locked design). Two presentations, ONE set of
// keys — the presentation is chosen by VIEWPORT WIDTH, never by hover/pointer (a touch laptop
// like the Surface reports pointer:coarse even with a mouse, so hover-gating hides controls):
//   • variant "popup"  (desktop / wide) — floats anchored to the selected note, above or below
//     its line so it never covers the note; fades + goes click-through while typing fast, and
//     reappears on pause / when a note is clicked ("ผู้ช่วยเงียบขรึม").
//   • variant "bar" (mobile / narrow) — a keyboard-accessory pinned to the bottom, the only way
//     to enter notes on a phone (no hardware keyboard — พี่เปา's bottleneck).
// It is a THIN presenter: it emits intents; SongViewer runs the shared edit engine (lib/songEdit).
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'bar' }, // 'bar' | 'popup'
  anchor: { type: Object, default: null }, // selected-note rect {top,bottom,left,width} (popup)
  dimmed: { type: Boolean, default: false }, // fade + click-through while typing (popup)
  mode: { type: String, default: 'insert' }, // 'insert' | 'overwrite' — the แทรก/ทับ state
})
const emit = defineEmits(['digit', 'octave', 'accidental', 'toggle-mode', 'backspace', 'step'])
const DIGITS = ['1', '2', '3', '4', '5', '6', '7']

// ---- popup positioning: float above the note's line, or below if there is no room above,
// and clamp horizontally so it never runs off screen. Never covers the anchor note itself. ----
const rootEl = ref(null)
const pos = ref({ top: 0, left: 0 })
function place() {
  if (props.variant !== 'popup' || !props.anchor || !rootEl.value) return
  const el = rootEl.value
  const w = el.offsetWidth || 320
  const h = el.offsetHeight || 56
  const a = props.anchor
  const gap = 10
  let top = a.top - h - gap // prefer ABOVE the note's line
  if (top < 8) top = a.bottom + gap // no room above → go below
  let left = a.left + a.width / 2 - w / 2 // centre on the note
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
  pos.value = { top: Math.round(top), left: Math.round(left) }
}
watch(() => props.anchor, () => nextTick(place), { deep: true })
watch(() => props.variant, () => nextTick(place))
onMounted(() => { nextTick(place); window.addEventListener('resize', place) })
onUnmounted(() => window.removeEventListener('resize', place))
</script>

<template>
  <div
    ref="rootEl"
    class="nib no-print"
    :class="[variant === 'popup' ? 'nib-pop' : 'nib-bar', { dimmed: variant === 'popup' && dimmed }]"
    :style="variant === 'popup' ? { top: pos.top + 'px', left: pos.left + 'px' } : null"
    role="toolbar"
    aria-label="แป้นพิมพ์โน้ต"
  >
    <div class="nib-scroll">
      <!-- ◀ ▶ — walk the note↔word sequence (the mobile equivalent of the ← → arrows) -->
      <button class="nib-key nib-nav" title="ไปหน่วยก่อนหน้า (โน้ต/คำ)" aria-label="ก่อนหน้า" @click="emit('step', -1)">◀</button>
      <button class="nib-key nib-nav" title="ไปหน่วยถัดไป (โน้ต/คำ)" aria-label="ถัดไป" @click="emit('step', 1)">▶</button>
      <span class="nib-sep" aria-hidden="true"></span>

      <!-- แทรก/ทับ — next to your hand -->
      <button
        class="nib-key nib-mode" :class="{ ins: mode === 'insert' }"
        :aria-label="mode === 'insert' ? 'โหมดแทรก (แตะเพื่อเปลี่ยนเป็นทับ)' : 'โหมดทับ (แตะเพื่อเปลี่ยนเป็นแทรก)'"
        :title="mode === 'insert' ? 'แทรก — พิมพ์แล้วเพิ่มโน้ต ดันตัวอื่นไปขวา (แตะสลับเป็น ทับ)' : 'ทับ — พิมพ์แล้วเปลี่ยนเฉพาะโน้ตที่เลือก (แตะสลับเป็น แทรก)'"
        @click="emit('toggle-mode')"
      >{{ mode === 'insert' ? 'แทรก' : 'ทับ' }}</button>
      <span class="nib-sep" aria-hidden="true"></span>

      <button v-for="d in DIGITS" :key="d" class="nib-key nib-num" :aria-label="'โน้ต ' + d" @click="emit('digit', d)">{{ d }}</button>
      <span class="nib-sep" aria-hidden="true"></span>

      <button class="nib-key" title="ยกเสียงสูงขึ้นหนึ่งช่วง (จุดบนโน้ต)" aria-label="สูงขึ้นหนึ่งช่วงเสียง" @click="emit('octave', 1)"><b>สูง</b> ↑</button>
      <button class="nib-key" title="ลดเสียงต่ำลงหนึ่งช่วง (จุดล่างโน้ต)" aria-label="ต่ำลงหนึ่งช่วงเสียง" @click="emit('octave', -1)"><b>ต่ำ</b> ↓</button>
      <button class="nib-key nib-acc" title="ครึ่งเสียงขึ้น (ชาร์ป)" aria-label="ชาร์ป" @click="emit('accidental', '#')">♯</button>
      <button class="nib-key nib-acc" title="ครึ่งเสียงลง (แฟลต)" aria-label="แฟลต" @click="emit('accidental', 'b')">♭</button>
      <span class="nib-sep" aria-hidden="true"></span>

      <button class="nib-key nib-del" title="ลบสิ่งที่เลือก — อยู่ที่โน้ต=เป็นตัวหยุด (คำอยู่) · อยู่ที่คำ=ลบคำ (โน้ตอยู่)" aria-label="ลบสิ่งที่เลือก" @click="emit('backspace')">⌫ ลบ</button>
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
/* mobile — keyboard-accessory pinned to the bottom, full width */
.nib-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  border-left: none;
  border-right: none;
  border-bottom: none;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
}
/* desktop — a floating popup anchored to the selected note (top/left set inline) */
.nib-pop {
  position: fixed;
  width: max-content;
  max-width: calc(100vw - 16px);
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.22);
  padding: 6px;
  transition: opacity 0.15s ease;
}
/* fades + goes click-through while typing fast, so it never hides the notes you are entering */
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
.nib-num { font-family: 'Courier New', monospace; font-weight: 700; font-size: 19px; color: var(--note-blue, #1d4ed8); min-width: 40px; }
.nib-acc { font-size: 20px; }
.nib-del { color: var(--brand, #8b4513); }
.nib-nav { font-size: 18px; font-weight: 700; }
.nib-mode {
  font-size: 13px; font-weight: 700;
  border-color: var(--brand, #8b4513); color: var(--brand, #8b4513);
}
.nib-mode.ins { background: var(--brand, #8b4513); color: #fff; }
.nib-sep { flex: 0 0 auto; width: 1px; align-self: stretch; background: var(--line, #d9d0c4); margin: 4px 2px; }
</style>
