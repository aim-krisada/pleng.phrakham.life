// DockKey — the reusable dock core engine. These tests exercise the ENGINE contract with a
// synthetic descriptor list (no page): row ordering by anchor/column, the ⚙ Setting page
// (default:inSetting || pinnable), 📌 pin → onto the button row, and menu dropdowns. ใบ#111: the
// dock is always the bottom bar — no grip, no collapse. Page-drawn cells (timeline/aa) are
// provided as empty slots.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DockKey from './DockKey.vue'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

const onPick = vi.fn(), onToggle = vi.fn(), run = vi.fn(), onInsert = vi.fn()
const items = () => [
  { id: 'grip', kind: 'grip', name: 'ย้าย', place: { anchor: 'left', row: 1 } },
  { id: 'play', kind: 'play', name: 'เล่น', place: { anchor: 'rightOf:grip', row: 1 }, control: { value: false }, run },
  { id: 'scale', kind: 'aa', name: 'Aa', place: { anchor: 'leftOf:setting', row: 1 }, permanent: true },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'timeslide', kind: 'timeline', name: 'ไทม์ไลน์', place: { row: 2, col: 1, span: 3 } },
  { id: 'key', kind: 'menu', name: 'คีย์', icon: 'key-round', place: { row: 2, col: 4, span: 1 }, control: { options: [{ value: 'C', label: 'C' }, { value: 'D', label: 'D' }], value: 'C', badge: 'C', onPick } },
  { id: 'repeat', kind: 'toggle', name: 'วนซ้ำ', icon: 'repeat', default: 'inSetting', pinnable: true, control: { value: false, onToggle } },
  { id: 'chord', kind: 'menu', name: 'คอร์ด', icon: 'guitar', default: 'inSetting', pinnable: true, control: { options: [{ value: 'a', label: 'a' }, { value: 'b', label: 'b' }], value: 'a', onPick } },
]
const mountDK = (props = {}) => mount(DockKey, {
  props: { items: items(), storeKey: 'test', alpha: 0.96, ...props },
  slots: { 'cell-timeslide': '<span class="my-time" />', 'cell-scale': '<button class="my-aa" />' },
  global: { stubs: { Icon: true } },
  attachTo: document.body,
})

beforeEach(() => { localStorage.clear(); onPick.mockClear(); onToggle.mockClear(); run.mockClear(); onInsert.mockClear() })

describe('DockKey layout engine', () => {
  it('lays out the bar: the timeline alone on top, every button in one centred row below', () => {
    const w = mountDK()
    const rows = w.findAll('.dk-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].classes()).toContain('dk-seekrow')
    expect(rows[0].findAll('[data-cell]').map((e) => e.attributes('data-cell'))).toEqual(['timeslide'])
    // row 1 up to ⚙ (the grip a page still hands over is dropped), then row 2's buttons, ⚙ last
    expect(rows[1].classes()).toContain('dk-btnrow')
    expect(rows[1].classes()).not.toContain('spread')
    expect(rows[1].findAll('[data-cell]').map((e) => e.attributes('data-cell'))).toEqual(['play', 'scale', 'key', 'setting'])
  })

  it('hidden items drop out of the layout', () => {
    const its = items().map((i) => (i.id === 'key' ? { ...i, hidden: true } : i))
    const w = mountDK({ items: its })
    expect(w.find('[data-cell="key"]').exists()).toBe(false)
  })
})

describe('DockKey ⚙ Setting page', () => {
  it('only default:inSetting / pinnable items get a Setting home (not the on-bar core)', async () => {
    const w = mountDK()
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    expect(w.find('.dk-panel [data-setting="repeat"] .dk-switch').exists()).toBe(true)
    expect(w.find('.dk-panel [data-setting="chord"] select').exists()).toBe(true)
    // key is on the bar by default (not inSetting/pinnable) → no Setting row
    expect(w.find('.dk-panel [data-setting="key"]').exists()).toBe(false)
  })

  // issues9 (พี่เปา): "ทำไมต้องกดปักหมุดก่อนถึงจะเซฟร่างได้" — a `btn` row rendered an EMPTY control
  // cell, so the command could not be run from the panel at all and pinning was the only way out.
  it('a btn in the Setting page is runnable in place (not pin-only)', async () => {
    const w = mountDK({
      items: [...items(), { id: 'act', kind: 'btn', name: 'บันทึกร่าง', icon: 'save', default: 'inSetting', pinnable: true, run }],
    })
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    const runBtn = w.find('.dk-panel [data-setting="act"] .dk-prun')
    expect(runBtn.exists()).toBe(true)
    await runBtn.trigger('click')
    expect(run).toHaveBeenCalledTimes(1)
  })

  // An item with a `place` already lives on the bar, so a pin for it must NOT draw it a second
  // time. Guards ui-standards §2 (single source of action) and self-heals a pin saved before the
  // item was promoted to the bar — พี่เปา has exactly that stale 'draft' pin from issues9.
  it('a stale pin for an item that now has a place does not duplicate it on the bar', () => {
    localStorage.setItem('pleng.dockkey.test.pins', JSON.stringify(['key']))
    const w = mountDK()
    expect(w.findAll('.dk-row')).toHaveLength(2) // no extra pinned row
    expect(w.findAll('[data-cell="key"]')).toHaveLength(1) // drawn once, on the button row
  })

  it('a toggle in the Setting page calls its onToggle', async () => {
    const w = mountDK()
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    await w.find('.dk-panel [data-setting="repeat"] .dk-switch').trigger('click')
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('📌 pin puts an item on the button row (just before ⚙) + persists', async () => {
    const w = mountDK()
    expect(w.findAll('.dk-row')).toHaveLength(2)
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    await w.find('.dk-panel [data-setting="chord"] .dk-pin').trigger('click')
    await nextTick()
    // no extra row: chord joins the one button group as a bar chip, ⚙ still ends it
    expect(w.findAll('.dk-row')).toHaveLength(2)
    expect(w.find('.dk-btnrow [data-cell="chord"].dk-pinwrap').exists()).toBe(true)
    expect(w.findAll('.dk-btnrow [data-cell]').map((e) => e.attributes('data-cell')).slice(-2)).toEqual(['chord', 'setting'])
    expect(JSON.parse(localStorage.getItem('pleng.dockkey.test.pins'))).toEqual(['chord'])
  })

  it('reloads pinned items from localStorage', () => {
    localStorage.setItem('pleng.dockkey.test.pins', JSON.stringify(['repeat']))
    const w = mountDK()
    expect(w.find('.dk-row [data-cell="repeat"]').exists()).toBe(true)
    expect(w.findAll('.dk-row')).toHaveLength(2)
  })
})

describe('DockKey menu dropdown', () => {
  it('opens on the bar and picks a value (single-select closes)', async () => {
    const w = mountDK()
    await w.find('[data-cell="key"] .dk-pbtn').trigger('click')
    await nextTick()
    const rows = w.findAll('[data-cell="key"] .dk-ddrow')
    expect(rows).toHaveLength(2)
    await rows[1].trigger('click')
    expect(onPick).toHaveBeenCalledWith('D')
    await nextTick()
    expect(w.find('[data-cell="key"] .dk-dd').exists()).toBe(false) // closed
  })

  it('only one popover is open at a time', async () => {
    const w = mountDK()
    await w.find('[data-cell="key"] .dk-pbtn').trigger('click')
    await nextTick()
    await w.find('.dk-gear').trigger('click') // open Setting
    await nextTick()
    expect(w.find('[data-cell="key"] .dk-dd').exists()).toBe(false) // key menu closed
    expect(w.find('.dk-panel').exists()).toBe(true)
  })
})

describe('DockKey phase-2 schema (E1 keys band · E2 prime/label)', () => {
  const withExtras = () => [
    { id: 'keys', kind: 'keys', name: 'แป้น', rows: [['1', '2', '3'], ['.', '-']], onInsert },
    ...items().filter((i) => ['grip', 'setting'].includes(i.id)),
    { id: 'print', kind: 'btn', name: 'พิมพ์', icon: 'printer', prime: true, place: { anchor: 'rightOf:grip', row: 1 }, run },
    { id: 'save', kind: 'btn', name: 'บันทึก', label: 'บันทึก', icon: 'send', prime: true, place: { row: 2, col: 1, span: 2 }, run },
  ]

  it('E1: renders a full-width key band whose keys call onInsert', async () => {
    const w = mountDK({ items: withExtras() })
    const keys = w.findAll('.dk-keys .dk-key')
    expect(keys.map((k) => k.text())).toEqual(['1', '2', '3', '.', '-'])
    await keys[0].trigger('mousedown')
    expect(onInsert).toHaveBeenCalledWith('1')
  })

  it('E1: an old remembered "folded" value no longer hides the key band (ใบ#111)', async () => {
    localStorage.setItem('pleng.dockkey.test.collapsed', '1')
    const w = mountDK({ items: withExtras() })
    expect(w.find('.dk-keys').exists()).toBe(true)
  })

  it('E2: prime buttons get the brand class; a label renders + widens', () => {
    const w = mountDK({ items: withExtras() })
    expect(w.find('[data-cell="print"]').classes()).toContain('prime')
    const save = w.find('[data-cell="save"]')
    expect(save.classes()).toContain('prime')
    expect(save.classes()).toContain('wide')
    expect(save.find('.dk-btn-lbl').text()).toBe('บันทึก')
  })

  it('a disabled btn is not clickable-through (undo/redo when empty)', () => {
    const its = items().map((i) => (i.id === 'play' ? { ...i, kind: 'btn', icon: 'undo-2', disabled: true } : i))
    const w = mountDK({ items: its })
    expect(w.find('[data-cell="play"]').attributes('disabled')).toBeDefined()
  })
})

// ใบ#111 — the bar cannot be dragged or folded any more
describe('DockKey has no grip / no collapse (ใบ#111)', () => {
  it('a grip item from a page is not drawn, and nothing folds the bar', async () => {
    const w = mountDK()
    expect(w.find('[data-grip]').exists()).toBe(false)
    expect(w.find('.dk-grip').exists()).toBe(false)
    expect(w.find('.dk-mini').exists()).toBe(false)
    expect(w.find('[data-cell="play"]').exists()).toBe(true)
  })

  it('an old remembered "folded" value still shows the full bar', () => {
    localStorage.setItem('pleng.dockkey.test.collapsed', '1')
    const w = mountDK()
    expect(w.find('.dk-mini').exists()).toBe(false)
    expect(w.find('[data-cell="play"]').exists()).toBe(true)
  })
})
