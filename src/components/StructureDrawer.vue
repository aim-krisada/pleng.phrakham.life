<script setup>
// S7 — Structure drawer (IA §2/§4). Macro-edit of the whole song: name/reorder sections
// (drag cards), add verse (share melody), duplicate / Make-Unique, cross-section JUMP
// commands (D.C./D.S./To Coda/Fine), performance directives, delete section.
//
// RESPONSIVE (A6 · Material 3 "side sheets are not recommended for narrow screens"):
//   • tablet/desktop → a right-hand COPLANAR side-sheet
//   • compact ≤600px → a BOTTOM-SHEET / full-height sheet (never squeezes the jianpu sheet)
//
// IA §4 split respected: only "action on the whole song / a section-as-block" lives here.
// Point-anchored structure (pickup · Segno/Coda anchor · repeat/volta at a bar · double
// barline) stays INLINE on the sheet (S5) — this drawer holds the cross-section commands.
//
// MOCKUP SCOPE: layout + progressive disclosure. Cards + controls are real; drag/apply
// logic is step 4. Emits `act(id, payload)`; carries over to build as-is.
import { ref } from 'vue'
import Icon from './Icon.vue'

defineProps({
  open: { type: Boolean, default: false },
  // mock section model — each card = one section block in the arrangement
  sections: {
    type: Array,
    default: () => [
      { id: 's1', name: 'ข้อ 1', melody: 'A', verses: 3, shared: true },
      { id: 's2', name: 'ร้องรับ', melody: 'B', verses: 1, shared: false, hook: true },
      { id: 's3', name: 'ท่อนส่ง', melody: 'C', verses: 1, shared: false },
    ],
  },
})
const emit = defineEmits(['act', 'close'])
const menuFor = ref(null) // which card's "⋯" menu is open

// cross-section jump commands (A · IA §4 = drawer, not inline)
const JUMPS = [
  { id: 'dc', label: 'D.C. (ย้อนต้น)' },
  { id: 'ds', label: 'D.S. (ย้อน Segno)' },
  { id: 'tocoda', label: 'To Coda' },
  { id: 'fine', label: 'Fine (จบตรงนี้)' },
]
// performance directives — text labels, NOT tied to melody (US-M6.8 · guards BI-005)
const DIRECTIVES = ['เดี่ยว', 'พร้อมกัน', 'ดนตรีรับ', '[ดนตรีส่ง]', 'สร้อย']
</script>

<template>
  <aside v-if="open" class="sd-host" role="dialog" aria-label="โครงสร้างเพลง">
    <div class="sd-grip" aria-hidden="true"></div>
    <header class="sd-head">
      <h3 class="sd-title"><Icon name="list-tree" :size="18" /> โครงสร้างเพลง</h3>
      <button class="sd-x" aria-label="ปิด" @click="emit('close')"><Icon name="x" :size="18" /></button>
    </header>
    <p class="sd-hint">ลากการ์ดเพื่อจัดลำดับการร้อง · ตั้งชื่อท่อน · เพิ่มข้อ — ระบบสร้างสัญลักษณ์วนซ้ำให้เอง</p>

    <!-- section cards (Material list · draggable) -->
    <ul class="sd-cards" role="list">
      <li v-for="s in sections" :key="s.id" class="sd-card" :class="{ hook: s.hook }">
        <button class="sd-drag" aria-label="ลากเพื่อจัดลำดับ"><Icon name="grip-vertical" :size="16" /></button>
        <div class="sd-card-main">
          <div class="sd-card-top">
            <input class="sd-name" :value="s.name" aria-label="ชื่อท่อน" @change="emit('act', 'rename', { id: s.id, name: $event.target.value })" />
            <span class="sd-melody" :title="'ใช้ทำนอง ' + s.melody">ทำนอง {{ s.melody }}</span>
          </div>
          <div class="sd-card-meta">
            <span v-if="s.verses > 1" class="sd-badge"><Icon name="layers" :size="13" /> {{ s.verses }} ข้อ (ใช้ทำนองร่วม)</span>
            <span v-if="s.hook" class="sd-badge hook">รับ (ร้องซ้ำ)</span>
            <button class="sd-verse" @click="emit('act', 'add-verse', { id: s.id })"><Icon name="plus" :size="14" /> เพิ่มข้อ</button>
          </div>
        </div>
        <div class="sd-card-menu">
          <button class="sd-more" aria-label="เพิ่มเติม" :aria-expanded="menuFor === s.id" @click="menuFor = menuFor === s.id ? null : s.id"><Icon name="more-vertical" :size="18" /></button>
          <div v-if="menuFor === s.id" class="sd-pop" role="menu" @click="menuFor = null">
            <button role="menuitem" @click="emit('act', 'duplicate', { id: s.id })"><Icon name="copy" :size="15" /> ทำซ้ำท่อน (ใช้ทำนองร่วม)</button>
            <button role="menuitem" @click="emit('act', 'make-unique', { id: s.id })"><Icon name="git-branch" :size="15" /> แยกทำนองเป็นอิสระ</button>
            <button role="menuitem" class="danger" @click="emit('act', 'delete', { id: s.id })"><Icon name="trash-2" :size="15" /> ลบท่อน</button>
          </div>
        </div>
      </li>
    </ul>

    <button class="sd-add" @click="emit('act', 'add-section')"><Icon name="plus" :size="16" /> เพิ่มท่อนใหม่</button>

    <!-- cross-section jump commands (A) -->
    <section class="sd-sect">
      <div class="sd-sect-t">คำสั่งกระโดด (ข้ามท่อน)</div>
      <div class="sd-wrap">
        <button v-for="j in JUMPS" :key="j.id" class="sd-tag" @click="emit('act', 'jump', { id: j.id })">{{ j.label }}</button>
      </div>
    </section>

    <!-- performance directives (A · text, unlinked to melody) -->
    <section class="sd-sect">
      <div class="sd-sect-t">ป้ายคำสั่งการร้อง</div>
      <div class="sd-wrap">
        <button v-for="d in DIRECTIVES" :key="d" class="sd-tag" @click="emit('act', 'directive', { text: d })"><Icon name="plus" :size="13" /> {{ d }}</button>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.sd-host {
  position: fixed; top: 0; right: 0; bottom: 0; width: 360px; max-width: 92vw;
  background: #fff; border-left: 1px solid var(--line); box-shadow: -8px 0 28px rgba(0, 0, 0, 0.12);
  z-index: 80; padding: var(--sp-4); overflow-y: auto;
  display: flex; flex-direction: column; gap: var(--sp-2);
}
.sd-grip { display: none; }
.sd-head { display: flex; align-items: center; justify-content: space-between; }
.sd-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: var(--fs-lg); }
.sd-x { border: none; background: transparent; color: var(--muted); cursor: pointer; padding: 6px; border-radius: 8px; min-height: 40px; min-width: 40px; }
.sd-x:hover { background: var(--cream-hover); }
.sd-hint { font-size: var(--fs-sm); color: var(--muted); margin: 0 0 var(--sp-2); }
.sd-cards { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
.sd-card {
  display: flex; align-items: flex-start; gap: var(--sp-1); border: 1px solid var(--line);
  border-radius: 12px; padding: var(--sp-2); background: var(--cream);
}
.sd-card.hook { border-color: var(--brand); }
.sd-drag { border: none; background: transparent; color: var(--muted); cursor: grab; padding: 6px 2px; min-height: 40px; align-self: center; }
.sd-card-main { flex: 1; min-width: 0; }
.sd-card-top { display: flex; align-items: center; gap: var(--sp-2); }
.sd-name { flex: 1; min-width: 0; border: 1px solid transparent; background: transparent; font: inherit; font-weight: 700; color: var(--ink); border-radius: 6px; padding: 4px 6px; min-height: 36px; }
.sd-name:hover, .sd-name:focus { border-color: var(--line); background: #fff; outline: none; }
.sd-melody { font-size: var(--fs-xs); color: var(--note-blue); background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
.sd-card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2); margin-top: var(--sp-1); }
.sd-badge { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-xs); color: var(--muted); }
.sd-badge.hook { color: var(--brand); font-weight: 600; }
.sd-verse { display: inline-flex; align-items: center; gap: 3px; border: 1px dashed var(--line); background: transparent; color: var(--brand); border-radius: 999px; padding: 4px 9px; font: inherit; font-size: var(--fs-xs); cursor: pointer; min-height: 30px; }
.sd-verse:hover { border-style: solid; }
.sd-card-menu { position: relative; }
.sd-more { border: none; background: transparent; color: var(--muted); cursor: pointer; padding: 6px; border-radius: 8px; min-height: 40px; min-width: 36px; }
.sd-more:hover { background: #fff; color: var(--ink); }
.sd-pop { position: absolute; right: 0; top: 100%; z-index: 5; background: #fff; border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18); padding: 4px; width: max-content; min-width: 220px; }
.sd-pop button { display: flex; align-items: center; gap: 8px; width: 100%; border: none; background: transparent; font: inherit; font-size: var(--fs-md); color: var(--ink); padding: 9px 10px; border-radius: 8px; cursor: pointer; text-align: left; min-height: 40px; }
.sd-pop button:hover { background: var(--cream); }
.sd-pop button.danger { color: var(--red); }
.sd-add { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; border: 1px dashed var(--line); background: transparent; color: var(--brand); border-radius: 12px; padding: 10px; font: inherit; font-weight: 600; cursor: pointer; min-height: 44px; margin-top: var(--sp-1); }
.sd-add:hover { border-style: solid; background: var(--cream); }
.sd-sect { margin-top: var(--sp-3); }
.sd-sect-t { font-size: var(--fs-xs); color: var(--muted); font-weight: 600; margin-bottom: var(--sp-2); }
.sd-wrap { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.sd-tag { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 6px 12px; font: inherit; font-size: var(--fs-sm); color: var(--ink); cursor: pointer; min-height: 34px; }
.sd-tag:hover { border-color: var(--brand); color: var(--brand); }

/* COMPACT: bottom-sheet instead of side-sheet (A6) — full width, does not pinch the sheet */
@media (max-width: 600px) {
  .sd-host {
    top: auto; left: 0; right: 0; width: auto; max-width: none; max-height: 82vh;
    border-left: none; border-top: 1px solid var(--line); border-radius: 18px 18px 0 0;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.22);
    padding-bottom: calc(var(--sp-6) + env(safe-area-inset-bottom, 0px));
  }
  .sd-grip { display: block; width: 40px; height: 4px; border-radius: 999px; background: var(--line); margin: 0 auto var(--sp-2); }
}
</style>
