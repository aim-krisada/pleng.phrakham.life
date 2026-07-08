// StudioDock — the shared studio dock (ps3-dock DS). These cover the engine that is
// testable without real layout (jsdom has no box metrics, so D3 dynamic overflow is
// verified in-browser, not here): the per-mode tool set + visibility guard, the jianpu
// key row (edit only), and the persisted collapse / transparency / customize state.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import StudioDock from './StudioDock.vue'

const tools = () => [
  { id: 'undo', icon: 'undo-2', label: 'ย้อน', run: vi.fn() },
  { id: 'redo', icon: 'redo-2', label: 'ทำซ้ำ', run: vi.fn() },
  { id: 'stop', icon: 'square', label: 'หยุด', run: vi.fn(), visible: false }, // not applicable now
  { id: 'draft', icon: 'save', label: 'บันทึกร่าง', run: vi.fn() }, // registry-only (not default)
]
const mountDock = (props = {}) =>
  mount(StudioDock, {
    props: { mode: 'edit', tools: tools(), defaultTools: ['undo', 'redo', 'stop'], paletteKeys: ['1', '2'], ...props },
    global: { stubs: { Icon: true } },
    attachTo: document.body,
  })
const toolLabels = (w) => w.findAll('.sd-tools .sd-tbtn:not(.sd-ctl)').map((b) => b.attributes('aria-label'))

beforeEach(() => localStorage.clear())

describe('StudioDock — shared dock engine (ps3-dock)', () => {
  it('renders only visible tools from the default set (visibility guard)', async () => {
    const w = mountDock()
    await nextTick()
    const labels = toolLabels(w)
    expect(labels).toContain('ย้อน')
    expect(labels).toContain('ทำซ้ำ')
    // "หยุด" is in defaultTools but visible:false → a saved layout never shows what
    // doesn't apply right now
    expect(labels).not.toContain('หยุด')
  })

  it('shows the jianpu key row in edit mode and emits insert on press', async () => {
    const w = mountDock()
    await nextTick()
    const keys = w.findAll('.sd-keys .sd-key')
    expect(keys.length).toBe(2)
    await keys[0].trigger('mousedown')
    expect(w.emitted('insert')[0]).toEqual(['1'])
  })

  it('hides the key row outside edit mode', async () => {
    const w = mountDock({ mode: 'sing', paletteKeys: [] })
    await nextTick()
    expect(w.find('.sd-keys').exists()).toBe(false)
  })

  it('restores a saved per-mode layout (order) from localStorage', async () => {
    localStorage.setItem('pleng.dock.edit.tools', JSON.stringify(['redo', 'undo']))
    const w = mountDock()
    await nextTick()
    expect(toolLabels(w)).toEqual(['ทำซ้ำ', 'ย้อน'])
  })

  it('customize → remove persists the new order per mode (D6)', async () => {
    const w = mountDock()
    await nextTick()
    await w.find('.sd-ctl[aria-label^="ตั้งค่าปุ่ม"]').trigger('click')
    await nextTick()
    const undoRow = w.findAll('.sd-crow').find((r) => r.find('.sd-crow-name').text() === 'ย้อน')
    await undoRow.find('[aria-label="เอาออก"]').trigger('click')
    await nextTick()
    const saved = JSON.parse(localStorage.getItem('pleng.dock.edit.tools'))
    expect(saved).not.toContain('undo')
    expect(saved).toContain('redo')
    // undo now moves to the "เพิ่มได้" section
    expect(toolLabels(w)).not.toContain('ย้อน')
  })

  // dock-core: desktop collapse/expand is the fused grip+chevron handle — a clean tap
  // (pointerdown→up, no travel) toggles; collapsed state is now SHARED across modes.
  it('a tap on the fused handle collapses + persists (shared key), FAB expands back', async () => {
    const w = mountDock()
    await nextTick()
    const handle = w.find('.sd-combined')
    await handle.trigger('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 })
    await handle.trigger('pointerup', { clientX: 10, clientY: 10, pointerId: 1 })
    await nextTick()
    expect(w.find('.sd-dock').classes()).toContain('sd-collapsed')
    // shared across modes now (not pleng.dock.collapsed.edit)
    expect(localStorage.getItem('pleng.dock.collapsed')).toBe('1')
    // collapsed desktop → the bar is a round floating button (FAB); tapping it expands
    const fab = w.find('.sd-fab')
    expect(fab.exists()).toBe(true)
    await fab.trigger('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 })
    await fab.trigger('pointerup', { clientX: 10, clientY: 10, pointerId: 1 })
    await nextTick()
    expect(w.find('.sd-dock').classes()).not.toContain('sd-collapsed')
    expect(localStorage.getItem('pleng.dock.collapsed')).toBe('0')
    expect(w.find('.sd-fab').exists()).toBe(false)
  })

  // the threshold that separates "แตะ" from "ลาก": a press that travels past ~5px is a
  // move, so it must NOT toggle collapse (the accidental-collapse trap P'Aim hit).
  it('a press that drags past the threshold moves, it does not toggle collapse', async () => {
    const w = mountDock()
    await nextTick()
    const handle = w.find('.sd-combined')
    await handle.trigger('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 })
    await handle.trigger('pointermove', { clientX: 60, clientY: 40, pointerId: 1 })
    await handle.trigger('pointerup', { clientX: 60, clientY: 40, pointerId: 1 })
    await nextTick()
    // still expanded (it was a drag, not a tap) …
    expect(w.find('.sd-dock').classes()).not.toContain('sd-collapsed')
    // … and the bar took an explicit fixed position (it was moved)
    expect(w.find('.sd-dock').attributes('style')).toContain('position: fixed')
  })

  it('a tiny jitter under the threshold still counts as a tap (collapses)', async () => {
    const w = mountDock()
    await nextTick()
    const handle = w.find('.sd-combined')
    await handle.trigger('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 })
    await handle.trigger('pointermove', { clientX: 12, clientY: 11, pointerId: 1 }) // <5px
    await handle.trigger('pointerup', { clientX: 12, clientY: 11, pointerId: 1 })
    await nextTick()
    expect(w.find('.sd-dock').classes()).toContain('sd-collapsed')
  })

  it('renders the palette as multiple rows when given an array of rows (B033)', async () => {
    const w = mountDock({ paletteKeys: [['1', '2', '3'], ['.', '#']] })
    await nextTick()
    const rows = w.findAll('.sd-keys .sd-key-row')
    expect(rows.length).toBe(2)
    expect(rows[0].findAll('.sd-key').length).toBe(3)
    expect(rows[1].findAll('.sd-key').length).toBe(2)
    // still emits the individual key on press
    await rows[1].findAll('.sd-key')[1].trigger('mousedown')
    expect(w.emitted('insert').at(-1)).toEqual(['#'])
  })

  it('transparency slider writes --dock-alpha + localStorage (D5, shared across modes)', async () => {
    const w = mountDock()
    await nextTick()
    await w.find('.sd-ctl[aria-label="ปรับความโปร่งของแถบ"]').trigger('click')
    await nextTick()
    const range = w.find('.sd-range')
    range.element.value = '50'
    await range.trigger('input')
    await nextTick()
    expect(localStorage.getItem('pleng.dock.alpha')).toBe('0.5')
    expect(w.find('.sd-dock').attributes('style')).toContain('--dock-alpha: 0.5')
  })

  it('a disabled tool does not fire its run handler', async () => {
    const spy = vi.fn()
    const w = mountDock({ tools: [{ id: 'undo', icon: 'undo-2', label: 'ย้อน', run: spy, disabled: true }], defaultTools: ['undo'] })
    await nextTick()
    await w.find('.sd-tools .sd-tbtn:not(.sd-ctl)').trigger('click')
    expect(spy).not.toHaveBeenCalled()
  })
})

// D7 (wave 2): menu tools open a dropdown of options; the button carries a badge + caret.
describe('StudioDock — menu / dropdown tools (D7)', () => {
  const pick = vi.fn()
  const menuTools = () => [
    { id: 'key', icon: 'key-round', label: 'คีย์', menu: true, badge: 'E', value: 'E',
      options: [{ value: 'E', label: 'E (ต้นฉบับ)' }, { value: 'G', label: 'G' }], onPick: pick },
    { id: 'loop', icon: 'repeat', label: 'วนซ้ำ', menu: true, multi: true, selected: ['v1'],
      options: [{ value: 'v1', label: 'ร้อง 1' }, { value: 'v2', label: 'ร้อง 2' }], onPick: pick },
  ]
  const mountMenu = () =>
    mount(StudioDock, {
      props: { mode: 'sing', tools: menuTools(), defaultTools: ['key', 'loop'], paletteKeys: [] },
      global: { stubs: { Icon: true } },
      attachTo: document.body,
    })
  beforeEach(() => pick.mockClear())

  it('renders a badge + caret and opens the option list on click', async () => {
    const w = mountMenu()
    await nextTick()
    const keyBtn = w.find('.sd-tbtn[data-tool="key"]')
    expect(keyBtn.find('.sd-badge').text()).toBe('E')
    expect(w.find('.sd-pop-menu').exists()).toBe(false)
    await keyBtn.trigger('click')
    await nextTick()
    expect(w.find('.sd-pop-menu').exists()).toBe(true)
    expect(w.findAll('.sd-menu-row').length).toBe(2)
    expect(keyBtn.attributes('aria-expanded')).toBe('true')
  })

  it('single-select calls onPick with the option value and closes the menu', async () => {
    const w = mountMenu()
    await nextTick()
    await w.find('.sd-tbtn[data-tool="key"]').trigger('click')
    await nextTick()
    const gRow = w.findAll('.sd-menu-row').find((r) => r.find('.sd-menu-lb').text() === 'G')
    await gRow.trigger('click')
    await nextTick()
    expect(pick).toHaveBeenCalledWith('G')
    expect(w.find('.sd-pop-menu').exists()).toBe(false) // single-select auto-closes
  })

  it('marks the current single-select value with ●', async () => {
    const w = mountMenu()
    await nextTick()
    await w.find('.sd-tbtn[data-tool="key"]').trigger('click')
    await nextTick()
    const rows = w.findAll('.sd-menu-row')
    const current = rows.find((r) => r.attributes('aria-checked') === 'true')
    expect(current.find('.sd-menu-lb').text()).toBe('E (ต้นฉบับ)')
  })

  it('multi-select toggles via onPick and keeps the menu open', async () => {
    const w = mountMenu()
    await nextTick()
    await w.find('.sd-tbtn[data-tool="loop"]').trigger('click')
    await nextTick()
    const rows = w.findAll('.sd-menu-row')
    // the pre-selected option is checked
    expect(rows.find((r) => r.find('.sd-menu-lb').text() === 'ร้อง 1').attributes('aria-checked')).toBe('true')
    await rows.find((r) => r.find('.sd-menu-lb').text() === 'ร้อง 2').trigger('click')
    expect(pick).toHaveBeenCalledWith('v2')
    expect(w.find('.sd-pop-menu').exists()).toBe(true) // multi stays open for more picks
  })
})
