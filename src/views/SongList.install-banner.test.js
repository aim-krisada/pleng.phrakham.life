// SongList — the mobile install BANNER above the list (หน้าแรก v2, locked P'Aim 2026-07-27).
// P'Aim: "ต้องเห็น ส่งเสริมให้ใช้". It appears only when install is possible & not yet installed &
// not dismissed (lib/pwaInstall showInstallBanner); the ✕ dismiss is remembered. (CSS gates the
// banner to the mobile compact layout; here we assert the reactive presence/dismiss, not the media
// query.) SongList is mounted the way the card tests do it — supabase + router mocked.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const h = vi.hoisted(() => ({ rows: [] }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push() {} }),
  useRoute: () => ({ params: {}, query: {} }),
}))
vi.mock('../supabase.js', () => ({
  supabase: {
    from: () => {
      const q = {}
      q.select = () => q
      q.order = () => Promise.resolve({ data: h.rows, error: null })
      return q
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))

import SongList from './SongList.vue'
import {
  canInstall, isStandalone, installBannerDismissed,
} from '../lib/pwaInstall.js'

const RouterLink = { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' }

async function mountList() {
  const w = mount(SongList, { global: { stubs: { RouterLink, Icon: true }, components: { RouterLink } } })
  await new Promise((r) => setTimeout(r, 0)) // let onMounted's supabase promise settle
  await nextTick()
  return w
}

let wrapper = null
beforeEach(() => {
  h.rows = []
  canInstall.value = false
  isStandalone.value = false
  installBannerDismissed.value = false
  try { localStorage.clear() } catch { /* jsdom */ }
})
afterEach(() => { if (wrapper) { wrapper.unmount(); wrapper = null } })

describe('SongList — install banner', () => {
  it('absent when install is not possible', async () => {
    wrapper = await mountList()
    expect(wrapper.find('.install-banner').exists()).toBe(false)
  })

  it('shows a full-width banner (title + sub + CTA + dismiss) when install is possible', async () => {
    canInstall.value = true
    wrapper = await mountList()
    const banner = wrapper.find('.install-banner')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('ติดตั้งเป็นแอพ')
    expect(banner.find('.ib-cta').text()).toContain('ติดตั้ง')
    expect(banner.find('.ib-x').attributes('aria-label')).toBe('ปิด')
  })

  it('the ✕ dismisses it and remembers (localStorage), so it does not reappear', async () => {
    canInstall.value = true
    wrapper = await mountList()
    await wrapper.find('.ib-x').trigger('click')
    await nextTick()
    expect(wrapper.find('.install-banner').exists()).toBe(false)
    expect(installBannerDismissed.value).toBe(true)
    expect(localStorage.getItem('pleng:install-banner-dismissed')).toBe('1')
  })

  it('absent when already installed (standalone)', async () => {
    canInstall.value = true
    isStandalone.value = true
    wrapper = await mountList()
    expect(wrapper.find('.install-banner').exists()).toBe(false)
  })
})
