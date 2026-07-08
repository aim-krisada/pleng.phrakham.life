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

  it('collapse toggles the class + persists per mode, and expands back (D4 / B034)', async () => {
    const w = mountDock()
    await nextTick()
    await w.find('.sd-ctl[aria-label="หุบแถบเครื่องมือ"]').trigger('click')
    await nextTick()
    expect(w.find('.sd-dock').classes()).toContain('sd-collapsed')
    expect(localStorage.getItem('pleng.dock.collapsed.edit')).toBe('1')
    // B034: the same control now expands again (previously it only ever collapsed, so a
    // collapsed desktop dock got stuck)
    await w.find('.sd-ctl[aria-label="กางแถบเครื่องมือ"]').trigger('click')
    await nextTick()
    expect(w.find('.sd-dock').classes()).not.toContain('sd-collapsed')
    expect(localStorage.getItem('pleng.dock.collapsed.edit')).toBe('0')
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
