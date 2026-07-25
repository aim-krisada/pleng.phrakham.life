<script setup>
// S6 — Note accessory (IA §2). On DESKTOP it is a small popover anchored to the selected
// note; on a COMPACT phone (≤600px) it becomes a bottom-sheet / keyboard-accessory
// (Material 3 bottom sheet — "side sheets are not recommended for narrow screens"; a
// selection-contextual surface on a phone rides above the keyboard, not beside the note).
//
// Progressive disclosure (NN/g): the BASIC row (chord · octave · #/b/n · tie 🔗) is always
// shown; the ADVANCED jianpu symbols (beam 1/8·1/16 · dotted · slur · grace · fermata ·
// caesura // · breath ' · measure-repeat %) sit behind ONE "สัญลักษณ์เพิ่ม ▾" toggle so they
// never clutter a non-musician, yet a musician reaches them in one tap (power path).
//
// MOCKUP SCOPE: layout + progressive disclosure only. Handlers emit `act(id)` — real
// insert/toggle logic is step 4 (this component carries over to build as-is).
import { ref } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  // what the caret is on — drives the header ("โน้ต 3 · ห้อง 2"); mock passes a label
  target: { type: String, default: 'โน้ต' },
  // start with the advanced disclosure already open (power path / musician preset)
  advanced: { type: Boolean, default: false },
})
const emit = defineEmits(['act', 'close'])
const showAdvanced = ref(props.advanced)

// basic set — the 80% controls a non-musician needs on a note (PD tier B)
const BASIC = [
  { id: 'chord', icon: 'guitar', label: 'คอร์ด' },
  { id: 'oct-up', icon: 'chevron-up', label: 'อ็อกเทฟสูง' },
  { id: 'oct-down', icon: 'chevron-down', label: 'อ็อกเทฟต่ำ' },
  { id: 'sharp', text: '♯', label: 'ชาร์ป' },
  { id: 'flat', text: '♭', label: 'แฟลต' },
  { id: 'natural', text: '♮', label: 'เนเชอรัล' },
  { id: 'tie', icon: 'link', label: 'เอื้อน/โยงเสียง' },
]
// advanced jianpu set (PD tier A · behind disclosure) — includes N-review folds
const ADVANCED = [
  { id: 'beam8', text: '‿', label: 'เขบ็ต 1/8 (ขีดใต้)' },
  { id: 'beam16', text: '≀', label: 'เขบ็ต 1/16 (สองขีด)' },
  { id: 'dot', text: '·', label: 'จุดประ (dotted)' },
  { id: 'slur', text: '⌒', label: 'สเลอร์' },
  { id: 'grace', text: '♪ₛ', label: 'เกรซโน้ต' },
  { id: 'fermata', text: '𝄐', label: 'เฟอร์มาตา' },
  { id: 'caesura', text: '//', label: 'ซีซูรา (หยุดสนิท)' },
  { id: 'breath', text: '’', label: 'จุดหายใจ' },
  { id: 'mrepeat', text: '%', label: 'ซ้ำห้องก่อนหน้า (simile)' },
]
// structure-at-this-bar (A · anchor/point actions that belong to one location → S5/S6)
const AT_BAR = [
  { id: 'pickup', icon: 'corner-up-left', label: 'ตั้งเป็นห้องยก' },
  { id: 'segno', text: '𝄋', label: 'ปัก Segno' },
  { id: 'coda', text: '𝄌', label: 'ปัก Coda' },
  { id: 'endline', icon: 'square', label: 'เส้นจบเพลง' },
  { id: 'modulate', icon: 'key-round', label: 'เปลี่ยนคีย์ที่นี่' },
  { id: 'meter', icon: 'timer', label: 'เปลี่ยนอัตราจังหวะ' },
]
</script>

<template>
  <div v-if="open" class="na-host" role="dialog" aria-label="เครื่องมือโน้ต">
    <div class="na-grip" aria-hidden="true"></div>
    <header class="na-head">
      <span class="na-target">{{ target }}</span>
      <button class="na-x" aria-label="ปิด" @click="emit('close')"><Icon name="x" :size="16" /></button>
    </header>

    <!-- BASIC row — always visible (PD B) -->
    <div class="na-row" role="group" aria-label="เครื่องมือพื้นฐาน">
      <button v-for="b in BASIC" :key="b.id" class="na-btn" :title="b.label" :aria-label="b.label" @click="emit('act', b.id)">
        <Icon v-if="b.icon" :name="b.icon" :size="18" /><span v-else class="na-sym">{{ b.text }}</span>
      </button>
    </div>

    <!-- disclosure — advanced jianpu behind ONE tap (PD A · power path) -->
    <button class="na-toggle" :aria-expanded="showAdvanced" @click="showAdvanced = !showAdvanced">
      <Icon :name="showAdvanced ? 'chevron-down' : 'chevron-right'" :size="16" />
      สัญลักษณ์เพิ่ม (ขั้นสูง)
      <span class="na-count">{{ ADVANCED.length }}</span>
    </button>
    <div v-if="showAdvanced" class="na-adv">
      <div class="na-row wrap" role="group" aria-label="สัญลักษณ์ jianpu ขั้นสูง">
        <button v-for="a in ADVANCED" :key="a.id" class="na-btn adv" :title="a.label" :aria-label="a.label" @click="emit('act', a.id)">
          <span class="na-sym">{{ a.text }}</span>
        </button>
      </div>
      <div class="na-sub">โครงสร้างที่ห้องนี้</div>
      <div class="na-row wrap" role="group" aria-label="โครงสร้างที่ห้องนี้">
        <button v-for="s in AT_BAR" :key="s.id" class="na-chip" @click="emit('act', s.id)">
          <Icon v-if="s.icon" :name="s.icon" :size="15" /><span v-else class="na-sym sm">{{ s.text }}</span>
          {{ s.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* DESKTOP: an anchored popover card (the host positions it near the caret). */
.na-host {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  padding: var(--sp-2) var(--sp-3) var(--sp-3);
  width: min(360px, calc(100vw - 24px));
}
.na-grip { display: none; }
.na-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-2); }
.na-target { font-size: var(--fs-sm); font-weight: 700; color: var(--brand); }
.na-x { border: none; background: transparent; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 8px; min-height: 32px; min-width: 32px; }
.na-x:hover { background: var(--cream-hover); }
.na-row { display: flex; gap: var(--sp-2); align-items: center; }
.na-row.wrap { flex-wrap: wrap; }
.na-btn {
  min-width: 40px; height: 40px; border: 1px solid var(--line); background: var(--cream);
  border-radius: 10px; color: var(--ink); cursor: pointer; display: inline-flex;
  align-items: center; justify-content: center; font: inherit;
}
.na-btn:hover { border-color: var(--brand); color: var(--brand); }
.na-btn.adv { background: #fff; }
.na-sym { font-size: 18px; line-height: 1; }
.na-sym.sm { font-size: 14px; }
.na-toggle {
  display: flex; align-items: center; gap: 6px; width: 100%; margin-top: var(--sp-3);
  background: transparent; border: none; color: var(--muted); font: inherit;
  font-size: var(--fs-sm); font-weight: 600; cursor: pointer; padding: 8px 4px; min-height: 40px;
}
.na-toggle:hover { color: var(--brand); }
.na-count { margin-left: auto; background: var(--cream); border: 1px solid var(--line); border-radius: 999px; font-size: 11px; padding: 1px 8px; color: var(--muted); }
.na-adv { margin-top: var(--sp-1); }
.na-sub { font-size: var(--fs-xs); color: var(--muted); margin: var(--sp-3) 0 var(--sp-2); }
.na-chip {
  display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line);
  background: #fff; border-radius: 999px; padding: 6px 11px; min-height: 34px; font: inherit;
  font-size: var(--fs-sm); color: var(--ink); cursor: pointer;
}
.na-chip:hover { border-color: var(--brand); color: var(--brand); }

/* COMPACT phone: promote to a bottom-sheet (Material 3) — rides above the keyboard,
   full width, drag-grip affordance. Never a beside-the-note popover on narrow screens. */
@media (max-width: 600px) {
  .na-host {
    position: fixed; left: 0; right: 0; bottom: 0; width: auto;
    border-radius: 18px 18px 0 0; padding-bottom: calc(var(--sp-4) + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.22); z-index: 95;
  }
  .na-grip { display: block; width: 38px; height: 4px; border-radius: 999px; background: var(--line); margin: 2px auto 8px; }
  .na-btn { min-width: 44px; height: 44px; } /* thumb target */
}
</style>
