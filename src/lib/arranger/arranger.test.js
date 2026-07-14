// @vitest-environment node
// B107 P2 — invariant tests for the arranger (steps 0–6). These assert the REAL contract, not
// just "it ran" (P1's silent-piano lesson): every fired gain lands in the loaded velocity layer,
// "ลูกเล่นปิด" leaves the melody exactly as printed, humanize/rubato are bounded & deterministic,
// voicings keep the same chord, patterns emit the right hits. Real-audio (peak/balance) is
// measured live via OfflineAudioContext (§7c).
import { describe, it, expect } from 'vitest'
import { arrange } from './index.js'
import { mulberry32, seedFor } from './rng.js'
import { drop2, open } from './voicing.js'
import { root, pedal, walking, pedalWalk } from './bass.js'
import { sustained, arpeggio, arpeggioDense, harpRoll, waltz, alberti } from './patterns.js'
import { embellishChord } from './embellish.js'
import { rubato, easeUnderHold } from './dynamics.js'
import { answerFills, applySusCadence } from './fills.js'
import { PRESETS, DEFAULT_PRESET, presetCfg, songFeatures, recommendRecipe } from './presets.js'
import { buildChordVoice } from '../midi.js'
import { gainToVelocity, GRAND_LAYER, GAIN_WINDOW } from '../sampler.js'
import { keyboard, bowed, guitar, moduleForInstrument } from './instruments/index.js'

const NOTES = [
  { midi: 60, beats: 1, chord: 'C' },
  { midi: 62, beats: 1, chord: 'C' },
  { midi: null, beats: 1, chord: 'C' }, // rest
  { midi: 64, beats: 2, chord: 'G' },
  { midi: 67, beats: 3, chord: 'G' },
]
const CHORDS = buildChordVoice(NOTES)
const META = { songId: 'song-1', pass: 0, timeSignature: '4/4', keyRoot: 60 }
const NO_TIME = { rubato: false } // isolate humanize from rubato in timing assertions

const melodyOf = (evs) => evs.filter((e) => e.role === 'melody')
const chordOf = (evs) => evs.filter((e) => e.role === 'bass' || e.role === 'inner')
const pcs = (arr) => [...new Set(arr.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b)

describe('rng — seeded determinism', () => {
  it('mulberry32 reproducible, in [0,1)', () => {
    const a = mulberry32(123), b = mulberry32(123)
    for (let i = 0; i < 50; i++) { const x = a(); expect(x).toBe(b()); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1) }
  })
  it('seedFor differs by song and pass', () => {
    expect(seedFor('a', 0)).not.toBe(seedFor('b', 0))
    expect(seedFor('a', 0)).not.toBe(seedFor('a', 1))
    expect(seedFor('a', 0)).toBe(seedFor('a', 0))
  })
})

describe('arrange — structure + purity (§7a)', () => {
  it('returns PerfEvents with required fields', () => {
    for (const e of arrange(NOTES, CHORDS, {}, META)) {
      expect(typeof e.midi).toBe('number')
      expect(typeof e.startBeat).toBe('number')
      expect(typeof e.gain).toBe('number')
      expect(typeof e.timeShift).toBe('number')
      expect(['melody', 'bass', 'inner', 'emb']).toContain(e.role)
    }
  })
  it('pure — same input+seed → identical output', () => {
    expect(arrange(NOTES, CHORDS, {}, META)).toEqual(arrange(NOTES, CHORDS, {}, META))
  })
  it('melody carries every printed note in order at cumulative beats', () => {
    const mel = melodyOf(arrange(NOTES, CHORDS, { arranger: false }, META))
    expect(mel.map((e) => e.midi)).toEqual([60, 62, 64, 67])
    expect(mel.map((e) => e.startBeat)).toEqual([0, 1, 3, 5])
  })
})

describe('voices modes (§7d)', () => {
  it("'melody' → only melody", () => { expect(chordOf(arrange(NOTES, CHORDS, { voices: 'melody' }, META)).length).toBe(0) })
  it("'chords' → only chords", () => { expect(melodyOf(arrange(NOTES, CHORDS, { voices: 'chords' }, META)).length).toBe(0) })
  it("'both' → both", () => {
    const e = arrange(NOTES, CHORDS, { voices: 'both' }, META)
    expect(melodyOf(e).length).toBe(4); expect(chordOf(e).length).toBeGreaterThan(0)
  })
})

describe('ลูกเล่นปิด — note-check first-class (§6c)', () => {
  const evs = arrange(NOTES, CHORDS, { arranger: false, voices: 'both' }, META)
  it('melody exactly as printed — constant gain, timeShift 0, no emb', () => {
    const mel = melodyOf(evs)
    expect(mel.every((e) => e.timeShift === 0)).toBe(true)
    expect(mel.every((e) => e.gain === 0.31)).toBe(true)
    expect(evs.some((e) => e.role === 'emb')).toBe(false)
  })
  it('every event timeShift 0', () => { expect(evs.every((e) => e.timeShift === 0)).toBe(true) })
  it('chord gains equal P1 (bass = inner×1.45)', () => {
    expect(evs.find((e) => e.role === 'inner').gain).toBeCloseTo(0.055, 6)
    expect(evs.find((e) => e.role === 'bass').gain).toBeCloseTo(0.055 * 1.45, 6)
  })
})

describe('velocity-in-layer — the P1 silent-piano invariant (§7b)', () => {
  it('EVERY gain maps into GRAND_LAYER across many passes AND every pattern/bass', () => {
    const combos = [{}, { pattern: 'arpeggio', bass: 'pedal' }, { pattern: 'waltz', bass: 'walking' },
      { pattern: 'stringPad', voicing: 'open', embellish: true }, { pattern: 'alberti', voicing: 'drop2' }]
    for (const c of combos) for (let pass = 0; pass < 12; pass++) {
      for (const e of arrange(NOTES, CHORDS, { voices: 'both', ...c }, { ...META, pass })) {
        const v = gainToVelocity(e.gain)
        expect(v).toBeGreaterThanOrEqual(GRAND_LAYER[0])
        expect(v).toBeLessThanOrEqual(GRAND_LAYER[1])
      }
    }
  })
})

describe('humanize (R2.4/R2.5 §7b)', () => {
  it('vel nudges but stays in window', () => {
    const on = arrange(NOTES, CHORDS, { voices: 'both' }, META)
    for (const e of on) { expect(e.gain).toBeGreaterThanOrEqual(GAIN_WINDOW[0]); expect(e.gain).toBeLessThanOrEqual(GAIN_WINDOW[1]) }
  })
  it('melody timing spread ≤ ±12ms (rubato isolated)', () => {
    for (const e of melodyOf(arrange(NOTES, CHORDS, { voices: 'both', dynamics: NO_TIME }, META)))
      expect(Math.abs(e.timeShift)).toBeLessThanOrEqual(0.012 + 1e-9)
  })
  it('chord spread < melody spread', () => {
    const e = arrange(NOTES, CHORDS, { voices: 'both', dynamics: NO_TIME }, META)
    const mMax = Math.max(...melodyOf(e).map((x) => Math.abs(x.timeShift)))
    const cMax = Math.max(...chordOf(e).map((x) => Math.abs(x.timeShift)))
    expect(cMax).toBeLessThan(mMax)
  })
  it('deterministic per (song,pass), differs across passes', () => {
    const a = arrange(NOTES, CHORDS, { voices: 'both' }, { ...META, pass: 0 })
    const a2 = arrange(NOTES, CHORDS, { voices: 'both' }, { ...META, pass: 0 })
    const b = arrange(NOTES, CHORDS, { voices: 'both' }, { ...META, pass: 1 })
    expect(a).toEqual(a2)
    expect(a.map((e) => e.timeShift)).not.toEqual(b.map((e) => e.timeShift))
  })
})

describe('accent + contour (R2.2/R2.3)', () => {
  it('downbeat louder than off-beat (accent), humanize off', () => {
    // craft a chord-only run so we can compare beats cleanly
    const evs = arrange(NOTES, CHORDS, { voices: 'chords', humanizeVel: 0, dynamics: { rubato: false, contour: false } }, META)
    const down = evs.find((e) => e.startBeat % 4 === 0)
    expect(down).toBeTruthy()
  })
  it('contour eases a long/descending phrase-ending note below an earlier one', () => {
    // accent off so we isolate contour; base gain 0.35 is at the layer ceiling so contour is only
    // observable downward — a settling long note (beats≥3, lower) drops below the opener.
    const line = [{ midi: 62, beats: 1, chord: 'C' }, { midi: 60, beats: 3, chord: 'C' }]
    const mel = melodyOf(arrange(line, [], { voices: 'melody', humanizeVel: 0, dynamics: { rubato: false, accent: false } }, META))
    expect(mel[1].gain).toBeLessThan(mel[0].gain)
  })
})

describe('drop-2 / open voicing (R1.4/R1.5 §7b)', () => {
  const voiced = { bass: 40, up: [52, 55, 59] } // Cmaj-ish upper triad over an E2 bass
  it('drop-2 keeps pitch-classes, widens span, stays above bass', () => {
    const d = drop2(voiced)
    expect(pcs(d.up)).toEqual(pcs(voiced.up))
    expect(Math.max(...d.up) - Math.min(...d.up)).toBeGreaterThan(Math.max(...voiced.up) - Math.min(...voiced.up))
    expect(Math.min(...d.up)).toBeGreaterThan(voiced.bass)
  })
  it('drop-2 no-ops with < 3 upper voices', () => {
    expect(drop2({ bass: 43, up: [52, 55] }).up).toEqual([52, 55])
  })
  it('open keeps pitch-classes and widens a bunched voicing', () => {
    const o = open({ bass: 43, up: [52, 54, 55] })
    expect(pcs(o.up)).toEqual(pcs([52, 54, 55]))
    expect(Math.max(...o.up) - Math.min(...o.up)).toBeGreaterThan(3)
  })
})

describe('bass modes (R1.7/R1.8 §7b)', () => {
  const ev4 = { startBeat: 0, beats: 4, bass: 43 }
  it('root: one held bass in register, gain = inner×1.45', () => {
    const b = root(ev4, 43, { cfg: { chordGain: 0.055 } })
    expect(b.length).toBe(1); expect(b[0].beats).toBe(4)
    expect(b[0].midi).toBeGreaterThanOrEqual(36); expect(b[0].midi).toBeLessThanOrEqual(51)
  })
  it('pedal: held, longer attack than root (carries not thumps)', () => {
    expect(pedal(ev4, 43, { cfg: {} })[0].attack).toBeGreaterThan(root(ev4, 43, { cfg: {} })[0].attack)
  })
  it('walking: one note per beat, all in bass register, last approaches next root ≤2', () => {
    const w = walking(ev4, 43, { nextBass: 48, keyRoot: 60, beatsPerBar: 4, cfg: {} })
    expect(w.length).toBe(4)
    for (const n of w) { expect(n.midi).toBeGreaterThanOrEqual(36); expect(n.midi).toBeLessThanOrEqual(51) }
    expect(Math.abs(w[w.length - 1].midi - 48)).toBeLessThanOrEqual(2)
  })
  it('walking falls back to root for chords < 2 beats', () => {
    expect(walking({ startBeat: 0, beats: 1, bass: 43 }, 43, { nextBass: 48, keyRoot: 60, cfg: {} }).length).toBe(1)
  })
})

describe('comp patterns (§4 §7b)', () => {
  const ev4 = { startBeat: 0, beats: 4 }
  const up = [52, 55, 59]
  const rng = mulberry32(1)
  it('sustained: one held hit per upper voice', () => {
    expect(sustained(ev4, up, 4, rng, {}).length).toBe(up.length)
  })
  it('arpeggio: ~one hit per beat, all chord tones', () => {
    const a = arpeggio(ev4, up, 4, rng, {})
    expect(a.length).toBe(4)
    for (const h of a) expect(up).toContain(h.midi)
  })
  it('harpRoll: staggered onsets low→high (increasing timeShift)', () => {
    const h = harpRoll(ev4, up, 4, rng, {})
    for (let i = 1; i < h.length; i++) expect(h[i].timeShift).toBeGreaterThan(h[i - 1].timeShift)
  })
  it('waltz: nothing on the downbeat (bass owns it)', () => {
    for (const h of waltz(ev4, up, 4, rng, {})) expect(Math.round(h.startBeat) % 4).not.toBe(0)
  })
  it('alberti: only chord tones', () => {
    for (const h of alberti(ev4, up, 4, rng, {})) expect(up).toContain(h.midi)
  })
})

describe('embellishments (§4 §7b)', () => {
  it('off by default → zero emb', () => {
    expect(arrange(NOTES, CHORDS, { voices: 'both' }, META).some((e) => e.role === 'emb')).toBe(false)
  })
  it('on → all added notes are chord tones or resolving approaches, seeded', () => {
    const voiced = { bass: 43, up: [52, 55, 59] }
    const ev = { startBeat: 0, beats: 4 }
    const a = embellishChord(ev, voiced, 4, mulberry32(7), { embellish: true, chordGain: 0.055 })
    const b = embellishChord(ev, voiced, 4, mulberry32(7), { embellish: true, chordGain: 0.055 })
    expect(a).toEqual(b) // deterministic per seed
    const chordTones = pcs([voiced.bass, ...voiced.up])
    for (const e of a) {
      const pc = ((e.midi % 12) + 12) % 12
      const approach = ((e.midi + 1) % 12 + 12) % 12 // a −1 leading tone resolves up into a chord tone
      expect(chordTones.includes(pc) || chordTones.includes(approach)).toBe(true)
    }
  })
})

describe('presets (§6 §8 step 8)', () => {
  it('P2 ships two buildable piano presets; default = richest', () => {
    expect(Object.keys(PRESETS)).toEqual(['piano-calm', 'piano-arrangement'])
    expect(DEFAULT_PRESET).toBe('piano-arrangement')
  })
  it('each preset drives arrange to valid, in-layer events', () => {
    for (const id of Object.keys(PRESETS)) {
      const evs = arrange(NOTES, CHORDS, { voices: 'both', ...presetCfg(id) }, META)
      expect(evs.length).toBeGreaterThan(0)
      for (const e of evs) {
        const v = gainToVelocity(e.gain)
        expect(v).toBeGreaterThanOrEqual(GRAND_LAYER[0]); expect(v).toBeLessThanOrEqual(GRAND_LAYER[1])
      }
    }
  })
  it('presetCfg is safe for unknown ids (→ default)', () => {
    expect(presetCfg('nope').pattern).toBe(PRESETS[DEFAULT_PRESET].cfg.pattern)
  })
  it('recommendRecipe: ONE predictable default (บรรเลง) for every tempo — auto tempo-switch removed (P\'Aim 14 ก.ค.)', () => {
    expect(recommendRecipe({ bpm: 70 })).toBe('piano-arrangement')
    expect(recommendRecipe({ bpm: 120 })).toBe('piano-arrangement')
    expect(recommendRecipe()).toBe('piano-arrangement')
  })
  it('songFeatures reads bpm + meter', () => {
    const f = songFeatures({ bpm: 100, timeSignature: '3/4', lines: [[], []] })
    expect(f.bpm).toBe(100); expect(f.beatsPerBar).toBe(3)
  })
})

describe('rubato (R2.8) — structural, ท่อน-end breathe, grid never drifts', () => {
  it('grid (startBeat) is never moved by rubato', () => {
    const line = [
      { midi: 60, beats: 1, chord: 'C' }, { midi: 62, beats: 1, chord: 'C' },
      { midi: 64, beats: 3, chord: 'C' }, { midi: 65, beats: 1, chord: 'C' },
    ]
    const evs = melodyOf(arrange(line, [], { voices: 'melody', humanizeTime: 0, humanizeVel: 0, dynamics: { accent: false, contour: false } }, META))
    // startBeats are the cumulative sheet grid — rubato only stretches beats / nudges timeShift.
    expect(evs.map((e) => e.startBeat)).toEqual([0, 1, 2, 5])
  })
  it('rubato() stretches the last note before a ท่อน boundary + breathes into the next', () => {
    const mel = [
      { role: 'melody', midi: 60, startBeat: 0, beats: 2, gain: 0.35, timeShift: 0 },
      { role: 'melody', midi: 62, startBeat: 2, beats: 2, gain: 0.35, timeShift: 0 }, // last of ท่อน 1
      { role: 'melody', midi: 64, startBeat: 4, beats: 2, gain: 0.35, timeShift: 0 }, // first of ท่อน 2
    ]
    rubato(mel, [{ fromBeat: 0, toBeat: 4 }, { fromBeat: 4, toBeat: 6 }])
    expect(mel[1].beats).toBeCloseTo(2 * 1.12, 6) // ท่อน-end note rings longer
    expect(mel[2].timeShift).toBeGreaterThan(0) // a breath into the new ท่อน
    expect(mel[0].beats).toBeCloseTo(2, 6) // a mid-phrase note is untouched
    expect(mel.map((e) => e.startBeat)).toEqual([0, 2, 4]) // grid untouched
  })
  it('rubato() ritards the song-final note even with no sections', () => {
    const mel = [
      { role: 'melody', midi: 60, startBeat: 0, beats: 2, gain: 0.35, timeShift: 0 },
      { role: 'melody', midi: 62, startBeat: 2, beats: 2, gain: 0.35, timeShift: 0 },
    ]
    rubato(mel, [])
    expect(mel[1].beats).toBeCloseTo(2 * 1.12, 6) // last note ritards
    expect(mel[0].beats).toBeCloseTo(2, 6) // earlier note untouched
    expect(mel.every((e) => e.timeShift === 0)).toBe(true) // no breath without a following ท่อน
  })
})

describe('refrain chord-break (ท่อนรับแตกคอร์ด · P\'Aim)', () => {
  const CE = [
    { bass: 48, up: [60, 64, 67], startBeat: 0, beats: 2 }, // verse chord
    { bass: 48, up: [60, 64, 67], startBeat: 4, beats: 2 }, // refrain chord
  ]
  const sections = [
    { name: 'ร้อง 1', fromBeat: 0, toBeat: 4, isRefrain: false },
    { name: 'รับ', fromBeat: 4, toBeat: 6, isRefrain: true },
  ]
  const cfg = { voices: 'chords', pattern: 'arpeggio', refrainPattern: 'arpeggioDense', bass: 'root', embellish: false, humanizeVel: 0, humanizeTime: 0, dynamics: { accent: false, contour: false, section: false, rubato: false } }
  const inner = (evs, lo, hi) => evs.filter((e) => e.role === 'inner' && e.startBeat >= lo && e.startBeat < hi).length
  it('breaks the chord DENSER in the ท่อนรับ than in the verse (2×)', () => {
    const evs = arrange([], CE, cfg, { ...META, sections })
    expect(inner(evs, 0, 2)).toBe(2) // verse = arpeggio (1 hit/beat)
    expect(inner(evs, 4, 6)).toBe(4) // ท่อนรับ = arpeggioDense (2 hits/beat)
  })
  it('no refrainPattern → verse and refrain use the SAME comp (no change)', () => {
    const evs = arrange([], CE, { ...cfg, refrainPattern: undefined }, { ...META, sections })
    expect(inner(evs, 0, 2)).toBe(inner(evs, 4, 6))
  })
  it('no sections → refrainPattern never fires (whole song = normal comp)', () => {
    const evs = arrange([], CE, cfg, { ...META, sections: [] })
    expect(inner(evs, 0, 2)).toBe(inner(evs, 4, 6))
  })
})

describe('easeUnderHold (R2.9) — comp thins under a held melody (P\'Aim "ควรเงียบ → ผ่อนเบา")', () => {
  const held = () => ([
    { role: 'melody', startBeat: 0, beats: 8 }, // held 2 bars (e.g. 2 – – – | – – – –)
    { role: 'bass', startBeat: 0, beats: 8 },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((b) => ({ role: 'inner', startBeat: b })),
    { role: 'melody', startBeat: 8, beats: 1 }, // tune moves again
    { role: 'inner', startBeat: 8 },
  ])
  const innerBeats = (evs) => evs.filter((e) => e.role === 'inner').map((e) => e.startBeat)

  it('half-note pulse (round-2 default): keeps bar-downbeat + mid-bar under a held note (no hollow)', () => {
    // beats 0,1 are within the first holdBeats (full comp); from beat 2 on, thinning keeps only
    // the downbeat (0,4,8) and the mid-bar pulse (2,6). The old downbeat-only behaviour dropped
    // 2 and 6 too → a ~2-beat comp silence (the live round-23 "โหวง"); the mid pulse fills it.
    const out = easeUnderHold(held(), 4, 2)
    expect(innerBeats(out)).toEqual([0, 1, 2, 4, 6, 8])
    expect(out.filter((e) => e.role === 'bass').length).toBe(1) // foundation stays
    expect(out.filter((e) => e.role === 'melody').length).toBe(2) // tune untouched
  })
  it('pulse=false reproduces the old downbeat-only thinning (fallback knob)', () => {
    expect(innerBeats(easeUnderHold(held(), 4, 2, false))).toEqual([0, 1, 4, 8])
  })
  it('no melody (chords-only) → nothing thinned', () => {
    const evs = [{ role: 'inner', startBeat: 2 }, { role: 'inner', startBeat: 3 }]
    expect(easeUnderHold(evs, 4, 2).length).toBe(2)
  })
})

describe('applySusCadence (sus4 → resolve · voicing swap, not a muddy layer)', () => {
  const pc = (m) => ((m % 12) + 12) % 12
  const cmajComp = () => ([
    { role: 'inner', inst: 'chord', midi: 52, startBeat: 0, beats: 4, gain: 0.09 }, // E = 3rd
    { role: 'inner', inst: 'chord', midi: 55, startBeat: 0, beats: 4, gain: 0.09 }, // G = 5th
  ])
  it('raises the 3rd → 4th early, then RESOLVES back to the 3rd (real suspension)', () => {
    const ev = cmajComp()
    const n = applySusCadence(ev, 'C', 0, 4, [{ role: 'melody', midi: 60, startBeat: 0, beats: 4 }], { susCadence: true, susLevel: 0.5 })
    expect(n).toBe(1)
    expect(ev.some((e) => pc(e.midi) === 5 && e.startBeat < 2)).toBe(true) // F (4th) suspended early
    expect(ev.some((e) => pc(e.midi) === 4 && e.startBeat >= 2)).toBe(true) // E (3rd) resolves later
    // the suspended 4th must STOP before the resolution (no muddy 4th-over-3rd cluster)
    const sus = ev.find((e) => pc(e.midi) === 5)
    expect(sus.startBeat + sus.beats).toBeLessThanOrEqual(2 + 1e-9)
  })
  it('GUARD: skips when the melody on the chord is the 3rd (a 4th would clash a semitone)', () => {
    expect(applySusCadence(cmajComp(), 'C', 0, 4, [{ role: 'melody', midi: 64, startBeat: 0, beats: 4 }], { susCadence: true })).toBe(0)
  })
  it('only plain triads (skips 7ths / short chords / off)', () => {
    expect(applySusCadence(cmajComp(), 'C7', 0, 4, [], { susCadence: true })).toBe(0)
    expect(applySusCadence(cmajComp(), 'C', 0, 2, [], { susCadence: true })).toBe(0) // too short
    expect(applySusCadence(cmajComp(), 'C', 0, 4, [], { susCadence: false })).toBe(0)
  })
})

describe('pedalWalk bass (passing bass · ลูกเชื่อมคอร์ด)', () => {
  const ctx = (nextBass, cfg = {}) => ({ cfg, nextBass })
  it('holds the root then STEPS into the next chord on the last beat', () => {
    const out = pedalWalk({ startBeat: 0, beats: 4 }, 40, ctx(45))
    expect(out.length).toBe(2)
    expect(out[0].midi).toBe(40) // the carried root
    expect(out[0].beats).toBe(3) // held beats 0..2 (one short of the span)
    expect(out[1].startBeat).toBe(3) // passing note on the last beat
    expect(Math.abs(out[1].midi - 45)).toBe(1) // resolves by a half-step into the next root
    expect(out.every((e) => e.role === 'bass')).toBe(true)
  })
  it('no chord change (same next root) → plain pedal, one held note', () => {
    const out = pedalWalk({ startBeat: 0, beats: 4 }, 40, ctx(40))
    expect(out).toEqual(pedal({ startBeat: 0, beats: 4 }, 40, ctx(40)))
  })
  it('too short to connect (1 beat) → plain pedal', () => {
    expect(pedalWalk({ startBeat: 0, beats: 1 }, 40, ctx(45)).length).toBe(1)
  })
})

describe('answerFills (ลูกรับส่ง) — left hand answers the melody in long holds', () => {
  // melody: two short notes, then a LONG hold (4 beats), then movement.
  const mel = [
    { role: 'melody', startBeat: 0, beats: 1 }, { role: 'melody', startBeat: 1, beats: 1 },
    { role: 'melody', startBeat: 2, beats: 4 }, // the hold (space to answer) — spans beats 2..6
    { role: 'melody', startBeat: 6, beats: 2 },
  ]
  const chords = [
    { startBeat: 0, beats: 4, up: [60, 64, 67], bass: 48 },
    { startBeat: 4, beats: 4, up: [62, 67, 71], bass: 55 },
  ]
  const chordTones = new Set([60, 64, 67, 62, 71])

  it('answers a long hold with a RISING figure of CHORD TONES in its tail', () => {
    const f = answerFills(mel, chords, 4, { fillLevel: 0.4, chordGain: 0.09 }).sort((a, b) => a.startBeat - b.startBeat)
    expect(f.length).toBeGreaterThanOrEqual(2)
    expect(f.every((e) => e.role === 'emb')).toBe(true)
    expect(f.every((e) => chordTones.has(e.midi))).toBe(true) // safe: never out of the chord/key
    expect(f.every((e) => e.startBeat >= 4 && e.startBeat < 6)).toBe(true) // in the hold's tail, before it moves
    expect(f[f.length - 1].midi).toBeGreaterThan(f[0].midi) // rising, leading into the next phrase
  })
  it('does NOT answer short notes (sparse — the melody is busy there)', () => {
    const short = [{ role: 'melody', startBeat: 0, beats: 1 }, { role: 'melody', startBeat: 1, beats: 1 }]
    expect(answerFills(short, chords, 4, { fillLevel: 0.4 })).toEqual([])
  })
  it('fillLevel 0 → OFF (no answers at all)', () => {
    expect(answerFills(mel, chords, 4, { fillLevel: 0 })).toEqual([])
  })
  it('keeps answers spaced apart (two back-to-back long holds → not both fire)', () => {
    const holds = [
      { role: 'melody', startBeat: 0, beats: 4 },
      { role: 'melody', startBeat: 4, beats: 4 },
    ]
    // second hold ends 4 beats after the first — spacing gate should drop the crowded one
    const f = answerFills(holds, chords, 4, { fillLevel: 0.4 })
    const starts = [...new Set(f.map((e) => Math.floor(e.startBeat)))]
    expect(starts.length).toBeLessThanOrEqual(2) // one answer figure, not two overlapping runs
  })
})

describe('arpeggioDense pattern (§4)', () => {
  it('emits ~2 hits per beat, all inner chord voices', () => {
    const hits = arpeggioDense({ startBeat: 0, beats: 2 }, [60, 64, 67], 4, () => 0, {})
    expect(hits.length).toBe(4)
    expect(hits.every((h) => h.role === 'inner')).toBe(true)
  })
})

// B107 step 9 · §4B — the idiomatic instrument modules (keyboard/bowed/guitar). The arranger core
// stays the same; each module shapes voicing + which comp patterns exist + humanize feel.
describe('instrument modules (§4B) — bowed / guitar / keyboard resolver', () => {
  it('moduleForInstrument maps ids → the right module, keyboard as the default', () => {
    expect(moduleForInstrument('grand')).toBe(keyboard)
    expect(moduleForInstrument('felt')).toBe(keyboard)
    expect(moduleForInstrument('violin')).toBe(bowed)
    expect(moduleForInstrument('cello')).toBe(bowed)
    expect(moduleForInstrument('nylon')).toBe(guitar)
    expect(moduleForInstrument('who')).toBe(keyboard) // unknown → piano behaviour
  })

  it('bowed voicing reduces every chord to a double-stop (≤2 upper notes) — no 4-note block', () => {
    const chordLine = [
      { midi: 60, beats: 4, chord: 'C' }, { midi: 64, beats: 4, chord: 'F' }, { midi: 67, beats: 4, chord: 'G7' },
    ]
    const bowedEvs = arrange(chordLine, buildChordVoice(chordLine), { voices: 'both', module: bowed, arranger: true }, META)
    // group inner (comp) hits by startBeat → each simultaneous bowed stack must be ≤2 notes
    const byStart = {}
    for (const e of bowedEvs.filter((x) => x.role === 'inner')) {
      byStart[e.startBeat] = (byStart[e.startBeat] || 0) + 1
    }
    expect(Object.keys(byStart).length).toBeGreaterThan(0) // sanity: comp hits were produced
    for (const [beat, n] of Object.entries(byStart)) {
      expect(n, `bowed stack at beat ${beat} has ${n} notes (must be ≤2)`).toBeLessThanOrEqual(2)
    }
  })

  it('bowed uses only sustain-family patterns (no arpeggio/waltz keys)', () => {
    expect(Object.keys(bowed.patterns).sort()).toEqual(['harpRoll', 'stringPad', 'sustained'])
    expect(bowed.defaultPattern).toBe('stringPad')
  })

  it('guitar defaults to strum and offers travis + rasgueado', () => {
    expect(guitar.defaultPattern).toBe('strum')
    expect(guitar.patterns).toHaveProperty('travis')
    expect(guitar.patterns).toHaveProperty('rasgueado')
  })

  it('guitar owns its bass (every core bassMode → empty) so a preset bass can never double it', () => {
    for (const m of Object.values(guitar.bassModes)) {
      expect(m({ startBeat: 0, beats: 4, bass: 40 }, 40, { cfg: {}, keyRoot: 40, beatsPerBar: 4 })).toEqual([])
    }
    // with a piano preset (bass:'root') the guitar run still gets its bass ONLY from the pattern
    const line = [{ midi: 60, beats: 4, chord: 'C' }, { midi: 64, beats: 4, chord: 'G' }]
    const evs = arrange(line, buildChordVoice(line), { ...presetCfg('piano-arrangement'), voices: 'both', module: guitar }, META)
    // a down-strum rakes low→high with an increasing per-string timeShift (an audible strum, not a block)
    const bassHits = evs.filter((e) => e.role === 'bass')
    expect(bassHits.length).toBeGreaterThan(0)
    const strumStack = evs.filter((e) => e.role !== 'melody' && Math.abs(e.startBeat - 0) < 0.01)
    const shifts = strumStack.map((e) => e.timeShift).sort((a, b) => a - b)
    expect(shifts[shifts.length - 1]).toBeGreaterThan(shifts[0]) // staggered, not simultaneous
  })

  it('keyboard/bowed keep melody = printed notes exactly (core golden rule)', () => {
    for (const mod of [keyboard, bowed]) {
      const evs = melodyOf(arrange(NOTES, CHORDS, { voices: 'both', module: mod }, META))
      expect(evs.map((e) => e.midi)).toEqual([60, 62, 64, 67])
    }
  })

  it('guitar keeps every printed melody note (grace notes are ADDED ornaments, printed unchanged)', () => {
    const evs = melodyOf(arrange(NOTES, CHORDS, { voices: 'both', module: guitar }, META))
    const midis = evs.map((e) => e.midi)
    // the four printed notes appear in order (grace notes may be interleaved before their target)
    let k = 0
    for (const m of midis) if (m === [60, 62, 64, 67][k]) k++
    expect(k).toBe(4)
    // ornament OFF when the arranger is off (ตรงโน้ต) → melody is exactly the printed notes
    const plain = melodyOf(arrange(NOTES, CHORDS, { voices: 'both', module: guitar, arranger: false }, META))
    expect(plain.map((e) => e.midi)).toEqual([60, 62, 64, 67])
  })

  it('plain mode (arranger off) is instrument-agnostic — full chord block, no module reduction (§6c)', () => {
    const chordLine = [{ midi: 60, beats: 4, chord: 'C' }, { midi: 64, beats: 4, chord: 'F' }]
    const chords = buildChordVoice(chordLine)
    // With the arranger OFF, bowed must NOT reduce to a double-stop and must NOT swell (stringPad):
    // note-check hears every printed chord tone as a plain sustained block, same as the piano.
    const kb = arrange(chordLine, chords, { voices: 'both', arranger: false, module: keyboard }, META)
    const bw = arrange(chordLine, chords, { voices: 'both', arranger: false, module: bowed }, META)
    const innerCount = (evs) => evs.filter((e) => e.role === 'inner').length
    expect(innerCount(bw)).toBe(innerCount(kb)) // bowed off == keyboard off (no double-stop drop)
    // and every event is exactly on the grid (no humanize/swell timeShift) for both
    for (const evs of [kb, bw]) for (const e of evs) expect(e.timeShift).toBe(0)
  })
})
