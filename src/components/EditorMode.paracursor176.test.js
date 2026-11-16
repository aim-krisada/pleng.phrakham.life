// ใบ v3/pleng#176 — the paragraph lyric box keeps the cursor where the author is typing.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

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
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})

const mountEd = (song) =>
  mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: {
      stubs: { Icon: true, 'router-link': true, SongSheet: true, DockKey: true, ComboSelect: true },
    },
  })
const inner = (w) => w.vm.$.setupState

// melody "1 - 2 3" → slot kinds attack · HELD · attack · attack. The 2nd word sits on the hold.
const song = (notes, syllables) => ({
  id: 's1',
  number: 1,
  title_th: 'เพลงทดสอบ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [notes.map((n) => ({ type: 'segment', note: n }))] }],
    arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables }],
  },
})
const HELD_SONG = () => song(['1', '-', '2', '3'], ['พระ', 'เย', 'ซู', 'เจ้า'])

// ใบ v3/pleng#176 (พี่เปา 16 พ.ย.) — deleting in the paragraph box threw the cursor to the end.
async function openBox() {
  const w = mountEd(HELD_SONG())
  await nextTick()
  const s = inner(w)
  s.lensChoice = 0
  s.paraOpen = true
  await nextTick()
  const box = w.find('textarea[aria-label="เนื้อร้องแบบย่อหน้า"]')
  expect(box.exists()).toBe(true)
  return { w, s, box }
}

describe('แก้เนื้อแบบย่อหน้า — the cursor stays where you type', () => {
  it('a delete that the syllables rebuild differently does not reset the box', async () => {
    const { w, s, box } = await openBox()
    await box.trigger('focus')
    // delete the word "เย" with Backspace → two spaces in a row, which the rebuild would squeeze to one
    const typed = 'พระ  ซู เจ้า'
    box.element.value = typed
    box.element.setSelectionRange(4, 4)
    await box.trigger('input')
    await nextTick()
    expect(box.element.value).toBe(typed) // not replaced …
    expect(box.element.selectionStart).toBe(4) // … so the cursor did not jump to the end
    expect(s.arrangement[0].syllables.filter(Boolean)).not.toContain('เย') // the words still updated
    w.unmount()
  })

  it('a double space stays as typed while editing', async () => {
    const { w, box } = await openBox()
    await box.trigger('focus')
    box.element.value = 'พระ  เย ซู เจ้า'
    box.element.setSelectionRange(4, 4)
    await box.trigger('input')
    await nextTick()
    expect(box.element.value).toBe('พระ  เย ซู เจ้า')
    expect(box.element.selectionStart).toBe(4)
    w.unmount()
  })

  it('leaving the box shows the words as saved again', async () => {
    const { w, box } = await openBox()
    await box.trigger('focus')
    box.element.value = 'พระ  เย ซู เจ้า'
    await box.trigger('input')
    await box.trigger('blur')
    await nextTick()
    expect(box.element.value).toBe('พระ เย ซู เจ้า')
    w.unmount()
  })
})
