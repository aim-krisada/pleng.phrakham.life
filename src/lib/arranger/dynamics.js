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

const isOffBeat = (b) => Math.abs(b - Math.round(b)) > 0.05

// R2.2 — Metric accent: emphasise the downbeat of each bar, ease off the weak beats and the
// off-beats, so the pulse breathes instead of every note hitting equally hard. Multiplies gain by
// a position factor in [0.72, 1.0]. Reads beats-per-bar from the caller (time signature).
export function metricAccent(events, beatsPerBar = 4) {
  const mid = Math.floor(beatsPerBar / 2)
  for (const e of events) {
    let f
    if (isOffBeat(e.startBeat)) f = 0.72
    else {
      const p = ((Math.round(e.startBeat) % beatsPerBar) + beatsPerBar) % beatsPerBar
      f = p === 0 ? 1.0 : p === mid ? 0.9 : 0.8
    }
    e.gain *= f
  }
  return events
}

// R2.3 — Melodic contour: within the tune, rising lines and local peaks get a touch louder while
// long/phrase-ending notes ease off — the shape a singer/player naturally gives a line. Operates
// on the melody events in order; factor clamped to [0.5, 1.2].
export function melodicContour(events) {
  const mel = events.filter((e) => e.role === 'melody')
  for (let i = 0; i < mel.length; i++) {
    const prev = mel[i - 1]
    const next = mel[i + 1]
    let c = 1
    if (prev) c += mel[i].midi > prev.midi ? 0.06 : mel[i].midi < prev.midi ? -0.04 : 0
    if (prev && next && mel[i].midi > prev.midi && mel[i].midi >= next.midi) c += 0.06 // local peak
    if (mel[i].beats >= 3) c -= 0.06 // long / phrase-ending note settles
    mel[i].gain *= Math.max(0.5, Math.min(1.2, c))
  }
  return events
}

// R2.6 — Section dynamics: verse softer, chorus/รับ fuller. sections = [{fromBeat,toBeat,name}]
// (optional — no-op if not provided). map = { verse:0.85, chorus:1.0, bridge:0.9, … }.
export function sectionDynamics(events, sections, map = {}) {
  if (!sections || !sections.length) return events
  for (const e of events) {
    const s = sections.find((x) => e.startBeat >= x.fromBeat && e.startBeat < x.toBeat)
    if (s && map[s.name] != null) e.gain *= map[s.name]
  }
  return events
}

// R2.7 — Crescendo / decrescendo: a linear gain ramp across a beat span (a "hairpin"). hairpins =
// [{fromBeat,toBeat,from,to}] (optional). Events inside a hairpin get gain × interpolated factor.
export function crescendo(events, hairpins) {
  if (!hairpins || !hairpins.length) return events
  for (const e of events) {
    for (const h of hairpins) {
      if (e.startBeat >= h.fromBeat && e.startBeat <= h.toBeat) {
        const t = (e.startBeat - h.fromBeat) / Math.max(1e-6, h.toBeat - h.fromBeat)
        e.gain *= h.from + t * (h.to - h.from)
      }
    }
  }
  return events
}

// R2.8 — Rubato at phrase ends: "breathe" into a long/phrase-ending melody note by delaying its
// onset a hair, then snap back "a tempo" on the next note (an equal negative shift) so the total
// time NEVER drifts (the sheet grid — startBeat — is untouched; only timeShift push-pulls). Σ of
// the rubato shifts over a phrase pair = 0. Default delay ~30ms.
export function rubato(events, delay = 0.03) {
  const mel = events.filter((e) => e.role === 'melody')
  for (let i = 0; i < mel.length - 1; i++) {
    if (mel[i].beats >= 3) {
      mel[i].timeShift = (mel[i].timeShift || 0) + delay // ritard into the long note
      mel[i + 1].timeShift = (mel[i + 1].timeShift || 0) - delay // a tempo — pulls back, Σ = 0
    }
  }
  return events
}

// Final safety net: guarantee every gain maps into the loaded velocity layer, even if humanize
// is disabled (accent/contour could otherwise leave a product outside the window). §7b.
export function clampAll(events) {
  for (const e of events) e.gain = clampGainToLayer(e.gain)
  return events
}
