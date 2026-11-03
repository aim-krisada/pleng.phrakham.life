// ใบ v3/pleng#148 — แก้เพลงกับดูแผ่นเพลงคู่กันบนคอม
//   AC1 a screen 1280 wide or more: แก้ไข shows the sheet on the right (the ก่อนพิมพ์ paper)
//   AC2 an edit the editor pushes up redraws that sheet at once, no save needed
//   AC4 ซ่อน / แสดงแผ่นข้างขวา, remembered on this device
//   AC5 a narrower screen has no sheet beside the editor; ดูแผ่นเพลง stays
//   Notes 3 (พี่เอม 3 พ.ย. 2569) — with the sheet beside it the editor drops its floating ดูผลทั้งเพลง window
// AC3 (same look and line breaks as ก่อนพิมพ์) holds by construction: both draw one SongSheet from the same
// settings (paperSheetProps). AC6 (scroll to the line being edited) needs real layout — checked in the browser.
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

const stubs = {
  SongViewer: { name: 'SongViewer', props: ['song'], emits: ['edit', 'set', 'dock', 'print'], template: '<div class="stub-viewer" />' },
  SongSheet: { name: 'SongSheet', props: ['content', 'displayKey', 'songbook', 'showChord', 'songTitle'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active', 'initialSet', 'sidePaper'], data: () => ({ isDirty: false }), template: '<div class="stub-editor" />' },
  DockKey: true,
  Icon: true,
}

let w = null
let wide = true
beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  window.scrollTo = () => {}
  window.matchMedia = (q) => ({ matches: q.includes('1280') ? wide : false, media: q, addEventListener() {}, removeEventListener() {} })
  localStorage.clear()
  wide = true
})
afterEach(() => { w?.unmount(); w = null })

async function toEdit() {
  w = mount(Studio, { global: { stubs }, attachTo: document.body })
  await flushPromises()
  await nextTick()
  w.findComponent({ name: 'SongViewer' }).vm.$emit('edit')
  await flushPromises()
  await nextTick()
  return w
}
const editor = () => w.findComponent({ name: 'EditorMode' })
const sideSheet = () => w.find('.ed-side').findComponent({ name: 'SongSheet' })
const sideBtn = () => w.findAll('.ed-back button').find((b) => b.text().includes('แผ่นข้างขวา'))

describe('ใบ#148 — แผ่นเพลงข้างหน้าแก้ไข', () => {
  it('AC1 — a wide screen shows the sheet beside the editor, with the song on it', async () => {
    await toEdit()
    expect(w.find('.ed-split').classes()).toContain('on')
    expect(w.find('.ed-side .pv-paper').exists()).toBe(true)
    expect(sideSheet().props('content').lines.length).toBeGreaterThan(0)
  })

  it('Notes 3 — the editor is told to drop its floating window', async () => {
    await toEdit()
    expect(editor().props('sidePaper')).toBe(true)
  })

  it('AC2 — an edit redraws the sheet at once', async () => {
    await toEdit()
    expect(sideSheet().props('songTitle')).toContain('เพลงทดสอบ')
    editor().vm.$emit('change', { ...ROW, title_th: 'ชื่อใหม่' })
    await nextTick()
    expect(sideSheet().props('songTitle')).toContain('ชื่อใหม่')
  })

  it('AC4 — ซ่อน puts the sheet away, แสดง brings it back, and the choice is remembered', async () => {
    await toEdit()
    await sideBtn().trigger('click')
    expect(w.find('.ed-side').exists()).toBe(false)
    expect(sideBtn().text()).toContain('แสดงแผ่นข้างขวา')
    expect(localStorage.getItem('pleng.editor.sidePaper')).toBe('0')
    expect(editor().props('sidePaper')).toBe(true) // still no floating window: the button brings the sheet back
    w.unmount()
    await toEdit()
    expect(w.find('.ed-side').exists()).toBe(false)
    await sideBtn().trigger('click')
    expect(w.find('.ed-side').exists()).toBe(true)
  })

  it('AC5 — a narrower screen keeps the old way: no sheet beside, the floating window stays, ดูแผ่นเพลง stays', async () => {
    wide = false
    await toEdit()
    expect(w.find('.ed-side').exists()).toBe(false)
    expect(sideBtn()).toBeUndefined()
    expect(editor().props('sidePaper')).toBe(false)
    expect(w.find('.ed-back').text()).toContain('ดูแผ่นเพลง')
  })

  it('the sheet beside is only for แก้ไข — ฝึกร้อง never shows it', async () => {
    w = mount(Studio, { global: { stubs }, attachTo: document.body })
    await flushPromises()
    await nextTick()
    expect(w.find('.ed-side').exists()).toBe(false)
  })
})
