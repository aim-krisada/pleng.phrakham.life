// ShellBar — the one app-wide header. phrakham parity (P'Aim 13 ก.ค.): desktop = inline nav
// (รายการเพลง · คู่มือ · พระคำ↗ · เกี่ยวกับเรา); mobile = ☰ opens a drawer with the same links
// + a "เครื่องมือ" section. Song creation lives on Studio's "เพลง ▾" panel, never the site menu.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/' }),
  useRouter: () => ({ push: vi.fn() }),
}))

// The mobile drawer is the shared vanilla core (window.PKDrawer). Importing it here registers
// that global so ShellBar's onMounted wires the real drawer, exactly as in the browser.
import './../lib/pk-drawer.js'
import ShellBar from './ShellBar.vue'
import { shellMenu, session } from '../store.js'

const stubs = {
  ProfileTool: true,
  DownloadTool: true,
  FontTool: true,
  Icon: true,
  // expose `to` as href so tests can assert where a link points (dropdown items)
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
}

let wrapper = null
beforeEach(() => { shellMenu.value = null })
afterEach(() => {
  if (wrapper) { wrapper.unmount(); wrapper = null }
  // PKDrawer lifts the panel + scrim onto <body>; purge any residue between tests.
  document.querySelectorAll('.pk-drawer,.pk-drawer-scrim').forEach((n) => n.remove())
})

describe('ShellBar — site nav (phrakham parity)', () => {
  it('the desktop inline nav lists pages, with รายการเพลง and NOT ทำเพลง', () => {
    wrapper = mount(ShellBar, { global: { stubs } })
    const text = wrapper.find('.sb-nav').text()
    expect(text).toContain('รายการเพลง')
    expect(text).toContain('คู่มือ')
    expect(text).toContain('เกี่ยวกับเรา')
    expect(text).toContain('พระคำ.ชีวิต')
    expect(text).not.toContain('ทำเพลง')
  })

  it('the ☰ hamburger opens the shared PKDrawer with the same links + a เครื่องมือ section', async () => {
    wrapper = mount(ShellBar, { attachTo: document.body, global: { stubs } })
    // Panel is always rendered (the core toggles it off-canvas) but starts closed.
    expect(document.querySelector('.sb-drawer-panel.is-open')).toBeNull()
    await wrapper.find('.sb-burger').trigger('click')   // core wires this click → open()
    await nextTick()
    const panel = document.querySelector('.sb-drawer-panel.is-open')
    expect(panel).not.toBeNull()
    expect(panel.querySelector('.sb-drawer-nav').textContent).toContain('รายการเพลง')
    expect(panel.textContent).toContain('เครื่องมือ')
    expect(panel.textContent).toContain('ตัวอักษรไทย')
    // The core syncs the trigger's aria-expanded, and the shared channel reflects 'site'.
    expect(wrapper.find('.sb-burger').attributes('aria-expanded')).toBe('true')
    expect(shellMenu.value).toBe('site')
  })

  it('exposes the teleport targets every mode shares (#shell-title / #shell-menus)', () => {
    wrapper = mount(ShellBar, { global: { stubs } })
    expect(wrapper.find('#shell-title').exists()).toBe(true)
    expect(wrapper.find('#shell-menus').exists()).toBe(true)
  })
})

describe('ShellBar — "คู่มือ ▾" dropdown (GATE 1: 2 sub-guides, every tier)', () => {
  it('the desktop คู่มือ button opens a role=menu with 2 items → /guide + /notation', async () => {
    wrapper = mount(ShellBar, { global: { stubs } })
    const btn = wrapper.find('.sb-guide .sb-nav-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('aria-haspopup')).toBe('true')
    expect(btn.attributes('aria-expanded')).toBe('false')
    // closed by default → no menu rendered
    expect(wrapper.find('.sb-guide-menu').exists()).toBe(false)
    await btn.trigger('click')
    await nextTick()
    const menu = wrapper.find('.sb-guide-menu')
    expect(menu.exists()).toBe(true)
    expect(menu.attributes('role')).toBe('menu')
    expect(btn.attributes('aria-expanded')).toBe('true')
    const items = menu.findAll('[role="menuitem"]')
    expect(items).toHaveLength(2)
    expect(items[0].attributes('href')).toBe('/guide')
    expect(items[1].attributes('href')).toBe('/notation')
    expect(menu.text()).toContain('คู่มือใช้งานโปรแกรม')
    expect(menu.text()).toContain('คู่มือทำเพลง')
  })

  it('shows the same 2 sub-guides regardless of login tier (login ไม่เปลี่ยนเมนู)', async () => {
    // logged in (a real session) must not change the guide menu — song-making is open to all.
    session.value = { user: { id: 'x' } }
    wrapper = mount(ShellBar, { global: { stubs } })
    await wrapper.find('.sb-guide .sb-nav-btn').trigger('click')
    await nextTick()
    const items = wrapper.find('.sb-guide-menu').findAll('[role="menuitem"]')
    expect(items.map((i) => i.attributes('href'))).toEqual(['/guide', '/notation'])
    session.value = null
  })

  it('the mobile drawer lists both sub-guides as nav links (every tier)', async () => {
    wrapper = mount(ShellBar, { attachTo: document.body, global: { stubs } })
    await wrapper.find('.sb-burger').trigger('click')
    await nextTick()
    const nav = document.querySelector('.sb-drawer-panel.is-open .sb-drawer-nav')
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/guide')
    expect(hrefs).toContain('/notation')
  })

  it('Escape closes the open menu and returns focus to the button', async () => {
    wrapper = mount(ShellBar, { attachTo: document.body, global: { stubs } })
    const btn = wrapper.find('.sb-guide .sb-nav-btn')
    await btn.trigger('click')
    await nextTick()
    await wrapper.find('.sb-guide-menu').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.find('.sb-guide-menu').exists()).toBe(false)
    expect(shellMenu.value).toBeNull()
  })
})
