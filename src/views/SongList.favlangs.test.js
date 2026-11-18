// พี่เอม 18 พ.ย. 2569 — "ในหน้าเพลงที่ชอบก็ต้องมีแท็กภาษาด้วยนะ": a starred song in เพลงที่ชอบ says
// which languages it has, the same label as a row in a book (ใบ v3/pleng#158). Thai-only → nothing.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const h = vi.hoisted(() => ({ rows: [] }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push() {}, replace() {} }),
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
import { _reloadFavorites, toggleFavorite } from '../lib/favorites.js'

const RouterLink = { name: 'RouterLink', props: ['to'], template: '<a :href="to"><slot /></a>' }
const song = (id, number, title, lyrics) => ({
  id, number, title_th: title, verified: true, category: 'anuchon',
  content: { version: 2, key: 'C', stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] }],
    arrangement: [{ stanza: 'A', syllables: ['ดวง', 'ตะวัน'], ...(lyrics ? { lyrics } : {}) }] },
})

beforeEach(() => {
  localStorage.clear()
  _reloadFavorites()
  h.rows = [song('a', 1, 'เพลงไทยล้วน'), song('c', 3, 'เพลงสามภาษา', { en: ['Sun', 'shine'], zh: ['太', '阳'] })]
  toggleFavorite('a')
  toggleFavorite('c')
})

describe('เพลงที่ชอบ — languages on each starred song', () => {
  it('a starred song with English and Chinese shows the label; a Thai-only one shows none', async () => {
    const w = mount(SongList, { global: { stubs: { RouterLink, 'router-link': RouterLink } } })
    await flushPromises()
    await nextTick()
    await w.find('[data-test="fav-open"]').trigger('click')
    await nextTick()
    const rows = w.find('[data-test="fav-view"]').findAll('.song-row')
    expect(rows).toHaveLength(2)
    const row = (t) => rows.find((r) => r.text().includes(t))
    const lang = row('เพลงสามภาษา').find('.lang')
    expect(lang.attributes('aria-label')).toBe('ภาษา ไทย · English · 中文')
    expect(lang.find('.lang-short').text()).toBe('ไทย · EN · 中')
    expect(row('เพลงไทยล้วน').find('.lang').exists()).toBe(false)
  })
})
