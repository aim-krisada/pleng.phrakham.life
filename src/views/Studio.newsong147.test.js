// ใบ v3/pleng#147 — สร้างเพลงใหม่ pressed while the song surface is open: Studio starts a blank editor, and
// AC5 (sad path) never drops unsaved work silently — it asks first, like ← กลับไปฝึกร้อง (ใบ#145).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const push = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 's1' }, query: {}, fullPath: '/song/s1' }), useRouter: () => ({ push, replace() {} }) }))
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
import { newSongRequest } from '../store.js'

let editorMounts = 0
const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], emits: ['edit', 'set', 'dock'], template: '<div class="stub-viewer" />' },
  SongSheet: true,
  DockKey: true,
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
  push.mockClear()
  window.scrollTo = () => {}
})
afterEach(() => { w?.unmount(); w = null })

async function open() {
  w = mount(Studio, { global: { stubs }, attachTo: document.body })
  await flushPromises()
  return w
}
const editor = () => w.findComponent({ name: 'EditorMode' })
async function pressNew() {
  newSongRequest.value++
  await nextTick()
  await flushPromises()
}

describe('ใบ#147 — สร้างเพลงใหม่ on the song surface', () => {
  it('AC3 — nothing unsaved: a blank editor at once, and the URL leaves the song for /studio', async () => {
    await open()
    expect(editor().props('song').id).toBe('s1')
    await pressNew()
    expect(w.find('[role="alertdialog"]').exists()).toBe(false)
    expect(editor().props('active')).toBe(true)
    expect(editor().props('song')).toBeNull()
    expect(editorMounts).toBe(2) // a fresh editor
    expect(push).toHaveBeenCalledWith('/studio')
  })

  it('AC5 — unsaved edits: it asks first; "แก้ต่อ" keeps the song and the edits', async () => {
    await open()
    editor().vm.isDirty = true
    await pressNew()
    const dlg = w.find('[role="alertdialog"]')
    expect(dlg.exists()).toBe(true)
    expect(dlg.text()).toContain('ยังไม่ได้บันทึก')
    expect(dlg.text()).toContain('ถ้าเริ่มเพลงใหม่ตอนนี้ ที่แก้ไว้จะหาย')
    const keep = dlg.findAll('button').find((b) => b.text() === 'แก้ต่อ')
    expect(document.activeElement).toBe(keep.element)
    await keep.trigger('click')
    expect(w.find('[role="alertdialog"]').exists()).toBe(false)
    expect(editor().props('song').id).toBe('s1')
    expect(editorMounts).toBe(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('AC5 — "ทิ้งแล้วเริ่มใหม่" drops the edits and starts the blank song', async () => {
    await open()
    editor().vm.isDirty = true
    await pressNew()
    await w.find('[role="alertdialog"]').findAll('button').find((b) => b.text() === 'ทิ้งแล้วเริ่มใหม่').trigger('click')
    await flushPromises()
    expect(w.find('[role="alertdialog"]').exists()).toBe(false)
    expect(editor().props('active')).toBe(true)
    expect(editor().props('song')).toBeNull()
    expect(editorMounts).toBe(2)
    expect(push).toHaveBeenCalledWith('/studio')
  })

  it('the เพลง ▾ panel only opens songs now — no second สร้างเพลงใหม่ on the screen', async () => {
    await open()
    expect(document.querySelector('#shell-menus').textContent).not.toContain('สร้างเพลงใหม่')
  })
})
