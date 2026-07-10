<script setup>
// Top-nav "Aa" reader-text-size tool (B043) — mirrors phrakham.life's Aa control
// (assets/pk-navbar.js): one button opens a small popup with A− [%] A+ and a
// "คืนค่าปกติ (100%)" reset. The size itself is the global store.readingFontScale, so the
// reader owns text size from the shared top bar, not the studio dock. Shown only while a
// song is open (like DownloadTool). The popup is clamped to stay fully on-screen.
import { ref, computed, nextTick, watch } from 'vue'
import { currentSong, readingFontScale, bumpFontScale, resetFontScale } from '../store.js'
import Icon from './Icon.vue'

const open = ref(false)
const popEl = ref(null)
const pct = computed(() => Math.round(readingFontScale.value * 100))

function clampPopup() {
  const el = popEl.value
  if (!el) return
  el.style.transform = '' // reset before measuring
  const r = el.getBoundingClientRect()
  const m = 8
  let dx = 0
  if (r.right > window.innerWidth - m) dx = window.innerWidth - m - r.right
  if (r.left + dx < m) dx = m - (r.left + dx)
  el.style.transform = dx ? `translateX(${dx}px)` : ''
}
watch(open, async (v) => {
  if (!v) return
  await nextTick()
  clampPopup()
})
</script>

<template>
  <div v-if="currentSong" class="ft-tool no-print">
    <button
      class="ft-btn"
      :aria-expanded="open"
      aria-label="ขนาดตัวอักษร"
      title="ขนาดตัวอักษร"
      @click="open = !open"
      @keydown.esc="open = false"
    >Aa</button>
    <div v-if="open" ref="popEl" class="ft-menu" role="menu">
      <div class="ft-lbl">ขนาดตัวอักษร</div>
      <div class="ft-row">
        <button class="ft-step" aria-label="ตัวเล็กลง" :disabled="pct <= 80" @click="bumpFontScale(-0.1)">
          <Icon name="a-arrow-down" :size="18" />
        </button>
        <b class="ft-pct">{{ pct }}%</b>
        <button class="ft-step" aria-label="ตัวใหญ่ขึ้น" :disabled="pct >= 220" @click="bumpFontScale(0.1)">
          <Icon name="a-arrow-up" :size="18" />
        </button>
      </div>
      <button class="ft-reset" @click="resetFontScale">คืนค่าปกติ (100%)</button>
    </div>
  </div>
</template>

<style scoped>
.ft-tool { position: relative; display: inline-flex; }
.ft-btn {
  /* full 44×44 touch target — matches the other shell-bar controls (WCAG 2.5.5) */
  width: var(--touch-min); height: var(--touch-min); min-height: 0; padding: 0;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 8px; font-weight: 700; font-size: var(--fs-md); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
@media (hover: hover) { .ft-btn:hover { border-color: var(--brand); color: var(--brand); } }
.ft-menu {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 60;
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18); padding: var(--sp-3);
  min-width: 190px; max-width: calc(100vw - var(--sp-4));
}
.ft-lbl { font-size: var(--fs-xs); color: var(--muted); padding: 0 2px var(--sp-2); }
.ft-row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); }
.ft-step {
  width: var(--touch-min); height: var(--touch-min); min-height: 0; padding: 0;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
}
.ft-step:disabled { opacity: 0.4; cursor: default; }
@media (hover: hover) { .ft-step:not(:disabled):hover { border-color: var(--brand); color: var(--brand); } }
.ft-pct { font-size: var(--fs-sm); font-variant-numeric: tabular-nums; min-width: 46px; text-align: center; }
.ft-reset {
  width: 100%; margin-top: var(--sp-2); border: 0; background: transparent; color: var(--brand);
  font: inherit; font-size: var(--fs-xs); cursor: pointer; padding: var(--sp-2) var(--sp-1);
  border-radius: 6px; text-align: center; min-height: var(--touch-min);
}
@media (hover: hover) { .ft-reset:hover { background: var(--cream); } }
</style>
