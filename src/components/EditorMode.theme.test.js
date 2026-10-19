// พี่เปา 19 ต.ค. 2569 — "และธีมให้เพิ่มได้เองด้วย ตอนนี้มันเพิ่มไม่ได้ มีแค่ให้เลือกเท่าที่มีอยู่"
// → the ธีม field takes free text, and a ธีม already used in the library is offered to the next
// song so it is typed once, not every time. หมวด is a different thing and stays LOCKED to the 3
// books (ComboSelect.category.test.js owns that); loosening ธีม must not loosen it, so the lock
// is re-checked here.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const songsRows = []
vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: table === 'songs' ? songsRows : [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (t) => makeQuery(t),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import ComboSelect from './ComboSelect.vue'

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  songsRows.length = 0
})

const BASE = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2' }]] }],
  arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: ['พระ', 'เจ้า'] }],
}
const song = (extra = {}) => ({ id: 's1', number: 3, title_th: 'เพลงทดสอบ', title_en: '', content: { ...BASE }, ...extra })

// ComboSelect is REAL here — the point is the editor's own wiring
const mountEd = (s) =>
  mount(EditorMode, {
    props: { song: s, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, DockKey: true } },
  })
const inner = (w) => w.vm.$.setupState
const themeCombo = (w) =>
  w.findAllComponents(ComboSelect).find((c) => (c.props('options') || [])[0]?.label === '— ไม่ระบุธีม —')
const categoryCombo = (w) =>
  w.findAllComponents(ComboSelect).find((c) => (c.props('options') || [])[0]?.value === 'lem-yai')

describe('ธีม — free text, and the list grows', () => {
  it('a ธีม that is not in the built-in 8 can be typed and sticks', async () => {
    vi.useFakeTimers()
    const w = mountEd(song())
    await nextTick()
    const combo = themeCombo(w)
    expect(combo).toBeTruthy()
    const input = combo.find('input')
    await input.trigger('focus')
    await input.setValue('เพลงงานศพ')
    await input.trigger('blur')
    vi.runAllTimers()
    await nextTick()
    expect(inner(w).meta.theme).toBe('เพลงงานศพ')
    expect(inner(w).themeKnown).toBe(true) // B108 — a human pick is genuine, so publish may write it
    w.unmount()
    vi.useRealTimers()
  })

  it('Enter confirms a typed ธีม without reaching for the mouse', async () => {
    const w = mountEd(song())
    await nextTick()
    const input = themeCombo(w).find('input')
    await input.trigger('focus')
    await input.setValue('ถวายตัว')
    await input.trigger('keydown', { key: 'Enter' })
    expect(inner(w).meta.theme).toBe('ถวายตัว')
    w.unmount()
  })

  it('a ธีม already used in the library is offered to the next song', async () => {
    songsRows.push({ id: 'x', number: 1, title_th: 'อีกเพลง', content: {}, theme: 'เพลงงานศพ' })
    const w = mountEd(song())
    await nextTick()
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
    await nextTick()
    const labels = (themeCombo(w).props('options') || []).map((o) => o.label)
    expect(labels).toContain('เพลงงานศพ')
    expect(labels).toContain('กิตติคุณ') // the built-in 8 are still there
    w.unmount()
  })

  it('whitespace alone is not a ธีม', async () => {
    vi.useFakeTimers()
    const w = mountEd(song())
    await nextTick()
    const input = themeCombo(w).find('input')
    await input.trigger('focus')
    await input.setValue('   ')
    await input.trigger('blur')
    vi.runAllTimers()
    await nextTick()
    expect(inner(w).meta.theme).toBe('')
    w.unmount()
    vi.useRealTimers()
  })

  it('หมวด stays LOCKED — loosening ธีม must not loosen the 3 books', async () => {
    vi.useFakeTimers()
    const w = mountEd(song())
    await nextTick()
    const combo = categoryCombo(w)
    const input = combo.find('input')
    await input.trigger('focus')
    await input.setValue('เยาวชน')
    await input.trigger('blur')
    vi.runAllTimers()
    await nextTick()
    expect(['lem-yai', 'anuchon', 'dek-lek']).toContain(inner(w).meta.category)
    w.unmount()
    vi.useRealTimers()
  })
})
