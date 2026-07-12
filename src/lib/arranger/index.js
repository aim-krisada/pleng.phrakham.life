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
// Pipeline (§1a): LAYER 1 voicing → LAYER 3 pattern (comp + bass + embellish) → LAYER 2 dynamics.
// (Dynamics runs last because accent/contour/humanize act on the fully-expanded attacks.)
//
// GOLDEN RULE (§1a, from B104): the sheet is SSOT. The arranger seasons the PERFORMANCE
// (ordering / loudness / timing / timbre) but never changes the melody pitches and never adds
// notes outside the chord (except opt-in safe embellishments — chord tones / resolving approaches).

import { rngFor } from './rng.js'
import {
  humanizeVel, humanizeTime, metricAccent, melodicContour,
  sectionDynamics, crescendo, rubato, clampAll,
} from './dynamics.js'
import { applyVoicing } from './voicing.js'
import { embellishChord } from './embellish.js'
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
// SEPARATE layer applied afterwards, and only when the arranger is on.
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
 * @param {Object} cfg   { arranger=true, voices='both', chordGain=0.055, module=keyboard,
 *                         pattern, bass, voicing, embellish, dynamics:{accent,contour,section,
 *                         sectionMap,cresc,rubato}, humanizeVel, humanizeTime }
 * @param {Object} meta  { songId, pass=0, timeSignature, keyRoot, sections }
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
  const dyn = cfg.dynamics || {}

  const events = []
  if (wantMelody) events.push(...melodyEvents(notes))

  // LAYER 1 voicing + LAYER 3 pattern (comp up voices + bass foundation + embellishments). When
  // OFF ("ลูกเล่นปิด" / ตรวจโน้ต §6c), force the plain block pad — INSTRUMENT-AGNOSTIC: a hard
  // sustained block of the FULL printed chord + root bass, ignoring the module's idiom. This keeps
  // note-check honest on any instrument (e.g. a violin's double-stop reduction would DROP printed
  // chord notes, and its stringPad default would add a swell — neither is "notes exactly as
  // printed"). ON = the module's idiomatic voicing/pattern.
  if (wantChords) {
    const compName = on ? (cfg.pattern || mod.defaultPattern) : 'sustained'
    const comp = mod.patterns[compName] || mod.patterns[mod.defaultPattern] || mod.patterns.sustained
    const bassName = on ? (cfg.bass || mod.defaultBass) : 'root'
    const bassMode = (mod.bassModes && mod.bassModes[bassName]) || mod.bassModes.root
    let prevUp = null
    const list = chordEvents || []
    for (let i = 0; i < list.length; i++) {
      const evc = list[i]
      // OFF → the raw voice-led chord (full up[]), no module reduction; ON → the module's voicing.
      let voiced = on ? mod.voicing(evc, prevUp, { cfg, meta }) : { bass: evc.bass, up: evc.up }
      if (on) voiced = applyVoicing(voiced, cfg) // drop-2 / open per preset
      prevUp = voiced.up
      events.push(...comp(evc, voiced.up, bpb, rng, cfg))
      events.push(...bassMode(evc, voiced.bass, {
        nextBass: list[i + 1] ? list[i + 1].bass : null,
        keyRoot: meta.keyRoot ?? 40, beatsPerBar: bpb, rng, cfg,
      }))
      if (on) events.push(...embellishChord(evc, voiced, bpb, rng, cfg))
    }
  }

  // LAYER 2 dynamics — only when the arranger is ON. When OFF ("ลูกเล่นปิด"): notes play exactly
  // as printed — constant gain, timeShift 0, no embellishment (§6c invariant). Order: shape the
  // gains (section → accent → contour → cresc), then time (rubato → humanize), clamp to layer.
  if (on) {
    if (dyn.section !== false) sectionDynamics(events, meta.sections, dyn.sectionMap)
    if (dyn.accent !== false) metricAccent(events, bpb)
    if (dyn.contour !== false) melodicContour(events)
    if (dyn.cresc) crescendo(events, dyn.cresc)
    if (dyn.rubato !== false) rubato(events)
    humanizeVel(events, rng, cfg.humanizeVel ?? mod.humanizeFeel.velJitter)
    humanizeTime(events, rng, cfg.humanizeTime ?? mod.humanizeFeel.timing.sigma)
    clampAll(events) // velocity-in-layer safety net (§7b)
  }

  return events
}
