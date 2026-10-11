// B107 P2 · LAYER 3 — comp patterns (§4). Each pattern takes ONE chord's UPPER voices (the
// "right hand" / inner voices — bass is rendered separately by bass.js) and expands them into
// PerfEvents describing HOW the chord is struck: held / broken / rolled / swelled / oom-pah.
// Every pattern is one export → the instrument module lists which it supports, and a preset
// picks one. Bass stays a separate foundation so patterns compose with any bass mode.
//
// Contract: pattern(chordEvent, up[], beatsPerBar, rng, cfg, meter) → PerfEvent[] (role 'inner').
//   chordEvent : { startBeat, beats, ... }  (startBeat on its bar grid: downbeats at multiples of the bar)
//   meter      : pulseOf(ts) for a compound bar (6/8 9/8 12/8, ใบ v3/pleng#106), else null/undefined —
//                then every pattern runs exactly its old code, so every other meter sounds as before
//   up[]       : upper MIDI notes (sorted low→high) after voicing transforms
//   rng        : seeded generator (never Math.random)
// Gains are the base chord level (cfg.chordGain, default 0.055); dynamics/humanize scale them
// later. attack/decayTo shape the synth envelope (sampler ignores them). All within the sheet's
// chord tones — patterns never invent pitches (embellishments are a separate, opt-in layer).

import { gridOnsets, compoundStress } from '../meterRegions.js'

const G = (cfg) => cfg.chordGain ?? 0.055

// ใบ v3/pleng#106 — a compound bar is pulses of 3 eighths (6/8 = 1 2 3 | 4 5 6), not quarter beats. The
// broken patterns below used to treat 6/8 exactly like 3/4 (arpeggio struck eighths 1 3 5 = a waltz).
// In a compound bar they strike on the eighth grid instead, with the pulses (eighths 1 and 4) the
// strongest: eighth 1 the most, the other pulse starts next, everything else under them.
const EIGHTH = 0.5
// the eighths a pattern strikes inside one chord, given which eighths of a pulse (0 1 2) it keeps
function compoundOnsets(chordEvent, bpb, meter, keepInPulse) {
  const per = Math.round(meter.pulseBeats * 2) // eighths per pulse (3)
  return gridOnsets(chordEvent.startBeat, chordEvent.beats, EIGHTH).filter((at, i) => {
    if (i === 0) return true // the chord sounds where it begins
    const x = Math.round(at * 2)
    return keepInPulse((((x % per) + per) % per))
  })
}
// "lilt" = eighths 1 3 | 4 6 — the long-short (quarter-eighth) swing of 6/8; the pulses stay on 1 and 4
const LILT = (k) => k === 0 || k === 2
const stressGain = (at, bpb, meter, gains) => gains[compoundStress(at, bpb, meter)]

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
export function arpeggio(chordEvent, up, bpb, rng, cfg, meter) {
  if (!up.length) return []
  const g = G(cfg)
  if (meter) {
    // compound: the lilt (1 3 | 4 6), each note ringing into the next; 1 strongest, 4 next
    const on = compoundOnsets(chordEvent, bpb, meter, LILT)
    const end = chordEvent.startBeat + chordEvent.beats
    return on.map((at, k) => ev(up[k % up.length], at, Math.min((on[k + 1] ?? end) - at + 0.1, end - at),
      g * stressGain(at, bpb, meter, [0.85, 0.93, 1.0]), 0.02, null))
  }
  const nb = Math.max(1, Math.round(chordEvent.beats))
  const out = []
  for (let b = 0; b < nb; b++) {
    const m = up[b % up.length]
    const onDown = (Math.round(chordEvent.startBeat) + b) % bpb === 0
    out.push(ev(m, chordEvent.startBeat + b, Math.min(1.1, chordEvent.beats - b), g * (onDown ? 1.0 : 0.85), 0.02, null))
  }
  return out
}

// arpeggioDense — like arpeggio but TWICE the motion: two notes per beat, cycling low→high. A
// fuller, flowing broken-chord used for the ท่อนรับ (refrain) so it "opens up" against the sparser
// verse (P'Aim: ท่อนรับเพิ่มแตกคอร์ด). Downbeats a touch louder; each hit rings ~half a beat.
export function arpeggioDense(chordEvent, up, bpb, rng, cfg, meter) {
  if (!up.length) return []
  const g = G(cfg)
  if (meter) {
    // compound: every eighth (1 2 3 4 5 6), the pulses leaning: 1 strongest, 4 next (it used to lean on 1 only)
    const on = compoundOnsets(chordEvent, bpb, meter, () => true)
    const end = chordEvent.startBeat + chordEvent.beats
    return on.map((at, k) => ev(up[k % up.length], at, Math.min(0.6, end - at),
      g * stressGain(at, bpb, meter, [0.82, 0.92, 1.0]), 0.02, null))
  }
  const steps = Math.max(1, Math.round(chordEvent.beats * 2)) // 2 hits per beat (8th-note flow)
  const out = []
  for (let s = 0; s < steps; s++) {
    const at = chordEvent.startBeat + s * 0.5
    const m = up[s % up.length]
    const onDown = Math.abs(((Math.round(at * 2) / 2) % bpb)) < 0.01 && Number.isInteger(at)
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
export function flowing(chordEvent, up, bpb, rng, cfg, meter) {
  if (!up.length) return []
  const g = G(cfg)
  const total = chordEvent.beats
  if (meter) {
    // compound: re-roll on each pulse (eighths 1 and 4 in 6/8) instead of every 2 quarter beats, which in
    // a 3-beat bar landed on eighth 5. The roll on 1 is the fullest, the other pulses next.
    const end = chordEvent.startBeat + total
    const rolls = gridOnsets(chordEvent.startBeat, total, meter.pulseBeats)
    const out = []
    rolls.forEach((at, k) => {
      const seg = (rolls[k + 1] ?? end) - at
      const gain = g * stressGain(at, bpb, meter, [0.85, 0.9, 1.0])
      up.forEach((m, i) => {
        const off = i * 0.13
        const dur = Math.min(end - at - off, seg + 0.6)
        out.push(ev(m, at + off, Math.max(0.5, dur), gain, 0.05, 0.85))
      })
    })
    return out
  }
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
export function waltz(chordEvent, up, bpb, rng, cfg, meter) {
  if (!up.length) return []
  const g = G(cfg)
  if (meter) {
    // compound: the bass keeps eighth 1; the chord answers on the lilt after it (3 | 4 6), 4 the firmest
    const end = chordEvent.startBeat + chordEvent.beats
    const on = compoundOnsets(chordEvent, bpb, meter, LILT).filter((at) => compoundStress(at, bpb, meter) !== 2)
    const out = []
    on.forEach((at, k) => {
      const dur = Math.min(0.9, (on[k + 1] ?? end) - at)
      const gain = g * (compoundStress(at, bpb, meter) === 1 ? 0.9 : 0.8)
      for (const m of up) out.push(ev(m, at, dur, gain, 0.02, 0.7))
    })
    return out
  }
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
export function alberti(chordEvent, up, bpb, rng, cfg, meter) {
  if (up.length < 3) return arpeggio(chordEvent, up, bpb, rng, cfg, meter)
  const g = G(cfg)
  if (meter) {
    // compound: low-high-mid-high laid on the lilt — each pulse opens on the low or middle note (1 | 4),
    // the high note answers on the 3rd eighth of the pulse; 1 strongest, 4 next
    const end = chordEvent.startBeat + chordEvent.beats
    const on = compoundOnsets(chordEvent, bpb, meter, LILT)
    let pulseNo = 0
    return on.map((at, k) => {
      const st = compoundStress(at, bpb, meter)
      const m = st > 0 || k === 0 ? up[pulseNo++ % 2 === 0 ? 0 : 1] : up[up.length - 1]
      return ev(m, at, Math.min((on[k + 1] ?? end) - at, end - at), g * [0.85, 0.92, 0.95][st], 0.02, null)
    })
  }
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
export function fingerpick(chordEvent, up, bpb, rng, cfg, meter) {
  if (!up.length) return []
  const g = G(cfg)
  if (meter) {
    // compound: the bass keeps eighth 1; light plucks on the other eighths, the pulse (4) a touch firmer
    const end = chordEvent.startBeat + chordEvent.beats
    return gridOnsets(chordEvent.startBeat, chordEvent.beats, EIGHTH)
      .filter((at) => compoundStress(at, bpb, meter) !== 2)
      .map((at, k) => ev(up[k % up.length], at, Math.min(0.5, end - at), g * (compoundStress(at, bpb, meter) === 1 ? 0.9 : 0.8), 0.02, null))
  }
  const nb = Math.max(1, Math.round(chordEvent.beats))
  const out = []
  for (let b = 0; b < nb; b++) {
    const m = up[b % up.length]
    out.push(ev(m, chordEvent.startBeat + b + 0.5, 0.5, g * 0.8, 0.02, null)) // the "and" of each beat
  }
  return out
}

export const COMP_PATTERNS = { sustained, arpeggio, arpeggioDense, flowing, harpRoll, stringPad, waltz, alberti, fingerpick }
