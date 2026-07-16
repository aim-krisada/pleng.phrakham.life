<script setup>
// The visible "ติดตั้งแอพ" affordance, shown inside the ☰ drawer's เครื่องมือ section.
// pleng is already a full PWA; this only makes installing DISCOVERABLE (see lib/pwaInstall.js).
//   • Android/Chrome/Edge/desktop → a button that replays the captured beforeinstallprompt.
//   • iOS Safari (no such event)  → a short, dismissible Share → Add-to-Home-Screen hint.
//   • Already installed / standalone → renders nothing.
// Placement + shape follow docs/ds/menu-drawer-spec.md §3: an action = flat row (icon + label).
import { computed } from 'vue'
import Icon from './Icon.vue'
import { canInstall, isStandalone, showIosHint, dismissIosHint, promptInstall } from '../lib/pwaInstall.js'

const showButton = computed(() => canInstall.value && !isStandalone.value)
const showHint = computed(() => showIosHint.value)

async function onInstall() {
  await promptInstall()
}
</script>

<template>
  <!-- v-if on the root: when there's nothing to offer this renders no element at all, so the
       drawer's flex-gap leaves no empty slot. -->
  <div v-if="showButton || showHint" class="ia">
    <button
      v-if="showButton"
      type="button"
      class="ia-btn"
      @click="onInstall"
    >
      <Icon name="smartphone" :size="20" />
      <span>ติดตั้งแอพ</span>
    </button>

    <div v-else class="ia-hint" role="note" aria-label="วิธีติดตั้งแอพบน iPhone/iPad">
      <p class="ia-hint-txt">
        ติดตั้งเป็นแอพ: แตะปุ่มแชร์
        <Icon name="share" :size="15" class="ia-inline" />
        แล้วเลือก “เพิ่มไปยังหน้าจอหลัก”
      </p>
      <button type="button" class="ia-hint-x" aria-label="ปิดคำแนะนำ" @click="dismissIosHint">
        <Icon name="x" :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Match the drawer nav row metrics (styles.css .sb-drawer-nav a): px-pinned padding, 44px
   touch target, brand hover — so the install action reads as one of the drawer's rows. */
.ia-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: var(--touch-min);
  padding: 10.2px 21.25px;
  background: none;
  border: none;
  border-radius: 10px;
  color: var(--brand);
  font: inherit;
  font-size: 17.34px;
  font-weight: 700;
  text-align: start;
  cursor: pointer;
}
.ia-btn:hover { background: rgba(139, 69, 19, 0.08); }
.ia-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.ia-btn .icn { flex: 0 0 auto; }

/* iOS hint — a quiet note row, not a button. Dismissible via the × (state in localStorage). */
.ia-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 2px 12px;
  padding: 10px 12px;
  background: rgba(139, 69, 19, 0.06);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.ia-hint-txt {
  flex: 1;
  margin: 0;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.45;
}
.ia-inline {
  display: inline-block;
  vertical-align: -2px;
  color: var(--brand);
}
.ia-hint-x {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  /* full ≥44px touch target (brief) — negative margins keep it visually tucked in the corner
     without inflating the hint box. */
  width: 44px;
  height: 44px;
  margin: -8px -6px -8px 0;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--muted);
  cursor: pointer;
}
.ia-hint-x:hover { background: rgba(139, 69, 19, 0.08); color: var(--ink); }
.ia-hint-x:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
</style>
