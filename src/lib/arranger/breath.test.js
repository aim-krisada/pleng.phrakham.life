// ใบ v3/pleng#98 thread 28402 — พี่เปา: เพลง 50 บรรทัด 3–4 "เวลาลงหัวห้องมันฟังดูหน้าทิ่ม", เพลง 18 ก็เป็น.
// The ท่อน breath delayed ONLY the notes struck at the new ท่อน (60 ms); the very next note stayed on the
// grid, so the gap to it lost the whole 60 ms — at 112 bpm an eighth went 268 → 208 ms (22% short). Measured
// 2 ต.ค. 2569 on the published songs: 611 gaps squeezed ≥ 15% in 165 songs. Now the breath eases back to the
// grid over 2 beats: every gap inside loses only a little, the grid never moves.
import { describe, it, expect } from 'vitest'
import { rubato } from './dynamics.js'

const mel = (beats) => { let b = 0; return beats.map((len) => { const e = { role: 'melody', midi: 60, startBeat: b, beats: len, gain: 0.3, timeShift: 0 }; b += len; return e }) }
const SPB = 60 / 112 // เพลง 50's tempo

describe('ใบ#98 thread 28402 — the ท่อน breath does not trip the next note', () => {
  it('a ท่อน that starts on beat 1 with eighths: full breath on beat 1, the eighth after it barely squeezed', () => {
    // ท่อน 1 = 0..4 (ends on a held note), ท่อน 2 starts at 4 with eighths (like เพลง 50 บรรทัด 3)
    const ev = mel([2, 2, 0.5, 0.5, 0.5, 0.5, 2])
    rubato(ev, [{ fromBeat: 0, toBeat: 4 }, { fromBeat: 4, toBeat: 8 }])
    expect(ev[2].timeShift).toBeCloseTo(0.06, 9) // the breath itself is kept, in full
    const squeeze = (ev[2].timeShift - ev[3].timeShift) / (0.5 * SPB)
    expect(squeeze).toBeLessThan(0.07) // it was 0.06 / 0.268 = 22%
  })
  it('a ท่อน that starts on a pickup: beat 1 after it does not tumble in early', () => {
    // ท่อน 2 starts with a half-beat pickup at 3.5, beat 1 of the next bar at 4
    const ev = mel([2, 1.5, 0.5, 2, 2])
    rubato(ev, [{ fromBeat: 0, toBeat: 3.5 }, { fromBeat: 3.5, toBeat: 8 }])
    expect(ev[2].timeShift).toBeCloseTo(0.06, 9)
    expect((ev[2].timeShift - ev[3].timeShift) / (0.5 * SPB)).toBeLessThan(0.07)
  })
  it('the breath is back on the grid 2 beats later, and the grid itself never moves', () => {
    const ev = mel([2, 2, 0.5, 0.5, 0.5, 0.5, 2, 2])
    const grid = ev.map((e) => e.startBeat)
    rubato(ev, [{ fromBeat: 0, toBeat: 4 }, { fromBeat: 4, toBeat: 10 }])
    expect(ev.map((e) => e.startBeat)).toEqual(grid)
    expect(ev.filter((e) => e.startBeat >= 6 && e.startBeat < 9).every((e) => e.timeShift === 0)).toBe(true)
  })
  it('two ท่อน starts close together take the larger breath, never the sum', () => {
    const ev = mel([2, 1.5, 1, 0.5, 2, 2])
    rubato(ev, [{ fromBeat: 0, toBeat: 3.5 }, { fromBeat: 3.5, toBeat: 4.5 }, { fromBeat: 4.5, toBeat: 10 }])
    expect(Math.max(...ev.map((e) => e.timeShift))).toBeLessThanOrEqual(0.06 + 1e-9)
  })
  it('every voice at an instant breathes together (melody, chord, bass) — พี่เปา 30 ก.ค. item 5', () => {
    const ev = [...mel([2, 2, 1, 1]), { role: 'inner', midi: 52, startBeat: 4, beats: 1, gain: 0.06, timeShift: 0 }, { role: 'bass', midi: 40, startBeat: 4, beats: 4, gain: 0.1, timeShift: 0 }, { role: 'inner', midi: 52, startBeat: 5, beats: 1, gain: 0.06, timeShift: 0 }]
    rubato(ev, [{ fromBeat: 0, toBeat: 4 }, { fromBeat: 4, toBeat: 8 }])
    const at = (b) => [...new Set(ev.filter((e) => e.startBeat === b).map((e) => e.timeShift))]
    expect(at(4)).toEqual([0.06])
    expect(at(5)).toHaveLength(1) // the melody and the chord at beat 5 still strike as one
  })
})
