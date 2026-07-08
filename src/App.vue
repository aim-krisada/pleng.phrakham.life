<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initAuth, recovering, emailChanged } from './store.js'
import SiteFooter from './components/SiteFooter.vue'
import ShellBar from './components/ShellBar.vue'
import ScrollButtons from './components/ScrollButtons.vue'

initAuth()
const route = useRoute()
const router = useRouter()
// The song surface (Studio) renders its own richer shell header (catalog · file/
// manage menus · mode toggle), so the site-wide AppHeader steps back there. A song
// opens in that surface too (/song/:id), gated to view-only for non-editors.
const isStudio = computed(() => route.path === '/studio' || route.path.startsWith('/song/'))
// Home is the song list itself (like the Docs home) — no redundant title; the brand
// links there. Other static pages still name themselves.
const pageTitle = computed(() => ({ '/guide': 'คู่มือ', '/about': 'เกี่ยวกับเรา' })[route.path] || '')
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
  <ShellBar :title="pageTitle" />
  <main class="container" :class="{ 'studio-wide': isStudio }">
    <router-view />
  </main>
  <ScrollButtons />
  <SiteFooter />
</template>
