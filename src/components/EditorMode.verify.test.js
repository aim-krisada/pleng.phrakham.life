// "✓ ตรวจแล้ว" (verified) toggle — marks a song human-checked (songs.verified) so the
// catalog can show which of the imported songs พี่เปา has reviewed. These assert the button
// only shows when logged in, flips the song's verified flag on click, and refuses to run
// before the song is saved (no editingId → no write).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// chainable supabase stub — update(...).eq(...) resolves { error: null } so markVerified
// treats the write as successful; select/list calls resolve empty.
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
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
  number: 7,
  title_th: 'เพลงทดสอบ',
  title_en: '',
  verified: false,
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
  session.value = { user: { id: 'approver-1', email: 'a@x.com' } }
  legacy.value = false
})

const mountEd = (props) =>
  mount(EditorMode, {
    props: { song: null, tier: 'approver', active: true, ...props },
    global: { stubs: { Icon: true, 'router-link': true, ComboSelect: true } },
  })

describe('EditorMode — "ตรวจแล้ว" verified toggle', () => {
  it('is hidden for anonymous users', async () => {
    const w = mount(EditorMode, {
      props: { song: SONG, tier: 'anon', active: true },
      global: { stubs: { Icon: true, 'router-link': true, ComboSelect: true } },
    })
    await nextTick()
    expect(w.find('.ed-verify').exists()).toBe(false)
  })

  it('shows for a logged-in team member and flips verified on click', async () => {
    const w = mountEd({ song: SONG })
    await nextTick()
    const btn = w.find('.ed-verify')
    expect(btn.exists()).toBe(true)
    expect(btn.classes()).not.toContain('on') // starts unverified
    expect(btn.text()).toContain('ตรวจแล้ว?')

    await btn.trigger('click')
    await nextTick()
    const after = w.find('.ed-verify')
    expect(after.classes()).toContain('on') // now marked verified (green)
    expect(after.text()).toContain('ตรวจแล้ว')
  })

  it('does nothing until the song is saved (no editingId → no verified flip)', async () => {
    const w = mountEd({ song: null }) // fresh, unsaved song → editingId null
    await nextTick()
    const btn = w.find('.ed-verify')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    await nextTick()
    expect(w.find('.ed-verify').classes()).not.toContain('on') // guard blocked the write
  })
})
