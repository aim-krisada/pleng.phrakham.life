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

describe('DockKey cap = f(width)', () => {
  let iwDesc
  beforeEach(() => { iwDesc = Object.getOwnPropertyDescriptor(window, 'innerWidth') })
  afterEach(() => { if (iwDesc) Object.defineProperty(window, 'innerWidth', iwDesc) })
  const setWidth = (px) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: px })

  it('wide viewport merges row2 into row1 (one row); narrow keeps two + dk-m', () => {
    const packable = () => [
      { id: 'grip', kind: 'grip', name: 'ย้าย', place: { anchor: 'left', row: 1 } },
      { id: 'print', kind: 'btn', name: 'พิมพ์', icon: 'printer', place: { anchor: 'rightOf:grip', row: 1 }, run },
      { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
      { id: 'save', kind: 'btn', name: 'บันทึก', label: 'บันทึก', icon: 'send', place: { row: 2, col: 1 }, run },
    ]
    setWidth(1200)
    const wide = mountDK({ items: packable() })
    expect(wide.findAll('.dk-row')).toHaveLength(1) // merged
    expect(wide.find('.dk-dock').classes()).not.toContain('dk-m')

    setWidth(400)
    const narrow = mountDK({ items: packable() })
    expect(narrow.findAll('.dk-row')).toHaveLength(2) // not merged on narrow
    expect(narrow.find('.dk-dock').classes()).toContain('dk-m')
  })

  it('cap grows with width: the same pinned set packs into FEWER rows when wider (no 760 jump)', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: 'p' + i, kind: 'btn', name: 'p' + i, icon: 'x', default: 'inSetting', pinnable: true, run }))
    const base = () => [
      { id: 'grip', kind: 'grip', name: 'g', place: { anchor: 'left', row: 1 } },
      { id: 'setting', kind: 'gear', name: 's', place: { anchor: 'right', row: 1 } },
      ...many,
    ]
    localStorage.setItem('pleng.dockkey.test.pins', JSON.stringify(many.map((m) => m.id)))
    setWidth(1400) // cap 14 → 12 pinned in one row
    const wideRows = mountDK({ items: base() }).findAll('.dk-row').length
    setWidth(300) // cap 6 → 12 pinned across two rows
    const narrowRows = mountDK({ items: base() }).findAll('.dk-row').length
    expect(narrowRows).toBeGreaterThan(wideRows)
  })
})

describe('DockKey hide-on-scroll (auto-hide)', () => {
  let rafOrig, scrollDesc
  beforeEach(() => {
    rafOrig = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (cb) => { cb(); return 0 } // run the rAF-gate synchronously
    scrollDesc = Object.getOwnPropertyDescriptor(window, 'scrollY')
  })
  afterEach(() => {
    globalThis.requestAnimationFrame = rafOrig
    if (scrollDesc) Object.defineProperty(window, 'scrollY', scrollDesc)
  })
  const scrollTo = async (w, y) => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: y })
    window.dispatchEvent(new Event('scroll'))
    await nextTick()
    return w
  }

  it('never hides when auto-hide is off (default) — phrakham stays put', async () => {
    const w = mountDK() // autoHide defaults false
    await scrollTo(w, 300)
    expect(w.find('.dk-shift.hidden').exists()).toBe(false)
    expect(w.find('.dk-peek').exists()).toBe(false)
  })

  it('scroll DOWN past the threshold hides the dock + shows the peek; scroll UP reveals', async () => {
    const w = mountDK({ autoHide: true })
    await scrollTo(w, 120) // down 120 (> 8, past the top dead-zone) → hide
    expect(w.find('.dk-shift.hidden').exists()).toBe(true)
    expect(w.find('.dk-peek').exists()).toBe(true)
    await scrollTo(w, 60) // up 60 → reveal
    expect(w.find('.dk-shift.hidden').exists()).toBe(false)
    expect(w.find('.dk-peek').exists()).toBe(false)
  })

  it('does NOT hide near the very top (no jitter at the page head)', async () => {
    const w = mountDK({ autoHide: true })
    await scrollTo(w, 30) // within the top dead-zone (<=40)
    expect(w.find('.dk-shift.hidden').exists()).toBe(false)
  })

  it('does NOT hide while a popover is open (guard)', async () => {
    const w = mountDK({ autoHide: true })
    await w.find('[data-cell="key"] .dk-pbtn').trigger('click') // open a menu
    await nextTick()
    await scrollTo(w, 200)
    expect(w.find('.dk-shift.hidden').exists()).toBe(false)
  })

  it('the peek handle brings the dock back', async () => {
    const w = mountDK({ autoHide: true })
    await scrollTo(w, 120)
    expect(w.find('.dk-peek').exists()).toBe(true)
    await w.find('.dk-peek').trigger('click')
    await nextTick()
    expect(w.find('.dk-shift.hidden').exists()).toBe(false)
  })

  it('the ⚙ "ซ่อนแถบเมื่อเลื่อนอ่าน" toggle turns auto-hide off + persists', async () => {
    const w = mountDK({ autoHide: true })
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    await w.find('.dk-prow-ah .dk-switch').trigger('click') // turn OFF
    expect(localStorage.getItem('pleng.dockkey.test.autohideoff')).toBe('1')
    await w.find('.dk-gear').trigger('click') // close panel
    await nextTick()
    await scrollTo(w, 200)
    expect(w.find('.dk-shift.hidden').exists()).toBe(false) // stays visible
  })

  it('prefers-reduced-motion disables auto-hide', async () => {
    const mmOrig = window.matchMedia
    window.matchMedia = (q) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })
    const w = mountDK({ autoHide: true })
    await scrollTo(w, 200)
    expect(w.find('.dk-shift.hidden').exists()).toBe(false)
    window.matchMedia = mmOrig
  })
})

describe('DockKey keyboard-aware hide', () => {
  let vvDesc, ihDesc
  const makeVV = (h) => {
    const L = {}
    return {
      height: h, width: 1024,
      addEventListener(ev, cb) { (L[ev] ||= []).push(cb) },
      removeEventListener(ev, cb) { L[ev] = (L[ev] || []).filter((x) => x !== cb) },
      _set(h2) { this.height = h2; (L.resize || []).forEach((cb) => cb()) },
    }
  }
  beforeEach(() => {
    vvDesc = Object.getOwnPropertyDescriptor(window, 'visualViewport')
    ihDesc = Object.getOwnPropertyDescriptor(window, 'innerHeight')
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  })
  afterEach(() => {
    if (vvDesc) Object.defineProperty(window, 'visualViewport', vvDesc); else delete window.visualViewport
    if (ihDesc) Object.defineProperty(window, 'innerHeight', ihDesc)
  })

  it('keyboard up (visualViewport height drop >150px) hides the dock; closing reveals it', async () => {
    const vv = makeVV(800)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
    const w = mountDK({ autoHide: true })
    vv._set(480) // drop 320 > 150 → keyboard
    await nextTick()
    expect(w.find('.dk-shift.hidden').exists()).toBe(true)
    vv._set(800) // keyboard closed
    await nextTick()
    expect(w.find('.dk-shift.hidden').exists()).toBe(false)
  })

  it('a URL-bar collapse (~90px) is NOT treated as a keyboard', async () => {
    const vv = makeVV(800)
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
    const w = mountDK({ autoHide: true })
    vv._set(710) // drop 90 < 150
    await nextTick()
    expect(w.find('.dk-shift.hidden').exists()).toBe(false)
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

describe('DockKey free-form resize (แบบ 2 · width→reflow)', () => {
  let iwDesc
  beforeEach(() => { iwDesc = Object.getOwnPropertyDescriptor(window, 'innerWidth'); Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 }) })
  afterEach(() => { if (iwDesc) Object.defineProperty(window, 'innerWidth', iwDesc) })

  it('is INERT by default (no handle · no width row · no --dk-w) — phrakham unchanged', async () => {
    const w = mountDK() // resizable defaults false
    expect(w.find('.dk-resize').exists()).toBe(false)
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    expect(w.find('.dk-prow-rz').exists()).toBe(false)
    expect(w.find('.dk-dock').attributes('style') || '').not.toContain('--dk-w')
  })

  it('resizable → renders the drag handle + the ⚙ width slider', async () => {
    const w = mountDK({ resizable: true })
    expect(w.find('.dk-resize').exists()).toBe(true)
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    expect(w.find('.dk-prow-rz input[type=range]').exists()).toBe(true)
  })

  it('the ⚙ slider sets an explicit width (--dk-w) + persists per storeKey; cap follows the chosen width', async () => {
    const w = mountDK({ resizable: true })
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    const slider = w.find('.dk-prow-rz input[type=range]')
    await slider.setValue('160')
    await nextTick()
    expect(localStorage.getItem('pleng.dockkey.test.width')).toBe('160')
    await w.find('.dk-gear').trigger('click') // close panel
    await nextTick()
    expect(w.find('.dk-dock').attributes('style')).toContain('--dk-w: 160px')
  })

  it('a persisted width is restored on mount (resizable), and ignored when not resizable', () => {
    localStorage.setItem('pleng.dockkey.test.width', '220')
    const on = mountDK({ resizable: true })
    expect(on.find('.dk-dock').attributes('style')).toContain('--dk-w: 220px')
    const off = mountDK({ resizable: false })
    expect(off.find('.dk-dock').attributes('style') || '').not.toContain('--dk-w')
  })

  it('a width below MIN_W (120) is clamped, not stored raw', async () => {
    const w = mountDK({ resizable: true })
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    await w.find('.dk-prow-rz input[type=range]').setValue('40') // below floor
    await nextTick()
    expect(Number(localStorage.getItem('pleng.dockkey.test.width'))).toBeGreaterThanOrEqual(120)
  })

  it('↺ reset returns to AUTO (clears --dk-w + storage)', async () => {
    localStorage.setItem('pleng.dockkey.test.width', '180')
    const w = mountDK({ resizable: true })
    expect(w.find('.dk-dock').attributes('style')).toContain('--dk-w: 180px')
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    await w.find('.dk-prow-rz .dk-mv').trigger('click') // ↺
    await nextTick()
    expect(localStorage.getItem('pleng.dockkey.test.width')).toBe(null)
    await w.find('.dk-gear').trigger('click')
    await nextTick()
    expect(w.find('.dk-dock').attributes('style') || '').not.toContain('--dk-w')
  })

  it('resize + auto-hide are independent (a chosen width survives the dock hiding)', async () => {
    const rafOrig = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (cb) => { cb(); return 0 }
    const scrollDesc = Object.getOwnPropertyDescriptor(window, 'scrollY')
    try {
      localStorage.setItem('pleng.dockkey.test.width', '200')
      const w = mountDK({ resizable: true, autoHide: true })
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 200 })
      window.dispatchEvent(new Event('scroll'))
      await nextTick()
      expect(w.find('.dk-shift.hidden').exists()).toBe(true) // hidden
      expect(w.find('.dk-dock').attributes('style')).toContain('--dk-w: 200px') // width preserved
    } finally {
      globalThis.requestAnimationFrame = rafOrig
      if (scrollDesc) Object.defineProperty(window, 'scrollY', scrollDesc)
    }
  })
})
