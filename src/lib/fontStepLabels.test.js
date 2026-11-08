import { describe, it, expect } from 'vitest'
import { fontStepLabels } from './fontStepLabels.js'

describe('ใบ#159 — Aa step-button labels follow the interface language', () => {
  it("'th' → ก− / ก+", () => {
    expect(fontStepLabels('th')).toEqual({ smaller: 'ก−', bigger: 'ก+' })
  })
  it("'en-US' → A− / A+", () => {
    expect(fontStepLabels('en-US')).toEqual({ smaller: 'A−', bigger: 'A+' })
  })
  it("'' (or missing) → Thai", () => {
    expect(fontStepLabels('')).toEqual({ smaller: 'ก−', bigger: 'ก+' })
    expect(fontStepLabels(undefined)).toEqual({ smaller: 'ก−', bigger: 'ก+' })
  })
  it('uses the real minus sign, never a hyphen', () => {
    expect(fontStepLabels('th').smaller).not.toContain('-')
    expect(fontStepLabels('en').smaller).not.toContain('-')
  })
})
