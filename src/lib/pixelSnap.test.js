// ใบ v3/pleng#99 — พี่เปา 2 ต.ค. 2569: at normal size the underline looked doubled ("ขีดซ้อน"), zoomed in it was
// straight. The digit's own border sits on whole device pixels; the beam bar / bridge sat at measured fractional
// positions and smeared over an extra half-lit row. Bars and bridges now share one snapped geometry.
import { describe, it, expect } from 'vitest'
import { snapPx, lineThickness, levelTop } from './pixelSnap.js'
import { segmentBeamLink } from './notation.js'

const DPRS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3]
const whole = (v, dpr) => Math.abs(v * dpr - Math.round(v * dpr)) < 1e-9

describe('ใบ#99 — one underline geometry on whole device pixels', () => {
  it('every level top and the thickness are whole device pixels, on every screen', () => {
    for (const dpr of DPRS) for (const base of [175.703125, 30, 12.34]) for (const lv of [1, 2, 3]) {
      expect(whole(levelTop(base, lv, dpr), dpr)).toBe(true)
      expect(whole(lineThickness(dpr), dpr)).toBe(true)
    }
  })
  it('the thickness rounds DOWN like the browser draws the 1.5px border: 1px at 1×, 2px at 1.5×, 3px at 2×', () => {
    expect(lineThickness(1) * 1).toBe(1)
    expect(lineThickness(1.25) * 1.25).toBe(1)
    expect(lineThickness(1.5) * 1.5).toBe(2)
    expect(lineThickness(2) * 2).toBe(3)
  })
  it('two levels never touch: at least one empty device-pixel row between them', () => {
    for (const dpr of DPRS) for (const base of [175.703125, 30.5, 99.99]) {
      const gap = (levelTop(base, 2, dpr) - levelTop(base, 1, dpr) - lineThickness(dpr)) * dpr
      expect(gap).toBeGreaterThanOrEqual(1 - 1e-9)
    }
  })
  it('snapPx moves to the NEAREST device pixel', () => {
    expect(snapPx(10.3, 1)).toBe(10)
    expect(snapPx(10.6, 1)).toBe(11)
    expect(snapPx(10.3, 2)).toBe(10.5)
  })
})

describe('ใบ#99 — the cross-segment bridge knows when to stand in for a digit underline', () => {
  it('lone eighths at both ends → the bridge covers both digits (no border meets it a pixel row off)', () => {
    const l = segmentBeamLink({ note: '3 3_', syllables: ['ก', 'ข'] }, { note: '2_ 3', syllables: ['', 'ค'] }, true)
    expect(l).toMatchObject({ levels: 1, fromBeamed: false, toBeamed: false, fromLevels: 1, toLevels: 1 })
  })
  it('an end digit already under a beam bar of its own row → the bridge stops at its edge', () => {
    const l = segmentBeamLink({ note: '1_ 2_', syllables: ['ก', ''] }, { note: '3_', syllables: [''] }, true)
    expect(l).toMatchObject({ fromBeamed: true, toBeamed: false })
  })
})
