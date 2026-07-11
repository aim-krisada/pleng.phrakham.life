// DockKey — UI-standard invariants (the tester gate, automated). Drives the ENGINE with
// sing-like descriptors and asserts docs/ui-standards.md §2 + dockkey-checklist §A/§B via the
// reusable ui-invariants helper. These are the checks that must be GREEN before P'Aim sees
// the dock. Pixel-geometry items (no-scroll · target-size · contrast) are Tier B and live in
// the browser run — see docs/reports/dockkey-tester-checklist.md.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DockKey from './DockKey.vue'
import {
  expectNoAxeViolations,
  caretOnTriggerViolations,
  openPopups,
  popupHeaderProse,
  pressEscape,
} from '../test-utils/ui-invariants.js'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

// Mirrors the SingTransport adapter shape closely enough to exercise every engine kind that
// renders a trigger/popup: gear(setting) · play · aa · menu(key,chord) · toggle · slider.
const onPick = vi.fn(), onToggle = vi.fn(), onInput = vi.fn(), run = vi.fn()
const items = () => [
  { id: 'grip', kind: 'grip', name: 'ย้าย', place: { anchor: 'left', row: 1 } },
  { id: 'play', kind: 'play', name: 'เล่น', place: { anchor: 'rightOf:grip', row: 1 }, control: { value: false }, run },
  { id: 'scale', kind: 'aa', name: 'Aa', place: { anchor: 'leftOf:setting', row: 1 }, permanent: true },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'timeslide', kind: 'timeline', name: 'ไทม์ไลน์', place: { row: 2, col: 1, span: 3 } },
  { id: 'key', kind: 'menu', name: 'คีย์', icon: 'key-round', place: { row: 2, col: 4, span: 1 },
    control: { options: [{ value: 'C', label: 'C' }, { value: 'D', label: 'D' }], value: 'C', badge: 'C', onPick } },
  { id: 'repeat', kind: 'toggle', name: 'วนซ้ำ', icon: 'repeat', default: 'inSetting', pinnable: true, control: { value: false, onToggle } },
  { id: 'chord', kind: 'menu', name: 'คอร์ด', icon: 'guitar', default: 'inSetting', pinnable: true,
    control: { options: [{ value: 'a', label: 'a' }, { value: 'b', label: 'b' }], value: 'a', onPick } },
  { id: 'alpha', kind: 'slider', name: 'โปร่งใส', icon: 'eye', default: 'inSetting', pinnable: true,
    control: { min: 40, max: 100, value: 96, onInput } },
]
const mountDK = (props = {}) => mount(DockKey, {
  props: { items: items(), storeKey: 'inv', alpha: 0.96, ...props },
  slots: { 'cell-timeslide': '<span class="my-time" />', 'cell-scale': '<button class="my-aa" aria-label="ขนาดตัวอักษร" />' },
  attachTo: document.body,
})

beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

describe('DockKey — a11y (Tier A · axe WCAG A/AA)', () => {
  it('the dock itself has no a11y violations (closed)', async () => {
    const w = mountDK()
    await nextTick()
    await expectNoAxeViolations(w)
  })

  it('no a11y violations with the ⚙ Setting page open', async () => {
    const w = mountDK()
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    await expectNoAxeViolations(w)
  })

  it('no a11y violations with a menu dropdown open', async () => {
    const w = mountDK()
    await w.find('[data-cell="key"] .dk-pbtn').trigger('click')
    await nextTick()
    await expectNoAxeViolations(w)
  })
})

describe('DockKey — popup invariants (Tier A · ui-standards §2)', () => {
  it('B9/§A · no popup-opening button carries a down-caret (▾)', async () => {
    const w = mountDK()
    await nextTick()
    // triggers (aria-expanded/haspopup) exist for menu + gear
    expect(caretOnTriggerViolations(w)).toEqual([])
  })

  it('§2 · at most one popup is open at a time', async () => {
    const w = mountDK()
    await w.find('.dk-gear').trigger('click')       // open Setting
    await nextTick()
    await w.find('[data-cell="key"] .dk-pbtn').trigger('click') // open key menu
    await nextTick()
    expect(openPopups(w).length).toBeLessThanOrEqual(1)
  })

  it('B11/§A · the Setting popup shows no how-to / usage prose in its header', async () => {
    const w = mountDK()
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    // the setting panel is .dk-panel (a .dk-pop). Its header must not explain how to use it.
    expect(popupHeaderProse(w, { popupSel: '.dk-panel', headerSel: '.dk-ptitle' })).toEqual([])
  })

  it('§2 · Escape closes an open popup', async () => {
    const w = mountDK()
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    expect(openPopups(w).length).toBe(1)
    pressEscape(document)
    await nextTick()
    expect(openPopups(w).length).toBe(0)
  })
})
