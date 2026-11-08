<script setup>
// Top of the home page (ใบ v3/pleng#156 · #155 · install-design.html figures 1, 7, 8).
//   Not installed → the card "ติดตั้งเป็นแอพ ใช้ได้แม้ไม่มีเน็ต" + ONE ติดตั้งแอพ button + ✕.
//     The same card on every device; what the button does is decided in lib/pwaInstall.js.
//     The offline status rides inside the card as a small line.
//   Card closed with ✕ (remembered on this device) or app installed → no card, and the status
//     line only when it has news (ใบ v3/pleng#157 · lib/offlineReady.js standaloneLine):
//     amber lines (saving %, not ready, at risk) always show; the green "ready" line shows only
//     on the visit it turns ready, then hides by itself after 8 s. Ready from the start → nothing.
// Install from the ☰ menu still works after ✕ (design rule 5).
import { computed, onMounted } from 'vue'
import Icon from './Icon.vue'
import {
  isStandalone, installCardDismissed, dismissInstallCard, startInstall,
} from '../lib/pwaInstall.js'
import {
  offlineStatus, statusText, watchOfflineStatus, standaloneLine, readyFlash,
} from '../lib/offlineReady.js'

const showCard = computed(() => !isStandalone.value && !installCardDismissed.value)
const status = computed(() => statusText(offlineStatus.value))
const line = computed(() => standaloneLine(status.value, readyFlash.value))

function onInstall(e) { startInstall(e.currentTarget) }

onMounted(() => watchOfflineStatus())
</script>

<template>
  <section v-if="showCard" class="ic-card no-print" aria-labelledby="ic-title" data-test="install-card">
    <button type="button" class="ic-x" aria-label="ปิดกล่องติดตั้งแอพ" @click="dismissInstallCard">
      <Icon name="x" :size="20" />
    </button>
    <h2 id="ic-title" class="ic-title">ติดตั้งเป็นแอพ ใช้ได้แม้ไม่มีเน็ต</h2>
    <p class="ic-sub">มีไอคอนบนหน้าจอ เปิดเพลงได้ในโบสถ์ที่ไม่มีสัญญาณ</p>
    <p
      v-if="status"
      class="ic-status"
      :class="'ic-' + status.tone"
      role="status"
      data-test="offline-status"
    >{{ status.text }}</p>
    <button type="button" class="ic-btn" @click="onInstall">
      <Icon name="smartphone" :size="20" />
      <span>ติดตั้งแอพ</span>
    </button>
  </section>
  <Transition v-else name="ic-fade">
    <p
      v-if="line"
      class="ic-line no-print"
      :class="'ic-' + line.tone"
      role="status"
      data-test="offline-status"
    >{{ line.text }}</p>
  </Transition>
</template>

<style scoped>
.ic-card {
  position: relative;
  margin: 0 0 var(--sp-4);
  padding: 14px 16px 16px;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ic-title {
  margin: 0;
  padding-right: 40px; /* room for ✕ */
  font-size: var(--fs-lg);
  line-height: var(--lh-snug);
  color: var(--ink);
}
.ic-sub { margin: 0; color: var(--muted); font-size: var(--fs-sm); line-height: var(--lh-normal); }
.ic-x {
  position: absolute;
  top: 4px;
  right: 4px;
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  background: none;
  border: none;
  border-radius: 10px;
  color: var(--muted);
  cursor: pointer;
}
.ic-x:hover { background: rgba(139, 69, 19, 0.08); color: var(--ink); }
.ic-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--touch-min);
  margin-top: 4px;
  padding: 8px 16px;
  background: var(--brand);
  color: #fff;
  border: 1px solid var(--brand);
  border-radius: 10px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.ic-btn:hover { filter: brightness(1.08); }
.ic-x:focus-visible, .ic-btn:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }
/* the offline line — green when ready, amber while saving or when not ready (design fig. 7–8) */
.ic-status, .ic-line {
  margin: 0;
  padding: 6px 10px;
  border-radius: 9px;
  font-size: var(--fs-sm);
  font-weight: 600;
  line-height: var(--lh-snug);
}
.ic-line { margin-bottom: var(--sp-3); }
.ic-fade-leave-active { transition: opacity 0.4s ease; }
.ic-fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .ic-fade-leave-active { transition: none; }
}
.ic-ok { background: #e8f4ec; color: #22663e; }
.ic-wait { background: #fff6e5; color: #7a4f00; }
</style>
