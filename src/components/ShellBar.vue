<script setup>
// THE one app-wide header (rendered by App.vue on every route). Brand + site menu +
// login live here; a page (e.g. Studio) teleports its own contextual controls into
// #shell-left / #shell-title / #shell-menus so there is a single shared bar, not
// one-per-page. openMenu is shared (v-model) so only one menu is open at a time.
import { useRoute } from 'vue-router'
import { shellMenu } from '../store.js'
import ProfileTool from './ProfileTool.vue'
import Icon from './Icon.vue'

defineProps({ title: { type: String, default: '' } })
const route = useRoute()
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
      <router-link to="/" class="sb-brand" aria-label="หน้าแรก · รายการเพลง">เพลง.พระคำ.ชีวิต</router-link>
      <button class="sb-caret" :aria-expanded="shellMenu === 'site'" aria-haspopup="true" aria-label="เมนู" @click.stop="toggleSite">
        <Icon name="chevron-down" :size="16" />
      </button>
      <div v-if="shellMenu === 'site'" class="sb-dropdown" role="menu" @click="closeMenus">
        <!-- B007: the site menu = pages only. "ทำเพลง" is gone — song creation lives on
             the "เพลง ▾" panel + the แก้ไข mode, not as a site page. -->
        <router-link to="/" role="menuitem" :class="{ here: route.path === '/' }"><Icon name="list-music" /> รายการเพลง</router-link>
        <router-link to="/guide" role="menuitem" :class="{ here: route.path === '/guide' }"><Icon name="book-open" /> คู่มือ</router-link>
        <router-link to="/about" role="menuitem" :class="{ here: route.path === '/about' }"><Icon name="info" /> เกี่ยวกับเรา</router-link>
        <a href="https://phrakham.life" role="menuitem"><Icon name="globe" /> พระคำ.ชีวิต <span class="sb-k">↗</span></a>
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
