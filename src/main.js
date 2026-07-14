import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './styles.css'
// B001 — floating scroll ↑/↓ buttons. The SAME vanilla file phrakham.life uses
// (self-mounts to <body>, portable by design). It listens on window scroll/resize.
import './lib/pk-scrollnav.js'
// The ONE shared off-canvas drawer core (also vanilla, verbatim from phrakham.life —
// edit-once, no second copy). Registers window.PKDrawer; ShellBar consumes it for the
// mobile ☰ menu so pleng's drawer = phrakham's drawer (left slide + scrim + a11y).
import './lib/pk-drawer.js'

// SPA route changes swap page content without a scroll/resize event, so the shared
// script (which re-checks on those events) wouldn't notice the new page height. Nudge it
// with a resize after each navigation so ↑/↓ reflect the new page.
router.afterEach(() => {
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
})

createApp(App).use(router).mount('#app')

// B107 step 9 — PWA service worker: precache the self-hosted instrument samples + app shell so the
// site loads and plays offline (a church with no signal). Registered in PRODUCTION only — a SW
// intercepting the Vite dev server's on-the-fly modules fights HMR, so offline is tested against a
// real build (`vite build` + `vite preview`). base is './', deployed at the domain root → /sw.js.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* SW optional — app still works online */ })
  })
}
