// Where the bars of a PLAYED note list really start — so the accompaniment's "beat 1" is the song's
// own downbeat (ใบ v3/pleng#98), in each melody's own meter (ใบ v3/pleng#96).
//
// The arranger used to count bars from played beat 0. That is the downbeat only when the song opens
// on one. A pickup (ห้องยก) — at the start of the song, or of a refrain — or a bar stretched by a
// fermata hold, puts every later bar off the grid, and the accompaniment then leans on the wrong
// note for the rest of the song (measured 1 ต.ค. 2569: x/4 songs with a pickup were stressed on the
// real beat 1 in only 7% of their bars).
//
// The notes carry the sheet's own bar numbering (li/bi), so we can read the grid off the song itself:
//   * a FULL bar (its notes add up to exactly one bar of its meter) starts ON the grid → its start
//     fixes the grid's phase;
//   * a SHORTER/LONGER bar does not: it continues the current grid when it starts on it (the first
//     half of a bar split across a line, a bar stretched by a hold), otherwise it is a pickup and
//     takes the grid of the next full bar;
//   * a SHORT bar that OPENS its line and is followed by a full bar is a pickup even when it happens
//     to start on the old grid — a refrain that starts on an upbeat (ใบ#98 thread 28351). A short bar
//     that CLOSES its line is the end of a phrase and keeps the grid, as before;
//   * the bar right after a bar stretched by a hold (longer than its meter AND carrying a 𝄐) starts a
//     new grid at its own start — after the fermata the song comes back in on a downbeat (ใบ#98 thread
//     28353). A bar that is simply WRITTEN too long (no 𝄐) is not a hold and keeps the old rule.
// A run = consecutive bars on one grid (same bar length, same melody meter, same phase).
//
// Everything is in QUARTER-NOTE beats, the unit the whole engine counts in (6/8 bar = 3, 2/2 = 4).
// A song whose bars all start on the beat-0 grid gets ONE run with phase 0 — callers then take
// exactly their old path, which is what keeps such songs sounding as before.
import { expectedBeats } from './notation.js'

const EPS = 1e-6
const mod = (x, m) => ((x % m) + m) % m
const near = (a, b) => Math.abs(a - b) < EPS
// same phase on a circle of length L (0 and L - ε are the same point)
const samePhase = (a, b, L) => { const d = mod(a - b, L); return d < EPS || L - d < EPS }

// notes → [{ from, to, ts, barBeats, phase }] covering every note, in play order.
//   ts       — the melody's own meter (note.ts, ใบ#96) or undefined (= the song meter)
//   barBeats — one bar of that meter, in quarter beats (fallback 4)
//   phase    — bars of this run start at beats ≡ phase (mod barBeats), 0 ≤ phase < barBeats
export function meterRuns(notes, songTs) {
  const bars = []
  let beat = 0
  for (const n of notes || []) {
    const key = `${n.li}:${n.bi}`
    const last = bars[bars.length - 1]
    if (!last || last.key !== key || last.ts !== n.ts) {
      bars.push({ key, li: n.li, ts: n.ts, start: beat, beats: 0, L: expectedBeats(n.ts || songTs) || 4 })
    }
    bars[bars.length - 1].beats += n.beats
    if (n.fermata) bars[bars.length - 1].held = true
    beat += n.beats
  }
  if (!bars.length) return []
  for (const b of bars) b.full = near(b.beats, b.L)
  // forward: full bars fix the phase; a non-full bar that starts on the current grid continues it
  let cur = null // { L, ts, phase }
  const meterOf = (a, b) => a && b && a.L === b.L && a.ts === b.ts
  bars.forEach((b, i) => {
    const sameMeter = cur && cur.L === b.L && cur.ts === b.ts
    const pv = bars[i - 1]
    const nx = bars[i + 1]
    if (b.full) {
      cur = { L: b.L, ts: b.ts, phase: mod(b.start, b.L) }
      b.phase = cur.phase
    } else if (b.beats < b.L - EPS && (!pv || pv.li !== b.li) && nx && nx.full && nx.li === b.li && meterOf(b, nx)) {
      b.phase = null // a line-opening pickup into the full bar after it (thread 28351)
    } else if (pv && meterOf(pv, b) && pv.held && pv.beats > pv.L + EPS) {
      cur = { L: b.L, ts: b.ts, phase: mod(b.start, b.L) } // after a stretched bar: a new downbeat (thread 28353)
      b.phase = cur.phase
    } else if (sameMeter && samePhase(b.start, cur.phase, b.L)) {
      b.phase = cur.phase
    } else {
      b.phase = null // a pickup (or no grid yet) — resolved backwards from the next full bar
    }
  })
  // backward: a pickup takes the grid of the next full bar of the same meter
  let next = null
  for (let i = bars.length - 1; i >= 0; i--) {
    const b = bars[i]
    if (b.full) next = { L: b.L, ts: b.ts, phase: b.phase }
    else if (b.phase == null) b.phase = next && next.L === b.L && next.ts === b.ts ? next.phase : null
  }
  // still unresolved (no full bar after it): keep the previous grid, else the plain beat-0 grid
  let prev = null
  for (const b of bars) {
    if (b.phase == null) b.phase = prev && prev.L === b.L && prev.ts === b.ts ? prev.phase : 0
    prev = b
  }
  const runs = []
  for (const b of bars) {
    const r = runs[runs.length - 1]
    const phase = samePhase(b.phase, 0, b.L) ? 0 : b.phase
    if (r && r.barBeats === b.L && r.ts === b.ts && samePhase(r.phase, phase, b.L)) r.to = b.start + b.beats
    else runs.push({ from: b.start, to: b.start + b.beats, ts: b.ts, barBeats: b.L, phase })
  }
  return runs
}

// the run a beat falls in (the first for a beat before the song, the last for one after it)
export function runAt(runs, beat) {
  if (!runs || !runs.length) return null
  for (const r of runs) if (beat < r.to - EPS) return r
  return runs[runs.length - 1]
}

// The secondary ("medium") stress inside a bar, in quarter beats from the downbeat, or null when the
// meter has none. x/4 meters keep the arranger's long-standing floor(bar/2) rule (so their sound does
// not move); other meters follow v3's arranger/meter.js — a secondary stress only where the bar halves
// evenly into two accented groups: 6/8 and 2/2 have none, 12/8 has it at half the bar.
export function mediumOf(ts, barBeats) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(ts || '').trim())
  if (!m || Number(m[2]) === 4) return Math.floor((barBeats || 4) / 2)
  const n = Number(m[1])
  const d = Number(m[2])
  const compound = n % 3 === 0 && n > 3
  const pulses = compound ? n / 3 : n
  const pulseBeats = (compound ? 3 : 1) * (4 / d)
  return pulses >= 4 && pulses % 2 === 0 ? (pulses / 2) * pulseBeats : null
}

// The shift that puts a run's bar grid at 0: (beat - shiftOf(r)) is a multiple of barBeats exactly on
// the run's downbeats. It is ≤ 0, so a shifted beat inside the song is never negative (patterns.js
// takes a plain `%`). 0 for a run already on the beat-0 grid — those callers' arithmetic is unchanged.
export function shiftOf(r) {
  return r && r.phase > EPS ? r.phase - r.barBeats : 0
}
