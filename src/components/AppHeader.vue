<script setup>
// Site-wide shell header — the same brand-dropdown + login chrome as the Studio bar,
// so every page reads as one app. Pages pass an optional title and may fill the
// right slot (defaults to download + login tools).
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { session } from '../store.js'
import ProfileTool from './ProfileTool.vue'
import DownloadTool from './DownloadTool.vue'
import Icon from './Icon.vue'

defineProps({ title: { type: String, default: '' } })
const siteOpen = ref(false)
const route = useRoute()
const canEdit = computed(() => !!session.value) // only editors see "ทำเพลง"
</script>

<template>
  <header class="shell-bar no-print">
    <div class="sb-menu">
      <router-link to="/" class="sb-brand" aria-label="หน้าแรก · รายการเพลง">เพลง.พระคำ.ชีวิต</router-link>
      <button
        class="sb-caret"
        :aria-expanded="siteOpen"
        aria-haspopup="true"
        aria-label="เมนู"
        @click.stop="siteOpen = !siteOpen"
      >
        <Icon name="chevron-down" :size="16" />
      </button>
      <div v-if="siteOpen" class="sb-dropdown" role="menu" @click="siteOpen = false">
        <router-link v-if="canEdit" to="/studio" role="menuitem" :class="{ here: route.path === '/studio' }"><Icon name="pencil" /> ทำเพลง</router-link>
        <router-link to="/guide" role="menuitem" :class="{ here: route.path === '/guide' }"><Icon name="book-open" /> คู่มือ</router-link>
        <router-link to="/about" role="menuitem" :class="{ here: route.path === '/about' }"><Icon name="info" /> เกี่ยวกับเรา</router-link>
        <a href="https://phrakham.life" role="menuitem"><Icon name="globe" /> พระคำ.ชีวิต <span class="sb-k">↗</span></a>
      </div>
    </div>
    <span v-if="title" class="sb-sep" aria-hidden="true"></span>
    <span v-if="title" class="shell-title">{{ title }}</span>
    <div class="shell-right">
      <slot name="right"><DownloadTool /><ProfileTool /></slot>
    </div>
    <div v-if="siteOpen" class="sb-backdrop" aria-hidden="true" @click="siteOpen = false"></div>
  </header>
</template>

<style scoped>
.shell-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8f9fa;
  border-bottom: 1px solid var(--line);
  padding: 8px 16px;
}
.sb-menu { position: relative; display: inline-flex; align-items: center; }
.sb-brand {
  color: var(--brand);
  font-size: 1.1rem;
  font-weight: 700;
  text-decoration: none;
  padding: 6px 8px;
  border-radius: 8px;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.sb-caret {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
}
@media (hover: hover) {
  .sb-brand:hover,
  .sb-caret:hover { background: rgba(0, 0, 0, 0.06); }
}
.sb-sep { width: 1px; align-self: stretch; background: var(--line); min-height: 22px; }
.shell-title { font-weight: 700; font-size: 1.05rem; color: var(--ink); }
.shell-right { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
.sb-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 234px;
  max-width: calc(100vw - 20px);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  padding: 6px;
  z-index: 60;
  display: flex;
  flex-direction: column;
}
.sb-dropdown a {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--ink);
  text-decoration: none;
  font-size: 0.98rem;
  min-height: 40px;
}
.sb-dropdown a.here { color: var(--brand); font-weight: 700; }
.sb-dropdown a:hover,
.sb-dropdown a:focus-visible { background: rgba(139, 69, 19, 0.1); outline: none; }
.sb-dropdown .icn { color: var(--brand); }
.sb-k { margin-left: auto; color: var(--muted); font-size: 0.8rem; }
.sb-backdrop { position: fixed; inset: 0; z-index: 40; }
@media (max-width: 760px) {
  .shell-bar { gap: 4px; }
  .sb-brand { font-size: 0.98rem; }
  .sb-sep { display: none; }
  .shell-title { font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
}
</style>
