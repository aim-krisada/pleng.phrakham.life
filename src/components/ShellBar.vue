<script setup>
// THE one app-wide header (rendered by App.vue on every route). Brand + site menu +
// login live here; a page (e.g. Studio) teleports its own contextual controls into
// #shell-left / #shell-title / #shell-menus so there is a single shared bar, not
// one-per-page. openMenu is shared (v-model) so only one menu is open at a time.
import { useRoute } from 'vue-router'
import { shellMenu, siteFont, setSiteFont } from '../store.js'
import ProfileTool from './ProfileTool.vue'
import Icon from './Icon.vue'

defineProps({ title: { type: String, default: '' } })
const route = useRoute()
// The phrakham.life link shows that site's own logo (public/phrakham.ico — the phrakham.life2
// favicon, kept as a distinct file now that pleng's own favicon.ico is P'Aim's glowing-book
// mark). BASE_URL keeps it resolving on both the custom domain (/) and the GitHub Pages project
// path (/repo/).
const brandIcon = import.meta.env.BASE_URL + 'phrakham.ico'
// App icon shown at the far left of the bar, before the brand name (phrakham-style top-left
// app mark). Uses P'Aim's 192px glowing-book icon; BASE_URL keeps it resolving on both the
// custom domain and the GitHub Pages project path.
const appIcon = import.meta.env.BASE_URL + 'android-chrome-192x192.png'
function toggleSite() {
  shellMenu.value = shellMenu.value === 'site' ? null : 'site'
}
function closeMenus() {
  shellMenu.value = null
}
</script>

<template>
  <header class="shell-bar no-print">
    <div id="shell-left" class="shell-slot"></div>
    <div class="sb-menu">
      <router-link to="/" class="sb-brand" aria-label="หน้าแรก · รายการเพลง"><img class="sb-app-ico" :src="appIcon" alt="" width="26" height="26" />เพลง.พระคำ.ชีวิต</router-link>
      <button class="sb-caret" :aria-expanded="shellMenu === 'site'" aria-haspopup="true" aria-label="เมนู" @click.stop="toggleSite">
        <Icon name="chevron-down" :size="16" />
      </button>
      <div v-if="shellMenu === 'site'" class="sb-dropdown" role="menu" @click="closeMenus">
        <!-- B007: the site menu = pages only. "ทำเพลง" is gone — song creation lives on
             the "เพลง ▾" panel + the แก้ไข mode, not as a site page. -->
        <router-link to="/" role="menuitem" :class="{ here: route.path === '/' }"><Icon name="list-music" /> รายการเพลง</router-link>
        <router-link to="/guide" role="menuitem" :class="{ here: route.path === '/guide' }"><Icon name="book-open" /> คู่มือ</router-link>
        <router-link to="/about" role="menuitem" :class="{ here: route.path === '/about' }"><Icon name="info" /> เกี่ยวกับเรา</router-link>
        <a href="https://phrakham.life" role="menuitem"><img class="sb-brand-ico" :src="brandIcon" alt="" width="18" height="18" /> พระคำ.ชีวิต <span class="sb-k">↗</span></a>
        <!-- Per-user Thai typeface (มีหัว / ไม่มีหัว). @click.stop keeps the menu open while
             comparing; each choice is this browser's own (store.siteFont · localStorage). -->
        <div class="sep" role="separator"></div>
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
    </div>
    <div id="shell-title" class="shell-title-wrap">
      <template v-if="title"><span class="sb-sep" aria-hidden="true"></span><span class="shell-title">{{ title }}</span></template>
    </div>
    <div id="shell-menus" class="shell-menus"></div>
    <!-- B045: download + font (Aa) moved OFF the top bar into the studio dock (they only
         ever showed while a song was open = a dock mode). Row 1 now = brand · title · 👤,
         so a long song title reads in full on a phone. Only login stays here. -->
    <div class="sb-right"><slot name="right"><ProfileTool /></slot></div>
    <div v-if="shellMenu" class="sb-backdrop" aria-hidden="true" @click="closeMenus"></div>
  </header>
</template>
