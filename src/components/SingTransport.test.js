// SingTransport — the ฝึกร้อง DockKey adapter. It turns the page's song state into the
// ITEMS_SING descriptor list and fills the three page-drawn cells (ไทม์ไลน์ · เลือกท่อน · Aa).
// The engine (DockKey) draws the 2-row dock; these tests drive the adapter's own behavior:
// transport emits, timeline scrub, the selector, and the ⚙ Setting page (repeat/คอร์ด/…, pin).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SingTransport from './SingTransport.vue'
import { readingFontScale } from '../store.js'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

const base = {
  playing: false,
  loop: false,
  frac: 0.25,
  totalSec: 60,
  markers: [
    { name: 'ร้อง 1', frac: 0, startIndex: 0, isHook: false, active: true, picked: true },
    { name: 'รับ', frac: 0.5, startIndex: 5, isHook: true, active: false, picked: false },
  ],
  tags: [
    { name: 'ร้อง 1', isHook: false },
    { name: 'รับ', isHook: true },
  ],
  selected: new Set(),
  hasSections: true,
  settings: [
    { id: 'display', icon: 'layers', label: 'แสดงผล', kind: 'menu', value: 'all', badge: 'ครบ', options: [{ value: 'all', label: 'ครบ' }, { value: 'lyric', label: 'เนื้อ' }], onPick: () => {} },
    { id: 'chord', icon: 'guitar', label: 'คอร์ด', kind: 'menu', value: 'letter', badge: 'ABC', options: [{ value: 'letter', label: 'ตัวอักษร' }, { value: 'hidden', label: 'ซ่อน' }], onPick: () => {} },
    { id: 'key', icon: 'key-round', label: 'คีย์', kind: 'menu', value: 'C', badge: 'C', options: [{ value: 'C', label: 'C' }, { value: 'D', label: 'D' }], onPick: () => {} },
    { id: 'tempo', icon: 'gauge', label: 'ความเร็ว', kind: 'menu', value: 90, badge: '90', options: [{ value: 90, label: '90' }, { value: 120, label: '120' }], onPick: () => {} },
  ],
}
const mountT = (over = {}) => mount(SingTransport, { props: { ...base, ...over }, global: { stubs: { Icon: true } }, attachTo: document.body })
const openSetting = async (w) => { await w.find('.dk-gear').trigger('click'); await nextTick() }
const panel = (w, id) => w.find(`.dk-panel [data-setting="${id}"]`)

beforeEach(() => { localStorage.clear() })

describe('B102 — "รอบ N" now-playing badge', () => {
  it('shows nothing when idle', () => {
    const w = mountT({ nowPlaying: null })
    expect(w.find('.st-now').exists()).toBe(false)
  })

  it('shows "รอบ n/total" while a repeated ท่อน (refrain) plays', () => {
    const w = mountT({ nowPlaying: { name: 'รับ', round: 4, total: 4 } })
    expect(w.find('.st-now').text()).toBe('รับ • รอบ 4/4')
  })

  it('shows just the name for a ท่อน that plays once (no รอบ noise)', () => {
    const w = mountT({ nowPlaying: { name: 'ข้อ 1', round: 1, total: 1 } })
    expect(w.find('.st-now').text()).toBe('ข้อ 1')
  })
})

describe('transport (row 1)', () => {
  it('play button (icon-only) emits toggle-play', async () => {
    const w = mountT()
    await w.find('.dk-play').trigger('click')
    expect(w.emitted('toggle-play')).toHaveLength(1)
  })

  it('back / forward emit prev / next', async () => {
    const w = mountT()
    await w.find('[aria-label="ท่อนก่อน"]').trigger('click')
    await w.find('[aria-label="ท่อนถัดไป"]').trigger('click')
    expect(w.emitted('prev')).toHaveLength(1)
    expect(w.emitted('next')).toHaveLength(1)
  })

  it('hasSections=false hides back/forward + selector, keeps play', () => {
    const w = mountT({ hasSections: false })
    expect(w.find('.dk-play').exists()).toBe(true)
    expect(w.find('[aria-label="ท่อนก่อน"]').exists()).toBe(false)
    expect(w.find('.st-seltrig').exists()).toBe(false)
  })
})

describe('timeline (col 1-3)', () => {
  it('a press on the bar emits seek with the fraction (แตะ=วิ่งไปทันที)', async () => {
    const w = mountT()
    const seek = w.find('.st-seek')
    seek.element.getBoundingClientRect = () => ({ left: 0, width: 100, top: 0, height: 26, right: 100, bottom: 26 })
    await seek.trigger('pointerdown', { clientX: 50, pointerId: 1 })
    expect(w.emitted('seek')).toBeTruthy()
    expect(w.emitted('seek')[0][0]).toBeCloseTo(0.5, 2)
  })

  it('section bars reflect the selection (picked = brand · current = taller)', () => {
    const w = mountT({ selected: new Set(['ร้อง 1']) })
    const segs = w.findAll('.st-seg')
    expect(segs).toHaveLength(2)
    expect(segs[0].classes()).toContain('on') // ร้อง 1 picked
    expect(segs[0].classes()).toContain('cur') // …and current
    expect(segs[1].classes()).not.toContain('on')
  })

  it('shows the total time only (DS)', () => {
    expect(mountT().find('.st-time').text()).toBe('1:00')
  })
})

describe('selector (col 5-6)', () => {
  it('count badge shows ONLY for a subset (icon-only when ทั้งหมด/none · mobile width)', () => {
    // all selected → icon only (no badge); a subset → the "n/total" badge appears + .sub highlight
    expect(mountT({ selected: new Set(['ร้อง 1', 'รับ']) }).find('.st-seltrig b').exists()).toBe(false)
    expect(mountT().find('.st-seltrig b').exists()).toBe(false) // none picked → icon only
    const sub = mountT({ selected: new Set(['รับ']) })
    expect(sub.find('.st-seltrig b').text()).toBe('1/2')
    expect(sub.find('.st-seltrig').classes()).toContain('sub')
  })

  it('opening the panel + toggling a row emits toggle-section', async () => {
    const w = mountT()
    await w.find('.st-seltrig').trigger('click')
    await nextTick()
    const rows = w.findAll('.st-ssrow')
    expect(rows).toHaveLength(2)
    await rows[1].trigger('click')
    expect(w.emitted('toggle-section')[0]).toEqual(['รับ'])
  })

  it('All / None emit set-all', async () => {
    const w = mountT()
    await w.find('.st-seltrig').trigger('click')
    await nextTick()
    const [all, none] = w.findAll('.st-ssallbtn')
    await all.trigger('click')
    await none.trigger('click')
    expect(w.emitted('set-all')).toEqual([[true], [false]])
  })

  it('a selected row shows its checked state', async () => {
    const w = mountT({ selected: new Set(['รับ']) })
    await w.find('.st-seltrig').trigger('click')
    await nextTick()
    const rows = w.findAll('.st-ssrow')
    expect(rows[1].classes()).toContain('on')
    expect(rows[0].classes()).not.toContain('on')
  })
})

describe('คีย์ on the bar (col 4)', () => {
  it('shows the current key as a badge', () => {
    expect(mountT().find('[data-cell="key"] .dk-badge').text()).toBe('C')
  })
  it('picking from its dropdown calls the descriptor onPick', async () => {
    const onPick = vi.fn()
    const settings = base.settings.map((s) => (s.id === 'key' ? { ...s, onPick } : s))
    const w = mountT({ settings })
    await w.find('[data-cell="key"] .dk-pbtn').trigger('click')
    await nextTick()
    await w.findAll('[data-cell="key"] .dk-ddrow')[1].trigger('click')
    expect(onPick).toHaveBeenCalledWith('D')
  })
})

describe('⚙ Setting page', () => {
  it('holds วนซ้ำ · คอร์ด · ความเร็ว · แสดงผล · โปร่งใส (not คีย์ — that is on the bar)', async () => {
    const w = mountT()
    await openSetting(w)
    for (const id of ['repeat', 'chord', 'speed', 'layer', 'alpha']) expect(panel(w, id).exists()).toBe(true)
    expect(panel(w, 'key').exists()).toBe(false)
  })

  it('the วนซ้ำ toggle emits toggle-loop', async () => {
    const w = mountT()
    await openSetting(w)
    await panel(w, 'repeat').find('.dk-switch').trigger('click')
    expect(w.emitted('toggle-loop')).toHaveLength(1)
  })

  it('a menu select calls the page descriptor onPick (แสดงผล → display)', async () => {
    const onPick = vi.fn()
    const settings = base.settings.map((s) => (s.id === 'display' ? { ...s, onPick } : s))
    const w = mountT({ settings })
    await openSetting(w)
    await panel(w, 'layer').find('select').setValue('lyric')
    expect(onPick).toHaveBeenCalledWith('lyric')
  })

  it('📌 pin promotes a control to a bar row + persists under the sing key', async () => {
    const w = mountT()
    expect(w.find('.dk-row [data-cell="chord"]').exists()).toBe(false)
    await openSetting(w)
    await panel(w, 'chord').find('.dk-pin').trigger('click')
    await nextTick()
    expect(w.find('.dk-row [data-cell="chord"]').exists()).toBe(true)
    expect(JSON.parse(localStorage.getItem('pleng.dockkey.sing.pins'))).toContain('chord')
  })

  it('the โปร่งใส slider drives the dock transparency', async () => {
    const w = mountT()
    await openSetting(w)
    await panel(w, 'alpha').find('input[type="range"]').setValue(60)
    await nextTick()
    expect(w.find('.dk-host').attributes('style')).toContain('0.6')
  })

  // B107 step 9 — the four sound axes collapse into ONE "เสียงดนตรี" bar button (P'Aim 13 ก.ค.).
  // Its popover holds all the axes; a coming-soon option renders disabled; picking one calls onPick.
  it('เสียงดนตรี button opens a popover with the sound axes (disabled options greyed)', async () => {
    const onPickInstr = vi.fn()
    const settings = [
      ...base.settings,
      { id: 'sound', icon: 'volume-2', label: 'เสียงที่เล่น', kind: 'menu', value: 'both', badge: 'รวม', options: [{ value: 'melody', label: 'ทำนอง', short: 'ทำนอง' }, { value: 'both', label: 'รวม', short: 'รวม' }], onPick: () => {} },
      { id: 'ensemble', icon: 'blend', label: 'การบรรเลง', kind: 'menu', value: 'solo', badge: 'เดี่ยว', options: [{ value: 'solo', label: 'เดี่ยว', short: 'เดี่ยว' }, { value: 'ensemble', label: 'เต็มวง', short: 'เต็มวง', disabled: true }], onPick: () => {} },
      { id: 'instrument', icon: 'music', label: 'เครื่องดนตรี', kind: 'menu', value: 'grand', badge: 'เปียโน', options: [{ value: 'grand', label: 'เปียโน', short: 'เปียโน' }, { value: 'violin', label: 'ไวโอลิน', short: 'ไวโอลิน' }], onPick: onPickInstr },
      { id: 'style', icon: 'sliders-horizontal', label: 'อารมณ์', kind: 'menu', value: 'arrangement', badge: 'บรรเลง', options: [{ value: 'arrangement', label: 'บรรเลง', short: 'บรรเลง' }, { value: 'plain', label: 'ตรงโน้ต', short: 'ตรงโน้ต' }], onPick: () => {} },
    ]
    const w = mountT({ settings })
    // the single bar button exists — ICON-ONLY (glyph reflects the current mode/instrument, no text)
    const trig = w.find('.sc-trig')
    expect(trig.exists()).toBe(true)
    expect(trig.find('.sc-sum').exists()).toBe(false) // no text label (icon-only)
    // opening it reveals all four axes as groups of option chips
    expect(w.find('.sc-pop').exists()).toBe(false)
    await trig.trigger('click')
    await nextTick()
    expect(w.find('.sc-pop').exists()).toBe(true)
    expect(w.findAll('.sc-grp')).toHaveLength(4)
    // a coming-soon option (เต็มวง) renders disabled
    const disabled = w.findAll('.sc-opt').filter((b) => b.text() === 'เต็มวง')
    expect(disabled[0].attributes('disabled')).toBeDefined()
    // picking a real instrument option calls the page's onPick
    const violin = w.findAll('.sc-opt').find((b) => b.text() === 'ไวโอลิน')
    await violin.trigger('click')
    expect(onPickInstr).toHaveBeenCalledWith('violin')
  })
})

describe('Aa reader font size', () => {
  beforeEach(() => { readingFontScale.value = 1 })

  it('is a permanent 1-tap control; its popover slider resizes the reader live', async () => {
    const w = mountT()
    expect(w.find('.st-aa').exists()).toBe(true)
    expect(w.find('.st-fontslider').exists()).toBe(false) // closed until tapped
    await w.find('.st-aa').trigger('click')
    await nextTick()
    const slider = w.find('.st-fontslider')
    expect(slider.exists()).toBe(true)
    await slider.setValue(140)
    expect(readingFontScale.value).toBeCloseTo(1.4, 5)
    expect(w.find('.st-fontval').text()).toContain('140%')
  })
})
