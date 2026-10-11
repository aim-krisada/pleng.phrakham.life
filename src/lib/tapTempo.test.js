// ใบ v3/pleng#102 ข้อ 1 — "เคาะตามที่ร้องจริง แล้วเว็บคิดเลขความเร็วให้เอง".
// The acceptance numbers from the ticket are asserted here:
//   · เคาะตามเครื่องนับจังหวะที่ 80 ⇒ ผลต้องห่างจาก 80 ไม่เกิน 2
//   · เคาะมั่ว / เคาะไม่ครบ ⇒ ต้องไม่ได้เลข ต้องบอกให้เคาะใหม่
import { describe, it, expect } from 'vitest'
import { bpmFromTaps, currentRun, createTapper, tapUnits, barBeats, TAP_MIN, TAP_RESET_MS } from './tapTempo.js'

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

// =================================================================================================
// ใบ v3/pleng#103 — สามเรื่องที่เคาะแล้วไม่ตรง
// =================================================================================================

// ข้อ 1 — เพลงที่ไม่ใช่ 4/4 เคาะตามห้อง แล้วได้ความเร็วผิดเป็นเท่าตัว.
// อนุชน 33 คือ 3/4 ตั้งไว้ ♩=108 → 36 ห้องต่อนาที. คนเคาะตามห้องได้ราว 36 ครั้ง/นาที และโปรแกรม
// เคยอ่านว่า "36" ⇒ เพลงช้าลง 3 เท่า. ในคลังมีเพลงแบบนี้ 220 เพลงจาก 651.
describe('ใบ#103 ข้อ 1 — เคาะตามห้อง: 3/4 · 6/8 · 6/4', () => {
  // taps at `perMin` taps a minute
  const at = (perMin, n = 8) => taps(perMin, n)

  it('3/4 ♩=108 — เคาะตามห้อง (36 ครั้ง/นาที) ได้ 108 ไม่ใช่ 36', () => {
    const r = bpmFromTaps(at(36), { timeSignature: '3/4', nearBpm: 108 })
    expect(r).toMatchObject({ ok: true, bpm: 108, unit: 3, perBar: true })
  })

  it('3/4 — เคาะตามจังหวะ (108 ครั้ง/นาที) ก็ยังได้ 108 เหมือนกัน', () => {
    const r = bpmFromTaps(at(108), { timeSignature: '3/4', nearBpm: 108 })
    expect(r).toMatchObject({ ok: true, bpm: 108, unit: 1, perBar: false })
  })

  it('3/4 — เคาะช้ากว่าเพลงจริง ๆ ก็ยังตามคนเคาะ ไม่ใช่ล็อกไว้ที่เลขเดิม', () => {
    // เพลงเก็บไว้ 108 แต่อยากร้องช้าลงเหลือ 72 → เคาะตามห้อง 24 ครั้ง/นาที
    expect(bpmFromTaps(at(24), { timeSignature: '3/4', nearBpm: 108 }).bpm).toBe(72)
  })

  it('6/8 ♩=120 — เคาะตามห้อง (40 ครั้ง/นาที) ได้ 120', () => {
    const r = bpmFromTaps(at(40), { timeSignature: '6/8', nearBpm: 120 })
    expect(r).toMatchObject({ ok: true, bpm: 120, perBar: true })
  })

  it('6/8 — เคาะตามจังหวะใหญ่ 2 ครั้งต่อห้อง (80 ครั้ง/นาที) ก็ได้ 120', () => {
    expect(bpmFromTaps(at(80), { timeSignature: '6/8', nearBpm: 120 }).bpm).toBe(120)
  })

  it('6/4 ♩=108 — เคาะครึ่งห้อง (36 ครั้ง/นาที) ได้ 108', () => {
    expect(bpmFromTaps(at(36), { timeSignature: '6/4', nearBpm: 108 }).bpm).toBe(108)
  })

  it('ไม่มีเลขห้องมาให้ ก็ยังอ่านแบบเดิม — 1 เคาะ = 1 จังหวะ', () => {
    expect(bpmFromTaps(at(96)).bpm).toBe(96)
    expect(bpmFromTaps(at(96), { timeSignature: '' }).bpm).toBe(96)
    expect(bpmFromTaps(at(96), { timeSignature: 'ไม่รู้' }).bpm).toBe(96)
  })

  it('ของเดิมเหมือนเดิม — 4/4 ให้เลขเดียวกับตอนไม่บอกอัตราจังหวะทุกความเร็ว', () => {
    for (const perMin of [40, 60, 72, 84, 92, 108, 120, 150, 180, 240]) {
      const plain = bpmFromTaps(at(perMin))
      const four = bpmFromTaps(at(perMin), { timeSignature: '4/4', nearBpm: 92 })
      expect(four).toMatchObject({ ok: true, bpm: plain.bpm, unit: 1, perBar: false })
      expect(four.bpm).toBe(perMin)
    }
  })

  it('tapUnits — มีแต่เพลงที่คนเคาะตามห้องจริงที่ได้ทางเลือกเพิ่ม', () => {
    expect(tapUnits('4/4')).toEqual([1])
    expect(tapUnits('2/4')).toEqual([1])
    expect(tapUnits('5/4')).toEqual([1])
    expect(tapUnits('3/4')).toEqual([3, 1])
    expect(tapUnits('6/8')).toEqual([3, 1.5])
    expect(tapUnits('9/8')).toEqual([4.5, 1.5])
    expect(tapUnits('6/4')).toEqual([6, 3, 1])
    expect(barBeats('6/8')).toBe(3)
    expect(barBeats('4/4')).toBe(4)
    expect(barBeats('')).toBe(null)
  })
})

// ข้อ 3 — ความแม่น. คนเคาะจำลอง 6 ครั้ง เพี้ยนได้ถึง ±60ms 300 รอบ.
// ของเดิม (เฉลี่ยเฉพาะช่องที่ "ดูดี") พลาดเฉลี่ย ~2.3 มากสุด 12-15 ที่ ♩=108
// ของใหม่ (ลากเส้นตรงเส้นเดียวผ่านทุกครั้งที่เคาะ) เหลือเฉลี่ย ~1.3 มากสุด 5
// ดูตารางเต็มได้ที่ tools/tap-accuracy.mjs
describe('ใบ#103 ข้อ 3 — ความแม่นของการเคาะ', () => {
  function rng(seed) {
    let a = seed | 0
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  // คนเคาะจำลอง: n ครั้ง ตรงจังหวะ แต่ละครั้งเพี้ยนได้ถึง ±jitter มิลลิวินาที
  function run(bpm, { n = 6, jitter = 60, rounds = 300, seed = 103 } = {}) {
    const r = rng(seed)
    const gap = 60000 / bpm
    let sum = 0
    let max = 0
    let refused = 0
    for (let k = 0; k < rounds; k++) {
      const t = []
      for (let i = 0; i < n; i++) t.push(1000 + i * gap + (r() * 2 - 1) * jitter)
      const got = bpmFromTaps(t)
      if (!got.ok) { refused++; continue }
      const err = Math.abs(got.bpm - bpm)
      sum += err
      if (err > max) max = err
    }
    return { avg: sum / (rounds - refused), max, refused }
  }

  it('♩=108 เคาะ 6 ครั้ง — เฉลี่ยไม่เกิน 1.5 และมากสุดไม่เกิน 5 (ของเดิมเฉลี่ย 2.3 มากสุด 12)', () => {
    const got = run(108)
    expect(got.avg).toBeLessThanOrEqual(1.5)
    expect(got.max).toBeLessThanOrEqual(5)
    expect(got.refused).toBe(0) // ของเดิมไม่ยอมอ่านไป 30 รอบจาก 300
  })

  it('♩=92 (ค่าตั้งต้นของเว็บ) เคาะ 6 ครั้ง — มากสุดไม่เกิน 4', () => {
    const got = run(92)
    expect(got.avg).toBeLessThanOrEqual(1.1)
    expect(got.max).toBeLessThanOrEqual(4)
  })

  it('เคาะ 8 ครั้ง — มากสุดไม่เกิน 3 ทุกความเร็วที่ร้องกันจริง', () => {
    for (const bpm of [60, 80, 92, 108]) {
      const got = run(bpm, { n: 8 })
      expect(got.max).toBeLessThanOrEqual(3)
    }
  })

  it('เคาะพลาดไปครั้งหนึ่ง (ลืมเคาะ 1 จังหวะ) ยังได้เลขเดิม', () => {
    const t = taps(90, 7)
    t.splice(3, 1) // หายไปหนึ่งครั้ง → ช่องนั้นยาวเป็นสองเท่า
    expect(bpmFromTaps(t)).toMatchObject({ ok: true, bpm: 90 })
  })
})
