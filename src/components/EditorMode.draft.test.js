// US-D01 / DS-D01 — an editor (logged in) makes/edits a song, saves it as a draft, and
// can reopen an existing draft to keep working. These assert the AC end-to-end through the
// component: save('draft') fires the contract event + persists a draft; loadDraft() pulls a
// stored draft's content back into the editor.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// records every from(<table>).<verb>(...) so a test can prove WHICH table a write hit
const calls = vi.hoisted(() => [])

vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) {
      q[m] = (...args) => { calls.push({ table, verb: m, args }); return q }
    }
    // insert(...).select('id').single() → a fresh draft id, so currentDraftId gets set
    q.single = () => Promise.resolve({ data: { id: 'draft-new-1' }, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (table) => makeQuery(table),
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
  calls.length = 0
  localStorage.clear()
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

  // issues9 (พี่เปา): "ทำไมต้องกดปักหมุดก่อนถึงจะเซฟร่างได้ ... ให้เลือกได้เลยที่รูปไอคอน".
  // บันทึกร่าง is THE most-used command when typing in songs, so it has a fixed seat on the dock
  // bar — never parked in ⚙ behind a pin, and never `pinnable` (a placed item that is also pinned
  // renders twice).
  it('บันทึกร่าง sits on the dock bar by default — not behind ⚙ + a pin', async () => {
    const wrapper = mountEditor()
    await nextTick()
    const draft = wrapper.vm.editItems.find((i) => i.id === 'draft')
    expect(draft).toBeTruthy()
    expect(draft.hidden).toBe(false) // logged in → available
    expect(draft.place?.row).toBe(2) // a real seat on the bar
    expect(draft.default).toBeUndefined() // not parked in ⚙
    expect(draft.pinnable).toBeFalsy() // so it can never be drawn twice
  })
})

// issues10 (พี่เปา): "เพลงร่างก็หาที่ลบทั้งเพลงไม่ได้". Scope approved by P'Aim (17 ก.ค.) = own
// drafts only. RLS ("Delete own or as approver", db/002) is the real guard; these cover the UI.
describe('EditorMode — delete own draft (issues10)', () => {
  it('asks to confirm, then deletes that draft row from song_drafts', async () => {
    const wrapper = mountEditor()
    await nextTick()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)

    await wrapper.vm.deleteDraft(DRAFT)
    await nextTick()

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(confirm.mock.calls[0][0]).toContain('ร่างเพลงเก่า') // names the draft being destroyed
    const del = calls.find((c) => c.table === 'song_drafts' && c.verb === 'delete')
    expect(del).toBeTruthy()
    // scoped to the one draft — never a bare delete()
    expect(calls.some((c) => c.table === 'song_drafts' && c.verb === 'eq' && c.args[1] === 'draft-7')).toBe(true)
    // published songs are NOT in scope for this change
    expect(calls.some((c) => c.table === 'songs' && c.verb === 'delete')).toBe(false)
    confirm.mockRestore()
  })

  it('cancelling the confirm deletes nothing', async () => {
    const wrapper = mountEditor()
    await nextTick()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await wrapper.vm.deleteDraft(DRAFT)

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(calls.some((c) => c.verb === 'delete')).toBe(false)
    confirm.mockRestore()
  })

  it('deleting the draft that is open lets go of its id, so the next save starts a fresh row', async () => {
    const wrapper = mountEditor()
    await nextTick()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    wrapper.vm.loadDraft(DRAFT)
    await nextTick()
    expect(wrapper.vm.currentDraftId).toBe('draft-7')

    await wrapper.vm.deleteDraft(DRAFT)
    await nextTick()

    // stale id would make the next บันทึกร่าง update a row that no longer exists
    expect(wrapper.vm.currentDraftId).toBe(null)
    confirm.mockRestore()
  })
})
