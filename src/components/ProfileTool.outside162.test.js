// ใบ v3/pleng#162 — the profile / เข้าสู่ระบบ popup closes on a tap anywhere outside it, like Aa.
// It rides the shared one-open-at-a-time shellMenu channel (key 'profile'), so ShellBar's backdrop
// closes it, and opening Aa closes it (and the other way round). Taps and typing inside never close it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/' }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('../supabase.js', () => {
  const q = {}
  for (const m of ['select', 'eq', 'limit', 'upsert']) q[m] = () => q
  q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
  return { supabase: { from: () => q, auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }
})

import './../lib/pk-drawer.js'
import ShellBar from './ShellBar.vue'
import ProfileTool from './ProfileTool.vue'
import { shellMenu, session, recovering, emailChanged } from '../store.js'

const stubs = { Icon: true, RouterLink: { template: '<a><slot /></a>' } }
let w = null
const mountBar = () => (w = mount(ShellBar, { attachTo: document.body, global: { stubs } }))
const menu = () => w.find('.profile-menu')
async function openProfile() {
  await w.find('.signin-btn').trigger('click')
  await nextTick()
}

beforeEach(() => {
  shellMenu.value = null
  session.value = null
  recovering.value = false
  emailChanged.value = false
})
afterEach(() => {
  w?.unmount(); w = null
  document.querySelectorAll('.pk-drawer,.pk-drawer-scrim').forEach((n) => n.remove())
})

describe('ใบ#162 — profile popup closes on an outside tap', () => {
  it('opens on the เข้าสู่ระบบ button and joins the shared channel', async () => {
    mountBar()
    expect(menu().exists()).toBe(false)
    await openProfile()
    expect(menu().exists()).toBe(true)
    expect(shellMenu.value).toBe('profile')
    expect(w.find('.signin-btn').attributes('aria-expanded')).toBe('true')
    expect(w.find('.sb-backdrop').exists()).toBe(true)
  })

  it('a tap outside (on the backdrop) closes it', async () => {
    mountBar()
    await openProfile()
    await w.find('.sb-backdrop').trigger('click')
    await nextTick()
    expect(menu().exists()).toBe(false)
    expect(shellMenu.value).toBe(null)
  })

  it('a tap inside the login form, and typing in it, does not close it', async () => {
    mountBar()
    await openProfile()
    const input = menu().find('input')
    expect(input.exists()).toBe(true)
    await input.trigger('click')
    await input.setValue('pow@example.com')
    await input.trigger('keydown', { key: 'a' })
    await menu().trigger('click')
    await nextTick()
    expect(menu().exists()).toBe(true)
    expect(shellMenu.value).toBe('profile')
  })

  it('opening Aa closes the profile popup, and opening the profile closes Aa', async () => {
    mountBar()
    await openProfile()
    await w.find('.ft-btn').trigger('click')
    await nextTick()
    expect(shellMenu.value).toBe('aa')
    expect(menu().exists()).toBe(false)
    expect(w.find('.ft-menu').exists()).toBe(true)
    await openProfile()
    expect(shellMenu.value).toBe('profile')
    expect(w.find('.ft-menu').exists()).toBe(false)
    expect(menu().exists()).toBe(true)
  })

  it('tapping the button again still closes it', async () => {
    mountBar()
    await openProfile()
    await openProfile()
    expect(menu().exists()).toBe(false)
    expect(shellMenu.value).toBe(null)
  })

  it('Esc closes it and puts focus back on the button', async () => {
    mountBar()
    await openProfile()
    await menu().find('input').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(menu().exists()).toBe(false)
    expect(document.activeElement).toBe(w.find('.signin-btn').element)
  })

  it('Esc does not close another menu that is open (Aa)', async () => {
    const t = mount(ProfileTool, { attachTo: document.body, global: { stubs } })
    shellMenu.value = 'aa'
    await nextTick()
    await t.find('.pk-tool').trigger('keydown', { key: 'Escape' })
    expect(shellMenu.value).toBe('aa')
    t.unmount()
  })

  it('a password-reset / invite link still opens it by itself', async () => {
    recovering.value = true
    mountBar()
    await nextTick()
    expect(shellMenu.value).toBe('profile')
    expect(menu().exists()).toBe(true)
  })

  it('an email-change link still opens it by itself, even after mounting', async () => {
    mountBar()
    emailChanged.value = true
    await nextTick(); await nextTick()
    expect(shellMenu.value).toBe('profile')
    expect(menu().exists()).toBe(true)
  })
})
