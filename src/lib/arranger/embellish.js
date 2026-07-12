// B107 P2 · LAYER 3 — embellishments (§4). Small, TASTEFUL extra notes added probabilistically
// (seeded rng → reproducible, and only ~1-in-4-ish chords get one → "less is more"). Every added
// note is a chord tone or a chromatic approach that resolves INTO the chord, so the sheet's
// harmony is never contradicted. All are role 'emb' (mixed a little quieter). Off by default in
// the plain presets; on for the rich "บรรเลง / เต็มวง" ones.
//
// Contract: each returns PerfEvent[] (possibly empty). embellishChord() runs the enabled set for
// one chord and concatenates. Probabilities are the demo-proven values (§4).

function emev(midi, startBeat, beats, gain, attack, decayTo, timeShift = 0) {
  return { role: 'emb', inst: 'chord', midi, startBeat, beats, gain, attack, decayTo, timeShift }
}
const G = (cfg) => cfg.chordGain ?? 0.055

// sparkle — an octave-up shimmer on the top voice at some downbeats (top capped at MIDI 86).
export function sparkle(chordEvent, voiced, bpb, rng, cfg) {
  const up = voiced.up || []
  if (!up.length || rng() > 0.16) return []
  const top = up[up.length - 1] + 12
  if (top > 86) return []
  return [emev(top, chordEvent.startBeat, Math.min(1, chordEvent.beats), G(cfg) * 0.8, 0.01, null)]
}

// chromaticApproach — a leading tone a semitone below the bass, just before the chord lands.
export function chromaticApproach(chordEvent, voiced, bpb, rng, cfg) {
  if (voiced.bass == null || rng() > 0.28) return []
  return [emev(voiced.bass - 1, chordEvent.startBeat, 0.4, G(cfg) * 0.7, 0.01, null, -0.12)]
}

// gapFill — fill the last beat of a long-held chord with a soft upper chord tone.
export function gapFill(chordEvent, voiced, bpb, rng, cfg) {
  const up = voiced.up || []
  if (chordEvent.beats < 3 || !up.length || rng() > 0.33) return []
  const m = up[Math.floor(rng() * up.length)]
  return [emev(m, chordEvent.startBeat + chordEvent.beats - 1, 1, G(cfg) * 0.75, 0.02, null)]
}

// octaveSwell — a low octave doubling that swells under a pad chord (string-pad flavour).
export function octaveSwell(chordEvent, voiced, bpb, rng, cfg) {
  const up = voiced.up || []
  if (!up.length || rng() > 0.22) return []
  const m = up[0] - 12
  if (m < 36) return []
  return [emev(m, chordEvent.startBeat, chordEvent.beats, G(cfg) * 0.6, 0.3, 0.85)]
}

const ALL = { sparkle, chromaticApproach, gapFill, octaveSwell }

// Run the enabled embellishments (cfg.embellish = true → the default rich set, or an array of
// names) for one chord. Returns [] when off — the plain presets get exactly zero extra notes.
export function embellishChord(chordEvent, voiced, bpb, rng, cfg) {
  if (!cfg.embellish) return []
  const names = Array.isArray(cfg.embellish) ? cfg.embellish : ['sparkle', 'chromaticApproach', 'gapFill']
  const out = []
  for (const n of names) if (ALL[n]) out.push(...ALL[n](chordEvent, voiced, bpb, rng, cfg))
  return out
}
