// ใบ v3/pleng#135 — the volume rules every panel and the audio graph share (lib/volume.js).
import { describe, it, expect } from 'vitest'
import { VOL_DEFAULT, VOL_MAX, clampLevel, normalizeVolume, effectiveVolume, moveVolume, levelToGain } from './volume.js'

describe('ใบ#135 — volume levels are percents of today\'s sound', () => {
  it('100 is today, and the range is capped at both ends', () => {
    expect(levelToGain(100)).toBe(1)
    expect(levelToGain(150)).toBe(1.5)
    expect(clampLevel(999)).toBe(VOL_MAX)
    expect(clampLevel(-5)).toBe(0)
    expect(clampLevel('abc')).toBe(null)
  })
  it('a stored value that is not a volume counts as "not set"', () => {
    expect(normalizeVolume(null)).toBe(null)
    expect(normalizeVolume({ melody: 'x', chord: 100 })).toBe(null)
    expect(normalizeVolume({ melody: 120, chord: 80 })).toEqual({ melody: 120, chord: 80, linked: true })
    expect(normalizeVolume({ melody: 120, chord: 80, linked: false }).linked).toBe(false)
  })
})

describe('ใบ#135 — who wins', () => {
  const site = { melody: 150, chord: 120, linked: true }
  const mine = { melody: 90, chord: 60, linked: false }
  it('a listener who set their own always wins over the site default', () => {
    expect(effectiveVolume(mine, site)).toEqual(mine)
  })
  it('a listener who never set one follows the site default', () => {
    expect(effectiveVolume(null, site)).toEqual(site)
  })
  it('no site default saved (or no table yet) → today\'s sound', () => {
    expect(effectiveVolume(null, null)).toEqual(VOL_DEFAULT)
  })
})

describe('ใบ#135 — the link button keeps the ratio, not the difference', () => {
  it('linked: chords follow the melody in proportion', () => {
    expect(moveVolume({ melody: 100, chord: 50, linked: true }, 'melody', 150)).toEqual({ melody: 150, chord: 75, linked: true })
    expect(moveVolume({ melody: 100, chord: 50, linked: true }, 'chord', 25)).toEqual({ melody: 50, chord: 25, linked: true })
  })
  it('unlinked: only the slider that moved changes', () => {
    expect(moveVolume({ melody: 100, chord: 50, linked: false }, 'melody', 150)).toEqual({ melody: 150, chord: 50, linked: false })
  })
  it('linked at the top of the range: both stop together, the ratio still holds', () => {
    // chord would need 240 → both stop where chord reaches the cap
    expect(moveVolume({ melody: 100, chord: 120, linked: true }, 'melody', 200)).toEqual({ melody: 167, chord: 200, linked: true })
  })
  it('a slider at 0 has no ratio to keep', () => {
    expect(moveVolume({ melody: 100, chord: 0, linked: true }, 'melody', 150)).toEqual({ melody: 150, chord: 0, linked: true })
    expect(moveVolume({ melody: 0, chord: 80, linked: true }, 'melody', 40)).toEqual({ melody: 40, chord: 80, linked: true })
  })
})
