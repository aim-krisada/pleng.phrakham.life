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
  SongViewer: { name: 'SongViewer', props: ['song', 'sheet'], emits: ['edit', 'set', 'dock', 'print', 'view-mode', 'key'], template: '<div class="stub-viewer" />' },
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
    // ใบ#160 — opened from ฝึกร้อง, คีย์ is the bottom bar's (one place to change it), not a row here
    expect(ids).toEqual(['book', 'lyricjoin', 'display', 'chord'])
    expect(w.find('.pv-set').text()).not.toContain('ขนาดตัวอักษร')
  })

  it('AC2 — a change redraws the sheet at once', async () => {
    await toPreview()
    expect(sheet().props('displayKey')).toBe('C')
    // ใบ#160 — the key picked on the bottom bar redraws the paper
    viewer().vm.$emit('key', 'D')
    await nextTick()
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

  it('AC5 — ใบ#160: the bar ฝึกร้อง goes back to the same song (no ← of its own from ฝึกร้อง)', async () => {
    await toPreview()
    expect(w.find('.pv-top .pv-back').exists()).toBe(false)
    expect(viewer().props('sheet')).toBe(true)
    viewer().vm.$emit('view-mode', 'sing')
    await nextTick()
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

// พี่เอม 3 พ.ย. 2569: "แสดงเป็น full ก่อน แล้วก็ zoom in zoom out ได้". jsdom has no layout, so the column
// measures 0 and เต็มแผ่น is real size (100%); in a browser it is the column ÷ the A4 width, at most 100%.
describe('ใบ#146 — เต็มแผ่น first, then − / +', () => {
  const val = () => w.find('.pv-zoom .pv-zval').text()
  const fit = () => w.find('.pv-zoom .pv-zfit')
  const btn = (label) => w.find(`.pv-zoom [aria-label="${label}"]`)
  const paperStyle = () => w.find('.pv-paper').attributes('style')

  it('opens เต็มแผ่น, and the paper is the scaled picture of a real-size page', async () => {
    await toPreview()
    expect(val()).toBe('100%')
    expect(fit().attributes('aria-pressed')).toBe('true')
    expect(w.find('.pv-paper').attributes()).toHaveProperty('data-layout-scale')
    expect(paperStyle()).toContain('scale(1)')
  })

  it('+ and − step the zoom, and เต็มแผ่น brings the whole page back', async () => {
    await toPreview()
    await btn('ขยาย').trigger('click')
    expect(val()).toBe('150%')
    expect(paperStyle()).toContain('scale(1.5)')
    expect(fit().attributes('aria-pressed')).toBe('false')
    await btn('ย่อ').trigger('click')
    await btn('ย่อ').trigger('click')
    expect(val()).toBe('75%')
    await fit().trigger('click')
    expect(val()).toBe('100%')
    expect(fit().attributes('aria-pressed')).toBe('true')
  })

  it('the steps stop at 25% and 200%', async () => {
    await toPreview()
    for (let i = 0; i < 6; i++) await btn('ขยาย').trigger('click')
    expect(val()).toBe('200%')
    expect(btn('ขยาย').attributes()).toHaveProperty('disabled')
    for (let i = 0; i < 8; i++) await btn('ย่อ').trigger('click')
    expect(val()).toBe('25%')
    expect(btn('ย่อ').attributes()).toHaveProperty('disabled')
  })

  it('coming back from ฝึกร้อง opens เต็มแผ่น again', async () => {
    await toPreview()
    await btn('ขยาย').trigger('click')
    viewer().vm.$emit('view-mode', 'sing')
    await nextTick()
    viewer().vm.$emit('print')
    await nextTick()
    expect(val()).toBe('100%')
  })
})
