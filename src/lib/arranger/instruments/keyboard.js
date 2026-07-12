// B107 P2 · §4B — the keyboard InstrumentModule (grand / felt piano).
//
// WHY a module: patterns differ per instrument (piano arp ≠ guitar strum). The arranger core
// stays instrument-agnostic (harmony + dynamics + humanize velocity) and calls a module for
// the instrument-idiomatic parts (voicing constraints, patterns, humanize FEEL). Adding an
// instrument later (guitar/bowed) = write one module, no change to the core. This module wraps
// the existing P1 piano behavior so nothing sounds different yet — it just establishes the seam.
//
// InstrumentModule shape (§4B.2):
//   id, role, register{lo,hi}, voicing(chordEvent,prevUp,ctx), patterns{}, defaultPattern,
//   humanizeFeel{ velJitter, timing }.

// One sustained chord → its bass + inner voices as held PerfEvents (the P1 "block pad"). This
// is the only pattern step 0–1 needs; arp/roll/pad/waltz/alberti join in step 5 as more keys
// on this same `patterns` object. Gains match P1 exactly (bass a touch louder = firmer
// foundation) so "ลูกเล่นปิด" and arranger-on-at-rest audio equal P1.
function sustained(chordEvent, voiced, beatsPerBar, rng, cfg = {}) {
  const chordGain = cfg.chordGain ?? 0.055
  const out = []
  if (voiced.bass != null) {
    out.push({
      role: 'bass', inst: 'chord', midi: voiced.bass,
      startBeat: chordEvent.startBeat, beats: chordEvent.beats,
      gain: chordGain * 1.45, attack: 0.05, decayTo: 0.72, timeShift: 0,
    })
  }
  for (const m of voiced.up || []) {
    out.push({
      role: 'inner', inst: 'chord', midi: m,
      startBeat: chordEvent.startBeat, beats: chordEvent.beats,
      gain: chordGain, attack: 0.05, decayTo: 0.72, timeShift: 0,
    })
  }
  return out
}

export const keyboard = {
  id: 'grand',
  role: 'both', // plays melody and comp/bass
  register: { lo: 21, hi: 108 }, // full piano; specific roles get squeezed by presets later
  // Piano uses the core voice-leading (buildChordVoice already produced bass/up nearest the
  // previous chord) as-is — no instrument-specific re-voicing. A guitar module would OVERRIDE
  // this to fret-playable shapes; that's the whole point of the seam.
  voicing(chordEvent /* , prevUp, ctx */) {
    return { bass: chordEvent.bass, up: chordEvent.up }
  },
  patterns: { sustained },
  defaultPattern: 'sustained',
  // Humanize FEEL is idiomatic (§4B.1): piano = each finger lands slightly independently
  // (symmetric spread). A guitar would be a one-directional strum stagger instead. sigma /
  // velJitter are the values P'Aim locked on the demo (±12ms / ±6%).
  humanizeFeel: { velJitter: 0.06, timing: { type: 'independent', sigma: 0.012 } },
}
