<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initAuth, recovering, emailChanged } from './store.js'
import SiteFooter from './components/SiteFooter.vue'
import DownloadTool from './components/DownloadTool.vue'
import ProfileTool from './components/ProfileTool.vue'

initAuth()
const menuOpen = ref(false)
const route = useRoute()
const router = useRouter()
watch(() => route.path, () => (menuOpen.value = false)) // close menu after navigating
// Supabase email links land as #access_token=…; the hash-router sees a bogus route
// and blanks the page. For any of them, send the app back home — the header panel
// (set-password, or the email-changed note) then shows over the normal catalog.
watch(
  [recovering, emailChanged],
  ([r, e]) => { if (r || e) router.replace('/') },
  { immediate: true },
)
</script>

<template>
  <header class="topbar no-print">
    <router-link to="/" class="brand">เพลง.พระคำ.ชีวิต</router-link>
    <nav class="site-nav" :class="{ open: menuOpen }" aria-label="เมนูหลัก">
      <router-link to="/">รายการเพลง</router-link>
      <router-link to="/studio">ห้องทำเพลง</router-link>
      <router-link to="/guide">คู่มือ</router-link>
      <router-link to="/about">เกี่ยวกับเรา</router-link>
      <a href="https://phrakham.life">พระคำ.ชีวิต</a>
    </nav>
    <div class="topbar-tools">
      <DownloadTool />
      <ProfileTool />
    </div>
    <button
      class="nav-toggle"
      :aria-expanded="menuOpen"
      aria-label="เปิด/ปิดเมนู"
      @click="menuOpen = !menuOpen"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  </header>
  <main class="container">
    <router-view />
  </main>
  <SiteFooter />
</template>
