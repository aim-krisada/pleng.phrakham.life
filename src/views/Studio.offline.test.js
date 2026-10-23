// The song page with no internet: a song saved on this device opens from that copy — but only
// when the database could not be reached. If the database ANSWERS that the song is not there
// (deleted, or hidden from the public since), the saved copy must not bring it back.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const h = vi.hoisted(() => ({ single: null, list: null }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'a' }, query: {} }),
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

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'songTitle'], template: '<div />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div />' },
  DockKey: true, ExportTool: true, ComboSelect: true, Icon: true,
}
const SAVED = {
  id: 'a', number: 1, title_th: 'เพลงที่เก็บไว้', title_en: '', verified: true, category: 'ก',
  content: { version: 2, key: 'C', stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1' }]] }], arrangement: [{ stanza: 'A', syllables: ['ก'] }] },
}
const OFFLINE = { data: null, error: { message: 'TypeError: Failed to fetch' }, status: 0 }

let store
beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  store = new Map([['catalog', { at: 1, rows: [SAVED] }]])
  _setBackend({ get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v) } })
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
})

const open = async () => {
  const w = mount(Studio, { global: { stubs } })
  await flushPromises()
  return w
}

describe('song page offline', () => {
  it('no internet: opens the song from the copy saved on this device', async () => {
    h.single = OFFLINE
    h.list = OFFLINE
    const w = await open()
    expect(w.vm.liveSong && w.vm.liveSong.title_th).toBe('เพลงที่เก็บไว้')
    expect(w.vm.songList.map((s) => s.id)).toEqual(['a']) // the song picker works offline too
  })

  it('the database says the song is gone: the saved copy does NOT bring it back', async () => {
    h.single = { data: null, error: { code: 'PGRST116', message: 'no rows' }, status: 406 }
    h.list = { data: [], error: null, status: 200 }
    const w = await open()
    expect(w.vm.liveSong).toBe(null)
  })

  it('online: the live row wins over the saved copy', async () => {
    h.single = { data: { ...SAVED, title_th: 'ชื่อใหม่' }, error: null, status: 200 }
    h.list = { data: [{ ...SAVED, title_th: 'ชื่อใหม่' }], error: null, status: 200 }
    const w = await open()
    expect(w.vm.liveSong.title_th).toBe('ชื่อใหม่')
    expect(store.get('catalog').rows[0].title_th).toBe('ชื่อใหม่') // the picker's fetch refreshed the copy
  })
})
