// ใบ v3/pleng#113 — where there is room the bar is ONE row: the seek bar + time on the left, the
// whole button group on the right. Only while the seek bar keeps at least 240px with every button
// and gap at full size; otherwise the bar stays as before (seek row on top, buttons under it, two
// button rows on a phone). A bar with no seek bar (แผ่นเพลง · แก้ไข) never changes.
// jsdom has no layout: the bar's column width, the button widths and the time label are faked.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import fs from 'node:fs'
import path from 'node:path'
import DockKey from './DockKey.vue'
import SingTransport from './SingTransport.vue'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

const singItems = () => [
  { id: 'back', kind: 'btn', name: 'ท่อนก่อน', icon: 'skip-back', place: { anchor: 'left', row: 1 }, run: () => {} },
  { id: 'play', kind: 'play', name: 'เล่น/หยุด', place: { anchor: 'rightOf:back', row: 1 }, control: { value: false }, run: () => {} },
  { id: 'forward', kind: 'btn', name: 'ท่อนถัดไป', icon: 'skip-forward', place: { anchor: 'rightOf:play', row: 1 }, run: () => {} },
  { id: 'export', kind: 'slot', name: 'ดาวน์โหลด', place: { anchor: 'rightOf:forward', row: 1 } },
  { id: 'scale', kind: 'aa', name: 'ขนาดตัวอักษร', place: { anchor: 'leftOf:setting', row: 1 }, permanent: true },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'timeslide', kind: 'timeline', name: 'ไทม์ไลน์', place: { row: 2, col: 1 }, flex: '1 1 auto' },
  { id: 'key', kind: 'menu', name: 'คีย์', icon: 'key-round', place: { row: 2, col: 4 }, control: { options: [{ value: 'C', label: 'C' }], value: 'C', badge: 'C', onPick: () => {} } },
  { id: 'speed', kind: 'slot', name: 'ความเร็ว', place: { row: 2, col: 5 }, permanent: true },
  { id: 'tuan', kind: 'sel', name: 'เลือกท่อน', place: { row: 2, col: 6 } },
  { id: 'soundctl', kind: 'slot', name: 'เสียงดนตรี', place: { row: 2, col: 7 } },
  { id: 'repeat', kind: 'toggle', name: 'วนซ้ำ', icon: 'repeat', default: 'inSetting', pinnable: true, control: { value: false, onToggle: () => {} } },
]
const sheetItems = () => [
  { id: 'print', kind: 'btn', name: 'พิมพ์', icon: 'printer', prime: true, place: { anchor: 'left', row: 1 }, run: () => {} },
  { id: 'export', kind: 'slot', name: 'ดาวน์โหลด', place: { anchor: 'rightOf:print', row: 1 } },
  { id: 'scale', kind: 'aa', name: 'ขนาดตัวอักษร', place: { anchor: 'leftOf:setting', row: 1 }, permanent: true },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
]
// the seek cell as SingTransport draws it: [ slider ][ ท่อนที่เล่น (may shrink) ][ 3:12 ]
const SEEK = `<template #cell-timeslide><span class="t-wrap"><span class="t-rail" role="slider" tabindex="0" aria-label="ตำแหน่ง" aria-valuenow="0"></span><span class="t-now" data-dk-shrink>ข้อ 1 • รอบ 2/4</span><span class="t-time">3:12</span></span></template>`
const cell = (id) => `<template #cell-${id}="{ open, toggle }"><button class="t-${id}" @click.stop="toggle">${id}</button><div v-if="open" class="dk-pop">pop ${id}</div></template>`
const Host = {
  components: { DockKey },
  props: ['items'],
  template: `<DockKey :items="items" store-key="b113">${SEEK}${['export', 'scale', 'speed', 'tuan', 'soundctl'].map(cell).join('')}</DockKey>`,
}
const mountBar = (items = singItems()) => mount(Host, { props: { items }, global: { stubs: { Icon: true } }, attachTo: document.body })
const flush = async () => { for (let i = 0; i < 4; i++) await nextTick() }

// ---- fake layout ----
// buttons: 48px each, คีย์ 52 · ความเร็ว 53 (a badge) · พิมพ์ 48 → the ฝึกร้อง group is
//   8×48 + 52 + 53 + 9 gaps × 8 = 561px
// beside the slider: the time label 30px + 2 gaps × 8 + padding 4+4 = 54px (the ท่อน label is
//   ignored: it gives up its room) → one row needs 561 + 16 + 240 + 54 = 871px of column
const WIDTH = { key: 52, speed: 53 }
const SING_ONE_ROW = 871
const realRect = Element.prototype.getBoundingClientRect
const realClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')
const realGCS = window.getComputedStyle
function fakeLayout(avail) {
  Element.prototype.getBoundingClientRect = function () {
    const id = this.dataset?.cell
    let w = 0
    if (id && id !== 'timeslide') w = WIDTH[id] || 48
    else if (this.classList?.contains('t-time')) w = 30
    else if (this.classList?.contains('t-now')) w = 120
    return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: w ? 48 : 0, width: w, height: w ? 48 : 0, toJSON() {} }
  }
  Object.defineProperty(Element.prototype, 'clientWidth', {
    configurable: true,
    get() { return this.classList?.contains('dk-inner') || this.classList?.contains('dk-btnrow') ? avail : 0 },
  })
  window.getComputedStyle = (el, p) => {
    const cs = realGCS(el, p)
    const over = el.classList?.contains('dk-btnrow') ? { columnGap: '8px' }
      : el.classList?.contains('t-wrap') ? { columnGap: '8px', paddingLeft: '4px', paddingRight: '4px' } : null
    return over ? new Proxy(cs, { get: (t, k) => (k in over ? over[k] : Reflect.get(t, k)) }) : cs
  }
}
function realLayout() {
  Element.prototype.getBoundingClientRect = realRect
  if (realClientWidth) Object.defineProperty(Element.prototype, 'clientWidth', realClientWidth)
  window.getComputedStyle = realGCS
}
async function resizeTo(avail) {
  fakeLayout(avail)
  window.dispatchEvent(new Event('resize'))
  await flush()
}
const ids = (row) => row.findAll(':scope > [data-cell]').map((e) => e.attributes('data-cell'))
const BAR_ORDER = ['back', 'play', 'forward', 'export', 'scale', 'key', 'speed', 'tuan', 'soundctl', 'setting']

beforeEach(() => { localStorage.clear(); document.body.innerHTML = '' })
afterEach(() => { realLayout() })

describe('ใบ#113 ข้อ 1–2 — one row while the seek bar keeps 240px', () => {
  for (const avail of [1184, 1008, SING_ONE_ROW]) {
    it(`column ${avail}px: ONE row — seek bar left, every button right, same order`, async () => {
      const w = mountBar()
      await resizeTo(avail)
      expect(w.find('.dk-host').classes()).toContain('dk-one')
      // still the same two pieces, side by side: the seek cell first, then the one button group
      const rows = w.findAll('.dk-inner > .dk-row')
      expect(rows.map((r) => r.classes().includes('dk-seekrow'))).toEqual([true, false])
      expect(ids(rows[0])).toEqual(['timeslide'])
      expect(w.findAll('.dk-btnrow')).toHaveLength(1)
      expect(ids(rows[1])).toEqual(BAR_ORDER)
    })
  }

  it(`one pixel short (${SING_ONE_ROW - 1}px): back to the seek row on top, buttons below`, async () => {
    const w = mountBar()
    await resizeTo(SING_ONE_ROW - 1)
    expect(w.find('.dk-host').classes()).not.toContain('dk-one')
    expect(w.findAll('.dk-btnrow')).toHaveLength(1)
  })

  it('the ท่อน label beside the slider does not move the switch (it shrinks instead)', async () => {
    // the fake gives that label 120px; if it counted, 871px would not be enough
    const w = mountBar()
    await resizeTo(SING_ONE_ROW)
    expect(w.find('.dk-host').classes()).toContain('dk-one')
  })

  it('switches both ways while the window is resized (no reload)', async () => {
    const w = mountBar()
    const one = () => w.find('.dk-host').classes().includes('dk-one')
    await resizeTo(1184); expect(one()).toBe(true)
    await resizeTo(696); expect(one()).toBe(false)
    await resizeTo(359); expect(w.findAll('.dk-btnrow')).toHaveLength(2)
    await resizeTo(SING_ONE_ROW); expect(one()).toBe(true)
    expect(w.findAll('.dk-btnrow')).toHaveLength(1)
  })
})

describe('ใบ#113 ข้อ 3 — narrow screens unchanged', () => {
  it('Fold (712 → column 696px): seek row on top, one button row', async () => {
    const w = mountBar()
    await resizeTo(696)
    expect(w.find('.dk-host').classes()).not.toContain('dk-one')
    expect(ids(w.find('.dk-seekrow'))).toEqual(['timeslide'])
    expect(ids(w.find('.dk-btnrow'))).toEqual(BAR_ORDER)
  })

  it('phone (375 → column 359px): seek row + two button rows, as before', async () => {
    const w = mountBar()
    await resizeTo(359)
    expect(w.find('.dk-host').classes()).not.toContain('dk-one')
    const rows = w.findAll('.dk-btnrow')
    expect(rows.map(ids)).toEqual([['back', 'play', 'forward', 'export', 'scale'], ['key', 'speed', 'tuan', 'soundctl', 'setting']])
  })
})

describe('ใบ#113 ข้อ 3–4 — a bar with no seek bar never changes', () => {
  it('แผ่นเพลง: one button row at every width, never "one"', async () => {
    const w = mountBar(sheetItems())
    for (const avail of [1184, 696, 359]) {
      await resizeTo(avail)
      expect(w.find('.dk-host').classes()).not.toContain('dk-one')
      expect(w.findAll('.dk-inner > .dk-row')).toHaveLength(1)
    }
  })

  it('แก้ไข (a key band, no seek bar): never "one"', async () => {
    const items = [...sheetItems(), { id: 'keys', kind: 'keys', name: 'แป้น', rows: [['1', '2', '3']], onInsert: () => {} }]
    const w = mountBar(items)
    await resizeTo(1184)
    expect(w.find('.dk-host').classes()).not.toContain('dk-one')
    expect(w.find('.dk-keys').exists()).toBe(true)
  })
})

describe('ใบ#113 ข้อ 6 — one toolbar, seek bar first in Tab order', () => {
  it('the seek bar and the buttons are in the same role="toolbar", seek bar first', async () => {
    const w = mountBar()
    await resizeTo(1184)
    const bars = w.findAll('[role="toolbar"]')
    expect(bars).toHaveLength(1)
    const tabbables = bars[0].findAll('[role="slider"], button')
    expect(tabbables[0].attributes('role')).toBe('slider')
  })
})

// the sizes come from CSS, which jsdom does not apply — guard the one-row rules in the stylesheet
describe('ใบ#113 — the one-row stylesheet', () => {
  const css = fs.readFileSync(path.resolve(__dirname, 'DockKey.vue'), 'utf8').split('<style scoped>')[1]
  it('side by side in the centred column, 16px apart; buttons keep their size and do not wrap', () => {
    expect(css).toMatch(/\.dk-bar\.dk-one \.dk-inner \{ display: flex; align-items: center; gap: 16px; \}/)
    expect(css).toMatch(/\.dk-bar\.dk-one \.dk-seekrow \{ flex: 1 1 0; min-width: 0; \}/)
    expect(css).toMatch(/\.dk-bar\.dk-one \.dk-btnrow \{ flex: 0 0 auto; flex-wrap: nowrap; \}/)
    expect(css).toMatch(/\.dk-inner \{ max-width: 1200px; margin: 0 auto; \}/)
  })
  it('the seek slider is never shorter than 240px on one row', () => {
    expect(css).toMatch(/\.dk-bar\.dk-one \.dk-seekrow :deep\(\[role="slider"\]\) \{ min-width: 240px; \}/)
  })
})

describe('ใบ#113 ข้อ 6 — the real ฝึกร้อง seek bar works from the keyboard', () => {
  const mountT = (over = {}) => mount(SingTransport, {
    props: { frac: 0.5, totalSec: 100, hasSections: false, ...over },
    global: { stubs: { Icon: true, ExportTool: true, SoundControl: true, TempoControl: true } },
    attachTo: document.body,
  })
  it('Tab reaches it (tabindex 0) and it says where the song is', () => {
    const s = mountT().find('.st-seek')
    expect(s.attributes('tabindex')).toBe('0')
    expect(s.attributes('role')).toBe('slider')
    expect(s.attributes('aria-valuetext')).toBe('0:50 จาก 1:40')
  })
  it('← → move 5 seconds · Page Up/Down 10% · Home/End the ends — and the page does not scroll', async () => {
    const w = mountT()
    const s = w.find('.st-seek')
    const cases = [['ArrowRight', 0.55], ['ArrowUp', 0.55], ['ArrowLeft', 0.45], ['ArrowDown', 0.45], ['PageUp', 0.6], ['PageDown', 0.4], ['Home', 0], ['End', 1]]
    for (const [key] of cases) {
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      s.element.dispatchEvent(ev)
      expect(ev.defaultPrevented).toBe(true)
    }
    expect(w.emitted('seek').map((e) => +e[0].toFixed(3))).toEqual(cases.map((c) => c[1]))
  })
  it('stays inside the song at the ends, and other keys are left alone', async () => {
    const w = mountT({ frac: 0.99 })
    const s = w.find('.st-seek')
    await s.trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('seek')[0][0]).toBe(1)
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    s.element.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(false)
    expect(w.emitted('seek')).toHaveLength(1)
  })
})
