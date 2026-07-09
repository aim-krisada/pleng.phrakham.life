// SingTransport — the reusable music-player band (B043). Drives are pure props/emits:
// scrub → seek, marker tap → jump, transport buttons, the Gmail selector (All/None +
// per-ท่อน toggle), and the ⚙ settings panel with 📌 pin persistence.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SingTransport from './SingTransport.vue'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

const base = {
  playing: false,
  loop: false,
  frac: 0.25,
  totalSec: 60,
  markers: [
    { name: 'ร้อง 1', frac: 0, startIndex: 0, isHook: false, active: false, picked: false },
    { name: 'รับ', frac: 0.5, startIndex: 5, isHook: true, active: false, picked: false },
  ],
  tags: [
    { name: 'ร้อง 1', isHook: false },
    { name: 'รับ', isHook: true },
  ],
  selected: new Set(),
  hasSections: true,
  settings: [
    { id: 'display', icon: '🎵', label: 'แสดงผล', kind: 'menu', value: 'all', options: [{ value: 'all', label: 'ครบ' }, { value: 'lyric', label: 'เนื้อ' }], onPick: () => {} },
    { id: 'key', icon: '🎼', label: 'คีย์', kind: 'stepper', display: 'C', onPrev: () => {}, onNext: () => {} },
    { id: 'print', icon: '🖨', label: 'พิมพ์', kind: 'action', actionLabel: 'เปิด', onAction: () => {} },
  ],
}
const mountT = (over = {}) => mount(SingTransport, { props: { ...base, ...over }, global: { stubs: { Icon: true } } })

beforeEach(() => localStorage.clear())

describe('transport row', () => {
  it('play button is icon-only (mp-play) and emits toggle-play', async () => {
    const w = mountT()
    await w.find('.mp-play').trigger('click')
    expect(w.emitted('toggle-play')).toHaveLength(1)
  })

  it('prev / next / loop emit their events', async () => {
    const w = mountT()
    await w.find('[aria-label="ท่อนก่อน"]').trigger('click')
    await w.find('[aria-label="ท่อนถัดไป"]').trigger('click')
    await w.find('[aria-label="วนซ้ำ"]').trigger('click')
    expect(w.emitted('prev')).toHaveLength(1)
    expect(w.emitted('next')).toHaveLength(1)
    expect(w.emitted('toggle-loop')).toHaveLength(1)
  })

  it('hasSections=false hides prev/next + selector, keeps play', () => {
    const w = mountT({ hasSections: false })
    expect(w.find('.mp-play').exists()).toBe(true)
    expect(w.find('[aria-label="ท่อนก่อน"]').exists()).toBe(false)
    expect(w.find('.mp-seltrig').exists()).toBe(false)
  })
})

describe('timeline — scrub + markers', () => {
  it('a pointer press on the bar emits seek with the fraction', async () => {
    const w = mountT()
    const seek = w.find('.mp-seek')
    seek.element.getBoundingClientRect = () => ({ left: 0, width: 100, top: 0, height: 26, right: 100, bottom: 26 })
    await seek.trigger('pointerdown', { clientX: 50, pointerId: 1 })
    expect(w.emitted('seek')).toBeTruthy()
    expect(w.emitted('seek')[0][0]).toBeCloseTo(0.5, 2)
  })

  it('tapping a marker emits jump with that occurrence startIndex', async () => {
    const w = mountT()
    const marks = w.findAll('.mp-mk')
    expect(marks).toHaveLength(2)
    await marks[1].trigger('click')
    expect(w.emitted('jump')[0]).toEqual([5])
  })
})

describe('selector — Gmail list', () => {
  it('count badge reads · / N/total / ทั้งหมด', async () => {
    expect(mountT().find('.mp-seltrig b').text()).toBe('·')
    expect(mountT({ selected: new Set(['รับ']) }).find('.mp-seltrig b').text()).toBe('1/2')
    expect(mountT({ selected: new Set(['ร้อง 1', 'รับ']) }).find('.mp-seltrig b').text()).toBe('ทั้งหมด')
  })

  it('opening the sheet + toggling a row emits toggle-section', async () => {
    const w = mountT()
    await w.find('.mp-seltrig').trigger('click')
    await nextTick()
    const rows = w.findAll('.mp-ssrow')
    expect(rows).toHaveLength(2)
    await rows[1].trigger('click')
    expect(w.emitted('toggle-section')[0]).toEqual(['รับ'])
  })

  it('All / None emit set-all', async () => {
    const w = mountT()
    await w.find('.mp-seltrig').trigger('click')
    await nextTick()
    const [all, none] = w.findAll('.mp-ssallbtn')
    await all.trigger('click')
    await none.trigger('click')
    expect(w.emitted('set-all')).toEqual([[true], [false]])
  })

  it('a selected row shows its checked state', async () => {
    const w = mountT({ selected: new Set(['รับ']) })
    await w.find('.mp-seltrig').trigger('click')
    await nextTick()
    const rows = w.findAll('.mp-ssrow')
    expect(rows[1].classes()).toContain('on')
    expect(rows[0].classes()).not.toContain('on')
  })
})

describe('⚙ settings panel (§4c)', () => {
  const panel = (w, id) => w.find(`.mp-panel [data-setting="${id}"]`)

  it('every control has a home in the panel, adjustable inline', async () => {
    const w = mountT()
    await w.find('.mp-more').trigger('click')
    await nextTick()
    expect(panel(w, 'display').find('select').exists()).toBe(true)
    expect(panel(w, 'key').find('.mp-stpv').text()).toBe('C')
    expect(panel(w, 'print').find('.mp-stp').text()).toBe('เปิด')
    // transparency (ความโปร่ง) is a dock-chrome control that lives in the panel too
    expect(panel(w, 'alpha').find('input[type="range"]').exists()).toBe(true)
  })

  it('a menu select calls the descriptor onPick', async () => {
    const onPick = vi.fn()
    const w = mountT({ settings: [{ id: 'display', icon: 'layers', label: 'แสดงผล', kind: 'menu', value: 'all', options: [{ value: 'all', label: 'ครบ' }, { value: 'lyric', label: 'เนื้อ' }], onPick }] })
    await w.find('.mp-more').trigger('click')
    await nextTick()
    await panel(w, 'display').find('select').setValue('lyric')
    expect(onPick).toHaveBeenCalledWith('lyric')
  })

  it('key / tempo / display are pinned on the bar by default (bar not empty)', () => {
    const w = mountT()
    expect(w.find('.mp-pins [data-setting="key"]').exists()).toBe(true)
    expect(w.find('.mp-pins [data-setting="display"]').exists()).toBe(true)
  })

  it('📌 pin promotes a non-default control to the bar strip + persists', async () => {
    const w = mountT()
    expect(w.find('.mp-pins [data-setting="print"]').exists()).toBe(false)
    await w.find('.mp-more').trigger('click')
    await nextTick()
    await panel(w, 'print').find('.mp-pin').trigger('click')
    await nextTick()
    expect(w.find('.mp-pins [data-setting="print"]').exists()).toBe(true)
    expect(JSON.parse(localStorage.getItem('pleng.dock.sing.pins'))).toContain('print')
  })

  it('reloads pinned controls from localStorage', async () => {
    localStorage.setItem('pleng.dock.sing.pins', JSON.stringify(['print']))
    const w = mountT()
    expect(w.find('.mp-pins [data-setting="print"]').exists()).toBe(true)
    expect(w.find('.mp-pins [data-setting="key"]').exists()).toBe(false)
  })

  it('a pinned menu opens a dropdown on the bar and picks a value', async () => {
    const onPick = vi.fn()
    const w = mountT({ settings: [{ id: 'display', icon: 'layers', label: 'แสดงผล', kind: 'menu', value: 'all', badge: 'ครบ', options: [{ value: 'all', label: 'ครบ' }, { value: 'lyric', label: 'เนื้อ' }], onPick }] })
    await w.find('.mp-pins [data-setting="display"] .mp-pbtn').trigger('click')
    await nextTick()
    const rows = w.findAll('.mp-pins [data-setting="display"] .mp-ddrow')
    expect(rows.length).toBe(2)
    await rows[1].trigger('click')
    expect(onPick).toHaveBeenCalledWith('lyric')
  })

  it('the transparency slider drives the dock alpha (dock-chrome hook)', async () => {
    const w = mountT()
    await w.find('.mp-more').trigger('click')
    await nextTick()
    await panel(w, 'alpha').find('input[type="range"]').setValue(60)
    expect(w.emitted('dock-alpha')[0]).toEqual([0.6])
  })

  it('the grip emits dock-collapse', async () => {
    const w = mountT()
    await w.find('.mp-grip').trigger('click')
    expect(w.emitted('dock-collapse')).toHaveLength(1)
  })
})
