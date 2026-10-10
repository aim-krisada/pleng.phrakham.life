// ใบ v3/pleng#102 — "เคาะตามจังหวะ" (tap tempo): turn a list of tap TIMES into one bpm number.
//
// Pure math, no DOM, no audio — so it can be unit-tested and reused by any page (the ฝึกร้อง dock
// uses it today; แก้ไข could use the same function later to set a song's stored bpm).
//
// Why the shape below:
//   · A singer taps along with the words, so the taps are never perfectly even. We take the MEDIAN
//     gap (not the mean) as the "true" beat, then AVERAGE only the gaps that sit close to it. A
//     median is immune to one stray tap; the trimmed average still uses every good tap, so with 8
//     clean taps at ♩=80 the answer lands within ~1 bpm.
//   · A long pause means the person stopped and started over → that gap is NOT a beat. Gaps longer
//     than RESET_MS are dropped, and `runFrom` tells the caller where the current run began so the
//     tap pad can show "เคาะต่อ" counting from there (this is also what makes tapping WHILE the song
//     plays safe: you can stop, listen, and start tapping again).
//   · If the surviving gaps still disagree wildly (เคาะมั่ว), we refuse: `{ ok: false }` with a
//     reason the UI shows as "เคาะไม่สม่ำเสมอ — ลองใหม่" instead of silently setting a wrong bpm.
//
// All times are milliseconds from any monotonic-ish clock (performance.now() or Date.now()).

// a gap longer than this = the person stopped; the next tap starts a NEW run
export const TAP_RESET_MS = 2500
// fewest taps we accept. 4 taps = 3 gaps — enough for a median + a trimmed average to mean something.
export const TAP_MIN = 4
// a gap may differ from the median by at most this fraction and still count as "the same beat".
// 0.2 is deliberately tight: a run that speeds up or slows down steadily (ไม่ใช่จังหวะเดียว) then
// fails to produce enough agreeing gaps and is refused, instead of returning the average of a drift.
const TOLERANCE = 0.2
// after trimming, the spread of the kept gaps must stay under this fraction of the median,
// otherwise we call it เคาะมั่ว and refuse
const MAX_SPREAD = 0.3
// the bpm window we accept — outside it the taps were not a singing tempo
export const BPM_MIN = 30
export const BPM_MAX = 300

function median(sorted) {
  const n = sorted.length
  if (!n) return 0
  const m = n >> 1
  return n % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2
}

// Keep only the taps belonging to the CURRENT run: walk back from the last tap while each gap is
// shorter than resetMs. Returns the kept times (oldest → newest).
export function currentRun(times, resetMs = TAP_RESET_MS) {
  const t = (times || []).filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b)
  if (t.length < 2) return t
  let start = t.length - 1
  while (start > 0 && t[start] - t[start - 1] <= resetMs) start--
  return t.slice(start)
}

/**
 * bpm from tap times.
 * @param {number[]} times  tap timestamps in ms
 * @param {object}   opts   { resetMs, min, max, minTaps }
 * @returns {{ ok:boolean, bpm:number|null, taps:number, reason:string }}
 *   reason: 'ok' | 'few' (ยังเคาะไม่พอ) | 'uneven' (เคาะไม่สม่ำเสมอ) | 'range' (เร็ว/ช้าเกินจริง)
 */
export function bpmFromTaps(times, opts = {}) {
  const resetMs = opts.resetMs ?? TAP_RESET_MS
  const minTaps = opts.minTaps ?? TAP_MIN
  const lo = opts.min ?? BPM_MIN
  const hi = opts.max ?? BPM_MAX

  const run = currentRun(times, resetMs)
  if (run.length < minTaps) return { ok: false, bpm: null, taps: run.length, reason: 'few' }

  const gaps = []
  for (let i = 1; i < run.length; i++) gaps.push(run[i] - run[i - 1])
  const sorted = gaps.slice().sort((a, b) => a - b)
  const mid = median(sorted)
  if (!(mid > 0)) return { ok: false, bpm: null, taps: run.length, reason: 'uneven' }

  // drop the taps that disagree with the majority (a missed tap = a ~double gap, a double tap = a
  // ~half gap — both land outside the tolerance window and are thrown away)
  const kept = gaps.filter((g) => Math.abs(g - mid) <= mid * TOLERANCE)
  if (kept.length < minTaps - 1) return { ok: false, bpm: null, taps: run.length, reason: 'uneven' }

  const spread = (Math.max(...kept) - Math.min(...kept)) / mid
  if (spread > MAX_SPREAD) return { ok: false, bpm: null, taps: run.length, reason: 'uneven' }

  const avg = kept.reduce((a, b) => a + b, 0) / kept.length
  const bpm = Math.round(60000 / avg)
  if (bpm < lo || bpm > hi) return { ok: false, bpm: null, taps: run.length, reason: 'range' }
  return { ok: true, bpm, taps: run.length, reason: 'ok' }
}

/**
 * A tiny stateful helper for a tap pad: push a time, get back the running state.
 * Keeps at most `keep` taps so a long session can't grow forever.
 */
export function createTapper({ keep = 16, ...opts } = {}) {
  let times = []
  return {
    tap(now) {
      const t = Number.isFinite(now) ? now : Date.now()
      // a tap after a long silence starts a fresh run (so the old taps can't poison the new one)
      const resetMs = opts.resetMs ?? TAP_RESET_MS
      if (times.length && t - times[times.length - 1] > resetMs) times = []
      times.push(t)
      if (times.length > keep) times = times.slice(-keep)
      return bpmFromTaps(times, opts)
    },
    reset() { times = [] },
    get taps() { return currentRun(times, opts.resetMs ?? TAP_RESET_MS).length },
    read() { return bpmFromTaps(times, opts) },
  }
}
