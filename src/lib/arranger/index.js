// B107 P2 — the auto-arranger. `arrange()` is a PURE function inserted between "the notes on
// the sheet" and "playing sound": it turns the sheet's melody + chord events into a flat list
// of PerfEvent (performance events) = plain data describing what to actually play. Because it's
// pure data (no AudioContext), it's headless-testable and shared by live playback AND the MP3
// export, so the two can never disagree (§1b).
//
//   notes[]        ← songToNotes(content)      "facts from the sheet" (SSOT)
//   chordEvents[]  ← buildChordVoice(notes)    voice-led chord blocks
//        │  arrange(notes, chordEvents, cfg, meta)
//        ▼
//   PerfEvent[]  { role, inst, midi, startBeat, beats, gain, attack, decayTo, timeShift }
//        │  scheduler (playSong / renderSongToBuffer) turns beats→seconds and fires
//        ▼
//   sampler.fire(...) | scheduleNote(...)
//
// Pipeline layers (§1a): LAYER 1 voicing → LAYER 2 dynamics → LAYER 3 pattern. Step 0–1 wires
// the seam + humanize; the deeper voicing/pattern/embellish rules slot into the same shape.
//
// GOLDEN RULE (§1a, from B104): the sheet is SSOT. The arranger seasons the PERFORMANCE
// (ordering / loudness / timing / timbre) but never changes the melody pitches and never adds
// notes outside the chord (except opt-in safe embellishments, later steps).

import { rngFor } from './rng.js'
import { humanizeVel, humanizeTime } from './dynamics.js'
import { keyboard } from './instruments/keyboard.js'

/** @typedef {Object} PerfEvent
 *  role     : 'melody' | 'bass' | 'inner' | 'emb'
 *  inst     : 'melody' | 'chord'
 *  midi     : number      // pitch before transpose (scheduler adds transpose)
 *  startBeat: number      // beats from song start
 *  beats    : number      // musical length in beats
 *  gain     : number      // linear gain before mix (melody ~0.35, chord inner ~0.055)
 *  attack   : number      // ramp-up seconds (synth) / onset hint (sampler)
 *  decayTo  : number|null // post-swell sustain fraction (chord ~0.72), synth path
 *  timeShift: number      // onset shift in SECONDS (humanize/rubato), added by scheduler
 */

// Parse "4/4" → beats-per-bar 4 (default 4). Only patterns that lock to the bar need it.
function beatsPerBar(meta) {
  const ts = meta && meta.timeSignature
  if (typeof ts === 'string') { const n = parseInt(ts.split('/')[0], 10); if (n > 0) return n }
  if (typeof ts === 'number' && ts > 0) return ts
  return 4
}

// Melody = the printed notes, one PerfEvent per sounding note (rests advance the beat clock but
// make no event). This is literal — the sheet's pitch/timing untouched; dynamics/humanize are a
// SEPARATE layer applied afterwards, and only when the arranger is on. `syk`/`li`/`si` are not
// needed downstream (the scheduler tracks follow-along from `notes` directly).
function melodyEvents(notes) {
  const out = []
  let beat = 0
  for (const n of notes || []) {
    if (n.midi != null) {
      out.push({
        role: 'melody', inst: 'melody', midi: n.midi,
        startBeat: beat, beats: n.beats,
        gain: 0.35, attack: 0.015, decayTo: null, timeShift: 0,
      })
    }
    beat += n.beats
  }
  return out
}

/**
 * @param {Array} notes        songToNotes(content) — melody + rests, cumulative beats
 * @param {Array} chordEvents  buildChordVoice(notes) — voice-led { bass, up[], startBeat, beats }
 * @param {Object} cfg   { arranger=true, voices='both', chordGain=0.055, pattern,
 *                         humanizeVel=0.06, humanizeTime=0.012, module=keyboard }
 * @param {Object} meta  { songId, pass=0, timeSignature }
 * @returns {PerfEvent[]}
 */
export function arrange(notes, chordEvents = [], cfg = {}, meta = {}) {
  const mod = cfg.module || keyboard
  const on = cfg.arranger !== false // false = "ลูกเล่นปิด" (note-check mode, §6c)
  const voices = cfg.voices || 'both'
  const wantMelody = voices !== 'chords'
  const wantChords = voices === 'chords' || voices === 'both'
  const bpb = beatsPerBar(meta)
  const rng = rngFor(meta.songId, meta.pass || 0)

  const events = []

  // LAYER 3 (pattern) — expand chords via the instrument module's pattern. Step 0–1 = sustained
  // only; the module owns the pattern set so a different instrument expands chords differently.
  if (wantMelody) events.push(...melodyEvents(notes))
  if (wantChords) {
    const patternName = (on && cfg.pattern) || mod.defaultPattern
    const pattern = mod.patterns[patternName] || mod.patterns[mod.defaultPattern]
    let prevUp = null
    for (const ev of chordEvents || []) {
      const voiced = mod.voicing(ev, prevUp, { cfg, meta })
      prevUp = voiced.up
      events.push(...pattern(ev, voiced, bpb, rng, cfg))
    }
  }

  // LAYER 2 (dynamics) — only when the arranger is ON. When OFF ("ลูกเล่นปิด"): notes play
  // exactly as printed — constant gain, timeShift 0, no embellishment (§6c invariant). Humanize
  // is the step-1 content; accent/contour/section/rubato are added here in step 4.
  if (on) {
    humanizeVel(events, rng, cfg.humanizeVel ?? mod.humanizeFeel.velJitter)
    humanizeTime(events, rng, cfg.humanizeTime ?? mod.humanizeFeel.timing.sigma)
  }

  return events
}
