<script setup>
// THE one app-wide header (rendered by App.vue on every route). Brand + site menu +
// login live here; a page (e.g. Studio) teleports its own contextual controls into
// #shell-left / #shell-title / #shell-menus so there is a single shared bar, not
// one-per-page. openMenu is shared (v-model) so only one menu is open at a time.
import { useRoute } from 'vue-router'
import { shellMenu } from '../store.js'
import ProfileTool from './ProfileTool.vue'
import DownloadTool from './DownloadTool.vue'
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
        <router-link to="/studio" role="menuitem" :class="{ here: route.path === '/studio' }"><Icon name="pencil" /> ทำเพลง</router-link>
        <router-link to="/guide" role="menuitem" :class="{ here: route.path === '/guide' }"><Icon name="book-open" /> คู่มือ</router-link>
        <router-link to="/about" role="menuitem" :class="{ here: route.path === '/about' }"><Icon name="info" /> เกี่ยวกับเรา</router-link>
        <a href="https://phrakham.life" role="menuitem"><Icon name="globe" /> พระคำ.ชีวิต <span class="sb-k">↗</span></a>
      </div>
    </div>
    <div id="shell-title" class="shell-title-wrap">
      <template v-if="title"><span class="sb-sep" aria-hidden="true"></span><span class="shell-title">{{ title }}</span></template>
    </div>
    <div id="shell-menus" class="shell-menus"></div>
    <div class="sb-right"><slot name="right"><DownloadTool /><ProfileTool /></slot></div>
    <div v-if="shellMenu" class="sb-backdrop" aria-hidden="true" @click="closeMenus"></div>
  </header>
</template>
