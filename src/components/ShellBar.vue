<script setup>
// THE one app-wide header (rendered by App.vue on every route). Brand + site menu +
// login live here; a page (e.g. Studio) teleports its own contextual controls into
// #shell-left / #shell-title / #shell-menus so there is a single shared bar, not
// one-per-page. `shellMenu` is shared (store) so only one menu/drawer is open at a time.
//
// phrakham parity (P'Aim 13 ก.ค.):
//   Desktop = brand NAME only (no icon) + inline nav (รายการเพลง · คู่มือ · เกี่ยวกับเรา ·
//             พระคำ↗) + tools on the right (🔍 · ⚙ ตัวอักษรไทย · เข้าสู่ระบบ).
//   Mobile  = app ICON only (มุมซ้าย · no name) + 🔍 + ☰ on the right; ☰ opens a drawer
//             holding the nav links + a "เครื่องมือ" section (ตัวอักษรไทย + เข้าสู่ระบบ).
//
// The mobile drawer is NOT hand-rolled here: it is the ONE shared vanilla core
// window.PKDrawer (src/lib/pk-drawer.js, verbatim from phrakham.life) — so pleng's ☰
// menu = phrakham's (left slide + scrim + focus-trap + Esc/scrim-close + scroll-lock,
// all a11y baked once). This component only owns the CONTENT of the panel (Vue nav +
// เครื่องมือ); the core owns the off-canvas SHELL. The core re-queries focusables on
// every open, so the Vue-rendered links are trapped correctly.
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shellMenu } from '../store.js'
import { t } from '../i18n/index.js'
import ProfileTool from './ProfileTool.vue'
import InstallAppTool from './InstallAppTool.vue'
import InstallSheet from './InstallSheet.vue'
import SettingsControls from './SettingsControls.vue'
import Icon from './Icon.vue'
import { canShowInstall, openInstall, installSheetOpen } from '../lib/pwaInstall.js'

defineProps({ title: { type: String, default: '' } })
const route = useRoute()
const router = useRouter()

// บริบท B (context-B, ux-groundup): on a song / studio route the top bar is the CONTEXTUAL
// song bar (‹ ชื่อ · ↗ · ⋮), not the home shell. The inline home nav + "สร้างเพลงใหม่" pill
// step aside so the song page reads as one clean bar; they stay reachable in ☰ (and create on home).
const isSong = computed(() => route.path === '/studio' || route.path.startsWith('/song/'))
// App icon shown as the whole brand on mobile (phrakham-style top-left app mark). P'Aim's
// 192px glowing-book icon; BASE_URL keeps it resolving on both hosts.
const appIcon = import.meta.env.BASE_URL + 'android-chrome-192x192.png'

// ---- Mobile drawer wiring (shared PKDrawer core) ----
// The ☰ button and the always-rendered panel are handed to PKDrawer.create() on mount;
// the core wires the trigger click, scrim, Esc and × itself. We only bridge its open
// state onto the shared one-open-at-a-time `shellMenu` channel (key 'site') so opening
// the drawer coexists with the desktop ⚙ popover ('settings') and Studio's own menus.
const burgerBtn = ref(null)
const drawerPanel = ref(null)
let drawer = null

// ---- B123 (ชั่วคราว · รอแถบบนออกแบบใหม่) — collapse when the bar does not FIT -------------
// The compact layout (☰ drawer + FAB) is the app's own, unchanged; only its trigger moved here.
// It used to fire at a guessed 992px, but the full bar needs a fixed ~1394px no matter how
// narrow the window is — every flex child is `flex: 0 1 auto` with `min-width: auto`, so
// nothing can shrink — which left a horizontal scrollbar on every laptop under ~1395px of
// viewport: 1366 (the most common one) by 43px, 1280 by 129px, 1200 by 209px, 1024 by 308px.
// So: measure. The decision is always taken against the FULL bar's requirement (the class is
// lifted for the measurement and put back in the same frame, before any paint), which is what
// makes it stable — the answer never depends on the state we are currently in, so it cannot
// oscillate. No width constant is left anywhere; add a button to the bar and the collapse point
// moves by itself.
// Two steps, cheapest first, so a desktop keeps looking like a desktop for as long as it fits:
//   0 full        → everything inline
//   1 .shell-tight → brand becomes the app icon (the wordmark costs ~164px and is the only
//                    thing on the row that repeats information the icon already carries).
//                    The nav links, mode switch and tools all stay inline — this is what saves
//                    1280 and 1366, the two widths the team actually works on.
//   2 .shell-compact → the app's existing ☰ layout (nav + ⚙ in the drawer, ＋ as the FAB).
const LEVELS = ['', 'shell-tight', 'shell-compact']
const barEl = ref(null)
function syncShellFit() {
  const bar = barEl.value
  if (!bar || typeof document === 'undefined') return
  const root = document.documentElement
  const wasCompact = root.classList.contains('shell-compact')
  // walk up the levels until it fits; each level is MEASURED, never assumed from a width
  let level = 0
  for (; level < LEVELS.length; level++) {
    root.classList.remove('shell-tight', 'shell-compact')
    if (LEVELS[level]) root.classList.add(LEVELS[level])
    if (bar.scrollWidth <= bar.clientWidth + 1) break // +1 = sub-pixel rounding
  }
  if (level >= LEVELS.length) level = LEVELS.length - 1 // still short → the smallest we have
  root.classList.remove('shell-tight', 'shell-compact')
  if (LEVELS[level]) root.classList.add(LEVELS[level])
  const compact = LEVELS[level] === 'shell-compact'
  // leaving compact takes the ☰ away with it — an open off-canvas would be left with no
  // trigger and no way back (this replaces the old fixed 992px media-query listener, which
  // now fires at a width that has nothing to do with whether the ☰ is on screen).
  if (wasCompact && !compact && drawer && drawer.isOpen()) drawer.close()
}
let fitRo = null
let fitTimers = []

onMounted(() => {
  // Runs before the browser paints, so the first frame is already measured — no flash of a
  // too-wide bar on a phone. Then keep it live: window resize covers rotate/fold, the
  // ResizeObserver covers layout-driven width changes (a Studio menu teleported into the bar),
  // fonts.ready + two settle timers cover the cold load (the first measure lands pre-font, and
  // a background/automated tab runs NO rendering steps, so the observer alone can never fire).
  syncShellFit()
  window.addEventListener('resize', syncShellFit)
  window.addEventListener('keydown', onCreateShortcut)   // "C" → open a blank editor (see above)
  if (typeof ResizeObserver === 'function' && barEl.value) {
    fitRo = new ResizeObserver(syncShellFit)
    fitRo.observe(barEl.value)
    fitRo.observe(document.documentElement)
  }
  document.fonts?.ready?.then(syncShellFit).catch(() => {})
  fitTimers = [setTimeout(syncShellFit, 300), setTimeout(syncShellFit, 1200)]

  if (!window.PKDrawer || !burgerBtn.value || !drawerPanel.value) return
  drawer = window.PKDrawer.create({
    side: 'left',
    trigger: burgerBtn.value,
    panel: drawerPanel.value,
    label: 'เมนู',
    scrim: true,
    onOpen() { shellMenu.value = 'site' },
    onClose() { if (shellMenu.value === 'site') shellMenu.value = null },
  })
  // Another menu (settings popover / Studio menu) taking the shared channel closes the drawer.
  watch(shellMenu, (v) => { if (v !== 'site' && drawer && drawer.isOpen()) drawer.close() })
  // (closing the drawer when the ☰ goes away is handled by syncShellFit — it knows when the
  //  bar actually leaves compact, which a fixed-width media query no longer tracks.)
})

onUnmounted(() => {
  if (drawer) { drawer.destroy(); drawer = null }   // kill scrim/listeners (leak + HMR)
  window.removeEventListener('resize', syncShellFit)
  window.removeEventListener('keydown', onCreateShortcut)
  fitRo?.disconnect()
  fitTimers.forEach(clearTimeout)
  // no bar on the page → drop the state it owns (a stale class would compact the next page)
  document.documentElement.classList.remove('shell-compact')
})

function toggleSettings() {
  shellMenu.value = shellMenu.value === 'settings' ? null : 'settings'
}
function closeMenus() {
  shellMenu.value = null
}

// ＋สร้างเพลง now lives ONLY on the FAB (mobile) / top-bar pill (desktop) — it was removed from
// the ☰ drawer (a drawer holds destinations, not actions · M3). So the create action gets a
// keyboard peer: press "C" anywhere the create affordance is offered (home/list/guide/about —
// i.e. not on a song/studio route) to open a blank editor. Guarded so it never hijacks typing
// (inputs, textareas, contenteditable), a modifier chord (Ctrl/⌘+C copy), or a route where
// create isn't shown. WCAG 2.1.4: single-character shortcut is only active off text fields.
function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}
function onCreateShortcut(e) {
  if (e.key !== 'c' && e.key !== 'C') return
  if (e.ctrlKey || e.metaKey || e.altKey) return          // leave Ctrl/⌘+C (copy) alone
  if (isTypingTarget(e.target)) return                    // don't steal the letter while typing
  if (isSong.value) return                                // create isn't offered on song/studio
  e.preventDefault()
  closeMenus()
  router.push('/studio')
}

// The promoted "ติดตั้งแอพ" affordances (top-bar button here + the mobile home banner) share one
// action: replay the captured install prompt, or open the iOS Share instruction sheet (openInstall).
async function onInstall() { closeMenus(); await openInstall() }

// ---- "คู่มือ ▾" desktop dropdown (WAI-ARIA APG menu button · GATE 1) ----
// A disclosure button that opens a role=menu of 2 links (ใช้งานโปรแกรม /guide · ทำเพลง /notation).
// Shares the one-open-at-a-time `shellMenu` channel (key 'guide') so it coexists with ⚙ + the
// drawer, and the existing .sb-backdrop closes it on an outside click. Keyboard: ↑↓ move, Home/
// End jump, Enter/Space/↓ on the button open+focus first item, Esc closes + returns focus, Tab
// closes. Not gated on session — the same menu shows to every tier (song-making is open to all).
const guideBtn = ref(null)
const guideMenu = ref(null)
function guideItems() {
  return guideMenu.value ? Array.from(guideMenu.value.querySelectorAll('[role="menuitem"]')) : []
}
function openGuide(focusFirst) {
  shellMenu.value = 'guide'
  if (!focusFirst) return
  nextTick(() => { const it = guideItems(); if (it.length) it[0].focus() })
}
function closeGuide(returnFocus) {
  if (shellMenu.value === 'guide') shellMenu.value = null
  if (returnFocus && guideBtn.value) guideBtn.value.focus()
}
function toggleGuide() {
  if (shellMenu.value === 'guide') closeGuide(false)
  else openGuide(false) // pointer open leaves focus on the button (APG)
}
function onGuideBtnKey(e) {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openGuide(true)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    openGuide(false)
    nextTick(() => { const it = guideItems(); if (it.length) it[it.length - 1].focus() })
  }
}
function onGuideMenuKey(e) {
  const it = guideItems()
  if (!it.length) return
  const i = it.indexOf(document.activeElement)
  if (e.key === 'ArrowDown') { e.preventDefault(); it[(i + 1) % it.length].focus() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); it[(i - 1 + it.length) % it.length].focus() }
  else if (e.key === 'Home') { e.preventDefault(); it[0].focus() }
  else if (e.key === 'End') { e.preventDefault(); it[it.length - 1].focus() }
  else if (e.key === 'Escape') { e.preventDefault(); closeGuide(true) }
  else if (e.key === 'Tab') { closeGuide(false) }
}
// 🔍 — the home list IS the search surface, so search = go home and focus the search box.
async function goSearch() {
  closeMenus()
  if (route.path !== '/') await router.push('/')
  await nextTick()
  const el = document.querySelector('.song-search')
  if (el) el.focus()
  window.scrollTo(0, 0)
}
</script>

<template>
  <header ref="barEl" class="shell-bar no-print" :class="{ 'sb-song': isSong }">
    <div id="shell-left" class="shell-slot"></div>

    <!-- Brand: mobile shows the app icon only (มุมซ้ายบน · ไม่มีชื่อ); desktop shows the name
         only (เพลง.พระคำ.ชีวิต · ไม่มี icon) — phrakham-style. One link; CSS swaps per width. -->
    <router-link to="/" class="sb-brand" :aria-label="t('brand.home')">
      <img class="sb-app-ico" :src="appIcon" alt="" width="40" height="40" />
      <span class="sb-brand-text">{{ t('brand.name') }}</span>
    </router-link>

    <!-- Desktop inline nav (phrakham navbar-nav). Hidden on mobile → moves into the drawer.
         Order (P'Aim 13 ก.ค.): รายการเพลง · คู่มือ · พระคำ.ชีวิต↗ · เกี่ยวกับเรา. -->
    <nav v-if="!isSong" class="sb-nav" aria-label="เมนูหลัก">
      <router-link to="/" :class="{ here: route.path === '/' }">{{ t('nav.songs') }}</router-link>
      <!-- คู่มือ ▾ — APG menu button opening 2 sub-guides (GATE 1). Shown to every tier. -->
      <div class="sb-menu sb-guide">
        <button
          ref="guideBtn"
          class="sb-nav-btn"
          :class="{ here: route.path === '/guide' || route.path === '/notation' }"
          :aria-expanded="shellMenu === 'guide'"
          aria-haspopup="true"
          @click.stop="toggleGuide"
          @keydown="onGuideBtnKey"
        >{{ t('nav.guide') }}<span class="sb-chev" aria-hidden="true">▾</span></button>
        <div
          v-if="shellMenu === 'guide'"
          ref="guideMenu"
          class="sb-dropdown sb-guide-menu"
          role="menu"
          :aria-label="t('nav.guide')"
          @keydown="onGuideMenuKey"
          @click.stop
        >
          <router-link to="/guide" role="menuitem" :class="{ here: route.path === '/guide' }" @click="closeGuide(false)">{{ t('nav.guideUse') }}</router-link>
          <router-link to="/notation" role="menuitem" :class="{ here: route.path === '/notation' }" @click="closeGuide(false)">{{ t('nav.guideMake') }}</router-link>
        </div>
      </div>
      <a href="https://phrakham.life" class="sb-nav-ext">{{ t('nav.phrakham') }}<span class="sb-ext" aria-hidden="true">↗</span></a>
      <router-link to="/about" :class="{ here: route.path === '/about' }">{{ t('nav.about') }}</router-link>
    </nav>

    <div id="shell-title" class="shell-title-wrap">
      <template v-if="title"><span class="sb-sep" aria-hidden="true"></span><span class="shell-title">{{ title }}</span></template>
    </div>
    <div id="shell-menus" class="shell-menus"></div>

    <div class="sb-right">
      <!-- ＋ สร้างเพลงใหม่ — the app's one primary CREATE action (single source of action).
           Desktop = this filled pill; mobile hides it (the FAB + drawer row take over via CSS).
           Bare /studio = a blank editor, no previous song state (AC-G2.2). -->
      <router-link v-if="!isSong" to="/studio" class="sb-create no-print">
        <Icon name="file-plus" :size="20" /><span>{{ t('action.create') }}</span>
      </router-link>

      <!-- ติดตั้งแอพ — desktop top-bar button beside create (P'Aim: "ต้องเห็น ส่งเสริมให้ใช้").
           Outlined amber = secondary to the filled create pill. Shown only when install is
           possible & not already installed (canShowInstall); hidden on the mobile compact layout
           (the home banner takes over there) and on song/studio routes. Tap = replay the prompt,
           or open the iOS Share sheet. -->
      <button
        v-if="canShowInstall && !isSong"
        type="button"
        class="sb-install-btn no-print"
        @click="onInstall"
      >
        <Icon name="download" :size="20" /><span>{{ t('install.button') }}</span>
      </button>

      <!-- 🔍 — go to the song search (home) and focus the search field. Hidden on the home
           route: the search box is already on screen there, so the icon would be a duplicate
           (AC-G4.1). Still shown on every other page as a shortcut back to search. -->
      <button v-if="route.path !== '/' && !isSong" class="sb-icon-btn" :aria-label="t('action.search')" @click="goSearch"><Icon name="search" :size="24" /></button>

      <!-- ⚙ site settings (ตัวอักษรไทย) — desktop only; on mobile it lives in the drawer.
           Esc closes it from anywhere inside (button or the segmented controls) — the .sb-backdrop
           already handles click-outside; this adds the keyboard half (WAI-ARIA APG · BI-016). -->
      <div class="sb-menu sb-settings" @keydown.esc="closeMenus">
        <button
          class="sb-icon-btn"
          :aria-expanded="shellMenu === 'settings'"
          aria-haspopup="true"
          :aria-label="t('action.settings')"
          @click.stop="toggleSettings"
        >
          <Icon name="settings" :size="24" />
        </button>
        <div v-if="shellMenu === 'settings'" class="sb-dropdown sb-mode-menu" role="menu" @click.stop>
          <SettingsControls />
        </div>
      </div>

      <!-- ☰ hamburger — mobile only; the PKDrawer core wires its click + syncs aria-expanded. -->
      <button ref="burgerBtn" class="sb-icon-btn sb-burger" :aria-label="t('action.menu')">
        <Icon name="menu" :size="24" />
      </button>

      <!-- login (เข้าสู่ระบบ) — far right on every width (P'Aim 13 ก.ค.: mobile icon outside
           the drawer, rightmost). On mobile ☰ sits to its left; on desktop ☰ is hidden. -->
      <ProfileTool class="sb-login" />
    </div>

    <!-- Mobile drawer CONTENT — the PKDrawer core (side:left) owns the off-canvas shell, scrim
         and a11y; this panel is its BYO-DOM content. Always rendered (the core toggles its
         visibility off-canvas), NOT v-if'd, so the core keeps a stable node to slide + trap.
         On desktop it stays hidden off-canvas (the ☰ trigger is display:none). -->
    <aside ref="drawerPanel" class="sb-drawer-panel">
      <!-- LOCKED "after" (P'Aim 2026-07-27): ＋สร้างเพลง is NOT in the drawer — a drawer holds
           destinations, not actions (M3). Create lives only on the mobile FAB / desktop top-bar
           pill (one source of action), with "C" as its keyboard peer. The old .sb-drawer-create
           row was removed. -->
      <!-- Nav links = text only (design-system SSOT docs/ds/menu-drawer-spec.md §2: ไม่มีไอคอนหน้า).
           Desktop .sb-nav is already text-only; this mirrors it in the drawer. ↗ on พระคำ.ชีวิต is a
           text external-link marker (same as desktop .sb-ext), not a leading icon. -->
      <nav class="sb-drawer-nav" @click="closeMenus">
        <router-link to="/" :class="{ here: route.path === '/' }">{{ t('nav.songs') }}</router-link>
        <!-- คู่มือ = 2 sub-guides (GATE 1). Flattened as two rows in the drawer (a menu-button
             popover isn't the mobile idiom); same 2 destinations, shown to every tier. -->
        <router-link to="/guide" :class="{ here: route.path === '/guide' }">{{ t('nav.guideUse') }}</router-link>
        <router-link to="/notation" :class="{ here: route.path === '/notation' }">{{ t('nav.guideMake') }}</router-link>
        <a href="https://phrakham.life">{{ t('nav.phrakham') }} <span class="sb-k">↗</span></a>
        <router-link to="/about" :class="{ here: route.path === '/about' }">{{ t('nav.about') }}</router-link>
      </nav>
      <div class="sb-drawer-sep" role="separator"></div>
      <div class="sb-drawer-tools">
        <div class="sb-drawer-lbl">{{ t('action.tools') }}</div>
        <!-- "ติดตั้งแอพ" affordance — self-contained (lib/pwaInstall.js). An action row per
             docs/ds/menu-drawer-spec.md §3. Renders nothing when already installed. -->
        <InstallAppTool />
        <!-- ภาษา + ตัวอักษรไทย — same shared control as the desktop ⚙ (SettingsControls) -->
        <SettingsControls @click.stop />
      </div>
    </aside>

    <!-- Click-away backdrop for every shell popover EXCEPT the mobile drawer: the ⚙ font
         popover ('settings') and Studio's teleported menus ('song' etc.) all rely on it to
         close on an outside click. The 'site' drawer is excluded — PKDrawer supplies its own
         scrim (and would double-dim behind it otherwise). -->
    <div v-if="shellMenu && shellMenu !== 'site'" class="sb-backdrop" aria-hidden="true" @click="closeMenus"></div>

    <!-- Mobile create FAB — home route only (never over the song page's bottom dock). CSS shows
         it only < 992px by WIDTH; on desktop it stays display:none even when rendered. -->
    <router-link v-if="route.path === '/'" to="/studio" class="sb-fab no-print" :aria-label="t('action.create')">
      <Icon name="plus" :size="24" /><span>{{ t('action.createShort') }}</span>
    </router-link>

    <!-- iOS Share → Add-to-Home-Screen instruction sheet — mounted app-wide so any install
         affordance (top-bar button, mobile home banner) can open it on iOS. -->
    <InstallSheet v-if="installSheetOpen" />
  </header>
</template>
