// ใบ v3/pleng#109 — the phone bar (≤760px, ฝึกร้อง · แผ่นเพลง) is laid out like a media player:
//   1. the seek bar has the top row to itself; EVERY button sits in ONE centred row below it,
//      each at least 48×48px;
//   2. from 600px up the group is not stretched — the spacing stays 8px, as on a phone;
//   3. on a narrow phone, buttons that don't fit move into ⚙ from the end of the row
//      (never ⚙ · เล่น · Aa · ความเร็ว), and nothing runs off the screen.
// jsdom has no layout: the viewport is faked through matchMedia (the same switch DockKey reads)
// and, for item 3, the widths are faked on the row and its buttons.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import fs from 'node:fs'
import path from 'node:path'
import DockKey from './DockKey.vue'
import SingTransport from './SingTransport.vue'
import { planFold, canFold } from '../lib/dockFold.js'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}

const realMM = window.matchMedia
function setWidth(px) {
  window.matchMedia = (q) => {
    const m = /max-width:\s*(\d+)px/.exec(q)
    return { matches: m ? px <= +m[1] : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  }
}

// the ฝึกร้อง dock as SingTransport builds it (descriptor order kept), with plain slots
const singItems = () => [
  { id: 'grip', kind: 'grip', name: 'ย้าย/ย่อ', place: { anchor: 'left', row: 1 } },
  { id: 'back', kind: 'btn', name: 'ท่อนก่อน', icon: 'skip-back', place: { anchor: 'rightOf:grip', row: 1 }, run: () => {} },
  { id: 'play', kind: 'play', name: 'เล่น/หยุด', place: { anchor: 'rightOf:back', row: 1 }, control: { value: false }, run: () => {} },
  { id: 'forward', kind: 'btn', name: 'ท่อนถัดไป', icon: 'skip-forward', place: { anchor: 'rightOf:play', row: 1 }, run: () => {} },
  { id: 'export', kind: 'slot', name: 'ดาวน์โหลด', icon: 'download', place: { anchor: 'rightOf:forward', row: 1 } },
  { id: 'scale', kind: 'aa', name: 'ขนาดตัวอักษร', place: { anchor: 'leftOf:setting', row: 1 }, permanent: true },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'timeslide', kind: 'timeline', name: 'ไทม์ไลน์', place: { row: 2, col: 1, span: 3 }, flex: '1 1 auto' },
  { id: 'key', kind: 'menu', name: 'คีย์', icon: 'key-round', place: { row: 2, col: 4 }, control: { options: [{ value: 'C', label: 'C' }, { value: 'D', label: 'D' }], value: 'C', badge: 'C', onPick: () => {} } },
  { id: 'speed', kind: 'slot', name: 'ความเร็ว', icon: 'gauge', place: { row: 2, col: 5 }, permanent: true },
  { id: 'tuan', kind: 'sel', name: 'เลือกท่อน', icon: 'list-music', place: { row: 2, col: 6 } },
  { id: 'soundctl', kind: 'slot', name: 'เสียงดนตรี', icon: 'audio-lines', place: { row: 2, col: 7 } },
  { id: 'repeat', kind: 'toggle', name: 'วนซ้ำ', icon: 'repeat', default: 'inSetting', pinnable: true, control: { value: false, onToggle: () => {} } },
  { id: 'alpha', kind: 'slider', name: 'โปร่งใส', icon: 'blend', default: 'inSetting', pinnable: true, hideOnBar: true, control: { min: 40, max: 100, value: 96, onInput: () => {} } },
]
// a page-drawn cell: a trigger button + its popover while open (like ExportTool / SoundControl)
const cell = (id) => `<template #cell-${id}="{ open, toggle }"><button class="t-${id}" @click.stop="toggle">${id}</button><div v-if="open" class="dk-pop p-${id}">pop ${id}</div></template>`
const SLOTS = ['timeslide', 'export', 'scale', 'speed', 'tuan', 'soundctl']
const Host = {
  components: { DockKey },
  props: ['items', 'storeKey'],
  template: `<DockKey :items="items" :store-key="storeKey" bar-on-mobile>${SLOTS.map(cell).join('')}</DockKey>`,
}
const mountBar = (its = singItems(), storeKey = 'b109') => mount(Host, {
  props: { items: its, storeKey },
  global: { stubs: { Icon: true } },
  attachTo: document.body,
})
const rowIds = (row) => row.findAll(':scope > [data-cell]').map((e) => e.attributes('data-cell'))
const BAR_ORDER = ['back', 'play', 'forward', 'export', 'scale', 'key', 'speed', 'tuan', 'soundctl', 'setting']

// ---- fake layout for item 3: the row is `avail` px wide and every button has a width ----
const realRect = Element.prototype.getBoundingClientRect
const realClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')
const realGCS = window.getComputedStyle
const WIDTH = { key: 52, speed: 53 } // the rest are 48 (one touch target)
function fakeLayout(avail) {
  Element.prototype.getBoundingClientRect = function () {
    const id = this.dataset?.cell
    const w = id ? (WIDTH[id] || 48) : 0
    return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: id ? 48 : 0, width: w, height: id ? 48 : 0, toJSON() {} }
  }
  Object.defineProperty(Element.prototype, 'clientWidth', {
    configurable: true,
    get() { return this.classList?.contains('dk-btnrow') ? avail : 0 },
  })
  window.getComputedStyle = (el, p) => {
    const cs = realGCS(el, p)
    return el.classList?.contains('dk-btnrow') ? new Proxy(cs, { get: (t, k) => (k === 'columnGap' ? '8px' : Reflect.get(t, k)) }) : cs
  }
}
function realLayout() {
  Element.prototype.getBoundingClientRect = realRect
  if (realClientWidth) Object.defineProperty(Element.prototype, 'clientWidth', realClientWidth)
  window.getComputedStyle = realGCS
}
// the widths of a row of buttons laid out with an 8px gap
const rowWidth = (ids) => ids.reduce((s, id) => s + (WIDTH[id] || 48), 0) + 8 * (ids.length - 1)
const flush = async () => { for (let i = 0; i < 4; i++) await nextTick() }

beforeEach(() => { localStorage.clear(); document.body.innerHTML = '' })
afterEach(() => { window.matchMedia = realMM; realLayout() })

describe('ใบ#109 ข้อ 1 — seek bar on top, ONE button group below', () => {
  for (const px of [360, 375, 390, 600, 712, 760]) {
    it(`${px}px: exactly two rows — the seek row (timeline only), then every button in one row`, async () => {
      setWidth(px)
      const w = mountBar()
      await flush()
      expect(w.find('.dk-host').classes()).toContain('dk-bar')
      const rows = w.findAll('.dk-dock > .dk-row')
      expect(rows).toHaveLength(2)
      expect(rows[0].classes()).toContain('dk-seekrow')
      expect(rowIds(rows[0])).toEqual(['timeslide'])
      expect(rows[1].classes()).toContain('dk-btnrow')
      // the dock's own order: row 1 up to ⚙, then row 2's buttons, then ⚙ last
      expect(rowIds(rows[1])).toEqual(BAR_ORDER)
    })
  }

  it('a button pinned from ⚙ joins the same button row (before ⚙), not a row of its own', async () => {
    setWidth(390)
    localStorage.setItem('pleng.dockkey.b109.pins', JSON.stringify(['repeat']))
    const w = mountBar()
    await flush()
    const rows = w.findAll('.dk-dock > .dk-row')
    expect(rows).toHaveLength(2)
    expect(rowIds(rows[1]).slice(-2)).toEqual(['repeat', 'setting'])
  })

  it('a page with no seek bar (แผ่นเพลง) has just the one button row', async () => {
    setWidth(375)
    const its = [
      { id: 'grip', kind: 'grip', name: 'ย้าย/ย่อ', place: { anchor: 'left', row: 1 } },
      { id: 'print', kind: 'btn', name: 'พิมพ์', icon: 'printer', prime: true, place: { anchor: 'rightOf:grip', row: 1 }, run: () => {} },
      { id: 'export', kind: 'slot', name: 'ดาวน์โหลด', icon: 'download', place: { anchor: 'rightOf:print', row: 1 } },
      { id: 'scale', kind: 'aa', name: 'ขนาดตัวอักษร', place: { anchor: 'leftOf:setting', row: 1 }, permanent: true },
      { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
      { id: 'key', kind: 'menu', name: 'คีย์', icon: 'key-round', default: 'inSetting', pinnable: true, control: { options: [{ value: 'C', label: 'C' }], value: 'C', onPick: () => {} } },
    ]
    const w = mountBar(its, 'p109')
    await flush()
    const rows = w.findAll('.dk-dock > .dk-row')
    expect(rows).toHaveLength(1)
    expect(rowIds(rows[0])).toEqual(['print', 'export', 'scale', 'setting'])
  })

  it('the real ฝึกร้อง dock: seek row on top, transport + คีย์ + ⚙ together below', async () => {
    setWidth(712)
    const w = mount(SingTransport, {
      props: {
        totalSec: 60, hasSections: true, tags: [{ name: 'ข้อ 1' }], selected: new Set(['ข้อ 1']),
        settings: [{ id: 'key', kind: 'menu', value: 'C', badge: 'C', options: [{ value: 'C', label: 'C' }], onPick: () => {} }],
      },
      global: { stubs: { Icon: true, ExportTool: true, SoundControl: true, TempoControl: true } },
      attachTo: document.body,
    })
    await flush()
    const rows = w.findAll('.dk-dock > .dk-row')
    expect(rows).toHaveLength(2)
    expect(rowIds(rows[0])).toEqual(['timeslide'])
    expect(rowIds(rows[1])).toEqual(['back', 'play', 'forward', 'export', 'scale', 'key', 'tuan', 'setting'])
  })

  it('wide screen (>760px) keeps its old rows — no seek row / button row split', async () => {
    setWidth(1024)
    const w = mountBar()
    await flush()
    expect(w.find('.dk-host').classes()).not.toContain('dk-bar')
    expect(w.find('.dk-seekrow').exists()).toBe(false)
    expect(w.find('.dk-btnrow').exists()).toBe(false)
    expect(w.find('[data-grip]').exists()).toBe(true)
  })
})

// The sizes themselves come from CSS, which jsdom does not apply — so guard the bar's rules in
// the stylesheet: 48px targets, a fixed 8px gap (no media query widens it from 600px up), a
// centred row that never wraps or spreads.
describe('ใบ#109 ข้อ 1–2 — 48px targets, same 8px spacing at every bar width (stylesheet)', () => {
  const css = fs.readFileSync(path.resolve(__dirname, 'DockKey.vue'), 'utf8').split('<style scoped>')[1]
  const block = css.slice(css.indexOf('ใบ v3/pleng#109'))
  it('every bar button is at least 48×48', () => {
    expect(block).toMatch(/\.dk-bar \.dk-dock \{[^}]*--touch-min: 48px/)
    expect(block).toMatch(/\.dk-bar \.dk-play \{ width: 48px; height: 48px; \}/)
    expect(block).toMatch(/min-width: var\(--touch-min\); min-height: var\(--touch-min\)/)
  })
  it('the gap is 8px, centred, no wrap, and nothing re-spaces it on a wider bar', () => {
    expect(block).toMatch(/\.dk-bar \.dk-row \{ gap: 8px; flex-wrap: nowrap; \}/)
    expect(block).toMatch(/\.dk-bar \.dk-btnrow \{ justify-content: safe center; \}/)
    expect(block).not.toMatch(/@media/)
    expect(block).not.toMatch(/space-(between|around|evenly)/)
  })
})

describe('ใบ#109 ข้อ 3 — what does not fit goes into ⚙, tail first', () => {
  it('planFold: a row that fits folds nothing', () => {
    const its = BAR_ORDER.map((id) => singItems().find((i) => i.id === id))
    expect(planFold(its, (it) => WIDTH[it.id] || 48, rowWidth(BAR_ORDER), 8)).toEqual([])
  })

  it('planFold: folds from the end, skipping ⚙ · เล่น · Aa · ความเร็ว', () => {
    const its = BAR_ORDER.map((id) => singItems().find((i) => i.id === id))
    const out = planFold(its, (it) => WIDTH[it.id] || 48, 344, 8) // 360px phone
    expect(out).toEqual(['soundctl', 'tuan', 'key', 'export'])
    for (const id of ['setting', 'play', 'scale', 'speed']) expect(canFold(its.find((i) => i.id === id))).toBe(false)
  })

  for (const [px, avail] of [[360, 344], [375, 359], [390, 374]]) {
    it(`${px}px: the row fits, the rest is in ⚙ in the dock's order, and opens from there`, async () => {
      setWidth(px)
      fakeLayout(avail)
      const w = mountBar()
      await flush()
      window.dispatchEvent(new Event('resize'))
      await flush()
      const row = w.find('.dk-btnrow')
      const shown = rowIds(row)
      // fits the bar: nothing runs off the screen
      expect(rowWidth(shown)).toBeLessThanOrEqual(avail)
      // the ones that must stay
      for (const id of ['play', 'scale', 'speed', 'setting']) expect(shown).toContain(id)
      // still in the dock's order
      expect(shown).toEqual(BAR_ORDER.filter((id) => shown.includes(id)))
      // what left the row is exactly the tail of the foldable buttons
      const gone = BAR_ORDER.filter((id) => !shown.includes(id))
      expect(gone.length).toBeGreaterThan(0)
      const foldable = BAR_ORDER.filter((id) => !['play', 'scale', 'speed', 'setting'].includes(id))
      expect(gone).toEqual(foldable.slice(foldable.length - gone.length))

      // every folded button has a row in ⚙, in the dock's own order, with no pin (it has a home)
      await w.find('.dk-gear').trigger('click')
      await flush()
      const settingIds = w.findAll('.dk-panel [data-setting]').map((e) => e.attributes('data-setting'))
      expect(settingIds.slice(0, gone.length)).toEqual(gone)
      for (const id of gone) expect(w.find(`.dk-panel [data-setting="${id}"] .dk-pin`).exists()).toBe(false)
      // คีย์ is adjusted right in ⚙; a page-drawn one opens its own popover from there
      expect(w.find('.dk-panel [data-setting="key"] select').exists()).toBe(true)
      await w.find('.dk-panel [data-setting="soundctl"] .dk-prun').trigger('click')
      await flush()
      expect(w.find('.dk-panel').exists()).toBe(false)
      expect(w.find('.dk-fold .p-soundctl').exists()).toBe(true)
    })
  }

  it('at 600px and wider every button stays on the row (nothing folded)', async () => {
    setWidth(600)
    fakeLayout(584)
    const w = mountBar()
    await flush()
    window.dispatchEvent(new Event('resize'))
    await flush()
    expect(rowIds(w.find('.dk-btnrow'))).toEqual(BAR_ORDER)
    expect(w.find('.dk-fold').exists()).toBe(false)
  })
})
