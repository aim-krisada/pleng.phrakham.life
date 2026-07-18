// DockKey — the reusable dock core engine. These tests exercise the ENGINE contract with a
// synthetic descriptor list (no page): row ordering by anchor/column, the ⚙ Setting page
// (default:inSetting || pinnable), 📌 pin → a new row above, collapse-in-place → [grip][⚙]
// mini, and menu dropdowns. Page-drawn cells (timeline/aa) are provided as empty slots.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, h } from 'vue'
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
  it('lays out two default rows: row 2 (timeline·key) above row 1 (core, spread)', () => {
    const w = mountDK()
    const rows = w.findAll('.dk-row')
    expect(rows).toHaveLength(2)
    // the core bottom row (with ⚙) spreads full width; it is the LAST row in DOM
    expect(rows[1].classes()).toContain('spread')
    const cells = rows[1].findAll('[data-cell]').map((e) => e.attributes('data-cell'))
    // grip left-most, setting right-most, scale (Aa) just left of setting
    expect(cells[0]).toBe('grip')
    expect(cells.at(-1)).toBe('setting')
    expect(cells.at(-2)).toBe('scale')
    // row 2 carries the timeline + key
    const r2 = rows[0].findAll('[data-cell]').map((e) => e.attributes('data-cell'))
    expect(r2).toEqual(['timeslide', 'key'])
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
    expect(w.findAll('[data-cell="key"]')).toHaveLength(1) // drawn once, by row 2
  })

  // A slot kind (soundctl · export) moved into ⚙ (default:'inSetting') must have its page-drawn
  // cell rendered INSIDE the panel row via #cell-<id> — before this the panel rendered nothing
  // for a slot, so UX could not move soundctl/export off the bar.
  it('a slot in the Setting page renders its #cell-<id> content', async () => {
    const its = [...items(), { id: 'sound', kind: 'slot', name: 'เสียงดนตรี', icon: 'audio-lines', default: 'inSetting', pinnable: true }]
    const w = mount(DockKey, {
      props: { items: its, storeKey: 'test', alpha: 0.96 },
      slots: {
        'cell-timeslide': '<span class="my-time" />', 'cell-scale': '<button class="my-aa" />',
        'cell-sound': '<button class="my-sound">เสียง</button>',
      },
      global: { stubs: { Icon: true } },
      attachTo: document.body,
    })
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    expect(w.find('.dk-panel [data-setting="sound"] .my-sound').exists()).toBe(true)
  })

  // Opening a panel slot's inner control uses panelOpenId (a second one-at-a-time tracker), so
  // it must NOT flip openId off 'setting' and close the ⚙ page. The scoped `open`/`toggle` given
  // to the slot are panel-local; the panel stays open.
  it('a panel slot opens its own popover WITHOUT closing the ⚙ page', async () => {
    const its = [...items(), { id: 'sound', kind: 'slot', name: 'เสียงดนตรี', icon: 'audio-lines', default: 'inSetting', pinnable: true }]
    const w = mount(DockKey, {
      props: { items: its, storeKey: 'test', alpha: 0.96 },
      slots: {
        'cell-timeslide': '<span class="my-time" />', 'cell-scale': '<button class="my-aa" />',
        'cell-sound': (p) => h('span', [h('button', { class: 'my-sound', onClick: p.toggle }), p.open ? h('div', { class: 'my-pop' }) : null]),
      },
      global: { stubs: { Icon: true } },
      attachTo: document.body,
    })
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    await w.find('.dk-panel [data-setting="sound"] .my-sound').trigger('click')
    await nextTick()
    expect(w.find('.my-pop').exists()).toBe(true) // inner popover opened
    expect(w.find('.dk-panel').exists()).toBe(true) // ⚙ page still open
  })

  it('a toggle in the Setting page calls its onToggle', async () => {
    const w = mountDK()
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    await w.find('.dk-panel [data-setting="repeat"] .dk-switch').trigger('click')
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('📌 pin promotes an item to a NEW row above row 2 + persists', async () => {
    const w = mountDK()
    expect(w.findAll('.dk-row')).toHaveLength(2)
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    await w.find('.dk-panel [data-setting="chord"] .dk-pin').trigger('click')
    await nextTick()
    // a pinned row is added on top → 3 rows now, and chord is a bar chip
    expect(w.findAll('.dk-row')).toHaveLength(3)
    expect(w.find('.dk-row [data-cell="chord"].dk-pinwrap').exists()).toBe(true)
    expect(JSON.parse(localStorage.getItem('pleng.dockkey.test.pins'))).toEqual(['chord'])
  })

  it('reloads pinned items from localStorage', () => {
    localStorage.setItem('pleng.dockkey.test.pins', JSON.stringify(['repeat']))
    const w = mountDK()
    expect(w.find('.dk-row [data-cell="repeat"]').exists()).toBe(true)
    expect(w.findAll('.dk-row')).toHaveLength(3)
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

  it('E1: the key band is hidden when collapsed', async () => {
    localStorage.setItem('pleng.dockkey.test.collapsed', '1')
    const w = mountDK({ items: withExtras() })
    expect(w.find('.dk-keys').exists()).toBe(false)
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

describe('DockKey collapse-in-place', () => {
  it('a grip tap collapses to the [grip][⚙] mini (DS I7)', async () => {
    const w = mountDK()
    const grip = w.find('[data-grip]')
    await grip.trigger('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 })
    await grip.trigger('pointerup', { clientX: 10, clientY: 10, pointerId: 1 })
    await nextTick()
    expect(w.find('.dk-mini').exists()).toBe(true)
    // mini = exactly grip + gear
    expect(w.find('.dk-mini .dk-grip').exists()).toBe(true)
    expect(w.find('.dk-mini .dk-gear').exists()).toBe(true)
    expect(w.find('.dk-mini [data-cell="play"]').exists()).toBe(false)
    expect(localStorage.getItem('pleng.dockkey.test.collapsed')).toBe('1')
  })

  it('the ⚙ in the mini expands again', async () => {
    localStorage.setItem('pleng.dockkey.test.collapsed', '1')
    const w = mountDK()
    expect(w.find('.dk-mini').exists()).toBe(true)
    await w.find('.dk-mini .dk-gear').trigger('click')
    await nextTick()
    expect(w.find('.dk-mini').exists()).toBe(false)
  })
})
