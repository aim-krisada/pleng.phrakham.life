// ใบ v3/pleng#145 — in and out of แก้ไข: ✎ on the ฝึกร้อง bar opens the same song in แก้ไข; "← กลับไปฝึกร้อง"
// (top left · ข้อเสนอ ก, พี่เอม 2 พ.ย. 2569) brings you back to it; unsaved work is never dropped silently.
//   AC1 ✎ on the ฝึกร้อง bar, where Aa was, for everyone (logged in or not)
//   AC2 ✎ → the same song in แก้ไข
//   AC3 a clear way back → the same song in ฝึกร้อง
//   AC4 sad path: unsaved edits + back → a question first; "แก้ต่อ" keeps them, "ทิ้งแล้วกลับ" really drops them
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 's1' }, query: {} }), useRouter: () => ({ push() {}, replace() {} }) }))
vi.mock('../lib/offlineSongs.js', () => ({
  CATALOG_COLUMNS: '*',
  readCatalog: () => Promise.resolve(null),
  readSong: () => Promise.resolve(null),
  saveCatalog: () => Promise.resolve(),
  isNetworkFailure: () => false,
}))
const ROW = {
  id: 's1', number: 7, title_th: 'เพลงทดสอบ', title_en: '', category: 'big',
  content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1' }]] }], arrangement: [{ stanza: 'A', label: '', syllables: ['ก'] }] },
}
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit', 'retry']) q[m] = () => q
    q.single = () => Promise.resolve({ data: ROW, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
    },
  }
})

import Studio from './Studio.vue'

let editorMounts = 0
const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], emits: ['edit', 'set', 'dock'], template: '<div class="stub-viewer">{{ song.title_th }}</div>' },
  SongSheet: true,
  DockKey: true,
  // the real editor's `isDirty` is what Studio reads; the stub lets a test flip it
  EditorMode: {
    name: 'EditorMode', props: ['song', 'tier', 'active', 'initialSet'], emits: ['change', 'save'],
    data: () => ({ isDirty: false }),
    mounted() { editorMounts++ },
    template: '<div class="stub-editor" />',
  },
  Icon: true,
}

let w = null
beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  editorMounts = 0
  window.scrollTo = () => {}
})
afterEach(() => { w?.unmount(); w = null })

async function open() {
  w = mount(Studio, { global: { stubs }, attachTo: document.body })
  await flushPromises()
  await nextTick()
  return w
}
const viewer = () => w.findComponent({ name: 'SongViewer' })
const editor = () => w.findComponent({ name: 'EditorMode' })
const backBtn = () => w.find('.ed-back-btn')

describe('ใบ#145 — ✎ in, ← out', () => {
  it('a song opens in ฝึกร้อง, with no back row there', async () => {
    await open()
    expect(editor().props('active')).toBe(false)
    expect(viewer().exists()).toBe(true)
    expect(backBtn().exists()).toBe(false)
  })

  it('AC2 — ✎ (the viewer emits edit) opens the SAME song in แก้ไข', async () => {
    await open()
    viewer().vm.$emit('edit')
    await nextTick()
    expect(editor().props('active')).toBe(true)
    expect(editor().props('song').id).toBe('s1')
  })

  it('AC3 — แก้ไข shows "← กลับไปฝึกร้อง" at the top; with nothing changed it goes straight back to the same song', async () => {
    await open()
    viewer().vm.$emit('edit')
    await nextTick()
    const b = backBtn()
    expect(b.exists()).toBe(true)
    expect(b.text()).toContain('กลับไปฝึกร้อง')
    // it sits ABOVE the editor, at the top of the page
    expect(b.element.compareDocumentPosition(editor().element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await b.trigger('click')
    expect(w.find('[role="alertdialog"]').exists()).toBe(false) // nothing to lose → no question
    expect(editor().props('active')).toBe(false)
    expect(viewer().props('song').title_th).toBe('เพลงทดสอบ')
  })

  it('AC4 — unsaved edits: back asks first; "แก้ต่อ" (focused, the safe default) keeps the edits and stays', async () => {
    await open()
    viewer().vm.$emit('edit')
    await nextTick()
    editor().vm.isDirty = true
    editor().vm.$emit('change', { ...ROW, title_th: 'ชื่อที่แก้ยังไม่บันทึก' })
    await backBtn().trigger('click')
    await nextTick()
    const dlg = w.find('[role="alertdialog"]')
    expect(dlg.exists()).toBe(true)
    expect(dlg.attributes('aria-modal')).toBe('true')
    expect(dlg.text()).toContain('ยังไม่ได้บันทึก')
    const keep = dlg.findAll('button').find((b) => b.text() === 'แก้ต่อ')
    expect(document.activeElement).toBe(keep.element)
    await keep.trigger('click')
    await nextTick()
    expect(w.find('[role="alertdialog"]').exists()).toBe(false)
    expect(editor().props('active')).toBe(true) // still editing
    expect(editorMounts).toBe(1) // the editor (and its edits) untouched
    expect(document.activeElement).toBe(backBtn().element)
  })

  it('AC4 — Esc or a tap outside the card also means "แก้ต่อ"', async () => {
    await open()
    viewer().vm.$emit('edit')
    await nextTick()
    editor().vm.isDirty = true
    await backBtn().trigger('click')
    await nextTick()
    await w.find('.ed-leave-scrim').trigger('keydown', { key: 'Escape' })
    expect(w.find('[role="alertdialog"]').exists()).toBe(false)
    expect(editor().props('active')).toBe(true)
    await backBtn().trigger('click')
    await nextTick()
    await w.find('.ed-leave-scrim').trigger('click')
    expect(w.find('[role="alertdialog"]').exists()).toBe(false)
    expect(editor().props('active')).toBe(true)
  })

  it('AC4 — "ทิ้งแล้วกลับ" really drops the edits: ฝึกร้อง shows the SAVED song and the editor starts over', async () => {
    await open()
    viewer().vm.$emit('edit')
    await nextTick()
    editor().vm.isDirty = true
    editor().vm.$emit('change', { ...ROW, title_th: 'ชื่อที่แก้ยังไม่บันทึก' })
    await nextTick()
    await backBtn().trigger('click')
    await nextTick()
    await w.find('[role="alertdialog"]').findAll('button').find((b) => b.text() === 'ทิ้งแล้วกลับ').trigger('click')
    await nextTick()
    expect(w.find('[role="alertdialog"]').exists()).toBe(false)
    expect(editor().props('active')).toBe(false)
    expect(viewer().props('song').title_th).toBe('เพลงทดสอบ') // the saved name, not the unsaved edit
    expect(editorMounts).toBe(2) // a fresh editor from the saved song
  })
})
