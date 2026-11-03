// ใบ v3/pleng#145 — in and out of แก้ไข: ✎ on the ฝึกร้อง bar opens the same song in แก้ไข; "← กลับไปฝึกร้อง"
// (top left · ข้อเสนอ ก, พี่เอม 2 พ.ย. 2569) brings you back to it; unsaved work is never dropped silently.
//   AC1 ✎ on the ฝึกร้อง bar, where Aa was, for everyone (logged in or not)
//   AC2 ✎ → the same song in แก้ไข
//   AC3 a clear way back → the same song in ฝึกร้อง
//   AC4 sad path: unsaved edits are never dropped — since ใบ#148 (พี่เปา) ← takes them along to ฝึกร้อง and ✎ brings them back
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
const backBtn = () => w.find('.ed-back .ed-back-btn') // ใบ#146's ก่อนพิมพ์ has a back button too

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

  // ใบ v3/pleng#148 (พี่เปา 3 พ.ย. 2569) replaced ใบ#145's AC4 question: "ควรกลับไปฟังได้แล้วกลับมาแก้ต่อได้เหมือนเมื่อก่อน".
  // ← with unsaved edits now goes to ฝึกร้อง WITH them, and ✎ comes back to them — nothing is ever thrown away.
  it('ใบ#148 — unsaved edits: ← goes straight to ฝึกร้อง, which plays the edits; nothing is asked or dropped', async () => {
    await open()
    viewer().vm.$emit('edit')
    await nextTick()
    editor().vm.isDirty = true
    editor().vm.$emit('change', { ...ROW, title_th: 'ชื่อที่แก้ยังไม่บันทึก' })
    await nextTick()
    await backBtn().trigger('click')
    await nextTick()
    expect(w.find('[role="alertdialog"]').exists()).toBe(false)
    expect(editor().props('active')).toBe(false)
    expect(viewer().props('song').title_th).toBe('ชื่อที่แก้ยังไม่บันทึก') // hears what was just edited
    expect(editorMounts).toBe(1) // the editor and its edits are untouched
  })

  it('ใบ#148 — ✎ after ← comes back to the same edits, where the editing was on the page', async () => {
    const scrolls = []
    window.scrollTo = (o) => scrolls.push(o.top)
    await open()
    viewer().vm.$emit('edit')
    await nextTick()
    editor().vm.isDirty = true
    window.scrollY = 1234
    await backBtn().trigger('click')
    window.scrollY = 0
    viewer().vm.$emit('edit')
    await nextTick()
    await nextTick()
    expect(editor().props('active')).toBe(true)
    expect(editor().vm.isDirty).toBe(true)
    expect(editorMounts).toBe(1)
    expect(scrolls.at(-1)).toBe(1234)
    window.scrollY = 0
  })
})
