// ส่งเพลงที่ชอบเป็นลิงก์ / เปิดลิงก์บนเครื่องใหม่ — m1.wpa.24.fav.02 (ใบ v3/pleng#153), mounted.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const h = vi.hoisted(() => ({ rows: [], query: {}, replaced: [] }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push() {}, replace(to) { h.replaced.push(to) } }),
  useRoute: () => ({ params: {}, query: h.query }),
}))
vi.mock('../supabase.js', () => ({
  supabase: {
    from: () => {
      const q = {}
      q.select = () => q
      q.is = () => q
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
import { _reloadFavorites, toggleFavorite, favorites } from '../lib/favorites.js'

const RouterLink = { name: 'RouterLink', props: ['to'], template: '<a :href="to"><slot /></a>' }
const song = (id, number, title) => ({
  id, number, title_th: title, verified: true, category: 'ก',
  content: { version: 2, key: 'C', stanzas: [], arrangement: [] },
})

async function mountList() {
  const w = mount(SongList, { global: { stubs: { RouterLink, 'router-link': RouterLink } } })
  await flushPromises()
  await nextTick()
  return w
}

const realNav = globalThis.navigator
function fakeNav(nav) {
  Object.defineProperty(globalThis, 'navigator', { value: { ...realNav, onLine: true, ...nav }, configurable: true })
}

beforeEach(() => {
  localStorage.clear()
  _reloadFavorites()
  h.query = {}
  h.replaced = []
  h.rows = [song('s1', 1, 'กางเขน'), song('s2', 2, 'พระเจ้าทรงดี'), song('s3', 3, 'สรรเสริญ')]
})
afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', { value: realNav, configurable: true })
})

describe('send — ส่งรายการนี้', () => {
  it('AC 8 — no starred song → no send button', async () => {
    h.query = { v: 'fav' }
    const w = await mountList()
    expect(w.find('[data-test="fav-view"]').exists()).toBe(true)
    expect(w.find('[data-test="fav-send"]').exists()).toBe(false)
  })

  it('AC 1-2 — opens the device share sheet with ONE link holding only the starred ids', async () => {
    toggleFavorite('s3')
    toggleFavorite('s1')
    const share = vi.fn(() => Promise.resolve())
    fakeNav({ share })
    h.query = { v: 'fav' }
    const w = await mountList()
    await w.find('[data-test="fav-send"]').trigger('click')
    await flushPromises()
    expect(share).toHaveBeenCalledTimes(1)
    const data = share.mock.calls[0][0]
    expect(data.url).toMatch(/#\/\?fav=s1,s3$/) // listed order = Thai title order
    expect(data.title).toContain('เพลงที่ชอบ 2 เพลง')
  })

  it('no share sheet → the link is copied and the page says so', async () => {
    toggleFavorite('s1')
    const writeText = vi.fn(() => Promise.resolve())
    fakeNav({ share: undefined, clipboard: { writeText } })
    h.query = { v: 'fav' }
    const w = await mountList()
    await w.find('[data-test="fav-send"]').trigger('click')
    await flushPromises()
    expect(writeText.mock.calls[0][0]).toMatch(/fav=s1$/)
    expect(w.find('[data-test="fav-copied"]').text()).toContain('คัดลอกลิงก์แล้ว')
  })
})

describe('receive — a link opened on another device', () => {
  it('AC 3-4 — shows the list first, stores nothing until the button, then ADDS to what is there', async () => {
    toggleFavorite('s2') // this device already likes s2
    h.query = { fav: 's1,s3' }
    const w = await mountList()
    const view = w.find('[data-test="fav-import"]')
    expect(view.exists()).toBe(true)
    expect(view.findAll('.song-row .ttl').map((t) => t.text())).toEqual(['กางเขน', 'สรรเสริญ'])
    expect([...favorites.value]).toEqual(['s2']) // just looking stores nothing
    await w.find('[data-test="fav-take"]').trigger('click')
    expect(w.find('[data-test="fav-taken"]').text()).toBe('เก็บแล้ว 2 เพลง')
    expect([...favorites.value].sort()).toEqual(['s1', 's2', 's3']) // merged, s2 kept
    await w.find('[data-test="fav-go"]').trigger('click')
    expect(h.replaced.at(-1)).toEqual({ path: '/', query: { v: 'fav' } })
  })

  it('AC 6 — ids no longer on the site are skipped and counted, not guessed', async () => {
    h.query = { fav: 's1,gone-1,gone-2' }
    const w = await mountList()
    expect(w.find('[data-test="fav-missing"]').text()).toContain('ไม่พบ 2 เพลง')
    await w.find('[data-test="fav-take"]').trigger('click')
    expect([...favorites.value]).toEqual(['s1'])
    expect(w.find('[data-test="fav-taken"]').text()).toBe('เก็บแล้ว 1 เพลง')
  })

  it('AC 7 — a broken link says it cannot open the list and leaves this device alone', async () => {
    toggleFavorite('s2')
    h.query = { fav: '%%%' }
    const w = await mountList()
    expect(w.find('[data-test="fav-bad-link"]').text()).toContain('ลิงก์นี้เปิดรายการไม่ได้')
    expect(w.find('[data-test="fav-take"]').exists()).toBe(false)
    expect([...favorites.value]).toEqual(['s2'])
  })
})
