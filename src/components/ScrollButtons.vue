<script setup>
// B001 — floating page-scroll buttons (bottom-right), copied from พระคำ.ชีวิต's
// `.post-nav-float`: round buttons that sit semi-transparent (opacity 0.5) and go fully
// opaque only on hover — no idle timer. Here ↑ jumps to the very top, ↓ to the very
// bottom. Self-contained (own chevron SVGs), shows only when the page is scrollable, dims
// the end you can't go further, never prints, and sits below the editor dock (z-index).
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const scrollable = ref(false)
const atTop = ref(true)
const atBottom = ref(false)

// ↑ jumps to the very top, ↓ to the very bottom (พระคำ.ชีวิต behavior) — one press per end.
function scrollToEnd(dir) {
  const bottom = document.documentElement.scrollHeight
  window.scrollTo({ top: dir < 0 ? 0 : bottom, left: 0, behavior: 'smooth' })
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
      aria-label="ขึ้นบนสุด"
      title="ขึ้นบนสุด"
      @click="scrollToEnd(-1)"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
    </button>
    <button
      class="scroll-fab-btn"
      :disabled="atBottom"
      aria-label="ลงล่างสุด"
      title="ลงล่างสุด"
      @click="scrollToEnd(1)"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
  </div>
</template>

<style scoped>
/* Copied from พระคำ.ชีวิต `.post-nav-float`: round, rests at opacity 0.5, opaque on hover,
   0.2s fade. Only the position + stacking differ (a corner ↑/↓ pair, not side prev/next). */
.scroll-fab {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 30; /* above content, below the editor dock (90) so they don't collide on mobile */
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: 0.5;
  transition: opacity 0.2s;
}
.scroll-fab:hover,
.scroll-fab:focus-within {
  opacity: 1;
}
.scroll-fab-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--brand);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.scroll-fab-btn:disabled {
  color: var(--muted);
  cursor: default;
}
@media (hover: hover) {
  .scroll-fab-btn:not(:disabled):hover {
    background: var(--cream);
  }
}
@media (max-width: 600px) {
  .scroll-fab-btn {
    width: 40px;
    height: 40px;
  }
}
</style>
