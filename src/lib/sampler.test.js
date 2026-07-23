// B107 — the pure, headless-provable pieces of the real-instrument sampler. The actual
// sample loading/playback is verified by ear in a real browser (it needs AudioContext +
// network); here we lock the gain→velocity balance and the instrument registry so the
// melody-vs-chord loudness and the synth-fallback rule can't silently drift.
import { describe, it, expect } from 'vitest'
import { gainToVelocity, gainToVelocityFull, isSampledInstrument, SAMPLE_HOSTS, SAMPLED_INSTRUMENTS, GRAND_LAYER, GRAND_VELOCITY_LAYERS, velocityInLoadedLayer, FIRED_GAINS } from './sampler.js'

describe('GRAND velocity layers — the five loaded layers tile [1,127] with NO gap (mute-proof)', () => {
  // Audio R2 STEP 0 loads ALL five layers. The mute bug (smplr plays SILENCE for a velocity outside
  // every loaded layer) is only impossible if the loaded layers cover 1..127 CONTIGUOUSLY. Lock that.
  it('covers 1..127 with no gap and no overlap between adjacent layers', () => {
    const sorted = [...GRAND_VELOCITY_LAYERS].sort((a, b) => a.range[0] - b.range[0])
    expect(sorted[0].range[0]).toBe(1)
    expect(sorted[sorted.length - 1].range[1]).toBe(127)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].range[0], `${sorted[i].name} must start right after ${sorted[i - 1].name}`).toBe(sorted[i - 1].range[1] + 1)
    }
  })
  it('velocityInLoadedLayer is true for EVERY MIDI velocity 1..127', () => {
    for (let v = 1; v <= 127; v++) expect(velocityInLoadedLayer(v), `vel ${v} must be in a loaded layer`).toBe(true)
  })
  it('GRAND_LAYER is the full loaded coverage [1,127]', () => {
    expect(GRAND_LAYER).toEqual([1, 127])
  })
})

describe('gainToVelocity — every fired note lands in a LOADED velocity layer (else: silence)', () => {
  // The regression that shipped P1 mute: smplr plays SILENCE when the fired velocity is outside
  // every loaded layer. The hard invariant: every gain we actually fire maps to a velocity that
  // velocityInLoadedLayer() accepts — not just "some math".
  it('all of playSong\'s fired gains map to a velocity inside a loaded layer', () => {
    for (const [role, gain] of Object.entries(FIRED_GAINS)) {
      const v = gainToVelocity(gain)
      expect(velocityInLoadedLayer(v), `${role} gain ${gain} → vel ${v} must be in a loaded layer`).toBe(true)
    }
  })
  it('maps ANY gain (incl. out-of-range) to a velocity in a loaded layer', () => {
    for (const g of [0, 0.001, 0.5, 1, 5, -1, NaN, undefined]) {
      const v = gainToVelocity(g)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(127)
      expect(velocityInLoadedLayer(v), `gain ${g} → vel ${v}`).toBe(true)
    }
  })
  it('the soft comp drops into PPP (softer than the old PP floor 41) — the left hand can get quiet', () => {
    // The whole point of STEP 0: comp is no longer jammed at the PP floor (vel 41).
    expect(gainToVelocity(FIRED_GAINS.chordInner)).toBeLessThan(41)
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
  // Same-origin mirror, rooted at the DEPLOYMENT base — '/samples/' at the site root and
  // '/v2/samples/' for the side-by-side build, never a runtime CDN (docs/deploy-v2.md).
  const root = (import.meta.env.BASE_URL || '/').replace(/^\.\//, '/')
  it('serves from the same-origin mirror <base>samples/ (no runtime CDN)', () => {
    expect(SAMPLE_HOSTS.base).toBe(root + 'samples/')
    expect(SAMPLE_HOSTS).toHaveProperty('grand')
    expect(SAMPLE_HOSTS.grand.startsWith(root + 'samples/')).toBe(true)
  })
  it('is same-origin absolute (leading slash), never a bare relative path', () => {
    expect(SAMPLE_HOSTS.base.startsWith('/')).toBe(true)
  })
})
