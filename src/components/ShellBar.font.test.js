// Per-user Thai typeface toggle (มีหัว / ไม่มีหัว) in the ⚙ settings popover (desktop; the
// same control also lives in the mobile ☰ drawer). Each browser keeps its own choice
// (store.siteFont · localStorage), applied by data-font on <html>.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/' }),
  useRouter: () => ({ push: vi.fn() }),
}))

import ShellBar from './ShellBar.vue'
import { shellMenu, siteFont, setSiteFont } from '../store.js'

const stubs = {
  ProfileTool: true,
  Icon: true,
  RouterLink: { template: '<a><slot /></a>' },
}

async function openMenu() {
  const w = mount(ShellBar, { global: { stubs } })
  // ⚙ settings button (desktop tools cluster) opens the ตัวอักษรไทย popover
  await w.find('.sb-settings .sb-icon-btn').trigger('click')
  await nextTick()
  return w
}

beforeEach(() => {
  shellMenu.value = null
  setSiteFont('default')
  localStorage.clear()
  document.documentElement.removeAttribute('data-font')
})

describe('ShellBar — Thai typeface toggle', () => {
  it('offers both cuts as a radiogroup, default selected', async () => {
    const w = await openMenu()
    const opts = w.findAll('.sb-font-opts button')
    expect(opts).toHaveLength(2)
    expect(w.find('.sb-font-opts').attributes('role')).toBe('radiogroup')
    expect(w.find('.sb-font-lbl').text()).toContain('ตัวอักษรไทย')
    // default cut is the checked radio
    expect(opts[0].attributes('aria-checked')).toBe('true')
    expect(opts[1].attributes('aria-checked')).toBe('false')
  })

  it('choosing มีหัว sets the store, persists it, and flags <html>', async () => {
    const w = await openMenu()
    await w.findAll('.sb-font-opts button')[1].trigger('click')
    expect(siteFont.value).toBe('looped')
    expect(localStorage.getItem('pleng.siteFont')).toBe('looped')
    expect(document.documentElement.getAttribute('data-font')).toBe('looped')
  })

  it('choosing ไม่มีหัว reverts to the default cut and clears the flag', async () => {
    setSiteFont('looped')
    await nextTick()
    expect(document.documentElement.getAttribute('data-font')).toBe('looped')
    const w = await openMenu()
    await w.findAll('.sb-font-opts button')[0].trigger('click')
    expect(siteFont.value).toBe('default')
    expect(localStorage.getItem('pleng.siteFont')).toBe('default')
    expect(document.documentElement.hasAttribute('data-font')).toBe(false)
  })

  it('rejects unknown values (guards against a bad stored key)', () => {
    setSiteFont('comic-sans')
    expect(siteFont.value).toBe('default')
  })
})
