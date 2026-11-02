// ใบ v3/pleng#146 — ก่อนพิมพ์: ดาวน์โหลด › พิมพ์ in ฝึกร้อง opens the A4 sheet with its settings, then prints.
//   AC1 ดาวน์โหลด › พิมพ์ → the ก่อนพิมพ์ page, not the printer straight away
//   AC2 every sheet setting is here (แบบแผ่น · คีย์ · เนื้อร้อง · แสดงผล · คอร์ด) and a change redraws the sheet
//       at once. No ขนาดตัวอักษร: the paper's size is fixed by ใบ#140 (พี่เอม 2 พ.ย. 2569)
//   AC3 พิมพ์ / บันทึก PDF → window.print()
//   AC5 ← back → the same song in ฝึกร้อง
//   AC6 the page count is shown (where each page starts: lib/printPages.test.js)
// AC4 (paper left · settings right / paper on top · settings below) is CSS layout, which jsdom does not
// do — it is checked in the browser at 375 and 1280.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ExportTool from '../components/ExportTool.vue'

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
  SongSheet: { name: 'SongSheet', props: ['content', 'displayKey', 'songbook', 'showChord'], template: '<div class="stub-sheet" />' },
  EditorMode: { name: 'EditorMode', props: ['song', 'tier', 'active', 'initialSet'], data: () => ({ isDirty: false }), template: '<div class="stub-editor" />' },
  DockKey: true,
  Icon: true,
}

let w = null
beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  window.scrollTo = () => {}
  localStorage.clear()
})
afterEach(() => { w?.unmount(); w = null })

async function open() {
  w = mount(Studio, { global: { stubs }, attachTo: document.body })
  await flushPromises()
  await nextTick()
  return w
}
const viewer = () => w.findComponent({ name: 'SongViewer' })
const sheet = () => w.findComponent({ name: 'SongSheet' })
const shown = (sel) => w.find(sel).element.style.display !== 'none'
async function toPreview() {
  await open()
  viewer().vm.$emit('print')
  await nextTick()
}

describe('ใบ#146 — ก่อนพิมพ์', () => {
  it('AC1 — พิมพ์ in the ดาวน์โหลด menu calls the page instead of the printer, when the page asks', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const onPrint = vi.fn()
    const et = mount(ExportTool, { props: { open: true, onPrint }, global: { stubs: { Icon: true } } })
    await et.findAll('.et-row')[0].trigger('click')
    expect(onPrint).toHaveBeenCalledTimes(1)
    expect(print).not.toHaveBeenCalled()
    expect(et.emitted('close')).toBeTruthy() // the menu closes
    et.unmount()
    print.mockRestore()
  })

  it('AC1 — without that, พิมพ์ still prints straight away (แก้ไข keeps its old behaviour)', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const et = mount(ExportTool, { props: { open: true }, global: { stubs: { Icon: true } } })
    await et.findAll('.et-row')[0].trigger('click')
    expect(print).toHaveBeenCalledTimes(1)
    et.unmount()
    print.mockRestore()
  })

  it('AC1 — ฝึกร้อง asking to print opens ก่อนพิมพ์ with the song on the paper', async () => {
    await open()
    expect(shown('.sheet-workspace')).toBe(false)
    viewer().vm.$emit('print')
    await nextTick()
    expect(shown('.sheet-workspace')).toBe(true)
    expect(w.find('.pv-paper').exists()).toBe(true)
    expect(sheet().props('content').lines.length).toBeGreaterThan(0)
  })

  it('AC2 — every sheet setting is a row here, and there is no font-size row', async () => {
    await toPreview()
    const ids = w.findAll('.pv-set [data-setting]').map((r) => r.attributes('data-setting'))
    expect(ids).toEqual(['book', 'key', 'lyricjoin', 'display', 'chord'])
    expect(w.find('.pv-set').text()).not.toContain('ขนาดตัวอักษร')
  })

  it('AC2 — a change redraws the sheet at once', async () => {
    await toPreview()
    expect(sheet().props('displayKey')).toBe('C')
    await w.find('.pv-set [data-setting="key"] select').setValue('D')
    expect(sheet().props('displayKey')).toBe('D')
    await w.find('.pv-set [data-setting="book"] select').setValue('full')
    expect(sheet().props('songbook')).toBe(false)
    await w.find('.pv-set [data-setting="chord"] select').setValue('hidden')
    expect(sheet().props('showChord')).toBe(false)
  })

  it('AC3 — พิมพ์ / บันทึก PDF prints', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    await toPreview()
    const btn = w.find('.pv-set .pv-print')
    expect(btn.text()).toContain('พิมพ์ / บันทึก PDF')
    await btn.trigger('click')
    expect(print).toHaveBeenCalledTimes(1)
    print.mockRestore()
  })

  it('AC5 — ← goes back to the same song in ฝึกร้อง', async () => {
    await toPreview()
    const back = w.find('.pv-top .pv-back')
    expect(back.attributes('aria-label')).toBe('กลับไปฝึกร้อง')
    await back.trigger('click')
    expect(shown('.sheet-workspace')).toBe(false)
    expect(viewer().props('song').title_th).toBe('เพลงทดสอบ')
  })

  it('AC6 — the page count is said out loud, 1 page for a short song', async () => {
    await toPreview()
    const n = w.find('.pv-set .pv-pages')
    expect(n.attributes('role')).toBe('status')
    expect(n.text()).toBe('ทั้งหมด 1 หน้า A4')
    expect(w.findAll('.pv-break').length).toBe(0)
  })
})
