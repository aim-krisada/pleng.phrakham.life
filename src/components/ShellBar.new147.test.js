// ใบ v3/pleng#147 — สร้างเพลงใหม่ from the top right (desktop) or ☰ เครื่องมือ (phone), one place per screen.
//   AC1 desktop: icon + name, between Aa and เข้าสู่ระบบ, on every page
//   AC2 phone: a row in ☰ เครื่องมือ with the same name and icon
//   AC3 pressing it opens a blank editor (a non-song page → /studio; the song surface → asks Studio)
//   AC4 the song list has no button of its own
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import fs from 'node:fs'
import path from 'node:path'

const nav = vi.hoisted(() => ({ path: '/', push: vi.fn() }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ get path() { return nav.path } }),
  useRouter: () => ({ push: nav.push }),
}))

import './../lib/pk-drawer.js'
import ShellBar from './ShellBar.vue'
import { shellMenu, newSongRequest } from '../store.js'

const stubs = {
  ProfileTool: { template: '<div class="sb-login" />' },
  Icon: { props: ['name'], template: '<i class="icn" :data-icon="name" />' },
  RouterLink: { template: '<a><slot /></a>' },
}
let w = null
beforeEach(() => { shellMenu.value = null; nav.path = '/'; nav.push.mockClear() })
afterEach(() => {
  w?.unmount(); w = null
  document.querySelectorAll('.pk-drawer,.pk-drawer-scrim').forEach((n) => n.remove())
})
const mountBar = () => (w = mount(ShellBar, { attachTo: document.body, global: { stubs } }))
const panel = () => [...document.querySelectorAll('.sb-drawer-panel')].at(-1)

describe('ใบ#147 — สร้างเพลงใหม่ on the bar and in ☰', () => {
  it('AC1 — desktop: icon + name, sitting between Aa and เข้าสู่ระบบ', () => {
    mountBar()
    const kids = [...w.find('.sb-right').element.children]
    const at = (sel) => kids.findIndex((el) => el.matches(sel))
    const btn = w.find('.sb-right .sb-new')
    expect(btn.text()).toBe('สร้างเพลงใหม่')
    expect(btn.find('[data-icon="file-plus"]').exists()).toBe(true)
    expect(at('.sb-new')).toBe(at('.ft-tool') + 1)
    expect(at('.sb-new')).toBeLessThan(at('.sb-login'))
  })

  it('AC2 — phone: a row in ☰ เครื่องมือ with the SAME name and icon', () => {
    mountBar()
    const row = panel().querySelector('.sb-drawer-tools .sb-drawer-new')
    expect(row.textContent.trim()).toBe('สร้างเพลงใหม่')
    expect(row.querySelector('[data-icon="file-plus"]')).not.toBeNull()
  })

  it('Notes 1/2 — never both on one screen: the bar button hides on a phone; ☰ itself is phone-only', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8')
    const phone = css.slice(css.indexOf('@media (max-width: 991.98px)'))
    expect(phone).toMatch(/\.sb-new \{ display: none; \}/)
    expect(css).toMatch(/\.sb-burger \{ display: none; \}/) // desktop: no ☰ at all
  })

  it('AC3 — from a page that is not a song (e.g. รายการเพลง) it opens /studio, a blank editor', async () => {
    nav.path = '/'
    mountBar()
    const before = newSongRequest.value
    await w.find('.sb-new').trigger('click')
    expect(nav.push).toHaveBeenCalledWith('/studio')
    expect(newSongRequest.value).toBe(before)
  })

  it('AC3 — on the song surface it asks Studio instead (Studio checks for unsaved work first)', async () => {
    for (const p of ['/song/abc', '/studio']) {
      nav.path = p
      mountBar()
      const before = newSongRequest.value
      panel().querySelector('.sb-drawer-new').click()
      expect(newSongRequest.value).toBe(before + 1)
      expect(nav.push).not.toHaveBeenCalled()
      w.unmount(); w = null
    }
  })

  it('AC4 — the song list has no สร้างเพลงใหม่ of its own', () => {
    const list = fs.readFileSync(path.resolve(__dirname, '../views/SongList.vue'), 'utf8')
    expect(list).not.toMatch(/สร้างเพลงใหม่/)
  })

  it('Notes 1 — the old places are gone: Studio\'s เพลง ▾ panel and the editor\'s own page button', () => {
    const studio = fs.readFileSync(path.resolve(__dirname, '../views/Studio.vue'), 'utf8')
    const editor = fs.readFileSync(path.resolve(__dirname, 'EditorMode.vue'), 'utf8')
    expect(studio).not.toMatch(/class="sb-song-new"/)
    expect(editor).not.toMatch(/@click="fileNew"/)
  })
})
