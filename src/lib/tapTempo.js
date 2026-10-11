// ใบ v3/pleng#102 + #103 — "เคาะตามจังหวะ" (tap tempo): turn a list of tap TIMES into one bpm number.
//
// Pure math, no DOM, no audio — so it can be unit-tested and reused by any page (the ฝึกร้อง dock
// uses it today; แก้ไข could use the same function later to set a song's stored bpm).
//
// Why the shape below:
//   · ใบ#103 ข้อ 3 — ONE straight line through ALL the taps. A singer's taps are never perfectly
//     even, so the old code threw away the gaps that looked "wrong" and averaged the rest. That
//     made the answer depend on 2–3 gaps instead of the whole run, and a ±60 ms human could land
//     15 bpm off. Now every tap is given its BEAT NUMBER (a missed beat = a double gap = +2) and
//     the beat length is the least-squares slope of time-vs-beat — i.e. the whole span from the
//     first tap to the last, which cancels the slop on the taps in between.
//   · ใบ#103 ข้อ 1 — ONE TAP IS NOT ALWAYS ONE BEAT. The stored speed of a song is counted in
//     quarter-notes per minute, but in a waltz (3/4) or a 6/8 people tap the BAR, not the beat.
//     อนุชน 33 is 3/4 at ♩=108 → 36 bars a minute → the old code read "36" and played the song 3×
//     too slow. `timeSignature` now tells us which units a tap could mean, and `nearBpm` (the
//     song's own stored speed) picks between them. 4/4 is untouched: one tap = one beat, always.
//   · A long pause means the person stopped and started over → that gap is NOT a beat. Gaps longer
//     than RESET_MS are dropped (this is also what makes tapping WHILE the song plays safe: you
//     can stop, listen, and start tapping again).
//   · If the taps still disagree wildly (เคาะมั่ว), we refuse: `{ ok: false }` with a reason the UI
//     shows as "เคาะไม่สม่ำเสมอ — ลองใหม่" instead of silently setting a wrong bpm.
//
// All times are milliseconds from any monotonic-ish clock (performance.now() or Date.now()).

// a gap longer than this = the person stopped; the next tap starts a NEW run
export const TAP_RESET_MS = 2500
// fewest taps we accept. 4 taps = 3 gaps — enough for a line through them to mean anything.
export const TAP_MIN = 4
// the bpm window we accept — outside it the taps were not a singing tempo
export const BPM_MIN = 30
export const BPM_MAX = 300

// A gap may be a missed beat (2 beats long) or two missed beats, but no more — beyond that the
// person is not holding a beat at all and we refuse instead of inventing one.
const MAX_STEP = 3
// How far off the straight line ONE tap may sit before we call it a mis-tap and leave it out of
// the line. It is a fraction of a beat OR a flat floor, whichever is bigger: the floor keeps an
// ordinary ±60 ms human from ever being "corrected" at a quick tempo (that correction is exactly
// what used to throw the number off), while the fraction catches a genuinely late tap in a slow
// song, where 150 ms is still well inside the beat.
const RESID_FRAC = 0.25
const RESID_FLOOR_MS = 150
// at most this share of the taps may be mis-taps; more than that = เคาะมั่ว
const BAD_SHARE = 0.2

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

// ---------------------------------------------------------------------------------------------
// อัตราจังหวะ → ONE TAP MEANS HOW MANY ♩ ?
// ---------------------------------------------------------------------------------------------
// The whole app counts speed in quarter-notes per minute (same as expectedBeats in notation.js:
// "n/d" → n*4/d quarter-beats in a bar). So a "unit" below is how many ♩ one tap covers.

/** quarter-note beats in one bar of "n/d" (6/8 → 3, 3/4 → 3, 4/4 → 4). null if unreadable. */
export function barBeats(timeSignature) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(timeSignature || '').trim())
  if (!m) return null
  const n = Number(m[1])
  const d = Number(m[2])
  if (!(n > 0) || !(d > 0)) return null
  return (n * 4) / d
}

/**
 * What ONE tap may mean in this time signature, most likely first (in ♩ units).
 *
 * Only the meters where people really do tap the BAR get more than one answer — everything else
 * (4/4, 2/4, 5/4, 7/8 …) stays exactly as it was before ใบ#103: one tap = one ♩.
 *   · 3/4, 3/8, 3/2  — a waltz is counted "one" per bar as often as "one-two-three"
 *   · 6/8, 9/8, 12/8 — compound: the bar, or the dotted-quarter pulse (1.5 ♩)
 *   · 6/4            — the bar, half a bar, or the beat
 */
export function tapUnits(timeSignature) {
  const bar = barBeats(timeSignature)
  if (!(bar > 0)) return [1]
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(timeSignature).trim())
  const n = Number(m[1])
  const d = Number(m[2])
  const beat = 4 / d // the written beat (a quarter in any n/4)
  let units
  if (n === 3) units = [bar, beat] // 3/4 · 3/8 · 3/2
  else if (d === 8 && n % 3 === 0 && n > 3) units = [bar, 1.5] // 6/8 · 9/8 · 12/8
  else if (n === 6 && d === 4) units = [bar, bar / 2, 1] // 6/4
  else units = [1] // 4/4 and friends — unchanged
  return units.filter((u, i) => u > 0 && units.indexOf(u) === i)
}

// least-squares slope of tap time against beat number, over the taps listed in `keep`
function lineFit(times, idx, keep) {
  const n = keep.length
  if (n < 2) return null
  let mi = 0
  let mt = 0
  for (const i of keep) { mi += idx[i]; mt += times[i] }
  mi /= n
  mt /= n
  let sxy = 0
  let sxx = 0
  for (const i of keep) { sxy += (idx[i] - mi) * (times[i] - mt); sxx += (idx[i] - mi) ** 2 }
  if (!(sxx > 0)) return null
  const slope = sxy / sxx
  return { slope, intercept: mt - slope * mi }
}

/**
 * How long ONE tap-to-tap beat lasts, in ms — the straight line through every tap.
 * Returns null when the taps are not one steady beat (เคาะมั่ว).
 */
export function periodFromTaps(run) {
  const n = (run || []).length
  if (n < 2) return null
  const gaps = []
  for (let i = 1; i < n; i++) gaps.push(run[i] - run[i - 1])
  const mid = median(gaps.slice().sort((a, b) => a - b))
  if (!(mid > 0)) return null

  // beat number of each tap: a gap near 2× the median = one beat was missed, so the NEXT tap is
  // still on the grid two beats later. A gap under half the median = two taps on one beat = มั่ว.
  const idx = [0]
  for (let i = 0; i < gaps.length; i++) {
    const step = Math.round(gaps[i] / mid)
    if (step < 1 || step > MAX_STEP) return null
    idx.push(idx[i] + step)
  }

  const all = idx.map((_, i) => i)
  let fit = lineFit(run, idx, all)
  if (!fit || !(fit.slope > 0)) return null

  // leave out the taps that clearly missed the line, then draw the line again through the rest
  const tol = Math.max(RESID_FRAC * fit.slope, RESID_FLOOR_MS)
  const bad = all.filter((i) => Math.abs(run[i] - (fit.intercept + fit.slope * idx[i])) > tol)
  if (bad.length) {
    if (bad.length > Math.max(1, Math.floor(n * BAD_SHARE))) return null // เคาะมั่ว
    const keep = all.filter((i) => !bad.includes(i))
    const refit = lineFit(run, idx, keep)
    if (!refit || !(refit.slope > 0)) return null
    fit = refit
  }
  return fit.slope
}

/**
 * bpm from tap times.
 * @param {number[]} times  tap timestamps in ms
 * @param {object}   opts   { resetMs, min, max, minTaps, timeSignature, nearBpm }
 *   timeSignature  อัตราจังหวะของเพลง เช่น '3/4' — decides whether one tap can mean a whole bar
 *   nearBpm        the song's own stored speed; when one tap could mean either a bar or a beat,
 *                  the reading nearest this one wins (people tap to NUDGE a song, not to invent
 *                  a speed out of nothing). 0 / missing → the meter's first unit is used.
 * @returns {{ ok:boolean, bpm:number|null, taps:number, reason:string, unit:number, perBar:boolean }}
 *   reason: 'ok' | 'few' (ยังเคาะไม่พอ) | 'uneven' (เคาะไม่สม่ำเสมอ) | 'range' (เร็ว/ช้าเกินจริง)
 *   unit:   ♩ per tap that was used (1 = one tap is one beat; 3 in a 3/4 = one tap is one bar)
 */
export function bpmFromTaps(times, opts = {}) {
  const resetMs = opts.resetMs ?? TAP_RESET_MS
  const minTaps = opts.minTaps ?? TAP_MIN
  const lo = opts.min ?? BPM_MIN
  const hi = opts.max ?? BPM_MAX
  const near = Number(opts.nearBpm) || 0

  const run = currentRun(times, resetMs)
  const miss = { ok: false, bpm: null, unit: 1, perBar: false }
  if (run.length < minTaps) return { ...miss, taps: run.length, reason: 'few' }

  const period = periodFromTaps(run)
  if (!(period > 0)) return { ...miss, taps: run.length, reason: 'uneven' }
  const tapsPerMin = 60000 / period

  // one tap = one beat, or one whole bar? Keep only the readings that are a real singing speed;
  // among those take the one closest (by ratio) to the song's own stored speed.
  const units = tapUnits(opts.timeSignature)
  const fits = units.filter((u) => {
    const b = Math.round(tapsPerMin * u)
    return b >= lo && b <= hi
  })
  if (!fits.length) return { ...miss, taps: run.length, reason: 'range' }
  let unit = fits[0]
  if (near > 0) {
    let bestOff = Infinity
    for (const u of fits) {
      const off = Math.abs(Math.log((tapsPerMin * u) / near))
      if (off < bestOff - 1e-9) { bestOff = off; unit = u }
    }
  }

  const bpm = Math.round(tapsPerMin * unit)
  return { ok: true, bpm, taps: run.length, reason: 'ok', unit, perBar: unit === barBeats(opts.timeSignature) }
}

/**
 * A tiny stateful helper for a tap pad: push a time, get back the running state.
 * Keeps at most `keep` taps so a long session can't grow forever.
 * `tap()` / `read()` take per-call opts (timeSignature · nearBpm) so the pad can follow whichever
 * song is on screen without being rebuilt.
 */
export function createTapper({ keep = 16, ...opts } = {}) {
  let times = []
  const merge = (extra) => ({ ...opts, ...(extra || {}) })
  return {
    tap(now, extra) {
      const t = Number.isFinite(now) ? now : Date.now()
      // a tap after a long silence starts a fresh run (so the old taps can't poison the new one)
      const resetMs = opts.resetMs ?? TAP_RESET_MS
      if (times.length && t - times[times.length - 1] > resetMs) times = []
      times.push(t)
      if (times.length > keep) times = times.slice(-keep)
      return bpmFromTaps(times, merge(extra))
    },
    reset() { times = [] },
    get taps() { return currentRun(times, opts.resetMs ?? TAP_RESET_MS).length },
    read(extra) { return bpmFromTaps(times, merge(extra)) },
  }
}
