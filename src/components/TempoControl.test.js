// ใบ v3/pleng#102 ข้อ 2–4 — the ความเร็ว cell on the ฝึกร้อง dock.
//   ข้อ 2 ตั้งได้ทุกเลขในช่วงที่ใช้จริง (84 → 86, ไม่ใช่แค่ 9 ค่าเดิม)
//   ข้อ 3 แตะไม่เกิน 3 ครั้งจากหน้าเพลง ก็ได้ความเร็วใหม่ · ไม่ต้องพิมพ์ตัวเลข
//   ข้อ 4 เห็นตลอดว่าตอนนี้ความเร็วเท่าไร
//   ข้อ 6 ค่าที่เคยเลือกได้ (TEMPO_MARKS) ยังเลือกได้ครบ
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TempoControl from './TempoControl.vue'
import { TEMPO_MARKS, TEMPO_MIN, TEMPO_MAX, TEMPO_STEP } from '../lib/midi.js'

const mountTC = (props = {}) =>
  mount(TempoControl, { props: { open: false, value: 108, songBpm: 108, ...props }, global: { stubs: { Icon: true } } })

const lastSet = (w) => w.emitted('set')?.at(-1)?.[0]
const stepBtns = (w) => w.findAll('.tc-step')

// the tap tests drive a fake clock; put it back so nothing leaks into the next test
afterEach(() => { vi.restoreAllMocks() })

describe('ข้อ 4 — the number is readable without opening anything', () => {
  it('the bar cell always shows the bpm sounding now', () => {
    expect(mountTC({ value: 84 }).find('.tc-num').text()).toBe('84')
  })

  it('it follows the page when the tempo changes elsewhere (เพลงใหม่ / เคาะ)', async () => {
    const w = mountTC({ value: 84 })
    await w.setProps({ value: 120 })
    expect(w.find('.tc-num').text()).toBe('120')
  })
})

describe('ข้อ 3 — a new speed in ≤3 taps, no typing', () => {
  it('tap the cell (1) then + (2) → a new speed is set', async () => {
    const w = mountTC({ value: 84 })
    await w.find('.tc-trig').trigger('click') // tap 1
    expect(w.emitted('toggle')).toHaveLength(1)
    await w.setProps({ open: true })
    await stepBtns(w)[1].trigger('click') // tap 2
    expect(lastSet(w)).toBe(84 + TEMPO_STEP)
  })

  it('− walks it back down by the same step', async () => {
    const w = mountTC({ value: 86, open: true })
    await stepBtns(w)[0].trigger('click')
    expect(lastSet(w)).toBe(86 - TEMPO_STEP)
  })

  it('every control is a button or a slider — nothing to type', () => {
    const w = mountTC({ open: true })
    expect(w.findAll('input[type="text"]').length + w.findAll('input[type="number"]').length).toBe(0)
  })
})

describe('ข้อ 2 — any number in the usable window', () => {
  it('84 then + gives 86 (the old menu could only jump 84 → 92)', async () => {
    const w = mountTC({ value: 84, open: true })
    await stepBtns(w)[1].trigger('click')
    expect(lastSet(w)).toBe(86)
    expect(TEMPO_MARKS.some((m) => m.value === 86)).toBe(false) // 86 was unreachable before
  })

  it('the slider covers the whole window and sets odd numbers too', async () => {
    const w = mountTC({ value: 100, open: true })
    const sl = w.find('.tc-slider')
    expect(sl.attributes('min')).toBe(String(TEMPO_MIN))
    expect(sl.attributes('max')).toBe(String(TEMPO_MAX))
    expect(sl.attributes('step')).toBe('1')
    await sl.setValue('107')
    expect(lastSet(w)).toBe(107)
  })

  it('never leaves the window — the ends simply stop', async () => {
    const lo = mountTC({ value: TEMPO_MIN, open: true })
    expect(stepBtns(lo)[0].attributes('disabled')).toBeDefined()
    const hi = mountTC({ value: TEMPO_MAX, open: true })
    expect(stepBtns(hi)[1].attributes('disabled')).toBeDefined()
  })
})

describe('ข้อ 6 — nothing that used to be pickable was taken away', () => {
  it('every TEMPO_MARKS value is still one tap away as a chip', () => {
    const w = mountTC({ open: true, songBpm: 0 })
    const chips = w.findAll('.tc-chip').map((c) => Number(c.text().replace(/\D+.*$/, '')))
    for (const m of TEMPO_MARKS) expect(chips).toContain(m.value)
  })

  it('"ตามเพลง" is the first chip so the song\'s own speed is always one tap back', async () => {
    const w = mountTC({ value: 130, open: true, songBpm: 108 })
    const first = w.findAll('.tc-chip')[0]
    expect(first.text()).toContain('ตามเพลง')
    await first.trigger('click')
    expect(lastSet(w)).toBe(108)
  })
})

describe('ข้อ 1 — เคาะตามจังหวะ', () => {
  // drive the pad with a fake clock so the taps are exactly N bpm apart
  async function tapAt(w, times) {
    const pad = w.find('.tc-tap')
    for (const t of times) {
      vi.spyOn(performance, 'now').mockReturnValue(t)
      await pad.trigger('click')
      await nextTick()
    }
  }
  const evenTaps = (bpm, n, from = 1000) => Array.from({ length: n }, (_, i) => from + (i * 60000) / bpm)

  it('tapping along with a 80 metronome sets a bpm within 2 of 80', async () => {
    const w = mountTC({ value: 108, open: true })
    await tapAt(w, evenTaps(80, 8))
    expect(Math.abs(lastSet(w) - 80)).toBeLessThanOrEqual(2)
  })

  it('too few taps set nothing and the pad says how many are left', async () => {
    const w = mountTC({ value: 108, open: true })
    await tapAt(w, evenTaps(80, 2))
    expect(w.emitted('set')).toBeUndefined()
    expect(w.find('.tc-taphint').text()).toMatch(/เคาะอีก/)
  })

  it('เคาะมั่ว sets nothing and asks for a fresh go', async () => {
    const w = mountTC({ value: 108, open: true })
    await tapAt(w, [1000, 1170, 1980, 2120, 2300, 3400])
    expect(w.emitted('set')).toBeUndefined()
    expect(w.find('.tc-taphint').text()).toMatch(/ไม่สม่ำเสมอ|เริ่มเคาะใหม่/)
  })

  it('closing the pad forgets the run, so the next session starts clean', async () => {
    const w = mountTC({ value: 108, open: true })
    await tapAt(w, evenTaps(80, 3))
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    expect(w.find('.tc-taphint').text()).toMatch(/อย่างน้อย/)
  })
})
