<script setup>
// B001 — floating page-scroll buttons (bottom-right), reusing the phrakham.life FAB
// pattern: a fixed, safe-area-aware pill that jumps the page up/down by ~one screen.
// Self-contained (own chevron SVGs) so it drops into any page. It only shows when the
// page is actually scrollable, and dims the end you can't go further. It never prints,
// and sits below the editor dock (z-index) so the two never fight on a phone.
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const scrollable = ref(false)
const atTop = ref(true)
const atBottom = ref(false)

// how far one press moves — most of a screen, keeping a little overlap for context
function step() {
  return Math.max(200, Math.round(window.innerHeight * 0.85))
}
function scrollByScreens(dir) {
  window.scrollBy({ top: dir * step(), left: 0, behavior: 'smooth' })
}

// A page counts as scrollable only if there is a meaningful amount below the fold;
// tiny overflows (a few px) should not pop the control.
function update() {
  const doc = document.documentElement
  const max = doc.scrollHeight - window.innerHeight
  scrollable.value = max > 40
  const y = window.scrollY || doc.scrollTop || 0
  atTop.value = y <= 4
  atBottom.value = y >= max - 4
}

// update() is cheap (a few reads) so we call it directly rather than via rAF, which a
// background/inactive tab throttles — that throttling was hiding the control until a
// real scroll happened.
// The page height also changes AFTER mount (route switches, async song content, fonts,
// the editor growing) with no scroll/resize event — a ResizeObserver on the document
// body is what re-checks scrollability in those cases. (jsdom has none → guarded.)
let ro = null
onMounted(() => {
  update()
  // onMounted can run before the routed page's content has laid out; re-measure once it
  // has so the control is correct on first paint, not only after the first scroll.
  nextTick(update)
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => update())
    ro.observe(document.body)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
  if (ro) ro.disconnect()
})
</script>

<template>
  <div v-show="scrollable" class="scroll-fab no-print" role="group" aria-label="เลื่อนหน้า">
    <button
      class="scroll-fab-btn"
      :disabled="atTop"
      aria-label="เลื่อนขึ้น"
      title="เลื่อนขึ้น"
      @click="scrollByScreens(-1)"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
    </button>
    <span class="scroll-fab-sep" aria-hidden="true"></span>
    <button
      class="scroll-fab-btn"
      :disabled="atBottom"
      aria-label="เลื่อนลง"
      title="เลื่อนลง"
      @click="scrollByScreens(1)"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
  </div>
</template>

<style scoped>
.scroll-fab {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 30; /* above content, below the editor dock (90) so they don't collide on mobile */
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.scroll-fab-btn {
  background: transparent;
  border: none;
  color: var(--brand);
  cursor: pointer;
  padding: 10px 12px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.scroll-fab-btn:disabled {
  color: var(--muted);
  opacity: 0.4;
  cursor: default;
}
.scroll-fab-sep {
  height: 1px;
  background: var(--line);
  margin: 0 8px;
}
@media (hover: hover) {
  .scroll-fab-btn:not(:disabled):hover {
    background: var(--cream);
  }
}
</style>
