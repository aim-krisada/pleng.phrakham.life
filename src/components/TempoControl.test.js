// ใบ v3/pleng#102 ข้อ 2–4 — the ความเร็ว cell on the ฝึกร้อง dock.
//   ข้อ 2 ตั้งได้ทุกเลขในช่วงที่ใช้จริง (84 → 86, ไม่ใช่แค่ 9 ค่าเดิม)
//   ข้อ 3 แตะไม่เกิน 3 ครั้งจากหน้าเพลง ก็ได้ความเร็วใหม่ · ไม่ต้องพิมพ์ตัวเลข
//   ข้อ 4 เห็นตลอดว่าตอนนี้ความเร็วเท่าไร
//   ข้อ 6 ค่าที่เคยเลือกได้ (TEMPO_MARKS) ยังเลือกได้ครบ
// ใบ v3/pleng#143 — −/+ ทีละ 1 · ไม่มีแถบเลื่อน · กดค้างแล้วเลขวิ่งเองและเร็วขึ้น (ดู describe ใบ#143 ท้ายไฟล์)
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

  it('every control is a button — nothing to type', () => {
    const w = mountTC({ open: true })
    expect(w.findAll('input[type="text"]').length + w.findAll('input[type="number"]').length).toBe(0)
  })
})

describe('ข้อ 2 — any number in the usable window', () => {
  it('84 then + gives 85 (the old menu could only jump 84 → 92)', async () => {
    const w = mountTC({ value: 84, open: true })
    await stepBtns(w)[1].trigger('click')
    expect(lastSet(w)).toBe(85)
    expect(TEMPO_MARKS.some((m) => m.value === 85)).toBe(false) // 85 was unreachable before
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

  // ใบ v3/pleng#103 ข้อ 1 — อนุชน 33 เป็น 3/4 ตั้งไว้ ♩=108 = 36 ห้องต่อนาที. พี่เอมเคาะตามห้อง
  // แล้วเคยได้ 36 ⇒ เพลงช้าลง 3 เท่า. แป้นเคาะต้องรู้อัตราจังหวะของเพลงที่เปิดอยู่
  it('3/4 — เคาะตามห้อง 36 ครั้งต่อนาที ได้ ♩=108 และบอกด้วยว่านับเป็นห้อง', async () => {
    const w = mountTC({ value: 92, songBpm: 108, timeSignature: '3/4', open: true })
    await tapAt(w, evenTaps(36, 8))
    expect(lastSet(w)).toBe(108)
    expect(w.find('.tc-taphint').text()).toContain('1 ห้อง')
  })

  it('6/8 — เคาะตามห้อง 40 ครั้งต่อนาที ได้ ♩=120', async () => {
    const w = mountTC({ value: 92, songBpm: 120, timeSignature: '6/8', open: true })
    await tapAt(w, evenTaps(40, 8))
    expect(lastSet(w)).toBe(120)
  })

  it('4/4 — ของเดิมเหมือนเดิม: เคาะ 80 ครั้งต่อนาที ได้ 80 ไม่ใช่เลขคูณ', async () => {
    const w = mountTC({ value: 108, songBpm: 92, timeSignature: '4/4', open: true })
    await tapAt(w, evenTaps(80, 8))
    expect(lastSet(w)).toBe(80)
    expect(w.find('.tc-taphint').text()).not.toContain('ห้อง')
  })

  // ใบ#103 ข้อ 2 — หน้าเพลงต้องแยกออกว่าเลขนี้มาจากการเคาะ จะได้ไม่สั่งเพลงเล่นใหม่ทุกครั้งที่เคาะ
  it('บอกที่มาของเลขไปด้วย — เคาะ = tap, ปุ่ม = ui', async () => {
    const w = mountTC({ value: 108, songBpm: 108, open: true })
    await stepBtns(w)[1].trigger('click')
    expect(w.emitted('set').at(-1)[1]).toBe('ui')
    await tapAt(w, evenTaps(80, 8))
    expect(w.emitted('set').at(-1)[1]).toBe('tap')
  })

  it('closing the pad forgets the run, so the next session starts clean', async () => {
    const w = mountTC({ value: 108, open: true })
    await tapAt(w, evenTaps(80, 3))
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    expect(w.find('.tc-taphint').text()).toMatch(/อย่างน้อย/)
  })
})

// ใบ v3/pleng#143 — ปรับความเร็วทีละ 1 (พี่เอม 1 พ.ย. 2569) และกดค้างแล้วเลขวิ่งเอง (พี่เอมเคาะ 2 พ.ย. 2569)
describe('ใบ#143 — one bpm a press, no slider, hold to run', () => {
  // a parent that feeds every emitted number straight back in, like the real page does
  const mountLive = (value) => {
    const w = mount(TempoControl, {
      props: { open: true, value, songBpm: 108, onSet: (v) => w.setProps({ value: v }) },
      global: { stubs: { Icon: true } },
    })
    return w
  }
  const shown = (w) => Number(w.find('.tc-big').text())

  it('AC1 — 120, + once → 121; − once → back to 120', async () => {
    const w = mountTC({ value: 120, open: true })
    await stepBtns(w)[1].trigger('click')
    expect(lastSet(w)).toBe(121)
    await w.setProps({ value: 121 })
    await stepBtns(w)[0].trigger('click')
    expect(lastSet(w)).toBe(120)
    expect(TEMPO_STEP).toBe(1)
  })

  it('AC2 — the number on the bar button follows at once', async () => {
    const w = mountTC({ value: 120, open: true })
    await w.setProps({ value: 121 })
    expect(w.find('.tc-num').text()).toBe('121')
  })

  it('AC3 — the popup holds −, the number, +, the tap pad and the quick chips — and no slider', () => {
    const w = mountTC({ value: 120, open: true })
    expect(w.find('.tc-step[aria-label="ช้าลง"]').exists()).toBe(true)
    expect(w.find('.tc-big').text()).toBe('120')
    expect(w.find('.tc-step[aria-label="เร็วขึ้น"]').exists()).toBe(true)
    expect(w.find('.tc-tap').exists()).toBe(true)
    expect(w.findAll('.tc-chip').length).toBeGreaterThan(0)
    expect(w.find('input[type="range"]').exists()).toBe(false)
    expect(w.find('.tc-slider').exists()).toBe(false)
  })

  it('AC4 sad path — at 40 − is dimmed, at 240 + is dimmed, and pressing them sets nothing', async () => {
    const lo = mountTC({ value: TEMPO_MIN, open: true })
    expect(TEMPO_MIN).toBe(40)
    expect(stepBtns(lo)[0].attributes('disabled')).toBeDefined()
    expect(stepBtns(lo)[1].attributes('disabled')).toBeUndefined()
    const hi = mountTC({ value: TEMPO_MAX, open: true })
    expect(TEMPO_MAX).toBe(240)
    expect(stepBtns(hi)[1].attributes('disabled')).toBeDefined()
    await stepBtns(hi)[1].trigger('click')
    expect(hi.emitted('set')).toBeUndefined()
  })

  it('a finger tap (press, release, click) is exactly ONE step, not two', async () => {
    const w = mountTC({ value: 120, open: true })
    const plus = stepBtns(w)[1]
    await plus.trigger('pointerdown', { button: 0 })
    await plus.trigger('pointerup')
    await plus.trigger('click')
    expect(w.emitted('set').map((e) => e[0])).toEqual([121])
  })

  it('the keyboard (Enter / Space = a click with no press before it) still steps once each time', async () => {
    const w = mountTC({ value: 120, open: true })
    await stepBtns(w)[0].trigger('click')
    await stepBtns(w)[0].trigger('click')
    expect(w.emitted('set').map((e) => e[0])).toEqual([119, 119]) // value is not fed back here
  })

  it('holding + keeps walking by 1 and speeds up; letting go stops it — 92 to 140 in a hold under 3.5 s', async () => {
    vi.useFakeTimers()
    try {
      const w = mountLive(92)
      const plus = stepBtns(w)[1]
      await plus.trigger('pointerdown', { button: 0 })
      expect(shown(w)).toBe(93) // the first step lands at once
      await vi.advanceTimersByTimeAsync(399)
      expect(shown(w)).toBe(93) // nothing more until the hold delay
      await vi.advanceTimersByTimeAsync(1)
      expect(shown(w)).toBe(94)
      const seen = new Set([93, 94])
      let ms = 400
      while (shown(w) < 140 && ms < 6000) { await vi.advanceTimersByTimeAsync(5); ms += 5; seen.add(shown(w)) }
      expect(shown(w)).toBe(140)
      expect(ms).toBeLessThan(3500)
      for (let n = 93; n <= 140; n++) expect(seen.has(n)).toBe(true) // walks by 1, never jumps
      await plus.trigger('pointerup')
      const at = shown(w)
      await vi.advanceTimersByTimeAsync(2000)
      expect(shown(w)).toBe(at) // released: it stops
    } finally { vi.useRealTimers() }
  })

  it('the hold also stops when the finger slides off, or the touch is cancelled', async () => {
    vi.useFakeTimers()
    try {
      for (const ev of ['pointerleave', 'pointercancel']) {
        const w = mountLive(100)
        const minus = stepBtns(w)[0]
        await minus.trigger('pointerdown', { button: 0 })
        await vi.advanceTimersByTimeAsync(700)
        await minus.trigger(ev)
        const at = shown(w)
        expect(at).toBeLessThan(99)
        await vi.advanceTimersByTimeAsync(2000)
        expect(shown(w)).toBe(at)
      }
    } finally { vi.useRealTimers() }
  })

  it('a hold stops by itself at the end of the window (40) and never goes past it', async () => {
    vi.useFakeTimers()
    try {
      const w = mountLive(45)
      await stepBtns(w)[0].trigger('pointerdown', { button: 0 })
      await vi.advanceTimersByTimeAsync(5000)
      expect(shown(w)).toBe(40)
      expect(Math.min(...w.emitted('set').map((e) => e[0]))).toBe(40)
      const n = w.emitted('set').length
      await vi.advanceTimersByTimeAsync(2000)
      expect(w.emitted('set').length).toBe(n) // stopped: no more emits
    } finally { vi.useRealTimers() }
  })

  it('closing the popup mid-hold stops it; a right-click is not a press', async () => {
    vi.useFakeTimers()
    try {
      const w = mountLive(100)
      await stepBtns(w)[1].trigger('pointerdown', { button: 0 })
      await w.setProps({ open: false })
      const n = w.emitted('set').length
      await vi.advanceTimersByTimeAsync(2000)
      expect(w.emitted('set').length).toBe(n)
      const r = mountTC({ value: 100, open: true })
      await stepBtns(r)[1].trigger('pointerdown', { button: 2 })
      await vi.advanceTimersByTimeAsync(2000)
      expect(r.emitted('set')).toBeUndefined()
    } finally { vi.useRealTimers() }
  })
})
