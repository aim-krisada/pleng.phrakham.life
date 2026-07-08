// US-04 / DS-04 — EditorMode is the editor lifted whole out of Studio, wired to the mode
// contract: it takes a `song` prop and emits `change(song)` when the song changes. These
// assert the contract's data-in / data-out, which is what lets A/B/C/D run in parallel.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

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

const SONG = {
  id: 'song-1',
  number: 12,
  title_th: 'พระเจ้าเป็นความรัก',
  title_en: '',
  content: {
    version: 2,
    key: 'E',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'E', note: '1' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['พระ'] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

describe('EditorMode — mode contract (DS-04)', () => {
  it('loads the song from the prop and echoes it back via change()', async () => {
    const wrapper = mount(EditorMode, {
      props: { song: SONG, tier: 'approver', active: true },
      global: { stubs: { Icon: true } },
    })
    await nextTick()

    const changes = wrapper.emitted('change')
    expect(changes).toBeTruthy()
    const out = changes.at(-1)[0]
    // the emitted song keeps identity + meta and carries a v2 content block
    expect(out).toMatchObject({ id: 'song-1', number: 12, title_th: 'พระเจ้าเป็นความรัก' })
    expect(out.content.version).toBe(2)
    expect(out.content.key).toBe('E')
    expect(out.content.stanzas.length).toBe(1)
  })

  it('re-emits change() when the song is edited (title change ripples out)', async () => {
    const wrapper = mount(EditorMode, {
      props: { song: SONG, tier: 'approver', active: true },
      global: { stubs: { Icon: true } },
    })
    await nextTick()
    const before = wrapper.emitted('change').length

    // edit the title through the teleported shell input, then confirm a fresh change fires
    const input = document.querySelector('#shell-title input.sb-title')
    expect(input).toBeTruthy()
    input.value = 'ชื่อใหม่'
    input.dispatchEvent(new Event('input'))
    await nextTick()

    const changes = wrapper.emitted('change')
    expect(changes.length).toBeGreaterThan(before)
    expect(changes.at(-1)[0].title_th).toBe('ชื่อใหม่')
  })
})
