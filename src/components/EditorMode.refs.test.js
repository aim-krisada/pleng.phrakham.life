// พี่เปา 19 ต.ค. 2569 — "อยากให้เพิ่มช่องอ้างอิงเพลงเข้าไปด้วย เช่น (ล.305) ประมาณนี้ แต่ต้องให้เขียน
// ได้เองเลย เพราะจะมีตัวย่อหลายตัว บางเพลงอ้างอิงหลายอัน" → a free-text อ้างอิง box in the
// song-settings card. The parse itself is covered in lib/bookRefs.test.js; these cover the
// editor's wiring: what is on screen, what gets stored, and what comes back on reopen.
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
const refsInput = (w) => w.find('input[aria-label="อ้างอิงเล่มอื่น"]')

describe('อ้างอิง — the editor can write a song’s cross-references', () => {
  it('the box is on the settings card', async () => {
    const w = mountEd(song())
    await nextTick()
    expect(refsInput(w).exists()).toBe(true)
    w.unmount()
  })

  it('what is typed is saved as a reference list on the song content', async () => {
    const w = mountEd(song())
    await nextTick()
    await refsInput(w).setValue('(ล.305), ย.274')
    expect(w.vm.previewContent.bookRefs).toEqual([
      { book: 'ล', no: 305 },
      { book: 'ย', no: 274 },
    ])
    w.unmount()
  })

  it('an abbreviation that is not one of the 9 known books is kept as typed', async () => {
    const w = mountEd(song())
    await nextTick()
    await refsInput(w).setValue('ฮม.9')
    expect(w.vm.previewContent.bookRefs).toEqual([{ book: 'ฮม', no: 9 }])
    w.unmount()
  })

  it('shows the long reading form under the box so a typo is visible', async () => {
    const w = mountEd(song())
    await nextTick()
    await refsInput(w).setValue('ล.305')
    await nextTick()
    expect(w.find('#edRefsHint').text()).toContain('เล่มเล็ก 305')
    w.unmount()
  })

  it('opening a song that already has refs shows them in the short form', async () => {
    const w = mountEd(song({ book_refs: [{ book: 'ล', no: 282 }] }))
    await nextTick()
    expect(refsInput(w).element.value).toBe('ล.282')
    w.unmount()
  })

  it('refs typed earlier come back when the song is reopened', async () => {
    const w = mountEd(song({ content: { ...BASE, bookRefs: [{ book: 'ล', no: 305 }] } }))
    await nextTick()
    expect(refsInput(w).element.value).toBe('ล.305')
    w.unmount()
  })

  it('clearing the box stores an empty list, so imported refs really go away', async () => {
    const w = mountEd(song({ book_refs: [{ book: 'ล', no: 282 }] }))
    await nextTick()
    await refsInput(w).setValue('')
    expect(w.vm.previewContent.bookRefs).toEqual([])
    w.unmount()
  })

  it('a song that never had refs keeps NO bookRefs key (content stays byte-identical)', async () => {
    const w = mountEd(song())
    await nextTick()
    expect('bookRefs' in w.vm.previewContent).toBe(false)
    expect(w.vm.previewContent).toEqual(BASE)
    w.unmount()
  })
})
