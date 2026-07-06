<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initAuth, recovering } from './store.js'
import SiteFooter from './components/SiteFooter.vue'
import DownloadTool from './components/DownloadTool.vue'
import ProfileTool from './components/ProfileTool.vue'

initAuth()
const menuOpen = ref(false)
const route = useRoute()
const router = useRouter()
watch(() => route.path, () => (menuOpen.value = false)) // close menu after navigating
// A reset link lands as #access_token=…; hash-router sees a bogus route and blanks
// the page. Once supabase parses it (PASSWORD_RECOVERY), send the app back home so
// the reset form in the header shows over the normal catalog.
watch(recovering, (on) => { if (on) router.replace('/') })
</script>

<template>
  <header class="topbar no-print">
    <router-link to="/" class="brand">เพลง.พระคำ.ชีวิต</router-link>
    <DownloadTool />
    <ProfileTool />
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
    <nav class="site-nav" :class="{ open: menuOpen }" aria-label="เมนูหลัก">
      <router-link to="/">รายการเพลง</router-link>
      <router-link to="/studio">ห้องทำเพลง</router-link>
      <router-link to="/guide">คู่มือ</router-link>
      <router-link to="/about">เกี่ยวกับเรา</router-link>
      <a href="https://phrakham.life">พระคำ.ชีวิต</a>
    </nav>
  </header>
  <main class="container">
    <router-view />
  </main>
  <SiteFooter />
</template>
