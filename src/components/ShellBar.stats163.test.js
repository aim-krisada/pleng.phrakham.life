// ใบ v3/pleng#163 (พี่เอม 17 พ.ย. 2569) — สถิติ moves out of แก้ไข ⇒ จัดการ into the shared bar:
//   1 logged in: desktop button right after สร้างเพลงใหม่, phone row right under it in ☰
//   2 visitors (not logged in) see neither
//   3 pressing it opens /stats straight away
//   4 จัดการ no longer carries its own สถิติ link (one place only)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import fs from 'node:fs'
import path from 'node:path'

const nav = vi.hoisted(() => ({ path: '/', push: vi.fn() }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ get path() { return nav.path } }),
  useRouter: () => ({ push: nav.push }),
}))

import './../lib/pk-drawer.js'
import ShellBar from './ShellBar.vue'
import { shellMenu, session } from '../store.js'

const stubs = {
  ProfileTool: { template: '<div class="sb-login" />' },
  Icon: { props: ['name'], template: '<i class="icn" :data-icon="name" />' },
  RouterLink: { template: '<a><slot /></a>' },
}
let w = null
beforeEach(() => { shellMenu.value = null; nav.path = '/'; nav.push.mockClear(); session.value = null })
afterEach(() => {
  w?.unmount(); w = null; session.value = null
  document.querySelectorAll('.pk-drawer,.pk-drawer-scrim').forEach((n) => n.remove())
})
const mountBar = () => (w = mount(ShellBar, { attachTo: document.body, global: { stubs } }))
const panel = () => [...document.querySelectorAll('.sb-drawer-panel')].at(-1)

describe('ใบ#163 — สถิติ in the main menu, logged in only', () => {
  it('1 — logged in: desktop button right after สร้างเพลงใหม่, before เข้าสู่ระบบ', () => {
    session.value = { user: { id: 'u1' } }
    mountBar()
    const kids = [...w.find('.sb-right').element.children]
    const at = (sel) => kids.findIndex((el) => el.matches(sel))
    const btn = w.find('.sb-right .sb-stats')
    expect(btn.text()).toBe('สถิติ')
    expect(btn.find('[data-icon="bar-chart-3"]').exists()).toBe(true)
    expect(at('.sb-stats')).toBe(at('.sb-new') + 1)
    expect(at('.sb-stats')).toBeLessThan(at('.sb-login'))
  })

  it('1 — logged in: phone row right under สร้างเพลงใหม่ in ☰ เครื่องมือ', () => {
    session.value = { user: { id: 'u1' } }
    mountBar()
    const row = panel().querySelector('.sb-drawer-tools .sb-drawer-stats')
    expect(row.textContent.trim()).toBe('สถิติ')
    expect(row.previousElementSibling.classList.contains('sb-drawer-new')).toBe(true)
  })

  it('2 — visitors see no สถิติ anywhere, and it appears once they log in', async () => {
    mountBar()
    expect(w.find('.sb-stats').exists()).toBe(false)
    expect(panel().querySelector('.sb-drawer-stats')).toBeNull()
    session.value = { user: { id: 'u1' } }
    await nextTick()
    expect(w.find('.sb-stats').exists()).toBe(true)
  })

  it('3 — pressing it (bar or ☰) opens /stats', async () => {
    session.value = { user: { id: 'u1' } }
    nav.path = '/song/abc'
    mountBar()
    await w.find('.sb-stats').trigger('click')
    expect(nav.push).toHaveBeenCalledWith('/stats')
    nav.push.mockClear()
    panel().querySelector('.sb-drawer-stats').click()
    expect(nav.push).toHaveBeenCalledWith('/stats')
  })

  it('one place per screen: the bar button hides on a phone, and จัดการ has no สถิติ link', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8')
    const phone = css.slice(css.indexOf('@media (max-width: 991.98px)'))
    expect(phone).toMatch(/\.sb-stats \{ display: none; \}/)
    // a narrow computer screen keeps only the icons, so the bar does not run past the right edge
    const narrow = css.slice(css.indexOf('@media (min-width: 992px) and (max-width: 1199.98px)'))
    expect(narrow).toMatch(/\.sb-new span, \.sb-stats span \{ display: none; \}/)
    expect(w).toBeNull()
    session.value = { user: { id: 'u1' } }
    mountBar()
    expect(w.find('.sb-stats').attributes('aria-label')).toBe('สถิติ')
    expect(w.find('.sb-new').attributes('aria-label')).toBe('สร้างเพลงใหม่')
    const ed = fs.readFileSync(path.resolve(__dirname, 'EditorMode.vue'), 'utf8')
    expect(ed).not.toMatch(/href="#\/stats"/)
  })
})
