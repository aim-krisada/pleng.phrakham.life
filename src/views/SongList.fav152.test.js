// ★ เพลงที่ชอบ on the home page — m1.wpa.24.fav.01 (ใบ v3/pleng#152), mounted.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const h = vi.hoisted(() => ({ rows: [], replaced: [] }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push() {}, replace(to) { h.replaced.push(to) } }),
  useRoute: () => ({ params: {}, query: {} }),
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
import { _reloadFavorites, toggleFavorite, isFavorite } from '../lib/favorites.js'

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

beforeEach(() => {
  localStorage.clear()
  _reloadFavorites()
  h.replaced = []
  h.rows = [song('s1', 1, 'กางเขน'), song('s2', 2, 'พระเจ้าทรงดี'), song('s3', 3, 'สรรเสริญ')]
})

describe('home — ★ เพลงที่ชอบ', () => {
  it('the shelf shows a เพลงที่ชอบ book on top, with its count, before anything is starred', async () => {
    const w = await mountList()
    const open = w.find('[data-test="fav-open"]')
    expect(open.exists()).toBe(true)
    expect(open.text()).toContain('เพลงที่ชอบ')
    expect(open.text()).toContain('0 เพลง')
    expect(w.findAll('.book-row-wrap')[0].classes()).toContain('fav-shelf')
  })

  it('AC 6 — empty list says what to do, not a blank page', async () => {
    const w = await mountList()
    await w.find('[data-test="fav-open"]').trigger('click')
    expect(w.find('[data-test="fav-view"]').exists()).toBe(true)
    expect(w.find('[data-test="fav-empty"]').text()).toContain('กดดาว')
    expect(h.replaced.at(-1)).toEqual({ path: '/', query: { v: 'fav' } })
  })

  it('AC 1-3 — star songs in a book, then the เพลงที่ชอบ book lists only those', async () => {
    const w = await mountList()
    await w.findAll('.book-row-wrap')[1].find('.book-row').trigger('click') // เล่ม ก
    const stars = w.findAll('[data-test="fav-star"]')
    expect(stars).toHaveLength(3)
    expect(stars[0].attributes('aria-pressed')).toBe('false')
    await stars[0].trigger('click')
    await stars[2].trigger('click')
    expect(w.findAll('[data-test="fav-star"]')[0].attributes('aria-pressed')).toBe('true')
    expect(isFavorite('s1')).toBe(true)

    await w.find('.crumb').trigger('click') // back to the shelf
    expect(w.find('[data-test="fav-open"]').text()).toContain('2 เพลง')
    await w.find('[data-test="fav-open"]').trigger('click')
    const titles = w.findAll('[data-test="fav-view"] .song-row .ttl').map((t) => t.text())
    expect(titles).toEqual(['กางเขน', 'สรรเสริญ'])
  })

  it('AC 2 — un-starring inside เพลงที่ชอบ takes the row away at once', async () => {
    toggleFavorite('s2')
    const w = await mountList()
    await w.find('[data-test="fav-open"]').trigger('click')
    expect(w.findAll('[data-test="fav-view"] .song-row')).toHaveLength(1)
    await w.find('[data-test="fav-view"] [data-test="fav-star"]').trigger('click')
    expect(w.findAll('[data-test="fav-view"] .song-row')).toHaveLength(0)
    expect(w.find('[data-test="fav-empty"]').exists()).toBe(true)
  })

  it('AC 7 — a starred song gone from the catalog is not listed and not counted', async () => {
    toggleFavorite('deleted-song')
    toggleFavorite('s3')
    const w = await mountList()
    expect(w.find('[data-test="fav-open"]').text()).toContain('1 เพลง')
  })

  it('the star is a sibling of the row link, never inside it (a tap must not also open the song)', async () => {
    const w = await mountList()
    await w.findAll('.book-row-wrap')[1].find('.book-row').trigger('click')
    expect(w.find('.song-row [data-test="fav-star"]').exists()).toBe(false)
    expect(w.find('.song-row-wrap > [data-test="fav-star"]').exists()).toBe(true)
  })

  it('the star comes before the title, inside the card frame (พี่เอม 5 พ.ย. 2569)', async () => {
    const w = await mountList()
    await w.findAll('.book-row-wrap')[1].find('.book-row').trigger('click')
    const wrap = w.find('.song-row-wrap')
    expect(wrap.classes()).toContain('has-star')
    expect(wrap.element.firstElementChild.getAttribute('data-test')).toBe('fav-star')
    expect(wrap.element.firstElementChild.classList.contains('in-card')).toBe(true)
  })
})
