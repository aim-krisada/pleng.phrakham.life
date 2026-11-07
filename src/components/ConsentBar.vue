<script setup>
// ใบ v3/pleng#154 — the "may we count?" bar (Thai PDPA: ask first). Shows only when lib/analytics.js has
// a GA_ID and this visitor has not answered yet; nothing is sent to Google before ยอมรับ.
//
// Non-modal: it never takes focus or blocks the page. It sits ON TOP of the music/edit bar at the bottom
// (--dock-clear, lib/dockClear.js), never over it, and publishes its own height as --consent-h with the
// class `has-consent-bar` on <html> so the page, the footer and the round scroll buttons make room for it
// (styles.css). Hidden in print. The two answers are the same size and look the same — neither is pushed.
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { askConsent, setConsent } from '../lib/analytics.js'

const bar = ref(null)
let ro = null

function publish() {
  const root = document.documentElement
  const h = bar.value ? Math.round(bar.value.getBoundingClientRect().height) : 0
  if (askConsent.value && bar.value) {
    root.style.setProperty('--consent-h', h + 'px')
    root.classList.add('has-consent-bar')
  } else {
    root.style.removeProperty('--consent-h')
    root.classList.remove('has-consent-bar')
  }
}

watch(
  askConsent,
  async (on) => {
    await nextTick()
    ro?.disconnect()
    ro = null
    if (on && bar.value && typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(publish)
      ro.observe(bar.value)
    }
    publish()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  ro?.disconnect()
  document.documentElement.style.removeProperty('--consent-h')
  document.documentElement.classList.remove('has-consent-bar')
})
</script>

<template>
  <section v-if="askConsent" ref="bar" class="consent-bar no-print" aria-label="นับการเปิดเพลง">
    <p class="cb-text">
      เราขอนับว่าแต่ละเพลงมีคนเปิดดูกี่ครั้ง โดยไม่รู้ว่าคุณเป็นใคร
      <router-link to="/about#stats" class="cb-more">อ่านเพิ่ม</router-link>
    </p>
    <div class="cb-btns">
      <button type="button" class="secondary" @click="setConsent('granted')">ยอมรับ</button>
      <button type="button" class="secondary" @click="setConsent('denied')">ไม่ยอมรับ</button>
    </div>
  </section>
</template>

<style scoped>
.consent-bar {
  position: fixed;
  left: 0;
  right: 0;
  /* on top of the music/edit bar, never over it (0 when no bar is showing) */
  bottom: calc(var(--dock-clear, 0px) + env(safe-area-inset-bottom, 0px));
  z-index: 85; /* under the dock (90) and its popups, over the page */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 16px;
  padding: 8px 16px;
  background: #fff;
  color: var(--ink);
  border-top: 1px solid var(--line);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
}
.cb-text { margin: 0; flex: 1 1 320px; max-width: 640px; }
.cb-more { white-space: nowrap; }
.cb-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex: 0 0 auto; }
.cb-btns button { min-width: 7.5em; }
/* a fixed music/edit bar is showing → sit exactly on its top edge (its full height, home-bar inset included) */
:global(html.has-dock-bar .consent-bar) { bottom: var(--dock-bar-h, 0px); }
@media (max-width: 599px) {
  .cb-btns { flex: 1 1 100%; }
}
@media print {
  .consent-bar { display: none !important; }
}
</style>
