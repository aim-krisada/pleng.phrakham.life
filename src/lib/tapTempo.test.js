// ใบ v3/pleng#102 ข้อ 1 — "เคาะตามที่ร้องจริง แล้วเว็บคิดเลขความเร็วให้เอง".
// The acceptance numbers from the ticket are asserted here:
//   · เคาะตามเครื่องนับจังหวะที่ 80 ⇒ ผลต้องห่างจาก 80 ไม่เกิน 2
//   · เคาะมั่ว / เคาะไม่ครบ ⇒ ต้องไม่ได้เลข ต้องบอกให้เคาะใหม่
import { describe, it, expect } from 'vitest'
import { bpmFromTaps, currentRun, createTapper, TAP_MIN, TAP_RESET_MS } from './tapTempo.js'

// build tap times from a bpm, with an optional per-tap human jitter (ms)
function taps(bpm, n, jitter = []) {
  const gap = 60000 / bpm
  const out = [1000]
  for (let i = 1; i < n; i++) out.push(out[i - 1] + gap + (jitter[i - 1] ?? 0))
  return out
}

describe('bpmFromTaps — เคาะตามเครื่องนับจังหวะ', () => {
  it('perfectly even taps at 80 give exactly 80', () => {
    expect(bpmFromTaps(taps(80, 8))).toMatchObject({ ok: true, bpm: 80 })
  })

  it('a human tapping along with a 80 metronome lands within 2 of 80 (ticket number)', () => {
    // ±25 ms of human slop on each tap — that is a sloppy-but-real singer
    const jitter = [22, -18, 25, -24, 15, -20, 19]
    const r = bpmFromTaps(taps(80, 8, jitter))
    expect(r.ok).toBe(true)
    expect(Math.abs(r.bpm - 80)).toBeLessThanOrEqual(2)
  })

  it('works across the whole singing window (60 · 84 · 108 · 140)', () => {
    for (const bpm of [60, 84, 108, 140]) {
      const r = bpmFromTaps(taps(bpm, 8, [12, -9, 14, -11, 8, -13, 10]))
      expect(r.ok).toBe(true)
      expect(Math.abs(r.bpm - bpm)).toBeLessThanOrEqual(2)
    }
  })

  it('ONE stray tap in an otherwise steady run is thrown away, not averaged in', () => {
    const t = taps(80, 9)
    t[4] += 260 // one very late tap → two bad gaps around it
    const r = bpmFromTaps(t)
    expect(r.ok).toBe(true)
    expect(Math.abs(r.bpm - 80)).toBeLessThanOrEqual(2)
  })
})

describe('bpmFromTaps — เคาะมั่ว / เคาะไม่ครบ ต้องไม่ได้เลขเพี้ยน', () => {
  it('fewer than the minimum taps → no number, asks for more', () => {
    for (let n = 0; n < TAP_MIN; n++) {
      const r = bpmFromTaps(taps(80, n))
      expect(r.ok).toBe(false)
      expect(r.bpm).toBe(null)
      expect(r.reason).toBe('few')
    }
  })

  it('random mashing → refused with "uneven", never a silent wrong bpm', () => {
    const messy = [0, 170, 980, 1120, 2600, 2680, 4000]
    const r = bpmFromTaps(messy)
    expect(r.ok).toBe(false)
    expect(r.bpm).toBe(null)
    expect(r.reason).toBe('uneven')
  })

  it('a steady run that drifts wildly faster is refused, not averaged', () => {
    const t = [0, 750, 1500, 2100, 2500, 2750] // speeding up every tap
    expect(bpmFromTaps(t).ok).toBe(false)
  })

  it('a beat outside the singing window is refused by the range check', () => {
    expect(bpmFromTaps(taps(25, 6)).reason).toBe('range') // ช้าเกินกว่าจะเป็นจังหวะ
    expect(bpmFromTaps(taps(400, 8)).reason).toBe('range') // รัวนิ้ว ไม่ใช่จังหวะเพลง
  })
})

describe('currentRun — ทิ้งช่วงนานเกินไป = เริ่มเคาะใหม่', () => {
  it('a long pause starts a fresh run; only the taps after it count', () => {
    const first = taps(60, 4) // 1000,2000,3000,4000
    const second = [4000 + TAP_RESET_MS + 500, 4000 + TAP_RESET_MS + 1000, 4000 + TAP_RESET_MS + 1500, 4000 + TAP_RESET_MS + 2000]
    expect(currentRun([...first, ...second])).toEqual(second)
  })

  it('the old run cannot poison the new one — bpm comes from the new taps only', () => {
    const slow = taps(60, 5)
    const t = slow[slow.length - 1]
    const fast = [t + 5000, t + 5500, t + 6000, t + 6500, t + 7000] // 120 bpm
    expect(bpmFromTaps([...slow, ...fast])).toMatchObject({ ok: true, bpm: 120 })
  })
})

describe('createTapper — the pad used by the dock', () => {
  it('stays silent until there are enough taps, then reports the bpm', () => {
    const tp = createTapper()
    const t = taps(100, 6)
    const seen = t.map((x) => tp.tap(x))
    expect(seen.slice(0, TAP_MIN - 1).every((r) => !r.ok)).toBe(true)
    expect(seen.at(-1)).toMatchObject({ ok: true, bpm: 100 })
  })

  it('reset() forgets the run (the pad is reopened)', () => {
    const tp = createTapper()
    taps(100, 6).forEach((x) => tp.tap(x))
    tp.reset()
    expect(tp.read().ok).toBe(false)
    expect(tp.taps).toBe(0)
  })

  it('a tap after a long silence restarts counting from 1', () => {
    const tp = createTapper()
    taps(100, 6).forEach((x) => tp.tap(x))
    const r = tp.tap(1000 + 60000)
    expect(r.ok).toBe(false)
    expect(r.taps).toBe(1)
  })
})
