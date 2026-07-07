<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initAuth, recovering, emailChanged } from './store.js'
import SiteFooter from './components/SiteFooter.vue'
import AppHeader from './components/AppHeader.vue'

initAuth()
const route = useRoute()
const router = useRouter()
// Studio renders its own richer shell header (catalog · file/manage menus · mode
// toggle), so the site-wide AppHeader steps back on that route.
const isStudio = computed(() => route.path === '/studio')
const pageTitle = computed(
  () => ({ '/': 'รายการเพลง', '/guide': 'คู่มือ', '/about': 'เกี่ยวกับเรา' })[route.path] || '',
)
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
  <AppHeader v-if="!isStudio" :title="pageTitle" />
  <main class="container" :class="{ 'studio-wide': isStudio }">
    <router-view />
  </main>
  <SiteFooter />
</template>
