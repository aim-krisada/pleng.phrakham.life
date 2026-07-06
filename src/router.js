import { createRouter, createWebHashHistory } from 'vue-router'
import SongList from './views/SongList.vue'
import SongView from './views/SongView.vue'
import Studio from './views/Studio.vue'
import Guide from './views/Guide.vue'
import About from './views/About.vue'

// Hash history: works on GitHub Pages with zero server config (no 404 fallback needed)
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: SongList },
    { path: '/song/:id', component: SongView },
    { path: '/studio', component: Studio },
    { path: '/guide', component: Guide },
    { path: '/about', component: About },
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, top: 70 }
    return { top: 0 }
  },
})
