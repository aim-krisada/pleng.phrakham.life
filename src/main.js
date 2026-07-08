import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './styles.css'
// B001 — floating scroll ↑/↓ buttons. The SAME vanilla file phrakham.life uses
// (self-mounts to <body>, portable by design). It listens on window scroll/resize.
import './lib/pk-scrollnav.js'

// SPA route changes swap page content without a scroll/resize event, so the shared
// script (which re-checks on those events) wouldn't notice the new page height. Nudge it
// with a resize after each navigation so ↑/↓ reflect the new page.
router.afterEach(() => {
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
})

createApp(App).use(router).mount('#app')
