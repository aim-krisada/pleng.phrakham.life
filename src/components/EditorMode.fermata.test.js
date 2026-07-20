// Fermata hold (fermata-hold M2) — the per-note `holds` map must survive the editor's
// load → serialize round-trip, and stale/orphaned entries must be pruned on the way out so a
// box index that no longer carries a `^` can't keep a ghost value.
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

function songWith(line) {
  return {
    id: 'song-f', number: 9, title_th: 'เฟอร์มาต้า', title_en: '',
    content: {
      version: 2, key: 'C', timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [line] }],
      arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
    },
  }
}

function mountEditor(song) {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  return mount(EditorMode, { props: { song, tier: 'approver', active: true }, global: { stubs: { Icon: true } } })
}

const firstSeg = (wrapper) =>
  wrapper.emitted('change').at(-1)[0].content.stanzas[0].lines[0].find((it) => it.type === 'segment')

beforeEach(() => { document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>' })

describe('fermata holds — round-trip through the editor', () => {
  it('preserves a stored hold on a fermata note-box (load → serialize)', async () => {
    const wrapper = mountEditor(songWith([{ type: 'segment', note: '5^', holds: { 0: 3 } }]))
    await nextTick()
    expect(firstSeg(wrapper).holds).toEqual({ 0: 3 })
  })

  it('keeps holds only for boxes that still carry a fermata (prunes the rest)', async () => {
    // box 0 = "5^" (fermata, keep) · box 1 = "3" (no fermata → its hold is dropped)
    const wrapper = mountEditor(songWith([{ type: 'segment', note: '5^ 3', holds: { 0: 2, 1: 5 } }]))
    await nextTick()
    expect(firstSeg(wrapper).holds).toEqual({ 0: 2 })
  })

  it('drops holds entirely when no fermata box remains', async () => {
    const wrapper = mountEditor(songWith([{ type: 'segment', note: '5 3', holds: { 0: 2 } }]))
    await nextTick()
    expect(firstSeg(wrapper).holds).toBeUndefined()
  })

  it('snaps a stored hold to the 0.5 grid and the minimum on save', async () => {
    const wrapper = mountEditor(songWith([{ type: 'segment', note: '5^', holds: { 0: 1.7 } }]))
    await nextTick()
    expect(firstSeg(wrapper).holds).toEqual({ 0: 1.5 })
  })
})

describe('fermata holds — glanceable badge is editor-only, never on the sheet', () => {
  it('renders a 𝄐N badge in the editable note boxes for a fermata note', async () => {
    const wrapper = mountEditor(songWith([{ type: 'segment', note: '5^', holds: { 0: 3 } }]))
    await nextTick()
    const badges = wrapper.findAll('.note-boxes .note-hold')
    expect(badges.length).toBe(1)
    expect(badges[0].text()).toBe('𝄐3')
    expect(badges[0].classes()).toContain('no-print')
  })

  it('shows the DEFAULT value (2) on a fermata note that has no stored hold yet', async () => {
    // P'Aim: a fresh fermata defaults to a constant 2 beats, regardless of bar position.
    const wrapper = mountEditor(songWith([{ type: 'segment', note: '5^' }]))
    await nextTick()
    expect(wrapper.find('.note-boxes .note-hold').text()).toBe('𝄐2')
  })

  it('the sheet render (NoteRow) shows the 𝄐 symbol but NO hold-number badge', async () => {
    const wrapper = mountEditor(songWith([{ type: 'segment', note: '5^', holds: { 0: 3 } }]))
    await nextTick()
    // the read-only jianpu render (SongSheet → NoteRow) draws the fermata symbol...
    expect(wrapper.findAll('.fermata').length).toBeGreaterThan(0)
    // ...but the number badge exists ONLY inside the editable note boxes, never in a sheet render.
    expect(wrapper.findAll('.ed-bar-live .note-hold').length).toBe(0)
    expect(wrapper.findAll('.ed-bar-render .note-hold').length).toBe(0)
  })
})
