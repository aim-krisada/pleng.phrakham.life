// ShellBar — the "หน้าแรก v2 ใหม่" changes (locked, P'Aim 2026-07-27):
//   • ＋สร้างเพลง removed from the ☰ drawer (a drawer holds destinations, not actions · M3);
//     it lives ONLY on the desktop top-bar pill + the mobile FAB, with "C" as its keyboard peer.
//   • no more "รุ่นทดลอง v2" pill / version switch.
//   • ติดตั้งแอพ promoted onto the desktop top-bar (button) when install is possible.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/' }),
  useRouter: () => ({ push }),
}))

import './../lib/pk-drawer.js'
import ShellBar from './ShellBar.vue'
import { shellMenu } from '../store.js'
import { canInstall, isStandalone } from '../lib/pwaInstall.js'

const stubs = {
  ProfileTool: true, DownloadTool: true, FontTool: true, Icon: true, InstallSheet: true,
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
}

let wrapper = null
beforeEach(() => {
  shellMenu.value = null
  push.mockClear()
  canInstall.value = false
  isStandalone.value = false
})
afterEach(() => {
  if (wrapper) { wrapper.unmount(); wrapper = null }
  document.querySelectorAll('.pk-drawer,.pk-drawer-scrim').forEach((n) => n.remove())
})

describe('ShellBar — create relocated out of the drawer', () => {
  it('the desktop top-bar keeps the ＋สร้างเพลง pill', () => {
    wrapper = mount(ShellBar, { global: { stubs } })
    expect(wrapper.find('.sb-create').exists()).toBe(true)
    expect(wrapper.find('.sb-create').attributes('href')).toBe('/studio')
  })

  it('the mobile FAB exists on the home route with an aria-label + keyboard focus (a real link)', () => {
    wrapper = mount(ShellBar, { global: { stubs } })
    const fab = wrapper.find('.sb-fab')
    expect(fab.exists()).toBe(true)
    expect(fab.attributes('aria-label')).toBe('สร้างเพลงใหม่')
    expect(fab.attributes('href')).toBe('/studio')   // <a> → in the tab order, screen-reader reachable
  })

  it('the ☰ drawer no longer holds a create action row', async () => {
    wrapper = mount(ShellBar, { attachTo: document.body, global: { stubs } })
    await wrapper.find('.sb-burger').trigger('click')
    await nextTick()
    const panel = document.querySelector('.sb-drawer-panel.is-open')
    expect(panel).not.toBeNull()
    expect(panel.querySelector('.sb-drawer-create')).toBeNull()
    // the drawer still holds destinations (nav) + tools
    expect(panel.querySelector('.sb-drawer-nav')).not.toBeNull()
  })
})

describe('ShellBar — no trial-version pill', () => {
  it('renders no version switch anywhere in the bar', () => {
    wrapper = mount(ShellBar, { global: { stubs } })
    expect(wrapper.find('.ver-switch').exists()).toBe(false)
  })
})

describe('ShellBar — "C" opens a blank editor', () => {
  it('bare "c" (off any text field) pushes /studio', () => {
    wrapper = mount(ShellBar, { attachTo: document.body, global: { stubs } })
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }))
    expect(push).toHaveBeenCalledWith('/studio')
  })

  it('does NOT fire while typing in an input, or with a Ctrl/⌘ chord (copy)', () => {
    wrapper = mount(ShellBar, { attachTo: document.body, global: { stubs } })
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', metaKey: true }))
    expect(push).not.toHaveBeenCalled()
    input.remove()
  })
})

describe('ShellBar — ติดตั้งแอพ on the desktop top-bar', () => {
  it('hidden when install is not possible', () => {
    wrapper = mount(ShellBar, { global: { stubs } })
    expect(wrapper.find('.sb-install-btn').exists()).toBe(false)
  })

  it('shows the top-bar install button once install is possible', async () => {
    canInstall.value = true
    wrapper = mount(ShellBar, { global: { stubs } })
    await nextTick()
    const btn = wrapper.find('.sb-install-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('ติดตั้งแอพ')
  })
})
