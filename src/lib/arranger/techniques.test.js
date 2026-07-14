// ROUND 2 — the "ปรับละเอียด" technique menu SSOT: overrides merge onto the preset, and each
// technique reads/writes the right cfg field so the menu and the engine never drift.
import { describe, it, expect } from 'vitest'
import { TECHNIQUES, buildArrangeCfg, readTechniques } from './techniques.js'
import { presetCfg } from './presets.js'

const base = () => presetCfg('piano-arrangement')

describe('buildArrangeCfg — overrides overlay the preset, never mutate it', () => {
  it('no overrides → equals the preset defaults (fills/pattern/sus unchanged)', () => {
    const p = base()
    const cfg = buildArrangeCfg(p, {})
    expect(cfg.pattern).toBe(p.pattern)
    expect(cfg.fills).toBe(p.fills)
    expect(cfg.susCadence).toBe(p.susCadence)
  })
  it('does not mutate the preset object', () => {
    const p = base()
    const before = JSON.stringify(p)
    buildArrangeCfg(p, { pattern: 'sustained', accent: false, sparkle: false })
    expect(JSON.stringify(p)).toBe(before)
  })
  it('applies each override to the right cfg field', () => {
    const cfg = buildArrangeCfg(base(), {
      pattern: 'arpeggio', bass: 'root', fills: 0, sus: false,
      sparkle: false, gapFill: false, accent: false, contour: false,
      rubato: false, holdPulse: false, easeUnderHold: false, humanize: false,
    })
    expect(cfg.pattern).toBe('arpeggio')
    expect(cfg.bass).toBe('root')
    expect(cfg.fills).toBe(false) // slider 0 → off
    expect(cfg.susCadence).toBe(false)
    expect(cfg.embellish).not.toContain('sparkle')
    expect(cfg.embellish).not.toContain('gapFill')
    expect(cfg.dynamics.accent).toBe(false)
    expect(cfg.dynamics.contour).toBe(false)
    expect(cfg.dynamics.rubato).toBe(false)
    expect(cfg.holdPulse).toBe(false)
    expect(cfg.easeUnderHold).toBe(false)
    expect(cfg.humanize).toBe(false)
  })
  it('fills slider value round-trips (60 → fills on, fillLevel 0.6)', () => {
    const cfg = buildArrangeCfg(base(), { fills: 60 })
    expect(cfg.fills).toBe(true)
    expect(cfg.fillLevel).toBeCloseTo(0.6)
  })
})

describe('readTechniques — the menu shows the effective state', () => {
  it('returns one row per technique with a value', () => {
    const rows = readTechniques(base(), {})
    expect(rows.length).toBe(TECHNIQUES.length)
    expect(rows.every((r) => r.value !== undefined && r.label && r.type)).toBe(true)
  })
  it('reflects an override in the displayed value', () => {
    const rows = readTechniques(base(), { accent: false, pattern: 'sustained' })
    expect(rows.find((r) => r.key === 'accent').value).toBe(false)
    expect(rows.find((r) => r.key === 'pattern').value).toBe('sustained')
  })
})
