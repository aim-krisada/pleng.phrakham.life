// B028 — approving a reviewed draft goes through the approve_and_publish RPC (one logical
// event / op_group), not two separate client writes. Guards the EditorMode wiring; the RPC
// behaviour itself is proven against real Postgres in db/004-audit-log-events.test.js.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const H = vi.hoisted(() => ({ rpc: null, updates: [] }))

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'delete', 'limit']) q[m] = () => q
    q.update = (row) => {
      H.updates.push(row)
      return q
    }
    q.single = () => Promise.resolve({ data: { id: 'x' }, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      rpc: (name, args) => {
        H.rpc = { name, args }
        return Promise.resolve({ data: 'published-song-1', error: null })
      },
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

const song = {
  id: 'song-1',
  number: 5,
  title_th: 'เพลงรออนุมัติ',
  title_en: '',
  review_flags: [],
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  H.rpc = null
  H.updates = []
})

function mountEd() {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, ComboSelect: true } },
  })
}

describe('B028 — approve() publishes via the RPC (one op_group)', () => {
  it('calls approve_and_publish with the draft id + prepared song, and NOT a raw draft update', async () => {
    const w = mountEd()
    await nextTick()
    w.vm.reviewingDraft = { id: 'draft-9', author_id: 'editor-1', status: 'pending' }
    w.vm.reviewComment = 'ดีแล้ว'
    await nextTick()

    await w.vm.approve()
    await nextTick()

    expect(H.rpc).toBeTruthy()
    expect(H.rpc.name).toBe('approve_and_publish')
    expect(H.rpc.args.p_draft_id).toBe('draft-9')
    expect(H.rpc.args.p_review_comment).toBe('ดีแล้ว')
    expect(H.rpc.args.p_song.title_th).toBe('เพลงรออนุมัติ')
    expect(Array.isArray(H.rpc.args.p_song.review_flags)).toBe(true)
    // the old two-step path did a direct song_drafts.update({status:'approved'}) — gone now
    expect(H.updates.find((u) => u && u.status === 'approved')).toBeUndefined()
  })

  it('on success sets editingId to the returned song id and reports approved+published', async () => {
    const w = mountEd()
    await nextTick()
    w.vm.reviewingDraft = { id: 'draft-9', author_id: 'editor-1', status: 'pending' }
    await nextTick()

    await w.vm.approve()
    await nextTick()

    expect(w.vm.editingId).toBe('published-song-1')
    expect(w.vm.reviewingDraft).toBeNull()
    expect(w.vm.saveMsg).toContain('อนุมัติและเผยแพร่แล้ว')
  })
})
