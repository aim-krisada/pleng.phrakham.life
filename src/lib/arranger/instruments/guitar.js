// B107 step 9 · §4B — the nylon-guitar InstrumentModule (LAUNCH instrument #2 · P'Aim approved).
//
// A guitar is NOT a piano: its idiom is the STRUM (a raked chord — strings sound one after another,
// low→high on a downstroke, high→low on an upstroke) and the FINGERPICK, not a block or an arpeggio
// of single notes. This module ports the P'Aim-approved patterns from docs/spikes/guitar-solo-demo.html
// (branch b107-p2-design): strum D-DU-UDU · Travis PIMA roll · rasgueado flick · a melody slide-in
// grace · a directional strum stagger you can HEAR. The real nylon CC0 sample plays it (sampler.js).
//
// ARCHITECTURE: unlike keyboard (which lets the core render the bass separately), the guitar module
// OWNS its whole voicing — every pattern emits its own bass string(s) — so the core bass is disabled
// for guitar (all bassModes → []). That keeps the rake self-contained and can't double a preset's
// bass. Plain mode ("ตรงโน้ต") uses `sustained` = a full held block (bass+up) so note-check still
// hears every printed chord tone.

// PerfEvent factory (same shape the scheduler consumes). role 'bass' for the low string, 'inner'
// for the raked upper strings; both fire on the one selected instrument (the nylon sampler).
function gev(role, midi, startBeat, beats, gain, attack, timeShift) {
  return { role, inst: 'chord', midi, startBeat, beats, gain, attack, decayTo: null, timeShift: timeShift || 0 }
}
const CHORD_G = (cfg) => cfg.chordGain ?? 0.055

// A raked strum: fire `notes` one after another with a per-string stagger (gapSec) you can hear —
// the essence of "รูด". `dir` +1 = downstroke low→high (fuller, includes the bass), −1 = upstroke
// high→low (lighter). Each later string a touch softer (1 − j·0.08), like a real pick sweep.
function rake(notes, startBeat, gapSec, baseG, dir, out) {
  const seq = dir < 0 ? notes.slice().reverse() : notes
  seq.forEach((m, j) => out.push(gev(j === 0 && dir > 0 ? 'bass' : 'inner', m, startBeat,
    1.8, baseG * (1 - j * 0.08), 0.006, j * gapSec)))
}

// strum — the recognizable worship groove D _ D U _ U D U across the bar (positions in beats).
// Downstroke = [bass, ...up] low→high; upstroke = up high→low, no bass. THE default guitar sound.
function strum(chordEvent, up, bpb, rng, cfg) {
  if (chordEvent.bass == null && !up.length) return []
  const g = CHORD_G(cfg)
  const full = [chordEvent.bass, ...up].filter((m) => m != null)
  const nb = Math.max(1, Math.round(chordEvent.beats))
  const PAT = { 0: 'D', 1: 'D', 1.5: 'U', 2.5: 'U', 3: 'D', 3.5: 'U' } // within a 4-beat bar
  const out = []
  for (let p = 0; p < nb; p += 0.5) {
    const bp = (((chordEvent.startBeat + p) % bpb) + bpb) % bpb
    const key = Object.keys(PAT).find((k) => Math.abs(+k - bp) < 0.01)
    if (!key) continue
    if (PAT[key] === 'D') rake(full, chordEvent.startBeat + p, 0.026, g * 1.6, +1, out) // down: fuller, +bass
    else rake(up, chordEvent.startBeat + p, 0.020, g * 1.0, -1, out) // up: lighter, no bass
  }
  return out
}

// travis — a fingerpicked pattern: an alternating thumb bass (root, then the 5th) on each beat,
// plus a clear ascending i-m-a roll of the upper strings across the beat (the picked "gallop").
function travis(chordEvent, up, bpb, rng, cfg) {
  if (chordEvent.bass == null) return strum(chordEvent, up, bpb, rng, cfg)
  const g = CHORD_G(cfg)
  const nb = Math.max(1, Math.round(chordEvent.beats))
  const out = []
  for (let k = 0; k < nb; k++) {
    const thumb = k % 2 === 0 ? chordEvent.bass : chordEvent.bass + 7 // root ↔ 5th
    out.push(gev('bass', thumb, chordEvent.startBeat + k, 2.0, g * 1.5, 0.006, 0))
    const ima = [up[0], up[1] ?? up[0], up[2] ?? up[1] ?? up[0]].filter((m) => m != null)
    ima.forEach((m, j) => out.push(gev('inner', m, chordEvent.startBeat + k + 0.25 + j * 0.22, 1.5, g * 0.9, 0.006, 0)))
  }
  return out
}

// rasgueado — a rapid flamenco finger-flick flourish at each chord start (4 fast cascading rakes,
// growing), then a lighter strum body over the rest of the bar. Spanish-guitar flavour.
function rasgueado(chordEvent, up, bpb, rng, cfg) {
  const g = CHORD_G(cfg)
  const full = [chordEvent.bass, ...up].filter((m) => m != null)
  const nb = Math.max(1, Math.round(chordEvent.beats))
  const out = []
  for (let f = 0; f < 4; f++) rake(full, chordEvent.startBeat, 0.012, g * (0.9 + f * 0.35), +1, out)
  const PAT = { 1: 'D', 2: 'D', 2.5: 'U', 3: 'U', 3.5: 'D' }
  for (let p = 1; p < nb; p += 0.5) {
    const bp = (((chordEvent.startBeat + p) % bpb) + bpb) % bpb
    const key = Object.keys(PAT).find((k) => Math.abs(+k - bp) < 0.01)
    if (!key) continue
    if (PAT[key] === 'D') rake(full, chordEvent.startBeat + p, 0.022, g * 1.1, +1, out)
    else rake(up, chordEvent.startBeat + p, 0.020, g * 0.9, -1, out)
  }
  return out
}

// sustained — a plain held block INCLUDING the bass, for "ตรงโน้ต" (note-check): every printed
// chord tone rings at once, no strum idiom. (The core forces this pattern when the arranger is off.)
function guitarBlock(chordEvent, up, bpb, rng, cfg) {
  const g = CHORD_G(cfg)
  const full = [chordEvent.bass, ...up].filter((m) => m != null)
  return full.map((m, j) => gev(j === 0 ? 'bass' : 'inner', m, chordEvent.startBeat, chordEvent.beats, g * (j === 0 ? 1.45 : 1), 0.01, 0))
}

const NONE = () => [] // guitar owns its own bass in every pattern → the core adds none

export const guitar = {
  id: 'nylon',
  role: 'both',
  register: { lo: 40, hi: 76 }, // guitar sounding range (E2–E5)
  // Nylon uses the core voice-leading (nearest-octave upper voices); the strum/pick patterns break
  // it into raked strings, so a strict fret-shape voicing isn't needed for the solo lead.
  voicing(chordEvent) {
    return { bass: chordEvent.bass, up: chordEvent.up }
  },
  patterns: { strum, travis, rasgueado, sustained: guitarBlock },
  defaultPattern: 'strum',
  // Every bass mode → empty: the guitar's patterns pluck their own bass string, so the core must
  // NOT add a separate bass (which a piano preset's bass:'root'/'pedal' would otherwise do).
  bassModes: { root: NONE, pedal: NONE, walking: NONE, none: NONE },
  defaultBass: 'none',
  // strum stagger is baked into the patterns (the rake gaps); humanize adds only a small extra
  // jitter on top so repeated strums aren't identical.
  humanizeFeel: { velJitter: 0.07, timing: { type: 'strum', sigma: 0.01 } },
  // a melody ornament (§demo "slide-in"): ~22% of longer notes get a quick grace a step below that
  // slides up into the target — a guitar hammer/slide, seeded so it's deterministic (MP3 == live).
  melodyGrace(e, rng) {
    if (e.beats < 1 || rng() >= 0.22) return null
    return { role: 'melody', inst: 'melody', midi: e.midi - 2, startBeat: e.startBeat, beats: 0.18, gain: e.gain * 0.62, attack: 0.006, decayTo: null, timeShift: -0.055 }
  },
}
