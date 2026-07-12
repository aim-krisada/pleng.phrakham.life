// @vitest-environment node
// B107 P2 — invariant tests for the arranger (step 0 seam + step 1 humanize). These assert the
// REAL contract, not just "it ran" (P1's silent-piano lesson): every fired gain lands in the
// loaded velocity layer, "ลูกเล่นปิด" leaves the melody exactly as printed, humanize is bounded
// and deterministic. Real-audio (peak/balance) is measured live via OfflineAudioContext (§7c).
import { describe, it, expect } from 'vitest'
import { arrange } from './index.js'
import { mulberry32, seedFor } from './rng.js'
import { buildChordVoice } from '../midi.js'
import { gainToVelocity, GRAND_LAYER } from '../sampler.js'

// A small song fragment: two chords, a rest in the middle, a long final note.
const NOTES = [
  { midi: 60, beats: 1, chord: 'C' },
  { midi: 62, beats: 1, chord: 'C' },
  { midi: null, beats: 1, chord: 'C' }, // rest — advances the clock, no melody event
  { midi: 64, beats: 2, chord: 'G' },
  { midi: 67, beats: 3, chord: 'G' },
]
const CHORDS = buildChordVoice(NOTES)
const META = { songId: 'song-1', pass: 0, timeSignature: '4/4' }

const melodyOf = (evs) => evs.filter((e) => e.role === 'melody')
const chordOf = (evs) => evs.filter((e) => e.role === 'bass' || e.role === 'inner')

describe('rng — seeded determinism', () => {
  it('mulberry32 is reproducible and in [0,1)', () => {
    const a = mulberry32(123)
    const b = mulberry32(123)
    for (let i = 0; i < 100; i++) {
      const x = a()
      expect(x).toBe(b())
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
  it('seedFor differs by song and by pass', () => {
    expect(seedFor('a', 0)).not.toBe(seedFor('b', 0))
    expect(seedFor('a', 0)).not.toBe(seedFor('a', 1))
    expect(seedFor('a', 0)).toBe(seedFor('a', 0))
  })
})

describe('arrange — structure (§7a)', () => {
  it('returns plain PerfEvents with the required fields', () => {
    const evs = arrange(NOTES, CHORDS, {}, META)
    expect(evs.length).toBeGreaterThan(0)
    for (const e of evs) {
      expect(typeof e.midi).toBe('number')
      expect(typeof e.startBeat).toBe('number')
      expect(typeof e.beats).toBe('number')
      expect(typeof e.gain).toBe('number')
      expect(typeof e.timeShift).toBe('number')
      expect(['melody', 'bass', 'inner', 'emb']).toContain(e.role)
    }
  })
  it('is a pure function — same input+seed → identical output', () => {
    expect(arrange(NOTES, CHORDS, {}, META)).toEqual(arrange(NOTES, CHORDS, {}, META))
  })
  it('melody events carry every printed note in order, at cumulative beats', () => {
    const mel = melodyOf(arrange(NOTES, CHORDS, { arranger: false }, META))
    expect(mel.map((e) => e.midi)).toEqual([60, 62, 64, 67])
    expect(mel.map((e) => e.startBeat)).toEqual([0, 1, 3, 5]) // rest at beat 2 leaves a gap
    expect(mel.map((e) => e.beats)).toEqual([1, 1, 2, 3])
  })
})

describe('arrange — voices modes (§7d regression)', () => {
  it("'melody' → only melody events", () => {
    const evs = arrange(NOTES, CHORDS, { voices: 'melody' }, META)
    expect(chordOf(evs).length).toBe(0)
    expect(melodyOf(evs).length).toBe(4)
  })
  it("'chords' → only chord events", () => {
    const evs = arrange(NOTES, CHORDS, { voices: 'chords' }, META)
    expect(melodyOf(evs).length).toBe(0)
    expect(chordOf(evs).length).toBeGreaterThan(0)
  })
  it("'both' → melody + chords", () => {
    const evs = arrange(NOTES, CHORDS, { voices: 'both' }, META)
    expect(melodyOf(evs).length).toBe(4)
    expect(chordOf(evs).length).toBeGreaterThan(0)
  })
})

describe('ลูกเล่นปิด — note-check mode is first-class (§6c)', () => {
  const evs = arrange(NOTES, CHORDS, { arranger: false, voices: 'both' }, META)
  it('melody plays exactly as printed — constant gain, timeShift 0, no embellishment', () => {
    const mel = melodyOf(evs)
    expect(mel.every((e) => e.timeShift === 0)).toBe(true)
    expect(new Set(mel.map((e) => e.gain)).size).toBe(1) // one constant gain
    expect(mel.every((e) => e.gain === 0.35)).toBe(true)
    expect(evs.some((e) => e.role === 'emb')).toBe(false)
  })
  it('every event has timeShift 0 (no humanize at all)', () => {
    expect(evs.every((e) => e.timeShift === 0)).toBe(true)
  })
  it('chord gains equal P1 (bass = inner×1.45)', () => {
    const bass = evs.find((e) => e.role === 'bass')
    const inner = evs.find((e) => e.role === 'inner')
    expect(inner.gain).toBeCloseTo(0.055, 6)
    expect(bass.gain).toBeCloseTo(0.055 * 1.45, 6)
  })
})

describe('velocity-in-layer — the P1 silent-piano invariant (§7b)', () => {
  it('EVERY fired gain maps to a velocity inside GRAND_LAYER, humanize on', () => {
    // sweep several passes so humanize explores its full ± range
    for (let pass = 0; pass < 25; pass++) {
      const evs = arrange(NOTES, CHORDS, { voices: 'both' }, { ...META, pass })
      for (const e of evs) {
        const v = gainToVelocity(e.gain)
        expect(v).toBeGreaterThanOrEqual(GRAND_LAYER[0])
        expect(v).toBeLessThanOrEqual(GRAND_LAYER[1])
      }
    }
  })
})

describe('humanize velocity (R2.4 §7b)', () => {
  it('nudges gain but keeps it clamped to the usable window', () => {
    const off = arrange(NOTES, CHORDS, { arranger: false, voices: 'both' }, META)
    const on = arrange(NOTES, CHORDS, { voices: 'both' }, META)
    // at least one melody gain moved off the flat 0.35 (humanize is doing something)
    const melGains = melodyOf(on).map((e) => e.gain)
    expect(melGains.some((g) => g !== 0.35)).toBe(true)
    // all gains stay within [chord floor, melody ceiling]
    for (const e of on) {
      expect(e.gain).toBeGreaterThanOrEqual(0.055)
      expect(e.gain).toBeLessThanOrEqual(0.35)
    }
    expect(off).not.toEqual(on)
  })
})

describe('humanize timing (R2.5 §7b)', () => {
  it('melody onset spread stays within ±sigma (12ms)', () => {
    const mel = melodyOf(arrange(NOTES, CHORDS, { voices: 'both' }, META))
    for (const e of mel) expect(Math.abs(e.timeShift)).toBeLessThanOrEqual(0.012 + 1e-9)
  })
  it('chord-stack spread is smaller than melody spread (still reads as one chord)', () => {
    const evs = arrange(NOTES, CHORDS, { voices: 'both' }, META)
    const melMax = Math.max(...melodyOf(evs).map((e) => Math.abs(e.timeShift)))
    const chMax = Math.max(...chordOf(evs).map((e) => Math.abs(e.timeShift)))
    expect(chMax).toBeLessThanOrEqual(0.012 * 0.35 + 1e-9)
    expect(chMax).toBeLessThan(melMax)
  })
  it('is deterministic per (song,pass) and differs across passes', () => {
    const a = arrange(NOTES, CHORDS, { voices: 'both' }, { ...META, pass: 0 })
    const a2 = arrange(NOTES, CHORDS, { voices: 'both' }, { ...META, pass: 0 })
    const b = arrange(NOTES, CHORDS, { voices: 'both' }, { ...META, pass: 1 })
    expect(a).toEqual(a2)
    expect(a.map((e) => e.timeShift)).not.toEqual(b.map((e) => e.timeShift))
  })
  it('humanize never reorders adjacent melody onsets', () => {
    const mel = melodyOf(arrange(NOTES, CHORDS, { voices: 'both' }, META))
    const spb = 60 / 92 // a typical tempo
    const onsets = mel.map((e) => e.startBeat * spb + e.timeShift)
    for (let i = 1; i < onsets.length; i++) expect(onsets[i]).toBeGreaterThan(onsets[i - 1])
  })
})
