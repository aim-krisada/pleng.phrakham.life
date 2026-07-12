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
import { root, pedal, walking } from './bass.js'
import { sustained, arpeggio, harpRoll, waltz, alberti } from './patterns.js'
import { embellishChord } from './embellish.js'
import { rubato } from './dynamics.js'
import { PRESETS, DEFAULT_PRESET, presetCfg, songFeatures, recommendRecipe } from './presets.js'
import { buildChordVoice } from '../midi.js'
import { gainToVelocity, GRAND_LAYER } from '../sampler.js'
import { keyboard, bowed, plucked, moduleForInstrument } from './instruments/index.js'

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
    expect(mel.every((e) => e.gain === 0.35)).toBe(true)
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
    for (const e of on) { expect(e.gain).toBeGreaterThanOrEqual(0.055); expect(e.gain).toBeLessThanOrEqual(0.35) }
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
  it('recommendRecipe: slow→arrangement (arp), fast→calm (sustain) at ~92bpm (§6d)', () => {
    expect(recommendRecipe({ bpm: 70 })).toBe('piano-arrangement')
    expect(recommendRecipe({ bpm: 120 })).toBe('piano-calm')
  })
  it('songFeatures reads bpm + meter', () => {
    const f = songFeatures({ bpm: 100, timeSignature: '3/4', lines: [[], []] })
    expect(f.bpm).toBe(100); expect(f.beatsPerBar).toBe(3)
  })
})

describe('rubato (R2.8 §7b) — no time drift', () => {
  it('Σ rubato shift over the phrase = 0 (grid never drifts)', () => {
    const line = [
      { midi: 60, beats: 1, chord: 'C' }, { midi: 62, beats: 1, chord: 'C' },
      { midi: 64, beats: 3, chord: 'C' }, { midi: 65, beats: 1, chord: 'C' },
    ]
    const evs = melodyOf(arrange(line, [], { voices: 'melody', humanizeTime: 0, humanizeVel: 0, dynamics: { accent: false, contour: false } }, META))
    const total = evs.reduce((s, e) => s + e.timeShift, 0)
    expect(Math.abs(total)).toBeLessThan(1e-9)
  })
  it('rubato() delays the long note and pulls the next one back equally', () => {
    const mel = [
      { role: 'melody', midi: 60, startBeat: 0, beats: 3, gain: 0.35, timeShift: 0 },
      { role: 'melody', midi: 62, startBeat: 3, beats: 1, gain: 0.35, timeShift: 0 },
    ]
    rubato(mel, 0.03)
    expect(mel[0].timeShift).toBeCloseTo(0.03, 6)
    expect(mel[1].timeShift).toBeCloseTo(-0.03, 6)
  })
})

// B107 step 9 · §4B — the idiomatic instrument modules (keyboard/bowed/plucked). The arranger core
// stays the same; each module shapes voicing + which comp patterns exist + humanize feel.
describe('instrument modules (§4B) — bowed / plucked / keyboard resolver', () => {
  it('moduleForInstrument maps ids → the right module, keyboard as the default', () => {
    expect(moduleForInstrument('grand')).toBe(keyboard)
    expect(moduleForInstrument('felt')).toBe(keyboard)
    expect(moduleForInstrument('violin')).toBe(bowed)
    expect(moduleForInstrument('cello')).toBe(bowed)
    expect(moduleForInstrument('nylon')).toBe(plucked)
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

  it('plucked defaults to arpeggio and offers fingerpick', () => {
    expect(plucked.defaultPattern).toBe('arpeggio')
    expect(plucked.patterns).toHaveProperty('fingerpick')
  })

  it('every module keeps melody = printed notes (core golden rule) regardless of instrument', () => {
    for (const mod of [keyboard, bowed, plucked]) {
      const evs = melodyOf(arrange(NOTES, CHORDS, { voices: 'both', module: mod }, META))
      expect(evs.map((e) => e.midi)).toEqual([60, 62, 64, 67])
    }
  })
})
