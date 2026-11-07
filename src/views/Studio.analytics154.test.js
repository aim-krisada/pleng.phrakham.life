// ใบ v3/pleng#154 — a song page is counted once the song has loaded, named with its BOOK (song numbers
// repeat across books), and only once per page open.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const h = vi.hoisted(() => ({ single: null, list: null }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/song/a', params: { id: 'a' }, query: {} }),
  useRouter: () => ({ push() {}, replace() {} }),
}))
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'limit', 'retry']) q[m] = () => q
    q.single = () => Promise.resolve(h.single)
    q.then = (ok, bad) => Promise.resolve(h.list).then(ok, bad)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    },
  }
})

import Studio from './Studio.vue'
import { _setBackend } from '../lib/offlineSongs.js'
import { _resetForTest, setConsent } from '../lib/analytics.js'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'songTitle'], template: '<div />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div />' },
  DockKey: true, ExportTool: true, ComboSelect: true, Icon: true,
}
const SONG = {
  id: 'a', number: 12, title_th: 'พระเจ้าทรงดี', title_en: '', verified: true, category: 'anuchon',
  content: { version: 2, key: 'C', stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1' }]] }], arrangement: [{ stanza: 'A', syllables: ['ก'] }] },
}
const pageViews = () => (window.dataLayer || []).map((a) => [...a]).filter((a) => a[1] === 'page_view').map((a) => a[2])

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  _setBackend({ get: async () => undefined, put: async () => {} })
  localStorage.clear()
  delete window.dataLayer
  _resetForTest({ id: 'G-TEST000' })
  setConsent('granted')
  h.single = { data: SONG, error: null, status: 200 }
  h.list = { data: [SONG], error: null, status: 200 }
})

describe('song page counting', () => {
  it('sends one page_view after the song loads, titled with its book', async () => {
    mount(Studio, { global: { stubs } })
    expect(pageViews()).toHaveLength(0) // not before the song is known
    await flushPromises()
    const pv = pageViews()
    expect(pv).toHaveLength(1)
    expect(pv[0].page_title).toBe('อนุชน · 12. พระเจ้าทรงดี')
    expect(pv[0].page_path).toBe('/song/a')
    expect(Object.keys(pv[0]).sort()).toEqual(['page_location', 'page_path', 'page_title'])
  })
})
