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
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shellMenu, siteFont, setSiteFont } from '../store.js'
import ProfileTool from './ProfileTool.vue'
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
// the drawer coexists with the desktop ⚙ popover ('settings') and Studio's own menus.
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
  // Another menu (settings popover / Studio menu) taking the shared channel closes the drawer.
  watch(shellMenu, (v) => { if (v !== 'site' && drawer && drawer.isOpen()) drawer.close() })
  // Crossing to desktop while open (rotate/resize): the ☰ is gone, so close the off-canvas.
  if (desktopMq) desktopMq.addEventListener('change', onDesktop)
})

function onDesktop(e) { if (e.matches && drawer && drawer.isOpen()) drawer.close() }

onUnmounted(() => {
  if (desktopMq) desktopMq.removeEventListener('change', onDesktop)
  if (drawer) { drawer.destroy(); drawer = null }   // kill scrim/listeners (leak + HMR)
})

function toggleSettings() {
  shellMenu.value = shellMenu.value === 'settings' ? null : 'settings'
}
function closeMenus() {
  shellMenu.value = null
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
      <router-link to="/guide" :class="{ here: route.path === '/guide' }">คู่มือ</router-link>
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

      <!-- ⚙ site settings (ตัวอักษรไทย) — desktop only; on mobile it lives in the drawer -->
      <div class="sb-menu sb-settings">
        <button
          class="sb-icon-btn"
          :aria-expanded="shellMenu === 'settings'"
          aria-haspopup="true"
          aria-label="ตั้งค่า"
          @click.stop="toggleSettings"
        >
          <Icon name="settings" :size="24" />
        </button>
        <div v-if="shellMenu === 'settings'" class="sb-dropdown sb-mode-menu" role="menu" @click.stop>
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
        <router-link to="/guide" :class="{ here: route.path === '/guide' }">คู่มือ</router-link>
        <a href="https://phrakham.life">พระคำ.ชีวิต <span class="sb-k">↗</span></a>
        <router-link to="/about" :class="{ here: route.path === '/about' }">เกี่ยวกับเรา</router-link>
      </nav>
      <div class="sb-drawer-sep" role="separator"></div>
      <div class="sb-drawer-tools">
        <div class="sb-drawer-lbl">เครื่องมือ</div>
        <div class="sb-font" @click.stop>
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
    </aside>

    <!-- Click-away backdrop for every shell popover EXCEPT the mobile drawer: the ⚙ font
         popover ('settings') and Studio's teleported menus ('song' etc.) all rely on it to
         close on an outside click. The 'site' drawer is excluded — PKDrawer supplies its own
         scrim (and would double-dim behind it otherwise). -->
    <div v-if="shellMenu && shellMenu !== 'site'" class="sb-backdrop" aria-hidden="true" @click="closeMenus"></div>
  </header>
</template>
