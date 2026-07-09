// B027 — double-dot (`..`) augmentation: `.` = ×1.5, `..` = ×1.75 (jianpu "two dots = +¾").
// Covers the parse (dot count vs low-octave dots), beatCount bar math, and DOT_FACTOR.
import { describe, it, expect } from 'vitest'
import { parseNotes, beatCount, DOT_FACTOR } from './notation.js'

const note = (str) => parseNotes(str).find((t) => t.type === 'note')

describe('parseNotes — augmentation dots', () => {
  it('no dot → dots 0', () => {
    expect(note('5').dots).toBe(0)
  })
  it('single dot → dots 1', () => {
    expect(note('5.').dots).toBe(1)
  })
  it('double dot → dots 2', () => {
    expect(note('5..').dots).toBe(2)
  })
  it('double dot stacks on an eighth note (5_..)', () => {
    const t = note('5_..')
    expect(t.underlines).toBe(1)
    expect(t.dots).toBe(2)
  })
  it('double dot stacks on a high note (5\'..)', () => {
    const t = note("5'..")
    expect(t.high).toBe(1)
    expect(t.dots).toBe(2)
  })
  it('double dot stacks on a low eighth note (.5_..)', () => {
    const t = note('.5_..')
    expect(t.low).toBe(1)
    expect(t.underlines).toBe(1)
    expect(t.dots).toBe(2)
  })
  it('leading dots are low-octave, NOT augmentation (..5)', () => {
    const t = note('..5')
    expect(t.low).toBe(2)
    expect(t.dots).toBe(0)
  })
  it('three trailing dots → double dot + a stray unreadable dot', () => {
    const toks = parseNotes('5...')
    expect(toks[0]).toMatchObject({ type: 'note', pitch: '5', dots: 2 })
    expect(toks[1]).toMatchObject({ type: 'raw' })
  })
})

describe('parseNotes — backward compat with low-octave next note', () => {
  it('5.5 → plain 5 then low-octave 5 (single dot before a digit = next octave)', () => {
    const toks = parseNotes('5.5').filter((t) => t.type === 'note')
    expect(toks[0]).toMatchObject({ pitch: '5', dots: 0 })
    expect(toks[1]).toMatchObject({ pitch: '5', low: 1, dots: 0 })
  })
  it('5..5 → dotted 5 then low-octave 5 (unchanged legacy split)', () => {
    const toks = parseNotes('5..5').filter((t) => t.type === 'note')
    expect(toks[0]).toMatchObject({ pitch: '5', dots: 1 })
    expect(toks[1]).toMatchObject({ pitch: '5', low: 1, dots: 0 })
  })
})

describe('beatCount — dot durations', () => {
  it('DOT_FACTOR table', () => {
    expect(DOT_FACTOR).toEqual([1, 1.5, 1.75])
  })
  it('plain quarter = 1 beat', () => {
    expect(beatCount(parseNotes('5'))).toBe(1)
  })
  it('dotted = ×1.5', () => {
    expect(beatCount(parseNotes('5.'))).toBe(1.5)
  })
  it('double-dotted = ×1.75', () => {
    expect(beatCount(parseNotes('5..'))).toBe(1.75)
  })
  it('double-dotted eighth = 0.5 × 1.75 = 0.875', () => {
    expect(beatCount(parseNotes('5_..'))).toBe(0.875)
  })
  it('a full 4/4 bar with a double-dotted note counts to 4', () => {
    // 1.. (1.75) + 2_ (0.5) + 3_ (0.5) + 4 (1) + 0_ (0.25) → wrong; use clean fill:
    // 1.. (1.75) + 2_ (0.5) + 3 (1) + 4__ (0.25) + 5__ (0.25) + 6__ (0.25) = 4.0
    expect(beatCount(parseNotes('1.. 2_ 3 4__ 5__ 6__'))).toBe(4)
  })
})
