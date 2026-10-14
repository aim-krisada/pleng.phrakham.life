<script setup>
import { computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initAuth, recovering, emailChanged, shellMenu } from './store.js'
import { initPrintChrome } from './lib/printChrome.js'
import { measureDockClear } from './lib/dockClear.js'
import { installFocusClear } from './lib/focusClear.js'
import { installHeaderHide, COMPACT_Q } from './lib/headerHide.js'
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
// No shell-title on the static pages: /guide and /about each already have a nav link of
// the same name (highlighted when active), so a title here only duplicated the menu item
// (P'Aim). The song surface (/song, /studio) shows its own title via the Studio chrome.
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
let observed = []
let flushPending = false
function applyDockClear() {
  flushPending = false
  // measuring + publishing lives in lib/dockClear.js (ใบ#108 also lifts the scroll buttons there)
  measureDockClear()
  // keep the ResizeObserver on every dock that can be measured. ใบ#108: Studio shows/hides its
  // modes with v-show (a style change, not a DOM change), so watch EVERY phone bar — a bar
  // appearing or hiding changes its size, which re-measures. Re-bind only when the set changes
  // (observe() fires once on its own, so re-binding every time would loop).
  const els = [...document.querySelectorAll('.sd-wrap, .dk-host.dk-bar > .dk-dock')]
  if (dockRO && (els.length !== observed.length || els.some((el, i) => el !== observed[i]))) {
    dockRO.disconnect()
    els.forEach((el) => dockRO.observe(el))
    observed = els
  }
}
function scheduleDockClear() {
  // coalesce bursts (a mode switch fires many mutations) into one measure. setTimeout, not
  // rAF, so it still flushes when the tab is backgrounded (rAF is paused while hidden).
  if (flushPending) return
  flushPending = true
  setTimeout(applyDockClear, 0)
}
// ใบ v3/pleng#111 — a focused field (or the caret line of a multi-line field) is never left
// under the bottom bar (WCAG 2.4.11) — lib/focusClear.js
let uninstallFocusClear = null
// ใบ v3/pleng#114 — on a phone (< 600px) the header slides away while you scroll down a song and
// comes back when you scroll up (lib/headerHide.js). Song pages only (ฝึกร้อง · แผ่นเพลง · แก้ไข —
// all three are long pages read or typed on a small screen); it stays put while a menu is open.
// ใบ v3/pleng#118 — and on every screen narrower than 1024px (a Fold, a tablet held upright).
const isCompact = () => typeof window.matchMedia === 'function' && !!window.matchMedia(COMPACT_Q)?.matches
let headerHide = null
watch([() => route.path, shellMenu], () => headerHide?.update())
onMounted(() => {
  uninstallFocusClear = installFocusClear()
  headerHide = installHeaderHide({ active: () => isStudio.value && isCompact(), pinned: () => shellMenu.value != null })
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
  uninstallFocusClear?.()
  headerHide?.uninstall()
  if (dockRO) dockRO.disconnect()
  if (dockMO) dockMO.disconnect()
  window.removeEventListener('resize', scheduleDockClear)
})
// the dock mounts/unmounts and swaps tools when the route or Studio mode changes
watch(() => route.path, () => nextTick(scheduleDockClear))
</script>

<template>
  <ShellBar />
  <main class="container" :class="{ 'studio-wide': isStudio }">
    <router-view />
  </main>
  <SiteFooter :class="{ 'footer-dock-clear': isStudio }" />
</template>
