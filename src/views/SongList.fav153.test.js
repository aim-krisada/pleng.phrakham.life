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
      q.order = () => q
      q.range = () => q
      q.then = (ok, bad) => Promise.resolve({ data: h.rows, error: null }).then(ok, bad)
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
import { pageShare } from '../store.js'

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

describe('send — the top bar แชร์ sends the page you are on (พี่เอม 5 พ.ย. 2569)', () => {
  it('no ส่งรายการนี้ button any more — แชร์ in the top bar does it', async () => {
    toggleFavorite('s1')
    h.query = { v: 'fav' }
    const w = await mountList()
    expect(w.find('[data-test="fav-view"]').exists()).toBe(true)
    expect(w.find('[data-test="fav-send"]').exists()).toBe(false)
    expect(w.text()).not.toContain('ส่งรายการนี้')
  })

  it('เพลงที่ชอบ → ONE link holding only the starred ids, in the listed order', async () => {
    toggleFavorite('s3')
    toggleFavorite('s1')
    toggleFavorite('gone-song') // no longer on the site → not sent
    h.query = { v: 'fav' }
    await mountList()
    expect(pageShare.value.url).toMatch(/#\/\?fav=s1,s3$/) // listed order = Thai title order
    expect(pageShare.value.title).toContain('เพลงที่ชอบ 2 เพลง')
  })

  it('เพลงที่ชอบ with nothing starred → the plain page (the bar shares the site)', async () => {
    h.query = { v: 'fav' }
    await mountList()
    expect(pageShare.value).toBeNull()
  })

  it('inside a เล่ม → that เล่ม, and opening that link lands in it', async () => {
    h.query = { book: 'ก' }
    const w = await mountList()
    expect(pageShare.value.url).toMatch(/#\/\?book=%E0%B8%81$/)
    expect(w.findAll('.song-row-wrap').length).toBe(3)
  })

  it('opening a เล่ม puts it in the address (so ← from a song comes back into it)', async () => {
    const w = await mountList()
    await w.findAll('.book-row-wrap:not(.fav-shelf) .book-row')[0].trigger('click')
    expect(h.replaced.at(-1)).toEqual({ path: '/', query: { book: 'ก' } })
  })

  it('a list someone sent → the same list', async () => {
    h.query = { fav: 's2,s3' }
    await mountList()
    expect(pageShare.value.url).toMatch(/#\/\?fav=s2,s3$/)
  })

  it('the shelf → nothing special (the bar shares the site)', async () => {
    await mountList()
    expect(pageShare.value).toBeNull()
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

describe('a เล่ม link to a เล่ม that is not here', () => {
  it('lands on the shelf, not an empty page', async () => {
    h.query = { book: 'nope' }
    const w = await mountList()
    expect(w.findAll('.book-row-wrap').length).toBeGreaterThan(0)
    expect(h.replaced.at(-1)).toEqual({ path: '/', query: {} })
  })
})
