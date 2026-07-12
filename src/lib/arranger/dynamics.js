// B107 P2 · LAYER 2 — Dynamics / Expression (§3). Each rule is ONE export that takes a
// PerfEvent[] and returns it with `gain` and/or `timeShift` adjusted, so rules compose and
// can be switched on/off individually per cfg. This is the layer that removes the "แข็ง
// เหมือนหุ่นยนต์" feel. Step 1 ships the two humanize rules (the consultant's #1 "ฐาน",
// biggest effect for least work); accent/contour/section/rubato land in step 4.
//
// All randomness comes from the seeded rng passed in (rng.js) — never Math.random() — so a
// performance is reproducible (MP3 == live) and two loop passes differ but repeat.

import { clampGainToLayer } from '../sampler.js'

// R2.4 — Humanize velocity: nudge each attack's gain by ±`amount` (P'Aim locked ±6%).
// GUARD (velocity-in-layer, §7b · P1 lesson): after the nudge, clamp gain into the sampler's
// usable window so gainToVelocity() stays inside the loaded layer — never a silent note.
export function humanizeVel(events, rng, amount = 0.06) {
  for (const e of events) {
    const jitter = 1 + (rng() * 2 - 1) * amount // [1-amount, 1+amount)
    e.gain = clampGainToLayer(e.gain * jitter)
  }
  return events
}

// How much smaller the chord-stack timing spread is vs the melody's. The bass+inner voices of
// ONE chord get only a hair of spread — enough that they're "not machine-perfectly together"
// like a real hand, but small enough they still read as a single chord (not an arpeggio).
const CHORD_TIME_RATIO = 0.35

// R2.5 — Humanize micro-timing: give each attack a small onset shift (seconds) so onsets stop
// landing dead on the grid — the single biggest "หายหุ่นยนต์" cue. `sigma` = melody spread in
// seconds (P'Aim locked ±12ms → 0.012); chord voices use sigma·CHORD_TIME_RATIO so the AC
// "chord spread < melody spread" holds. timeShift is ADDITIVE so later rules (rubato) can push
// on top. Seeded → deterministic per (song, pass).
export function humanizeTime(events, rng, sigma = 0.012) {
  for (const e of events) {
    const s = e.role === 'melody' ? sigma : sigma * CHORD_TIME_RATIO
    e.timeShift = (e.timeShift || 0) + (rng() * 2 - 1) * s
  }
  return events
}
