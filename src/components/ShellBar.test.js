// ShellBar — the one app-wide header. phrakham parity (P'Aim 13 ก.ค.): desktop = inline nav
// (รายการเพลง · คู่มือ · พระคำ↗ · เกี่ยวกับเรา); mobile = ☰ opens a drawer with the same links
// + a "เครื่องมือ" section. Song creation lives on Studio's "เพลง ▾" panel, never the site menu.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/' }),
  useRouter: () => ({ push: vi.fn() }),
}))

import ShellBar from './ShellBar.vue'
import { shellMenu } from '../store.js'

const stubs = {
  ProfileTool: true,
  DownloadTool: true,
  FontTool: true,
  Icon: true,
  RouterLink: { template: '<a><slot /></a>' },
}

beforeEach(() => { shellMenu.value = null })

describe('ShellBar — site nav (phrakham parity)', () => {
  it('the desktop inline nav lists pages, with รายการเพลง and NOT ทำเพลง', () => {
    const w = mount(ShellBar, { global: { stubs } })
    const text = w.find('.sb-nav').text()
    expect(text).toContain('รายการเพลง')
    expect(text).toContain('คู่มือ')
    expect(text).toContain('เกี่ยวกับเรา')
    expect(text).toContain('พระคำ.ชีวิต')
    expect(text).not.toContain('ทำเพลง')
  })

  it('the ☰ hamburger opens the mobile drawer with the same links + a เครื่องมือ section', async () => {
    const w = mount(ShellBar, { global: { stubs } })
    expect(w.find('.sb-drawer').exists()).toBe(false)
    await w.find('.sb-burger').trigger('click')
    await nextTick()
    const drawer = w.find('.sb-drawer')
    expect(drawer.exists()).toBe(true)
    expect(drawer.find('.sb-drawer-nav').text()).toContain('รายการเพลง')
    expect(drawer.text()).toContain('เครื่องมือ')
    expect(drawer.text()).toContain('ตัวอักษรไทย')
  })

  it('exposes the teleport targets every mode shares (#shell-title / #shell-menus)', () => {
    const w = mount(ShellBar, { global: { stubs } })
    expect(w.find('#shell-title').exists()).toBe(true)
    expect(w.find('#shell-menus').exists()).toBe(true)
  })
})
