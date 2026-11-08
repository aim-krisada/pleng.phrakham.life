<script setup>
// THE "Aa" button — the one place to set how text reads (ใบ v3/pleng#142). It sits on the shared top
// bar (ShellBar) on every page and every width, in the same spot, so a reader never has to learn two
// places (NN/g utility navigation · WCAG 3.2.3/3.2.4). Its popup holds:
//   - ก− [%] ก+ (A− / A+ on an English interface, ใบ#159) and "คืนค่าปกติ (100%)" — store.readingFontScale, one value for the whole site, 10%
//     a step from 80% to 220%. Buttons, not a slider (พี่เอม 1 พ.ย. 2569: "ปุ่มกด บวก ลบ ง่ายกว่า").
//   - ตัวอักษรไทย ไม่มีหัว / มีหัว — store.siteFont (was in the ⚙ popover and the ☰ drawer).
// It rides the shared one-open-at-a-time `shellMenu` channel (key 'aa'), so ShellBar's backdrop closes
// it on an outside click and opening another menu closes it. The popup is clamped to stay on-screen.
import { computed, nextTick, ref, watch } from 'vue'
import { readingFontScale, bumpFontScale, resetFontScale, siteFont, setSiteFont, shellMenu } from '../store.js'
import { fontStepLabels } from '../lib/fontStepLabels.js'

const open = computed(() => shellMenu.value === 'aa')
const btnEl = ref(null)
const popEl = ref(null)
const pct = computed(() => Math.round(readingFontScale.value * 100))
// ก− / ก+ on a Thai interface, A− / A+ on English (ใบ#159) — read once from <html lang>
const step = fontStepLabels(typeof document !== 'undefined' ? document.documentElement.lang : '')

function toggle() { shellMenu.value = open.value ? null : 'aa' }
function close(returnFocus) {
  if (open.value) shellMenu.value = null
  if (returnFocus) btnEl.value?.focus()
}

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
  <div class="ft-tool" @keydown.esc="close(true)">
    <button
      ref="btnEl"
      class="ft-btn"
      :class="{ on: open }"
      :aria-expanded="open"
      aria-haspopup="true"
      aria-label="ขนาดตัวอักษร"
      :title="'ขนาดตัวอักษร ' + pct + '%'"
      @click.stop="toggle"
    >Aa</button>
    <div v-if="open" ref="popEl" class="ft-menu" role="dialog" aria-label="ตัวอักษร" @click.stop>
      <div class="ft-lbl">ขนาดตัวอักษร</div>
      <div class="ft-row">
        <button class="ft-step" aria-label="ตัวเล็กลง" :disabled="pct <= 80" @click="bumpFontScale(-0.1)">
          <span class="ft-step-txt" aria-hidden="true">{{ step.smaller }}</span>
        </button>
        <b class="ft-pct" aria-live="polite">{{ pct }}%</b>
        <button class="ft-step" aria-label="ตัวใหญ่ขึ้น" :disabled="pct >= 220" @click="bumpFontScale(0.1)">
          <span class="ft-step-txt" aria-hidden="true">{{ step.bigger }}</span>
        </button>
      </div>
      <button class="ft-reset" :disabled="pct === 100" @click="resetFontScale">คืนค่าปกติ (100%)</button>
      <div class="ft-sep" role="separator"></div>
      <div class="sb-font">
        <div class="sb-font-lbl">ตัวอักษรไทย</div>
        <div class="sb-font-opts" role="radiogroup" aria-label="ตัวอักษรไทย">
          <button type="button" role="radio" :aria-checked="siteFont === 'default'" :class="{ on: siteFont === 'default' }" @click="setSiteFont('default')">
            <span class="sb-font-eg">ก&nbsp;ข&nbsp;ค</span>
            ไม่มีหัว
          </button>
          <button type="button" role="radio" :aria-checked="siteFont === 'looped'" :class="{ on: siteFont === 'looped' }" @click="setSiteFont('looped')">
            <span class="sb-font-eg looped">ก&nbsp;ข&nbsp;ค</span>
            มีหัว
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ft-tool { position: relative; display: inline-flex; }
.ft-btn {
  /* full 44×44 touch target — matches the other shell-bar controls (WCAG 2.5.5) */
  width: var(--touch-min); height: var(--touch-min); min-height: 0; padding: 0;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 8px; font-weight: 700; font-size: var(--fs-md); letter-spacing: -0.3px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.ft-btn.on { border-color: var(--brand); color: var(--brand); }
@media (hover: hover) { .ft-btn:hover { border-color: var(--brand); color: var(--brand); } }
.ft-menu {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 60;
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18); padding: var(--sp-3);
  width: max-content; min-width: 220px; max-width: calc(100vw - var(--sp-4));
}
.ft-lbl { font-size: var(--fs-xs); color: var(--muted); padding: 0 2px var(--sp-2); }
.ft-row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); }
.ft-step {
  width: var(--touch-min); height: var(--touch-min); min-height: 0; padding: 0;
  border: 1px solid var(--line); background: transparent; color: var(--ink);
  border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
}
.ft-step-txt { font-weight: 700; font-size: var(--fs-md); line-height: 1; white-space: nowrap; }
.ft-step:disabled { opacity: 0.4; cursor: default; }
@media (hover: hover) { .ft-step:not(:disabled):hover { border-color: var(--brand); color: var(--brand); } }
.ft-pct { font-size: var(--fs-sm); font-variant-numeric: tabular-nums; min-width: 46px; text-align: center; }
.ft-reset {
  width: 100%; margin-top: var(--sp-2); border: 0; background: transparent; color: var(--brand);
  font: inherit; font-size: var(--fs-xs); cursor: pointer; padding: var(--sp-2) var(--sp-1);
  border-radius: 6px; text-align: center; min-height: var(--touch-min);
}
.ft-reset:disabled { color: var(--muted); opacity: 0.6; cursor: default; }
@media (hover: hover) { .ft-reset:not(:disabled):hover { background: var(--cream); } }
.ft-sep { height: 1px; background: var(--line); margin: var(--sp-2) 0; }
/* the ตัวอักษรไทย radios reuse the shared .sb-font* rules in styles.css; no side padding in here */
.ft-menu .sb-font { padding: 0; }
</style>
