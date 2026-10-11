// B107 P2 · LAYER 1/3 — the bass foundation. Rendered SEPARATELY from the comp patterns so any
// "right hand" pattern composes with any "left hand" bass. Three modes (§R1.7 pedal, §R1.8
// walking, plus the P1 default root):
//   root    — one held bass per chord (the P1 block foundation).
//   pedal   — sustain-root: held, long attack + long tail + a touch softer, so the bass "อุ้ม"
//             (carries) instead of "ตอก" (strikes). Church-organ depth (§R1.7 sustain-root).
//   walking — one note per beat, stepping diatonically toward the NEXT chord's root and closing
//             with a chromatic approach (§R1.8). Life/continuity for rhythmic songs.
// All bass notes stay in the low register (MIDI 36–51). Contract:
//   bassMode(chordEvent, bass, ctx) → PerfEvent[] (role 'bass')
//   ctx = { nextBass, keyRoot, beatsPerBar, rng, cfg, meter }
//   meter = pulseOf(ts) in a compound bar (6/8 9/8 12/8, ใบ v3/pleng#106), else null. A compound bar
//   moves the bass by its PULSE (a dotted quarter = eighths 1 and 4 in 6/8), not by the quarter beat —
//   by the quarter beat a 6/8 bar walked on eighths 1 3 5 like 3/4. null = the old code, unchanged.

import { gridOnsets } from '../meterRegions.js'

const BASS_LO = 36
const BASS_HI = 51
const MAJOR = [0, 2, 4, 5, 7, 9, 11]

const bassGain = (cfg, mul = 1) => (cfg.chordGain ?? 0.055) * 1.45 * mul
const clampBass = (m) => Math.max(BASS_LO, Math.min(BASS_HI, m))

function bev(midi, startBeat, beats, gain, attack, decayTo) {
  return { role: 'bass', inst: 'chord', midi: clampBass(midi), startBeat, beats, gain, attack, decayTo, timeShift: 0 }
}

// root — P1 behavior exactly: bass held for the chord span (louder than inner = firm foundation).
export function root(chordEvent, bass, ctx) {
  if (bass == null) return []
  return [bev(bass, chordEvent.startBeat, chordEvent.beats, bassGain(ctx.cfg), 0.05, 0.72)]
}

// pedal — held root that carries: long attack (~0.08s) so it swells in, long tail (decayTo high),
// slightly softer so it underpins without thumping. SLASH chord (ctx.slashBass): strike the ROOT
// first (P'Aim 14 ก.ค. "ลง G ก่อน แล้วค่อยเป็น B"), then move the bass to the printed slash note for
// the rest of the chord — root establishes the harmony, then the specified bass sings underneath.
export function pedal(chordEvent, bass, ctx) {
  if (bass == null) return []
  const slash = ctx.slashBass
  if (ctx.meter && slash != null && slash !== bass) {
    // compound: root on the chord's first pulse, the slash bass from the next pulse (eighth 4 in 6/8)
    const on = gridOnsets(chordEvent.startBeat, chordEvent.beats, ctx.meter.pulseBeats)
    if (on.length >= 2) {
      const end = chordEvent.startBeat + chordEvent.beats
      return [
        bev(bass, on[0], on[1] - on[0], bassGain(ctx.cfg, 0.9), 0.08, 0.9),
        bev(slash, on[1], end - on[1], bassGain(ctx.cfg, 0.9), 0.06, 0.9),
      ]
    }
  } else if (slash != null && slash !== bass && chordEvent.beats >= 2) {
    return [
      bev(bass, chordEvent.startBeat, 1, bassGain(ctx.cfg, 0.9), 0.08, 0.9), // root first
      bev(slash, chordEvent.startBeat + 1, chordEvent.beats - 1, bassGain(ctx.cfg, 0.9), 0.06, 0.9), // → slash bass
    ]
  }
  return [bev(bass, chordEvent.startBeat, chordEvent.beats, bassGain(ctx.cfg, 0.9), 0.08, 0.9)]
}

// pedalWalk — pedal's carrying root for most of the chord, then a single PASSING note on the last
// beat that steps INTO the next chord's root (a "ลูกเชื่อม" between chords · P'Aim 14 ก.ค.). Keeps the
// "อุ้ม ไม่ตอก" pedal feel (root sustains beats 1..n-1) but adds the walking-bass connection that makes
// a real left hand lead from one chord to the next. Only when the chord is ≥2 beats and the next root
// differs (nothing to connect otherwise) → falls back to plain pedal. The approach note is the
// chromatic neighbour of the next root that resolves into it — the same accepted device as walking().
export function pedalWalk(chordEvent, bass, ctx) {
  if (bass == null) return []
  // a slash chord's own bass move (root → slash) takes priority over walking into the next chord
  if (ctx.slashBass != null && ctx.slashBass !== bass) return pedal(chordEvent, bass, ctx)
  if (ctx.meter) {
    // compound: carry the root to the chord's LAST pulse, step into the next root there (eighth 4 of a
    // one-bar 6/8 chord — it used to fall on eighth 5)
    const on = gridOnsets(chordEvent.startBeat, chordEvent.beats, ctx.meter.pulseBeats)
    const next = ctx.nextBass
    if (on.length < 2 || next == null || next === bass) return pedal(chordEvent, bass, ctx)
    const last = on[on.length - 1]
    const end = chordEvent.startBeat + chordEvent.beats
    const approach = clampBass(next - (next > bass ? 1 : -1))
    return [
      bev(bass, on[0], last - on[0], bassGain(ctx.cfg, 0.9), 0.08, 0.9),
      bev(approach, last, end - last, bassGain(ctx.cfg, 0.82), 0.04, 0.4),
    ]
  }
  const nb = Math.max(1, Math.round(chordEvent.beats))
  const next = ctx.nextBass
  const connect = nb >= 2 && next != null && next !== bass
  if (!connect) return pedal(chordEvent, bass, ctx)
  const dir = next > bass ? 1 : -1
  const approach = clampBass(next - dir) // resolves by a half-step into the next root
  return [
    bev(bass, chordEvent.startBeat, nb - 1, bassGain(ctx.cfg, 0.9), 0.08, 0.9), // the carried root
    bev(approach, chordEvent.startBeat + nb - 1, 1, bassGain(ctx.cfg, 0.82), 0.04, 0.4), // passing step
  ]
}

// Nearest diatonic (in-key) note to `target`, within the bass register, walking `dir` from `from`.
function nextDiatonic(from, dir, keyRoot) {
  for (let step = 1; step <= 12; step++) {
    const cand = from + dir * step
    const pc = (((cand - keyRoot) % 12) + 12) % 12
    if (MAJOR.includes(pc)) return clampBass(cand)
  }
  return clampBass(from + dir)
}

// walking — one bass note per beat from this root toward the next root; the last beat lands a
// chromatic step (±1) below/above the next root so it "leads" into it. ≥2 beats or falls back to
// root (short chords don't walk). Diatonic in the song key except the final approach note.
export function walking(chordEvent, bass, ctx) {
  if (ctx.meter) {
    // compound: one bass note per PULSE (eighths 1 and 4 in 6/8), same walk toward the next root
    const on = gridOnsets(chordEvent.startBeat, chordEvent.beats, ctx.meter.pulseBeats)
    if (bass == null || on.length < 2) return root(chordEvent, bass, ctx)
    const end = chordEvent.startBeat + chordEvent.beats
    const keyRoot = ctx.keyRoot ?? 40
    const target = ctx.nextBass != null ? ctx.nextBass : bass
    let cur = bass
    return on.map((at, b) => {
      const note = b === 0 ? bass
        : b === on.length - 1 ? clampBass(target + (target >= cur ? -1 : 1))
          : nextDiatonic(cur, target >= cur ? 1 : -1, keyRoot)
      cur = note
      return bev(note, at, (on[b + 1] ?? end) - at, bassGain(ctx.cfg, 0.95), 0.03, 0.5)
    })
  }
  const nb = Math.max(1, Math.round(chordEvent.beats))
  if (bass == null || nb < 2) return root(chordEvent, bass, ctx)
  const keyRoot = ctx.keyRoot ?? 40
  const target = ctx.nextBass != null ? ctx.nextBass : bass
  const out = []
  let cur = bass
  for (let b = 0; b < nb; b++) {
    let note
    if (b === 0) {
      note = bass
    } else if (b === nb - 1) {
      note = clampBass(target + (target >= cur ? -1 : 1)) // chromatic approach into next root
    } else {
      const dir = target >= cur ? 1 : -1
      note = nextDiatonic(cur, dir, keyRoot)
    }
    cur = note
    out.push(bev(note, chordEvent.startBeat + b, 1.0, bassGain(ctx.cfg, 0.95), 0.03, 0.5))
  }
  return out
}

export const BASS_MODES = { root, pedal, walking, pedalWalk }
