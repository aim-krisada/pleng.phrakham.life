// ใบ v3/pleng#132 — the arithmetic that keeps one entered line on one printed row.
import { describe, it, expect } from 'vitest'
import { fitScale } from './fitLine.js'

// A line whose width scales exactly with the type size — the ideal case.
const linear = (naturalAtFullSize) => (scale) => naturalAtFullSize * scale

// The real case: a glyph's advance is rounded to whole pixels, so shrinking the type gives back
// a little less width than the ratio promised. `grain` is how coarse that rounding is.
const rounded = (naturalAtFullSize, grain = 1) => (scale) => {
  const ideal = naturalAtFullSize * scale
  return Math.ceil(ideal / grain) * grain + grain // always a touch wider than asked for
}

describe('ใบ#132 — fitScale', () => {
  it('leaves a line that already fits completely alone', () => {
    expect(fitScale(673, linear(600))).toBe(1)
    expect(fitScale(673, linear(671))).toBe(1)
  })

  it('aims a pixel inside the margin — a flex row wraps on an excess of a hundredth', () => {
    // exactly the margin is NOT good enough: 463.1 against 463 dropped a bar onto its own row
    expect(fitScale(673, linear(673))).toBeLessThan(1)
    expect(fitScale(673, linear(672))).toBe(1)
    const scale = fitScale(673, linear(673.4))
    expect(673.4 * scale).toBeLessThanOrEqual(672)
  })

  it('shrinks an overflowing line to the page, in one step when width scales cleanly', () => {
    const scale = fitScale(673, linear(740))
    expect(scale).toBeCloseTo(672 / 740, 6)
    expect(740 * scale).toBeLessThanOrEqual(672)
  })

  it('keeps going when the first ratio is not enough — which is the real behaviour of text', () => {
    const measure = rounded(740, 4)
    let last = 0
    const scale = fitScale(673, (s) => (last = measure(s)))
    expect(scale).toBeLessThan(1)
    // the line it finally measured fits the page
    expect(measure(scale)).toBeLessThanOrEqual(672 + 4) // within one rounding grain
    expect(last).toBeGreaterThan(0)
  })

  it('never shrinks further than it has to — a 1% overflow is not a 50% cut', () => {
    const scale = fitScale(673, linear(680))
    expect(scale).toBeGreaterThan(0.95)
  })

  it('stops instead of spinning when a measurement refuses to move', () => {
    let calls = 0
    const stuck = () => {
      calls++
      return 900 // the same width whatever the scale
    }
    const scale = fitScale(673, stuck)
    expect(calls).toBeLessThanOrEqual(3)
    expect(scale).toBeLessThan(1)
  })

  it('gives up safely on a line that cannot be measured — hidden, or no layout yet', () => {
    expect(fitScale(673, () => 0)).toBe(1)
    expect(fitScale(0, linear(900))).toBe(1) // no page width known
    expect(fitScale(673, null)).toBe(1)
  })

  it('a line measured at the fitted scale is what the caller must apply', () => {
    // three passes that never converge: the answer comes back un-measured, so the caller applies it
    const scale = fitScale(673, rounded(5000, 50))
    expect(scale).toBeLessThan(1)
    expect(Number.isFinite(scale)).toBe(true)
  })
})
