// ใบ v3/pleng#151 — แชร์ sits beside 🔍 on every page, glyph + word, hidden on an unsaved song.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const nav = vi.hoisted(() => ({ path: '/', push: vi.fn() }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ get path() { return nav.path }, get fullPath() { return nav.path } }),
  useRouter: () => ({ push: nav.push }),
}))

import './../lib/pk-drawer.js'
import ShellBar from './ShellBar.vue'
import { shellMenu, currentSong, pageShare } from '../store.js'

const stubs = {
  ProfileTool: { template: '<div class="sb-login" />' },
  Icon: { props: ['name'], template: '<i class="icn" :data-icon="name" />' },
  RouterLink: { template: '<a><slot /></a>' },
}
let w = null
const realShare = navigator.share
const realClip = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
beforeEach(() => { shellMenu.value = null; nav.path = '/'; currentSong.value = null; pageShare.value = null })
afterEach(() => {
  w?.unmount(); w = null
  document.querySelectorAll('.pk-drawer,.pk-drawer-scrim').forEach((n) => n.remove())
  navigator.share = realShare
  if (realClip) Object.defineProperty(navigator, 'clipboard', realClip)
  else delete navigator.clipboard
})
const mountBar = () => (w = mount(ShellBar, { attachTo: document.body, global: { stubs } }))
const setClipboard = (writeText) => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

describe('ใบ#151 — แชร์ in the top bar', () => {
  it('AC1 · AC3 — right after 🔍, with the word แชร์ next to the glyph', () => {
    mountBar()
    const kids = [...w.find('.sb-right').element.children]
    const search = kids.findIndex((el) => el.getAttribute('aria-label') === 'ค้นหาเพลง')
    expect(kids[search + 1].classList.contains('sb-share-wrap')).toBe(true)
    expect(w.find('.sb-share').text()).toBe('แชร์')
    // phone hides the word (CSS) — the button keeps its name for screen readers
    expect(w.find('.sb-share').attributes('aria-label')).toBe('แชร์')
    expect(w.find('.sb-share-label').exists()).toBe(true)
  })

  it('AC2 — a non-Apple device (jsdom) gets the three-circle glyph', () => {
    mountBar()
    expect(w.find('.sb-share [data-icon]').attributes('data-icon')).toBe('share-2')
  })

  it('AC1 — every page has it: home, guide, about, a song', () => {
    for (const p of ['/', '/guide', '/about', '/notation', '/song/9']) {
      nav.path = p
      mountBar()
      expect(w.find('.sb-share').exists(), p).toBe(true)
      w.unmount(); w = null
    }
  })

  it('AC8 sad path — no แชร์ on a new song / unsaved draft', () => {
    nav.path = '/studio'
    mountBar()
    expect(w.find('.sb-share').exists()).toBe(false)
  })

  it('AC4 · AC6 — on a song the share sheet gets the song name and its ฝึกร้อง link', async () => {
    nav.path = '/song/9'
    currentSong.value = { title_th: 'สรรเสริญ' }
    navigator.share = vi.fn().mockResolvedValue()
    mountBar()
    await w.find('.sb-share').trigger('click')
    await flushPromises()
    const arg = navigator.share.mock.calls[0][0]
    expect(arg.url).toBe(window.location.origin + '/?openExternalBrowser=1#/song/9')
    expect(arg.text).toContain('สรรเสริญ')
    expect(w.find('.sb-share-note').exists()).toBe(false)
  })

  it('home page view (a เล่ม · เพลงที่ชอบ) → sends what the page says it is (พี่เอม 5 พ.ย. 2569)', async () => {
    pageShare.value = { url: 'https://x.test/#/?fav=a,b', title: 'เพลงที่ชอบ 2 เพลง' }
    navigator.share = vi.fn().mockResolvedValue()
    mountBar()
    await w.find('.sb-share').trigger('click')
    await flushPromises()
    expect(navigator.share.mock.calls[0][0].url).toBe('https://x.test/?openExternalBrowser=1#/?fav=a,b')
  })

  it('a song page ignores a stale home-page view', async () => {
    pageShare.value = { url: 'https://x.test/#/?book=x', title: 'x' }
    nav.path = '/song/9'
    navigator.share = vi.fn().mockResolvedValue()
    mountBar()
    await w.find('.sb-share').trigger('click')
    await flushPromises()
    expect(navigator.share.mock.calls[0][0].url).toBe(window.location.origin + '/?openExternalBrowser=1#/song/9')
  })

  it('AC5 — no share sheet: copies the link and says คัดลอกลิงก์แล้ว', async () => {
    navigator.share = undefined
    const writeText = vi.fn().mockResolvedValue()
    setClipboard(writeText)
    mountBar()
    await w.find('.sb-share').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(window.location.origin + '/?openExternalBrowser=1')
    expect(w.find('.sb-share-note').text()).toBe('คัดลอกลิงก์แล้ว')
  })

  it('AC9 sad path — copying blocked: shows the link in a box to copy by hand, × closes it', async () => {
    navigator.share = undefined
    setClipboard(vi.fn().mockRejectedValue(new Error('blocked')))
    nav.path = '/guide'
    mountBar()
    await w.find('.sb-share').trigger('click')
    await flushPromises()
    expect(w.find('.sb-share-manual input').element.value).toBe(window.location.origin + '/?openExternalBrowser=1#/guide')
    await w.find('.sb-share-x').trigger('click')
    expect(w.find('.sb-share-note').exists()).toBe(false)
  })
})
