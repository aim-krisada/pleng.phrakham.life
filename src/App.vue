<script setup>
import { computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initAuth, recovering, emailChanged } from './store.js'
import { initPrintChrome } from './lib/printChrome.js'
import SiteFooter from './components/SiteFooter.vue'
import ShellBar from './components/ShellBar.vue'

initAuth()
// Running print footer (site · page X of Y · date) injected on every print — one place
// so it works from any page, Save-as-PDF button or Ctrl+P alike.
initPrintChrome()
const route = useRoute()
const router = useRouter()
// The song surface (Studio) renders its own richer shell header (catalog · file/
// manage menus · mode toggle), so the site-wide AppHeader steps back there. A song
// opens in that surface too (/song/:id), gated to view-only for non-editors.
const isStudio = computed(() => route.path === '/studio' || route.path.startsWith('/song/'))
// Home is the song list itself (like the Docs home) — no redundant title; the brand
// links there. Other static pages still name themselves.
const pageTitle = computed(() => ({ '/guide': 'คู่มือ', '/about': 'เกี่ยวกับเรา' })[route.path] || '')
// Supabase email links land as #access_token=…; the hash-router sees a bogus route
// and blanks the page. For any of them, send the app back home — the header panel
// (set-password, or the email-changed note) then shows over the normal catalog.
watch(
  [recovering, emailChanged],
  ([r, e]) => { if (r || e) router.replace('/') },
  { immediate: true },
)

// Footer↔dock clearance (bug: footer floated mid-screen / under the dock on ฝึกร้อง).
// The music/edit dock (.sd-wrap) is position:fixed at the viewport bottom; we publish its
// live height as --dock-clear so the sticky footer reserves exactly that band and its
// line + text land flush on top of the dock. Measured (not a magic number) because the
// dock's height changes with mode/viewport and the DockKey line keeps evolving it. When
// no dock is mounted (list/guide/about) or it's been dragged off the bottom, clearance = 0
// and the footer sits on the true viewport bottom.
let dockRO = null
let dockMO = null
let measuredEl = null
let flushPending = false
function applyDockClear() {
  flushPending = false
  const dock = document.querySelector('.sd-wrap')
  let h = 0
  if (dock) {
    const cs = getComputedStyle(dock)
    const r = dock.getBoundingClientRect()
    // count it only while it's a real, visible bar anchored to the bottom edge
    if (cs.display !== 'none' && r.height > 0 && r.bottom >= window.innerHeight - 4) {
      h = r.height
    }
  }
  document.documentElement.style.setProperty('--dock-clear', Math.round(h) + 'px')
  // keep the ResizeObserver bound to whichever .sd-wrap is currently mounted
  if (dock !== measuredEl) {
    if (dockRO) dockRO.disconnect()
    measuredEl = dock
    if (dock && dockRO) dockRO.observe(dock)
  }
}
function scheduleDockClear() {
  // coalesce bursts (a mode switch fires many mutations) into one measure. setTimeout, not
  // rAF, so it still flushes when the tab is backgrounded (rAF is paused while hidden).
  if (flushPending) return
  flushPending = true
  setTimeout(applyDockClear, 0)
}
onMounted(() => {
  dockRO = new ResizeObserver(scheduleDockClear)
  // the dock is v-if, so it mounts after the song loads (later than the route change) and
  // can toggle; watch the tree so we re-measure whenever it appears/disappears. Cheap +
  // coalesced, so subtree churn (e.g. typing in the editor) costs one measure per tick.
  dockMO = new MutationObserver(scheduleDockClear)
  dockMO.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', scheduleDockClear)
  scheduleDockClear()
})
onBeforeUnmount(() => {
  if (dockRO) dockRO.disconnect()
  if (dockMO) dockMO.disconnect()
  window.removeEventListener('resize', scheduleDockClear)
})
// the dock mounts/unmounts and swaps tools when the route or Studio mode changes
watch(() => route.path, () => nextTick(scheduleDockClear))
</script>

<template>
  <ShellBar :title="pageTitle" />
  <main class="container" :class="{ 'studio-wide': isStudio }">
    <router-view />
  </main>
  <SiteFooter :class="{ 'footer-dock-clear': isStudio }" />
</template>
