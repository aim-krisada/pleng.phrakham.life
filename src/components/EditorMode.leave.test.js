// B100 — "unsaved changes" leave warning. The route guard + beforeunload both key off a
// single `isDirty` flag: the document differs from the last CLEAN checkpoint (song load /
// form reset / successful save). These assert that flag so the warning fires exactly when
// there is work to lose and stays silent otherwise. (The window/route wiring itself is thin
// glue over isDirty and is exercised by hand in the browser — see the B100 report.)
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: { id: 'song-new-1' }, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import { session, legacy } from '../store.js'

const SONG = {
  id: 'song-1',
  number: 1,
  title_th: 'เพลงเดิม',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['มา'] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = { user: { id: 'editor-1', email: 'e@x.com' } }
  legacy.value = false
})

const mountEditor = (tier = 'editor') =>
  mount(EditorMode, { props: { song: SONG, tier, active: true }, global: { stubs: { Icon: true } } })

// wait past the immediate props.song watcher + its nextTick(resetHistory) so the clean
// checkpoint reflects the loaded song
const settle = async () => {
  await nextTick()
  await nextTick()
}

describe('EditorMode — leave warning dirty state (B100)', () => {
  it('a freshly loaded song is NOT dirty (no false warning)', async () => {
    const w = mountEditor()
    await settle()
    expect(w.vm.isDirty).toBe(false)
  })

  it('editing a field marks the editor dirty', async () => {
    const w = mountEditor()
    await settle()
    w.vm.meta.title_th = 'แก้ชื่อใหม่'
    await nextTick()
    expect(w.vm.isDirty).toBe(true)
  })

  it('editing the melody marks the editor dirty', async () => {
    const w = mountEditor()
    await settle()
    w.vm.opts.key = 'G'
    await nextTick()
    expect(w.vm.isDirty).toBe(true)
  })

  it('saving a draft clears dirty (saved work no longer warns)', async () => {
    const w = mountEditor()
    await settle()
    w.vm.meta.title_th = 'แก้ชื่อใหม่'
    await nextTick()
    expect(w.vm.isDirty).toBe(true)

    await w.vm.saveDraft('draft')
    await nextTick()
    expect(w.vm.isDirty).toBe(false)
  })

  it('publishing (approver) clears dirty', async () => {
    const w = mountEditor('approver')
    await settle()
    w.vm.meta.title_th = 'แก้แล้วเผยแพร่'
    await nextTick()
    expect(w.vm.isDirty).toBe(true)

    await w.vm.saveDirect()
    await nextTick()
    expect(w.vm.isDirty).toBe(false)
  })
})
