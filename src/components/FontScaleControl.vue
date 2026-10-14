<script setup>
// FontScaleControl — the "Aa" text-size button + its popover, drawn inside a DockKey `aa` cell.
// ONE component for every page that offers it (ฝึกร้อง · แก้ไข — ใบ v3/pleng#119), so the button
// looks the same, sits in the same spot and opens the same popover everywhere (NN/g consistency).
// It holds no value of its own: each page passes ITS remembered scale in and stores what comes out
// (ใบ#101 "แต่ละหน้าจำค่าของตัวเอง"). DockKey owns open/close (one popover at a time · Esc ·
// click outside) and keeps the popover on-screen.
import { computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  value: { type: Number, default: 1 }, // the page's scale, 0.8–2.2
})
const emit = defineEmits(['toggle', 'set'])
const pct = computed(() => Math.round(props.value * 100))
</script>

<template>
  <button
    class="st-aa"
    :class="{ on: open }"
    :aria-expanded="open"
    :title="'ขนาดตัวอักษร ' + pct + '%'"
    aria-label="ขนาดตัวอักษร"
    @click.stop="emit('toggle')"
  ><b class="st-aa-lbl">Aa</b></button>
  <div v-if="open" class="dk-pop st-fontpop" role="menu" aria-label="ขนาดตัวอักษร" @click.stop>
    <div class="st-fonttitle">ขนาดตัวอักษร</div>
    <div class="st-fontrow">
      <span class="st-fonta st-fonta-sm" aria-hidden="true">A</span>
      <input class="st-fontslider" type="range" min="80" max="220" step="10" :value="pct" aria-label="ปรับขนาดตัวอักษร" @input="emit('set', +$event.target.value / 100)" />
      <span class="st-fonta st-fonta-lg" aria-hidden="true">A</span>
    </div>
    <div class="st-fontfoot">
      <span class="st-fontval">{{ pct }}%</span>
      <button class="st-fontreset" :disabled="pct === 100" @click="emit('set', 1)">↺ 100%</button>
    </div>
  </div>
</template>

<style scoped>
/* the popover anchors to the DOCK right edge = same spot as every popup (§A); DockKey clamps it */
.st-fontpop {
  pointer-events: auto;
  position: absolute; bottom: calc(100% + 8px); right: 8px; left: auto;
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); z-index: 30;
}
.st-aa {
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 10px; padding: 0 8px; height: var(--touch-min); min-height: 0; min-width: var(--touch-min); cursor: pointer;
}
@media (hover: hover) { .st-aa:hover { border-color: var(--brand); } }
.st-aa.on { border-color: var(--brand); color: var(--brand); }
.st-aa-lbl { font-size: 15px; font-weight: 700; letter-spacing: -0.3px; }
.st-fontpop { width: max-content; min-width: 220px; max-width: calc(100vw - 24px); padding: 12px; }
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
