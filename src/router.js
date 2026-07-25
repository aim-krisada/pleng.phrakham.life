import { createRouter, createWebHashHistory } from 'vue-router'
import SongList from './views/SongList.vue'
import Studio from './views/Studio.vue'
import Guide from './views/Guide.vue'
import NotationStandard from './views/NotationStandard.vue'
import About from './views/About.vue'
import SharedList from './views/SharedList.vue'

// Hash history: works on GitHub Pages with zero server config (no 404 fallback needed)
// A song opens in Studio — the single song surface (view or edit, gated by login).
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: SongList },
    { path: '/song/:id', component: Studio },
    { path: '/studio', component: Studio },
    { path: '/guide', component: Guide },
    { path: '/notation', component: NotationStandard },
    { path: '/about', component: About },
    // a playlist shared by link/QR — read-only until saved to this device (lib/playlists.js)
    { path: '/list', component: SharedList },
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, top: 70 }
    return { top: 0 }
  },
})
