// The home page with no internet: it shows the songs saved on this device the last time the
// library loaded, says so, and never falls back to the demo songs while a saved copy exists.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const h = vi.hoisted(() => ({ res: null, retried: [] }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push() {} }),
  useRoute: () => ({ params: {}, query: {} }),
}))
vi.mock('../supabase.js', () => ({
  supabase: {
    from: () => {
      const q = {}
      q.select = () => q
      q.is = () => q
      q.eq = () => q
      q.retry = (v) => { h.retried.push(v); return q }
      q.order = () => q
      q.then = (ok, bad) => Promise.resolve(h.res).then(ok, bad)
      return q
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))

import SongList from './SongList.vue'
import { _setBackend, offlineSince } from '../lib/offlineSongs.js'
import { SAMPLE_SONGS } from '../data/sample-songs.js'

const RouterLink = { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' }
const song = (id, n, title) => ({
  id, number: n, title_th: title, verified: true, category: 'ก',
  content: { version: 2, key: 'C', stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1' }]] }], arrangement: [{ stanza: 'A', syllables: ['ก'] }] },
})
const OFFLINE = { data: null, error: { message: 'TypeError: Failed to fetch' }, status: 0 }

let store
beforeEach(() => {
  store = new Map()
  _setBackend({ get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v) } })
  h.retried = []
  offlineSince.value = 0
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
})

const open = async () => {
  const w = mount(SongList, { global: { stubs: { RouterLink }, components: { RouterLink } } })
  await flushPromises()
  return w
}

describe('home page offline', () => {
  it('online: shows the live list and saves it on the device', async () => {
    h.res = { data: [song('a', 1, 'เพลงหนึ่ง')], error: null, status: 200 }
    const w = await open()
    expect(w.vm.songs.map((s) => s.id)).toEqual(['a'])
    expect(store.get('catalog').rows.map((s) => s.id)).toEqual(['a'])
    expect(w.find('[data-test="offline-note"]').exists()).toBe(false)
  })

  it('no internet + a saved copy: shows the saved songs and says they are from the device', async () => {
    store.set('catalog', { at: Date.UTC(2026, 9, 22), rows: [song('a', 1, 'เพลงหนึ่ง'), song('b', 2, 'เพลงสอง')] })
    h.res = OFFLINE
    const w = await open()
    expect(w.vm.songs.map((s) => s.id)).toEqual(['a', 'b'])
    expect(w.find('[data-test="offline-note"]').text()).toContain('เก็บไว้ในเครื่อง')
    expect(w.text()).not.toContain('แสดงเพลงตัวอย่าง')
    expect(h.retried).toEqual([false]) // a copy was on hand → no ~7 s of retries
  })

  it('phone says it is offline: does not even ask the database', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
    store.set('catalog', { at: 1, rows: [song('a', 1, 'เพลงหนึ่ง')] })
    h.res = null
    const w = await open()
    expect(w.vm.songs.map((s) => s.id)).toEqual(['a'])
    expect(w.find('[data-test="offline-note"]').exists()).toBe(true)
  })

  it('no internet and nothing saved yet: the old demo-songs fallback, unchanged', async () => {
    h.res = OFFLINE
    const w = await open()
    expect(w.vm.songs).toEqual(SAMPLE_SONGS)
    expect(w.text()).toContain('แสดงเพลงตัวอย่าง')
    expect(h.retried).toEqual([]) // no copy → keep the library's normal retries
  })
})
