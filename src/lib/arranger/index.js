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
  sectionDynamics, crescendo, rubato, clampAll, easeUnderHold,
} from './dynamics.js'
import { applyVoicing } from './voicing.js'
import { embellishChord } from './embellish.js'
import { answerFills, applySusCadence } from './fills.js'
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

// True if `beat` falls inside a ท่อนรับ (refrain) section. sections come from sectionBeatRanges,
// which flags refrains (name รับ / *** or a recurring label). Used to break the chord more there.
function inRefrain(beat, sections) {
  if (!sections || !sections.length) return false
  return sections.some((s) => s.isRefrain && beat >= s.fromBeat && beat < s.toBeat)
}

// Parse "4/4" → beats-per-bar 4 (default 4). Only patterns that lock to the bar need it.
function beatsPerBar(meta) {
  const ts = meta && meta.timeSignature
  if (typeof ts === 'string') { const n = parseInt(ts.split('/')[0], 10); if (n > 0) return n }
  if (typeof ts === 'number' && ts > 0) return ts
  return 4
}

// Melody = the printed notes, one PerfEvent per sounding note (rests advance the beat clock but
// make no event). This is literal — the sheet's pitch/timing untouched; dynamics/humanize are a
// SEPARATE layer applied afterwards, and only when the arranger is on. When the arranger is on, an
// instrument MAY add an idiomatic ornament per note via `mod.melodyGrace` (e.g. a guitar slide-in) —
// opt-in, seeded, and only for a module that defines it (piano leaves the melody exactly as printed).
function melodyEvents(notes, mod, rng, cfg) {
  const out = []
  let beat = 0
  for (const n of notes || []) {
    if (n.midi != null) {
      const e = {
        // gain 0.31 (was 0.35, the layer ceiling) — a slightly softer touch so the piano doesn't
        // "กระแทก" on every note (P'Aim 14 ก.ค.). Still the loudest role, well above the comp floor.
        role: 'melody', inst: 'melody', midi: n.midi,
        startBeat: beat, beats: n.beats,
        gain: 0.31, attack: 0.015, decayTo: null, timeShift: 0,
      }
      const grace = mod && mod.melodyGrace ? mod.melodyGrace(e, rng, cfg) : null
      if (grace) out.push(grace)
      out.push(e)
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

  let events = []
  const voicedChords = [] // {startBeat,beats,up,bass} per chord — the chord tones ลูกรับส่ง draws on
  // pass the module only when the arranger is ON, so "ตรงโน้ต" (off) never adds an ornament — the
  // melody stays exactly as printed (§6c), and piano (no melodyGrace) is unchanged either way.
  if (wantMelody) events.push(...melodyEvents(notes, on ? mod : null, rng, cfg))

  // LAYER 1 voicing + LAYER 3 pattern (comp up voices + bass foundation + embellishments). When
  // OFF ("ลูกเล่นปิด" / ตรวจโน้ต §6c), force the plain block pad — INSTRUMENT-AGNOSTIC: a hard
  // sustained block of the FULL printed chord + root bass, ignoring the module's idiom. This keeps
  // note-check honest on any instrument (e.g. a violin's double-stop reduction would DROP printed
  // chord notes, and its stringPad default would add a swell — neither is "notes exactly as
  // printed"). ON = the module's idiomatic voicing/pattern.
  if (wantChords) {
    const compName = on ? (cfg.pattern || mod.defaultPattern) : 'sustained'
    const comp = mod.patterns[compName] || mod.patterns[mod.defaultPattern] || mod.patterns.sustained
    // ท่อนรับ (refrain) may break the chord MORE than the verse (P'Aim) — cfg.refrainPattern names a
    // fuller comp used only inside refrain sections; falls back to the normal comp if absent/OFF.
    const refrainComp = (on && cfg.refrainPattern && mod.patterns[cfg.refrainPattern]) || comp
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
      voicedChords.push({ startBeat: evc.startBeat, beats: evc.beats, up: voiced.up, bass: voiced.bass })
      const useComp = inRefrain(evc.startBeat, meta.sections) ? refrainComp : comp
      const compEvts = useComp(evc, voiced.up, bpb, rng, cfg)
      // sus → คลี่คลาย at a cadence chord (harmony-aware; uses melody already in `events` for the
      // clash guard). Edits compEvts in place before they join the stream.
      if (on && cfg.susCadence) applySusCadence(compEvts, evc.chord, evc.startBeat, evc.beats, events, cfg)
      events.push(...compEvts)
      events.push(...bassMode(evc, voiced.bass, {
        nextBass: list[i + 1] ? list[i + 1].bass : null,
        slashBass: evc.slashBass, // slash chord: root first, then move to this (P'Aim)
        keyRoot: meta.keyRoot ?? 40, beatsPerBar: bpb, rng, cfg,
      }))
      if (on) events.push(...embellishChord(evc, voiced, bpb, rng, cfg))
    }
  }

  // LAYER 3 (ลูกรับส่ง) — the LEFT hand answers the melody in the space of a long held note, using
  // that moment's chord tones (voicedChords). Needs BOTH hands present (melody + chords), the
  // arranger ON, and cfg.fills. Added before dynamics so accent/humanize shade the answer too.
  if (on && cfg.fills && wantMelody && wantChords) {
    events.push(...answerFills(events, voicedChords, bpb, cfg))
  }

  // LAYER 2 dynamics — only when the arranger is ON. When OFF ("ลูกเล่นปิด"): notes play exactly
  // as printed — constant gain, timeShift 0, no embellishment (§6c invariant). Order: shape the
  // gains (section → accent → contour → cresc), then time (rubato → humanize), clamp to layer.
  if (on) {
    // thin the comp under a held melody note first (fewer notes = real space), then shape gains.
    // cfg.holdPulse (default on) = the mid-bar pulse that keeps a long hold from going hollow.
    if (cfg.easeUnderHold !== false) events = easeUnderHold(events, bpb, 2, cfg.holdPulse !== false)
    if (dyn.section !== false) sectionDynamics(events, meta.sections, dyn.sectionMap)
    if (dyn.accent !== false) metricAccent(events, bpb)
    if (dyn.contour !== false) melodicContour(events)
    if (dyn.cresc) crescendo(events, dyn.cresc)
    if (dyn.rubato !== false) rubato(events, meta.sections) // ท่อน-end breathe (§R2.8)
    // humanize: cfg.humanize === false turns BOTH nudges off (jitter 0) so the menu can A/B it.
    const humOff = cfg.humanize === false
    humanizeVel(events, rng, humOff ? 0 : (cfg.humanizeVel ?? mod.humanizeFeel.velJitter))
    humanizeTime(events, rng, humOff ? 0 : (cfg.humanizeTime ?? mod.humanizeFeel.timing.sigma))
    clampAll(events) // velocity-in-layer safety net (§7b)
  }

  return events
}
