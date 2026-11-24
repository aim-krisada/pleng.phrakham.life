import { createRouter, createWebHashHistory } from 'vue-router'
import SongList from './views/SongList.vue'
import Studio from './views/Studio.vue'
import Guide from './views/Guide.vue'
import NotationStandard from './views/NotationStandard.vue'
import About from './views/About.vue'
import Stats from './views/Stats.vue'
import Changes from './views/Changes.vue'
import BookNumbers from './views/BookNumbers.vue'
import { SITE_NAME } from './lib/songName.js'

// Hash history: works on GitHub Pages with zero server config (no 404 fallback needed)
// A song opens in Studio — the single song surface (view or edit, gated by login).
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: SongList },
    { path: '/song/:id', component: Studio },
    { path: '/studio', component: Studio },
    { path: '/guide', component: Guide, meta: { title: 'คู่มือใช้งานโปรแกรม' } },
    { path: '/notation', component: NotationStandard, meta: { title: 'คู่มือทำเพลง' } },
    { path: '/about', component: About, meta: { title: 'เกี่ยวกับเรา' } },
    { path: '/stats', component: Stats, meta: { title: 'สถิติ' } }, // ใบ v3/pleng#163 — team only, the page itself checks the login
    { path: '/changes', component: Changes, meta: { title: 'ประวัติการแก้เพลง' } }, // ใบ v3/pleng#179 — team only, same
    { path: '/numbers/:book', component: BookNumbers, meta: { title: 'ใส่เลขเพลง' } }, // ใบ v3/pleng#182 — approvers only, the page itself checks
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, top: 70 }
    return { top: 0 }
  },
})

// Name the tab after the page, so a printed PDF is called e.g. "เพลง.พระคำ.ชีวิต - สถิติ"
// (the print dialog suggests document.title). A song page names itself after the song
// (Studio.vue), so its routes are left alone here. P'Aim 18 พ.ย. 2569 (ใบ v3/pleng#163).
const SITE_TITLE = document.title
export function pageTitle(route) {
  return route.meta?.title ? `${SITE_NAME} - ${route.meta.title}` : SITE_TITLE
}
router.afterEach((to) => {
  if (to.path === '/studio' || to.path.startsWith('/song/')) return
  document.title = pageTitle(to)
})

export default router
