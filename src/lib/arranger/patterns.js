// B107 P2 · LAYER 3 — comp patterns (§4). Each pattern takes ONE chord's UPPER voices (the
// "right hand" / inner voices — bass is rendered separately by bass.js) and expands them into
// PerfEvents describing HOW the chord is struck: held / broken / rolled / swelled / oom-pah.
// Every pattern is one export → the instrument module lists which it supports, and a preset
// picks one. Bass stays a separate foundation so patterns compose with any bass mode.
//
// Contract: pattern(chordEvent, up[], beatsPerBar, rng, cfg) → PerfEvent[] (role 'inner').
//   chordEvent : { startBeat, beats, ... }
//   up[]       : upper MIDI notes (sorted low→high) after voicing transforms
//   rng        : seeded generator (never Math.random)
// Gains are the base chord level (cfg.chordGain, default 0.055); dynamics/humanize scale them
// later. attack/decayTo shape the synth envelope (sampler ignores them). All within the sheet's
// chord tones — patterns never invent pitches (embellishments are a separate, opt-in layer).

const G = (cfg) => cfg.chordGain ?? 0.055

function ev(midi, startBeat, beats, gain, attack, decayTo, extra) {
  return { role: 'inner', inst: 'chord', midi, startBeat, beats, gain, attack, decayTo, timeShift: 0, ...extra }
}

// sustained — one held block (the P1 pad). Default; calm songs. Held full span, soft swell.
export function sustained(chordEvent, up, bpb, rng, cfg) {
  const g = G(cfg)
  return up.map((m) => ev(m, chordEvent.startBeat, chordEvent.beats, g, 0.05, 0.72))
}

// arpeggio — break the upper voices into one hit per beat, cycling low→high (a flowing "left
// hand under the tune" feel). Downbeat a touch louder. Best for slow/medium "เปียโนบรรเลง".
export function arpeggio(chordEvent, up, bpb, rng, cfg) {
  if (!up.length) return []
  const g = G(cfg)
  const nb = Math.max(1, Math.round(chordEvent.beats))
  const out = []
  for (let b = 0; b < nb; b++) {
    const m = up[b % up.length]
    const onDown = (Math.round(chordEvent.startBeat) + b) % bpb === 0
    out.push(ev(m, chordEvent.startBeat + b, Math.min(1.1, chordEvent.beats - b), g * (onDown ? 1.0 : 0.85), 0.02, null))
  }
  return out
}

// harpRoll — a single chord whose notes enter staggered low→high (~30ms apart) like a harp/
// rolled piano chord. Same startBeat, offset via timeShift. Slow, tender.
export function harpRoll(chordEvent, up, bpb, rng, cfg) {
  const g = G(cfg)
  return up.map((m, i) => ev(m, chordEvent.startBeat, chordEvent.beats, g, 0.03, 0.72, { timeShift: i * 0.03 }))
}

// stringPad — held with a long attack (a slow swell) + long tail. "นมัสการช้า สงบ / เต็มวง".
export function stringPad(chordEvent, up, bpb, rng, cfg) {
  const g = G(cfg)
  return up.map((m) => ev(m, chordEvent.startBeat, chordEvent.beats, g * 0.95, 0.35, 0.85))
}

// waltz — upper voices "ย่ำ" on beats 2..N of each bar (bass takes beat 1, rendered separately).
// For 3/4 songs / lilting feel. One hit per non-downbeat beat within the chord span.
export function waltz(chordEvent, up, bpb, rng, cfg) {
  if (!up.length) return []
  const g = G(cfg)
  const nb = Math.max(1, Math.round(chordEvent.beats))
  const out = []
  for (let b = 0; b < nb; b++) {
    const beatInBar = (Math.round(chordEvent.startBeat) + b) % bpb
    if (beatInBar === 0) continue // downbeat belongs to the bass
    for (const m of up) out.push(ev(m, chordEvent.startBeat + b, 0.9, g * 0.9, 0.02, 0.7))
  }
  return out
}

// alberti — classic low-high-mid-high broken figure over the upper voices (needs ≥3; falls back
// to arpeggio otherwise). Steady motion for medium tempo.
export function alberti(chordEvent, up, bpb, rng, cfg) {
  if (up.length < 3) return arpeggio(chordEvent, up, bpb, rng, cfg)
  const g = G(cfg)
  const order = [0, up.length - 1, 1, up.length - 1] // low, high, mid, high
  const nb = Math.max(1, Math.round(chordEvent.beats))
  const out = []
  for (let b = 0; b < nb; b++) {
    const m = up[order[b % order.length]]
    out.push(ev(m, chordEvent.startBeat + b, 1.0, g * 0.9, 0.02, null))
  }
  return out
}

// fingerpick — a gentle ballad figure: a soft off-beat pluck of the upper voices between the
// bass beats. One light hit on each off-beat half. (Bass rendered separately.)
export function fingerpick(chordEvent, up, bpb, rng, cfg) {
  if (!up.length) return []
  const g = G(cfg)
  const nb = Math.max(1, Math.round(chordEvent.beats))
  const out = []
  for (let b = 0; b < nb; b++) {
    const m = up[b % up.length]
    out.push(ev(m, chordEvent.startBeat + b + 0.5, 0.5, g * 0.8, 0.02, null)) // the "and" of each beat
  }
  return out
}

export const COMP_PATTERNS = { sustained, arpeggio, harpRoll, stringPad, waltz, alberti, fingerpick }
