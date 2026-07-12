// B107 — the pure, headless-provable pieces of the real-instrument sampler. The actual
// sample loading/playback is verified by ear in a real browser (it needs AudioContext +
// network); here we lock the gain→velocity balance and the instrument registry so the
// melody-vs-chord loudness and the synth-fallback rule can't silently drift.
import { describe, it, expect } from 'vitest'
import { gainToVelocity, isSampledInstrument, SAMPLE_HOSTS, GRAND_LAYER, FIRED_GAINS } from './sampler.js'

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

describe('isSampledInstrument — synth is always the instant default', () => {
  it('true only for real-sample instruments', () => {
    expect(isSampledInstrument('grand')).toBe(true)
    expect(isSampledInstrument('synth')).toBe(false)
    expect(isSampledInstrument(undefined)).toBe(false)
    expect(isSampledInstrument('nope')).toBe(false)
  })
})

describe('SAMPLE_HOSTS — the one host-agnostic knob', () => {
  it('has a grand entry (P1); production mirrors samples by editing this object only', () => {
    expect(SAMPLE_HOSTS).toHaveProperty('grand')
  })
})
