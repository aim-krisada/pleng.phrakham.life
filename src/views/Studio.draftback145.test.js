// ใบ v3/pleng#145 — a draft opened from รอตรวจ (/studio?draft=…) must look like a song opened with ✎:
// "← กลับไปฝึกร้อง" at the top, so the reviewer can go and hear the whole song (พี่เอม 3 พ.ย. 2569).
// There is no saved song behind such a page — the draft lives in the editor — so ฝึกร้อง plays the draft.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({ useRoute: () => ({ params: {}, query: { draft: 'd1' }, fullPath: '/studio?draft=d1' }), useRouter: () => ({ push() {}, replace() {} }) }))
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit', 'retry']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
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

const DRAFT = {
  id: 's9', number: 9, title_th: 'เพลงในร่าง', title_en: '',
  content: { version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] },
}
let editorMounts = 0
let draftId = 'd1'
const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], emits: ['edit', 'set', 'dock', 'print'], template: '<div class="stub-viewer" />' },
  SongSheet: true,
  DockKey: true,
  // the real editor opens ?draft= itself and exposes which draft it holds (currentDraftId)
  EditorMode: {
    name: 'EditorMode', props: ['song', 'tier', 'active', 'initialSet'], emits: ['change', 'save'],
    data: () => ({ isDirty: false, currentDraftId: draftId, editingId: null }),
    // the draft arrives after a fetch, i.e. after the page has set itself up (as in the real editor)
    mounted() { editorMounts++; Promise.resolve().then(() => this.$emit('change', DRAFT)) },
    template: '<div class="stub-editor" />',
  },
  Icon: true,
}

let w = null
beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  editorMounts = 0
  draftId = 'd1'
  window.scrollTo = () => {}
})
afterEach(() => { w?.unmount(); w = null })

async function open() {
  w = mount(Studio, { global: { stubs }, attachTo: document.body })
  await flushPromises()
  await nextTick()
  return w
}
const editor = () => w.findComponent({ name: 'EditorMode' })
const viewer = () => w.findComponent({ name: 'SongViewer' })
const backBtn = () => w.find('.ed-back .ed-back-btn')

describe('ใบ#145 — a draft from รอตรวจ has the same way back as ✎', () => {
  it('opens in แก้ไข with "← กลับไปฝึกร้อง" at the top, like a song opened with ✎', async () => {
    await open()
    expect(editor().props('active')).toBe(true)
    expect(backBtn().exists()).toBe(true)
    expect(backBtn().text()).toContain('กลับไปฝึกร้อง')
  })

  it('← goes to ฝึกร้อง, which plays the draft; ✎ there comes back to the same editor', async () => {
    await open()
    await backBtn().trigger('click')
    expect(editor().props('active')).toBe(false)
    expect(viewer().props('song')).toMatchObject({ number: 9, title_th: 'เพลงในร่าง' })
    viewer().vm.$emit('edit')
    await nextTick()
    expect(editor().props('active')).toBe(true)
    expect(editorMounts).toBe(1) // the same editor, the draft still open
  })

  it('ใบ#148 — unsaved edits on the draft: ← takes them to ฝึกร้อง, no question, the same editor stays', async () => {
    await open()
    editor().vm.isDirty = true
    await backBtn().trigger('click')
    await nextTick()
    expect(w.find('[role="alertdialog"]').exists()).toBe(false)
    expect(editor().props('active')).toBe(false)
    expect(editorMounts).toBe(1)
    expect(viewer().props('song')).toMatchObject({ title_th: 'เพลงในร่าง' })
  })

  it('ใบ#148 (พี่เปา) — after อนุมัติและเผยแพร่ the ← is still there: the editor now holds the published song', async () => {
    await open()
    editor().vm.currentDraftId = null // approved: the draft is gone …
    editor().vm.editingId = 's9' // … and the editor holds the song it became
    await nextTick()
    expect(backBtn().exists()).toBe(true)
    await backBtn().trigger('click')
    expect(editor().props('active')).toBe(false)
  })

  it('a brand-new song (no draft open) still has no ← — there is no ฝึกร้อง page yet', async () => {
    draftId = null
    await open()
    expect(backBtn().exists()).toBe(false)
    expect(w.find('.ed-back .ed-sheet-btn').exists()).toBe(true) // ดูแผ่นเพลง is there for any song
  })
})
