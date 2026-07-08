// US-D01 / DS-D01 — an editor (logged in) makes/edits a song, saves it as a draft, and
// can reopen an existing draft to keep working. These assert the AC end-to-end through the
// component: save('draft') fires the contract event + persists a draft; loadDraft() pulls a
// stored draft's content back into the editor.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    // insert(...).select('id').single() → a fresh draft id, so currentDraftId gets set
    q.single = () => Promise.resolve({ data: { id: 'draft-new-1' }, error: null })
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

// a stored draft the editor should be able to reopen (v2 content)
const DRAFT = {
  id: 'draft-7',
  song_id: 'song-42',
  number: 42,
  title_th: 'ร่างเพลงเก่า',
  title_en: '',
  status: 'draft',
  content: {
    version: 2,
    key: 'G',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'G', note: '1' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['พระ'] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  session.value = { user: { id: 'editor-1', email: 'e@x.com' } }
  legacy.value = false
})

const mountEditor = () =>
  mount(EditorMode, { props: { song: null, tier: 'editor', active: true }, global: { stubs: { Icon: true } } })

describe('EditorMode — save draft (US-D01)', () => {
  it('save("draft") emits the contract event and persists a draft (currentDraftId set)', async () => {
    const wrapper = mountEditor()
    await nextTick()
    wrapper.vm.meta.title_th = 'เพลงใหม่ของฉัน'

    await wrapper.vm.saveDraft('draft')
    await nextTick()

    // contract: EditorMode announces the save so the shell/dock can react
    const saves = wrapper.emitted('save')
    expect(saves).toBeTruthy()
    expect(saves.at(-1)).toEqual(['draft'])
    // the store insert returned an id → the editor now tracks this draft
    expect(wrapper.vm.currentDraftId).toBe('draft-new-1')
  })

  it('reopen an existing draft → its content loads back for continued editing', async () => {
    const wrapper = mountEditor()
    await nextTick()

    wrapper.vm.loadDraft(DRAFT)
    await nextTick()

    expect(wrapper.vm.meta.title_th).toBe('ร่างเพลงเก่า')
    expect(wrapper.vm.editingId).toBe('song-42') // continues the same song
    expect(wrapper.vm.currentDraftId).toBe('draft-7') // continues the same draft
    expect(wrapper.vm.previewContent.key).toBe('G') // melody/key came back
  })
})
