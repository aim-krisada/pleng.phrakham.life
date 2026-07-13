// B107 — the pure, headless-provable pieces of the real-instrument sampler. The actual
// sample loading/playback is verified by ear in a real browser (it needs AudioContext +
// network); here we lock the gain→velocity balance and the instrument registry so the
// melody-vs-chord loudness and the synth-fallback rule can't silently drift.
import { describe, it, expect } from 'vitest'
import { gainToVelocity, gainToVelocityFull, isSampledInstrument, SAMPLE_HOSTS, SAMPLED_INSTRUMENTS, GRAND_LAYER, FIRED_GAINS } from './sampler.js'

describe('gainToVelocity — every fired note lands in the LOADED velocity layer (else: silence)', () => {
  // The regression that shipped P1 mute: smplr plays SILENCE when the fired velocity is outside
  // the loaded layer (it does not fall back across layers). So the hard invariant is that every
  // gain we actually fire maps to a velocity INSIDE GRAND_LAYER — not just "some math".
  it('all of playSong\'s fired gains map inside the loaded layer [lo,hi]', () => {
    for (const [role, gain] of Object.entries(FIRED_GAINS)) {
      const v = gainToVelocity(gain)
      expect(v, `${role} gain ${gain} → vel ${v} must be within the loaded layer`).toBeGreaterThanOrEqual(GRAND_LAYER[0])
      expect(v, `${role} gain ${gain} → vel ${v} must be within the loaded layer`).toBeLessThanOrEqual(GRAND_LAYER[1])
    }
  })
  it('clamps ANY gain (incl. out-of-range) to inside the loaded layer', () => {
    for (const g of [0, 0.001, 0.5, 1, 5, -1]) {
      const v = gainToVelocity(g)
      expect(v).toBeGreaterThanOrEqual(GRAND_LAYER[0])
      expect(v).toBeLessThanOrEqual(GRAND_LAYER[1])
    }
  })
  it('keeps the pad under the melody: chord velocity < melody velocity', () => {
    expect(gainToVelocity(FIRED_GAINS.chordInner)).toBeLessThan(gainToVelocity(FIRED_GAINS.melody))
    expect(gainToVelocity(FIRED_GAINS.chordBass)).toBeLessThan(gainToVelocity(FIRED_GAINS.melody))
  })
  it('is monotonic: louder gain → louder (or equal) velocity', () => {
    let prev = -1
    for (const g of [0.02, 0.055, 0.08, 0.2, 0.35, 0.5]) {
      const v = gainToVelocity(g)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})

describe('gainToVelocityFull — the non-layered (Soundfont/Sampler) velocity map', () => {
  // These instruments have ONE sample per note (no velocity layer to fall out of), so the map
  // spreads the gain window across a fuller velocity band. It still must be monotonic (louder gain
  // → louder velocity) so the melody stays over the chord, and stay a legal MIDI velocity [1,127].
  it('keeps every fired gain a legal MIDI velocity in [1,127]', () => {
    for (const g of [0, 0.001, 0.055, 0.08, 0.35, 0.5, 1, 5, -1]) {
      const v = gainToVelocityFull(g)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(127)
    }
  })
  it('is monotonic and keeps the pad under the melody', () => {
    let prev = -1
    for (const g of [0.02, 0.055, 0.08, 0.2, 0.35, 0.5]) {
      const v = gainToVelocityFull(g)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
    expect(gainToVelocityFull(FIRED_GAINS.chordInner)).toBeLessThan(gainToVelocityFull(FIRED_GAINS.melody))
    expect(gainToVelocityFull(FIRED_GAINS.chordBass)).toBeLessThan(gainToVelocityFull(FIRED_GAINS.melody))
  })
})

describe('isSampledInstrument — synth is always the instant default', () => {
  it('true for every real-sample instrument in the registry', () => {
    expect(isSampledInstrument('grand')).toBe(true)
    for (const name of ['grand', 'felt', 'nylon', 'violin', 'cello', 'steel', 'string']) {
      expect(isSampledInstrument(name), `${name} should be a sampled instrument`).toBe(true)
    }
    expect(isSampledInstrument('synth')).toBe(false)
    expect(isSampledInstrument(undefined)).toBe(false)
    expect(isSampledInstrument('nope')).toBe(false)
  })
  it('SAMPLED_INSTRUMENTS lists the five solo voices the UI enables', () => {
    for (const name of ['grand', 'felt', 'nylon', 'violin', 'cello']) {
      expect(SAMPLED_INSTRUMENTS).toContain(name)
    }
  })
})

describe('SAMPLE_HOSTS — the one host knob, now same-origin (offline PWA)', () => {
  it('serves from the same-origin mirror /samples/ (no runtime CDN)', () => {
    expect(SAMPLE_HOSTS.base).toBe('/samples/')
    expect(SAMPLE_HOSTS).toHaveProperty('grand')
    expect(SAMPLE_HOSTS.grand.startsWith('/samples/')).toBe(true)
  })
})
