// DockKey — the reusable dock core engine. These tests exercise the ENGINE contract with a
// synthetic descriptor list (no page): row ordering by anchor/column, the ⚙ Setting page
// (default:inSetting || pinnable), 📌 pin → a new row above, collapse-in-place → [grip][⚙]
// mini, and menu dropdowns. Page-drawn cells (timeline/aa) are provided as empty slots.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DockKey from './DockKey.vue'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

const onPick = vi.fn(), onToggle = vi.fn(), run = vi.fn()
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

beforeEach(() => { localStorage.clear(); onPick.mockClear(); onToggle.mockClear(); run.mockClear() })

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
