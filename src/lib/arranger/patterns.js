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

// Where the bar grid starts, in quarter-beats. A song that opens with a pickup (ห้องยก) has its
// first FULL bar begin partway in, so "is this a downbeat" has to be measured from there and not
// from played beat 0 — otherwise the comp's bar lines sit somewhere inside the melody's bars for
// the whole song. arrange() puts it on cfg; absent/0 = the song opens on a downbeat.
const OFF = (cfg) => cfg.barOffset || 0

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
    const onDown = (Math.round(chordEvent.startBeat - OFF(cfg)) + b) % bpb === 0
    out.push(ev(m, chordEvent.startBeat + b, Math.min(1.1, chordEvent.beats - b), g * (onDown ? 1.0 : 0.85), 0.02, null))
  }
  return out
}

// arpeggioDense — like arpeggio but TWICE the motion: two notes per beat, cycling low→high. A
// fuller, flowing broken-chord used for the ท่อนรับ (refrain) so it "opens up" against the sparser
// verse (P'Aim: ท่อนรับเพิ่มแตกคอร์ด). Downbeats a touch louder; each hit rings ~half a beat.
export function arpeggioDense(chordEvent, up, bpb, rng, cfg) {
  if (!up.length) return []
  const g = G(cfg)
  const steps = Math.max(1, Math.round(chordEvent.beats * 2)) // 2 hits per beat (8th-note flow)
  const out = []
  for (let s = 0; s < steps; s++) {
    const at = chordEvent.startBeat + s * 0.5
    const m = up[s % up.length]
    const onDown = Math.abs(((Math.round((at - OFF(cfg)) * 2) / 2) % bpb)) < 0.01 && Number.isInteger(at - OFF(cfg))
    out.push(ev(m, at, Math.min(0.6, chordEvent.beats - s * 0.5), g * (onDown ? 1.0 : 0.82), 0.02, null))
  }
  return out
}

// flowing — a LEGATO broken chord for "เพราะ · ลื่น · ไม่กระแทกเป็นจังหวะ" (P'Aim 14 ก.ค.: the plain
// arpeggio "เหมือนลงคอร์ดเป็นจังหวะ · ไม่เข้ากับ melody" — a per-beat pulse fights a freely-sung tune).
// Instead of re-striking every beat, it gently ROLLS the chord tones low→high at the chord's start and
// lets them RING (long, overlapping durations = a held wash of harmony), re-rolling only every ~2 beats
// on a long chord so there's motion without a metric pulse. Soft attack + high sustain → it sits UNDER
// the melody like a pedalled left hand, carrying the harmony rather than marking time.
export function flowing(chordEvent, up, bpb, rng, cfg) {
  if (!up.length) return []
  const g = G(cfg)
  const total = chordEvent.beats
  const period = 2 // re-roll the wash every ~2 beats (a slow swell), NOT a hit on every beat
  const out = []
  for (let start = 0; start < total - 0.01; start += period) {
    const seg = Math.min(period, total - start)
    up.forEach((m, i) => {
      const off = i * 0.13 // a soft harp-like roll, not a beat-locked strike
      const dur = Math.min(total - start - off, seg + 0.6) // rings ~through the segment (legato overlap)
      out.push(ev(m, chordEvent.startBeat + start + off, Math.max(0.5, dur), g * (start === 0 ? 1.0 : 0.85), 0.05, 0.85))
    })
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
    const beatInBar = (Math.round(chordEvent.startBeat - OFF(cfg)) + b) % bpb
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

export const COMP_PATTERNS = { sustained, arpeggio, arpeggioDense, flowing, harpRoll, stringPad, waltz, alberti, fingerpick }
