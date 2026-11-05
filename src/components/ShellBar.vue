<script setup>
// THE one app-wide header (rendered by App.vue on every route). Brand + site menu +
// login live here; a page (e.g. Studio) teleports its own contextual controls into
// #shell-left / #shell-title / #shell-menus so there is a single shared bar, not
// one-per-page. `shellMenu` is shared (store) so only one menu/drawer is open at a time.
//
// phrakham parity (P'Aim 13 ก.ค.):
//   Desktop = brand NAME only (no icon) + inline nav (รายการเพลง · คู่มือ · เกี่ยวกับเรา ·
//             พระคำ↗) + tools on the right (🔍 · Aa · สร้างเพลงใหม่ · เข้าสู่ระบบ).
//   Mobile  = app ICON only (มุมซ้าย · no name) + 🔍 + Aa + ☰ on the right; ☰ opens a drawer
//             holding the nav links + a "เครื่องมือ" section (สร้างเพลงใหม่ · ติดตั้งแอพ).
//   สร้างเพลงใหม่ (ใบ v3/pleng#147) = ONE place per screen: top right on desktop, ☰ on a phone (never
//   both, never ☰ on desktop — NN/g utility navigation / hamburger menus).
//   Aa (FontTool · ใบ v3/pleng#142) is the ONE place for text size + ตัวอักษรไทย มีหัว/ไม่มีหัว, on
//   every page and width — it replaced the desktop ⚙ popover and the drawer's ตัวอักษรไทย row.
//
// The mobile drawer is NOT hand-rolled here: it is the ONE shared vanilla core
// window.PKDrawer (src/lib/pk-drawer.js, verbatim from phrakham.life) — so pleng's ☰
// menu = phrakham's (left slide + scrim + focus-trap + Esc/scrim-close + scroll-lock,
// all a11y baked once). This component only owns the CONTENT of the panel (Vue nav +
// เครื่องมือ); the core owns the off-canvas SHELL. The core re-queries focusables on
// every open, so the Vue-rendered links are trapped correctly.
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shellMenu, newSongRequest, currentSong } from '../store.js'
import { shareTarget, isApple, shareLink } from '../lib/share.js'
import FontTool from './FontTool.vue'
import ProfileTool from './ProfileTool.vue'
import InstallAppTool from './InstallAppTool.vue'
import Icon from './Icon.vue'

defineProps({ title: { type: String, default: '' } })
const route = useRoute()
const router = useRouter()
// App icon shown as the whole brand on mobile (phrakham-style top-left app mark). P'Aim's
// 192px glowing-book icon; BASE_URL keeps it resolving on both hosts.
const appIcon = import.meta.env.BASE_URL + 'android-chrome-192x192.png'

// ---- Mobile drawer wiring (shared PKDrawer core) ----
// The ☰ button and the always-rendered panel are handed to PKDrawer.create() on mount;
// the core wires the trigger click, scrim, Esc and × itself. We only bridge its open
// state onto the shared one-open-at-a-time `shellMenu` channel (key 'site') so opening
// the drawer coexists with the Aa popover ('aa') and Studio's own menus.
const burgerBtn = ref(null)
const drawerPanel = ref(null)
let drawer = null
const desktopMq = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(min-width: 992px)') : null

onMounted(() => {
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
  // Another menu (Aa popover / Studio menu) taking the shared channel closes the drawer.
  watch(shellMenu, (v) => { if (v !== 'site' && drawer && drawer.isOpen()) drawer.close() })
  // Crossing to desktop while open (rotate/resize): the ☰ is gone, so close the off-canvas.
  if (desktopMq) desktopMq.addEventListener('change', onDesktop)
})

function onDesktop(e) { if (e.matches && drawer && drawer.isOpen()) drawer.close() }

onUnmounted(() => {
  if (desktopMq) desktopMq.removeEventListener('change', onDesktop)
  if (drawer) { drawer.destroy(); drawer = null }   // kill scrim/listeners (leak + HMR)
})

// ใบ v3/pleng#147 — สร้างเพลงใหม่. On the song surface the bar asks Studio to start one (it owns the
// editor, so it can ask about unsaved work first); from any other page it opens a blank editor.
const STUDIO_PATH = (p) => p === '/studio' || p.startsWith('/song/')
function newSong() {
  closeMenus()
  if (drawer && drawer.isOpen()) drawer.close()
  if (STUDIO_PATH(route.path)) newSongRequest.value++
  else router.push('/studio')
}

function closeMenus() {
  shellMenu.value = null
}

// ---- "คู่มือ ▾" desktop dropdown (WAI-ARIA APG menu button · GATE 1) ----
// A disclosure button that opens a role=menu of 2 links (ใช้งานโปรแกรม /guide · ทำเพลง /notation).
// Shares the one-open-at-a-time `shellMenu` channel (key 'guide') so it coexists with Aa + the
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

// ใบ v3/pleng#151 — แชร์, beside 🔍 on every page (rules + standards in lib/share.js). The glyph
// follows the device; the word แชร์ is always shown. No share sheet → the link is copied and the
// bar says so for 2 s; copying blocked too → a small box shows the link to copy by hand.
const shareIcon = typeof navigator !== 'undefined' && isApple(navigator) ? 'share' : 'share-2'
const siteRoot = () => window.location.origin + import.meta.env.BASE_URL
const share = computed(() => shareTarget(route.path, currentSong.value, siteRoot()))
const shareNote = ref('')        // '' · 'copied' · 'manual'
const shareUrl = ref('')
let shareTimer = null
async function doShare() {
  closeMenus()
  const t = share.value
  if (!t) return
  const r = await shareLink(t, navigator)
  clearTimeout(shareTimer)
  shareUrl.value = t.url
  shareNote.value = r === 'copied' || r === 'manual' ? r : ''
  if (r === 'copied') shareTimer = setTimeout(() => { shareNote.value = '' }, 2000)
}
function selectAll(e) { e.target.select() }
watch(() => route.fullPath, () => { shareNote.value = '' })
onUnmounted(() => clearTimeout(shareTimer))
</script>

<template>
  <header class="shell-bar no-print">
    <div id="shell-left" class="shell-slot"></div>

    <!-- Brand: mobile shows the app icon only (มุมซ้ายบน · ไม่มีชื่อ); desktop shows the name
         only (เพลง.พระคำ.ชีวิต · ไม่มี icon) — phrakham-style. One link; CSS swaps per width. -->
    <router-link to="/" class="sb-brand" aria-label="หน้าแรก · เพลง.พระคำ.ชีวิต">
      <img class="sb-app-ico" :src="appIcon" alt="" width="40" height="40" />
      <span class="sb-brand-text">เพลง.พระคำ.ชีวิต</span>
    </router-link>

    <!-- Desktop inline nav (phrakham navbar-nav). Hidden on mobile → moves into the drawer.
         Order (P'Aim 13 ก.ค.): รายการเพลง · คู่มือ · พระคำ.ชีวิต↗ · เกี่ยวกับเรา. -->
    <nav class="sb-nav" aria-label="เมนูหลัก">
      <router-link to="/" :class="{ here: route.path === '/' }">รายการเพลง</router-link>
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
        >คู่มือ<span class="sb-chev" aria-hidden="true">▾</span></button>
        <div
          v-if="shellMenu === 'guide'"
          ref="guideMenu"
          class="sb-dropdown sb-guide-menu"
          role="menu"
          aria-label="คู่มือ"
          @keydown="onGuideMenuKey"
          @click.stop
        >
          <router-link to="/guide" role="menuitem" :class="{ here: route.path === '/guide' }" @click="closeGuide(false)">คู่มือใช้งานโปรแกรม</router-link>
          <router-link to="/notation" role="menuitem" :class="{ here: route.path === '/notation' }" @click="closeGuide(false)">คู่มือทำเพลง</router-link>
        </div>
      </div>
      <a href="https://phrakham.life" class="sb-nav-ext">พระคำ.ชีวิต<span class="sb-ext" aria-hidden="true">↗</span></a>
      <router-link to="/about" :class="{ here: route.path === '/about' }">เกี่ยวกับเรา</router-link>
    </nav>

    <div id="shell-title" class="shell-title-wrap">
      <template v-if="title"><span class="sb-sep" aria-hidden="true"></span><span class="shell-title">{{ title }}</span></template>
    </div>
    <div id="shell-menus" class="shell-menus"></div>

    <div class="sb-right">
      <!-- 🔍 — go to the song search (home) and focus the search field -->
      <button class="sb-icon-btn" aria-label="ค้นหาเพลง" @click="goSearch"><Icon name="search" :size="24" /></button>

      <!-- แชร์ (ใบ v3/pleng#151) — glyph + word, hidden on an unsaved new song / draft -->
      <div v-if="share" class="sb-share-wrap">
        <button type="button" class="sb-share" aria-label="แชร์" @click="doShare"><Icon :name="shareIcon" :size="20" /><span class="sb-share-label">แชร์</span></button>
        <div v-if="shareNote === 'copied'" class="sb-share-note" role="status">คัดลอกลิงก์แล้ว</div>
        <div v-else-if="shareNote === 'manual'" class="sb-share-note sb-share-manual" role="status">
          <label>คัดลอกลิงก์นี้<input :value="shareUrl" readonly @focus="selectAll" /></label>
          <button type="button" class="sb-share-x" aria-label="ปิด" @click="shareNote = ''"><Icon name="x" :size="18" /></button>
        </div>
      </div>

      <!-- Aa — text size + ตัวอักษรไทย, every page and width (ใบ v3/pleng#142) -->
      <FontTool />

      <!-- สร้างเพลงใหม่ — desktop only, icon + name, between Aa and login (ใบ v3/pleng#147). On a phone
           the same action is a row in ☰ เครื่องมือ (CSS hides this one under 992px). -->
      <button type="button" class="sb-new" @click="newSong"><Icon name="file-plus" :size="20" /><span>สร้างเพลงใหม่</span></button>

      <!-- ☰ hamburger — mobile only; the PKDrawer core wires its click + syncs aria-expanded. -->
      <button ref="burgerBtn" class="sb-icon-btn sb-burger" aria-label="เมนู">
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
      <!-- Nav links = text only (design-system SSOT docs/ds/menu-drawer-spec.md §2: ไม่มีไอคอนหน้า).
           Desktop .sb-nav is already text-only; this mirrors it in the drawer. ↗ on พระคำ.ชีวิต is a
           text external-link marker (same as desktop .sb-ext), not a leading icon. -->
      <nav class="sb-drawer-nav" @click="closeMenus">
        <router-link to="/" :class="{ here: route.path === '/' }">รายการเพลง</router-link>
        <!-- คู่มือ = 2 sub-guides (GATE 1). Flattened as two rows in the drawer (a menu-button
             popover isn't the mobile idiom); same 2 destinations, shown to every tier. -->
        <router-link to="/guide" :class="{ here: route.path === '/guide' }">คู่มือใช้งานโปรแกรม</router-link>
        <router-link to="/notation" :class="{ here: route.path === '/notation' }">คู่มือทำเพลง</router-link>
        <a href="https://phrakham.life">พระคำ.ชีวิต <span class="sb-k">↗</span></a>
        <router-link to="/about" :class="{ here: route.path === '/about' }">เกี่ยวกับเรา</router-link>
      </nav>
      <div class="sb-drawer-sep" role="separator"></div>
      <div class="sb-drawer-tools">
        <div class="sb-drawer-lbl">เครื่องมือ</div>
        <!-- สร้างเพลงใหม่ — same name and icon as the desktop top-right button (ใบ v3/pleng#147) -->
        <button type="button" class="sb-drawer-act sb-drawer-new" @click="newSong"><Icon name="file-plus" :size="20" /><span>สร้างเพลงใหม่</span></button>
        <!-- "ติดตั้งแอพ" affordance — self-contained (lib/pwaInstall.js). An action row per
             docs/ds/menu-drawer-spec.md §3. Renders nothing when already installed. -->
        <InstallAppTool />
      </div>
    </aside>

    <!-- Click-away backdrop for every shell popover EXCEPT the mobile drawer: the Aa
         popover ('aa') and Studio's teleported menus ('song' etc.) all rely on it to
         close on an outside click. The 'site' drawer is excluded — PKDrawer supplies its own
         scrim (and would double-dim behind it otherwise). -->
    <div v-if="shellMenu && shellMenu !== 'site'" class="sb-backdrop" aria-hidden="true" @click="closeMenus"></div>
  </header>
</template>
