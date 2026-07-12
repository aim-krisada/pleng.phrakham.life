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
//   ctx = { nextBass, keyRoot, beatsPerBar, rng, cfg }

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
// slightly softer so it underpins without thumping.
export function pedal(chordEvent, bass, ctx) {
  if (bass == null) return []
  return [bev(bass, chordEvent.startBeat, chordEvent.beats, bassGain(ctx.cfg, 0.9), 0.08, 0.9)]
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

export const BASS_MODES = { root, pedal, walking }
