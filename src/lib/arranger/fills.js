// B107 · ROUND 2 — ลูกรับส่ง (two-hand call-and-response). The give-and-take that makes a piano
// sound like a PERSON, not a backing track (P'Aim 14 ก.ค.): when the RIGHT hand (melody) holds a
// note for a while, the LEFT hand "answers" in the space with a tiny rising figure that leads back
// INTO the next phrase. This is the musician's instinct the old easeUnderHold got backwards — it
// hushed the left hand under a hold; the natural move is to let it ANSWER there.
//
// SAFE by construction (golden rule §1a): every answer note is a CHORD TONE taken from the chord
// voiced at that moment (voiced.up) — never an invented pitch, never out of key. SPARSE by design
// ("น้อยๆ เนียนๆ"): only genuinely long holds get an answer, and answers are spaced apart so the
// texture stays calm. Pure + deterministic (no rng) → headless-testable, MP3 == live.
//
//   answerFills(melodyEvents, chordCtx, beatsPerBar, cfg) → PerfEvent[] (role 'emb', soft)
//     melodyEvents : the melody PerfEvents (role 'melody' · startBeat, beats)
//     chordCtx     : [{ startBeat, beats, up:[…], bass }] — the voiced chords (for the tones to use)
//     cfg.fillLevel: 0..1 — how much interplay. 0 = off. Higher = answers shorter holds + more notes.

import { parseChord } from '../chords.js'

function fev(midi, startBeat, beats, gain) {
  return { role: 'emb', inst: 'chord', midi, startBeat, beats, gain, attack: 0.02, decayTo: null, timeShift: 0 }
}

const pcOf = (m) => (((m % 12) + 12) % 12)

// susCadence — a suspension at a resting/cadence chord: for the FIRST part of a long plain
// major/minor chord the comp sounds the 4th INSTEAD of the 3rd (sus4), then RESOLVES to the 3rd
// for the rest — the classic worship "sus → คลี่คลาย". It's a real VOICING SWAP done in place
// (raise the sounding 3rd to the 4th, cap it, then add the 3rd back at the resolution) — NOT a 4th
// layered over a still-sounding 3rd (that's a muddy cluster, the reason v1 was deferred). Edits
// compEvents in place; returns how many notes were suspended (0 = didn't fire).
// GUARD (P'Aim): plain major/minor only, long chords (≥3 beats = a resting point), and SKIP if the
// melody sitting on this chord IS the 3rd (a 4th over a sung 3rd = a semitone clash). Chord-tone → safe.
export function applySusCadence(compEvents, chordSym, startBeat, beats, melodyEvents, cfg) {
  if (!cfg || !cfg.susCadence) return 0
  const level = cfg.susLevel ?? 0.5
  if (level <= 0 || beats < 3 || !compEvents || !compEvents.length) return 0
  const p = parseChord(chordSym || '')
  if (!p || !(p.suffix === '' || p.suffix === 'm')) return 0 // plain triad only (no 7/dim/sus/…)
  const minor = p.suffix === 'm'
  const thirdPc = pcOf(p.rootIndex + (minor ? 3 : 4))
  const fourthPc = pcOf(p.rootIndex + 5)
  const susUntil = startBeat + Math.min(2, beats / 2) // sus the first ~half (≤2 beats), then resolve
  const delta = (((fourthPc - thirdPc) % 12) + 12) % 12 // +1 (major) or +2 (minor) semitones

  // clash guard: if the tune over this chord is the 3rd, a sus 4th would sit a semitone away → skip
  const overlaps = (e) => e.startBeat < susUntil && e.startBeat + (e.beats || 0) > startBeat
  const mel = (melodyEvents || []).filter((e) => e.role === 'melody' && overlaps(e))
  if (mel.some((e) => pcOf(e.midi) === thirdPc)) return 0

  let changed = 0
  let thirdMidi = null
  for (const e of compEvents) {
    if (e.role !== 'inner') continue
    if (e.startBeat < susUntil && pcOf(e.midi) === thirdPc) {
      thirdMidi = e.midi // remember the 3rd's octave so the resolution lands in the same place
      e.midi += delta // raise the 3rd → 4th (the suspension)
      e.beats = Math.max(0.5, Math.min(e.beats, susUntil - e.startBeat)) // stop before the resolution
      changed++
    }
  }
  // add the resolution: the 3rd re-enters at susUntil for the rest of the chord (chord tone → safe)
  if (changed && thirdMidi != null) {
    const g = compEvents.find((e) => e.role === 'inner')?.gain ?? (cfg.chordGain ?? 0.055)
    compEvents.push({ role: 'inner', inst: 'chord', midi: thirdMidi, startBeat: susUntil, beats: startBeat + beats - susUntil, gain: g, attack: 0.04, decayTo: 0.85, timeShift: 0 })
  }
  return changed
}

export function answerFills(melodyEvents, chordCtx, beatsPerBar = 4, cfg = {}) {
  const level = cfg.fillLevel ?? 0.5
  if (level <= 0 || !melodyEvents?.length || !chordCtx?.length) return []
  const mel = melodyEvents.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  if (!mel.length) return []

  const softer = (cfg.chordGain ?? 0.055) * 0.9 // a hair under the comp = a gentle "answer", not a solo
  const chordAt = (beat) =>
    chordCtx.find((c) => beat >= c.startBeat - 1e-6 && beat < c.startBeat + c.beats)
  // Only holds this long get an answer; a bolder level answers shorter holds too. Answers are kept
  // ≥ SPACING beats apart so a stretch of held notes doesn't turn into constant noodling.
  const minHold = level >= 0.7 ? 3 : 4
  const SPACING = level >= 0.7 ? 3 : 4
  const step = 0.5 // eighth-note run

  const out = []
  let lastEnd = -Infinity
  for (const n of mel) {
    const L = n.beats
    if (L < minHold) continue // short note — the melody is busy, no space to answer
    const end = n.startBeat + L // the next phrase begins here; the answer LEADS into it
    if (end - lastEnd < SPACING) continue // too soon after the last answer — stay sparse
    const c = chordAt(end - 0.75) || chordAt(n.startBeat)
    const tones = [...new Set((c && c.up) || [])].sort((a, b) => a - b)
    if (tones.length < 2) continue // need at least two chord tones to make a rising figure

    // A rising figure of chord tones, landing just before the melody moves again. Default = 2 notes
    // (subtle); a bold level adds a third lower pickup so the answer is a touch more of a phrase.
    const hi = tones[tones.length - 1]
    const mid = tones[Math.max(0, tones.length - 2)]
    const figure =
      level >= 0.7 && tones.length >= 3
        ? [tones[Math.max(0, tones.length - 3)], mid, hi]
        : [mid, hi]
    const startAt = end - figure.length * step
    if (startAt <= n.startBeat + 0.5) continue // don't crowd the note's own attack
    figure.forEach((m, i) => out.push(fev(m, startAt + i * step, step, softer)))
    lastEnd = end
  }
  return out
}
