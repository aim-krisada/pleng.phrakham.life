<script setup>
// The contextual note-input bar (EPIC C · locked ground-up wireframe: "[123] [♯♭·] … 🎼โครง").
// A bottom keyboard-accessory that appears while editing a note on the sheet, so the number
// pad + jianpu symbols are always in the thumb zone — this is what makes editing work on a
// PHONE (พี่เปา's bottleneck), where there is no hardware keyboard. Desktop keeps its physical
// keys AND this bar. It is a THIN presenter: it just emits intents; SongViewer runs the shared
// edit engine (lib/songEdit). Chord picker + desktop float-near-cursor + fade-on-type = next step.
defineProps({
  mode: { type: String, default: 'insert' }, // 'insert' | 'overwrite' — the แทรก/ทับ state
})
const emit = defineEmits(['digit', 'octave', 'accidental', 'toggle-mode', 'backspace', 'rest'])
const DIGITS = ['1', '2', '3', '4', '5', '6', '7']
</script>

<template>
  <div class="nib no-print" role="toolbar" aria-label="แป้นพิมพ์โน้ต">
    <div class="nib-scroll">
      <!-- แทรก/ทับ — moved here from the sheet header so it rides next to your hand -->
      <button
        class="nib-key nib-mode" :class="{ ins: mode === 'insert' }"
        :aria-label="mode === 'insert' ? 'โหมดแทรก (แตะเพื่อเปลี่ยนเป็นทับ)' : 'โหมดทับ (แตะเพื่อเปลี่ยนเป็นแทรก)'"
        :title="mode === 'insert' ? 'แทรก — พิมพ์แล้วเพิ่มโน้ต ดันตัวอื่นไปขวา (แตะสลับเป็น ทับ)' : 'ทับ — พิมพ์แล้วเปลี่ยนเฉพาะโน้ตที่เลือก (แตะสลับเป็น แทรก)'"
        @click="emit('toggle-mode')"
      >{{ mode === 'insert' ? 'แทรก' : 'ทับ' }}</button>
      <span class="nib-sep" aria-hidden="true"></span>

      <!-- scale digits -->
      <button v-for="d in DIGITS" :key="d" class="nib-key nib-num" :aria-label="'โน้ต ' + d" @click="emit('digit', d)">{{ d }}</button>
      <span class="nib-sep" aria-hidden="true"></span>

      <!-- octave + accidentals -->
      <button class="nib-key" title="ยกเสียงสูงขึ้นหนึ่งช่วง (จุดบนโน้ต)" aria-label="สูงขึ้นหนึ่งช่วงเสียง" @click="emit('octave', 1)"><b>สูง</b> ↑</button>
      <button class="nib-key" title="ลดเสียงต่ำลงหนึ่งช่วง (จุดล่างโน้ต)" aria-label="ต่ำลงหนึ่งช่วงเสียง" @click="emit('octave', -1)"><b>ต่ำ</b> ↓</button>
      <button class="nib-key nib-acc" title="ครึ่งเสียงขึ้น (ชาร์ป)" aria-label="ชาร์ป" @click="emit('accidental', '#')">♯</button>
      <button class="nib-key nib-acc" title="ครึ่งเสียงลง (แฟลต)" aria-label="แฟลต" @click="emit('accidental', 'b')">♭</button>
      <span class="nib-sep" aria-hidden="true"></span>

      <!-- deletes: ลบชิด (pull tight) · ตัวหยุด (leave a gap = rest) -->
      <button class="nib-key nib-del" title="ลบโน้ต ดึงตัวที่เหลือมาชิด" aria-label="ลบโน้ตดึงชิด" @click="emit('backspace')">⌫ ลบ</button>
      <button class="nib-key" title="เปลี่ยนเป็นตัวหยุด (เงียบ) ตำแหน่งอื่นไม่ขยับ" aria-label="เปลี่ยนเป็นตัวหยุด" @click="emit('rest')">ตัวหยุด</button>
    </div>
  </div>
</template>

<style scoped>
/* keyboard-accessory bar: fixed to the bottom, full width, above the safe-area inset. It is
   the primary bottom control while editing (the play transport steps aside — locked wireframe
   context B). Horizontal scroll if the keys don't fit a narrow phone; the page never scrolls. */
.nib {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 45;
  background: var(--surface, #fff);
  border-top: 1px solid var(--line, #d9d0c4);
  box-shadow: 0 -3px 12px rgba(0, 0, 0, 0.12);
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
}
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
/* the number keys are the stars — bigger digit, monospace like the sheet's notation */
.nib-num { font-family: 'Courier New', monospace; font-weight: 700; font-size: 19px; color: var(--note-blue, #1d4ed8); min-width: 40px; }
.nib-acc { font-size: 20px; }
.nib-del { color: var(--brand, #8b4513); }
/* แทรก/ทับ — filled when active so the current mode is unmistakable */
.nib-mode {
  font-size: 13px; font-weight: 700;
  border-color: var(--brand, #8b4513); color: var(--brand, #8b4513);
}
.nib-mode.ins { background: var(--brand, #8b4513); color: #fff; }
.nib-sep { flex: 0 0 auto; width: 1px; align-self: stretch; background: var(--line, #d9d0c4); margin: 4px 2px; }
</style>
