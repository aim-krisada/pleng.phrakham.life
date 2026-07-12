// B107 — the pure, headless-provable pieces of the real-instrument sampler. The actual
// sample loading/playback is verified by ear in a real browser (it needs AudioContext +
// network); here we lock the gain→velocity balance and the instrument registry so the
// melody-vs-chord loudness and the synth-fallback rule can't silently drift.
import { describe, it, expect } from 'vitest'
import { gainToVelocity, isSampledInstrument, SAMPLE_HOSTS } from './sampler.js'

describe('gainToVelocity — keeps the chord pad well under the melody', () => {
  it('maps a melody-level gain (0.35) high and a chord-level gain (0.055) low', () => {
    const mel = gainToVelocity(0.35)
    const chord = gainToVelocity(0.055)
    expect(mel).toBeGreaterThan(100) // melody sings out
    expect(chord).toBeLessThan(45) // pad stays soft
    expect(mel - chord).toBeGreaterThan(60) // a real dynamic gap, like the demo
  })
  it('clamps to the valid MIDI-velocity range for any input', () => {
    for (const g of [0, 0.001, 0.5, 1, 5, -1]) {
      const v = gainToVelocity(g)
      expect(v).toBeGreaterThanOrEqual(6)
      expect(v).toBeLessThanOrEqual(122)
    }
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
