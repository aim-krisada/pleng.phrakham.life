// ใบ v3/pleng#123 — only แผ่นเพลง asks the sheet for the key + meter head; ฝึกร้อง (SongViewer) is left as it is.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({ useRoute: () => ({ params: {} }), useRouter: () => ({ push() {} }) }))
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
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
import SongSheet from '../components/SongSheet.vue'

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: { content: Object, songTitle: String, songHead: Boolean, displayKey: String }, template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active'], emits: ['change', 'save'], template: '<div class="stub-editor" />' },
  Icon: true,
}

describe('ใบ#123 — แผ่นเพลง turns the head on', () => {
  it('the sheet in แผ่นเพลง gets songHead', async () => {
    document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
    const wrapper = mount(Studio, { global: { stubs } })
    await nextTick()
    const sheet = wrapper.findComponent(SongSheet)
    expect(sheet.exists()).toBe(true)
    expect(sheet.props('songHead')).toBe(true)
  })
})
