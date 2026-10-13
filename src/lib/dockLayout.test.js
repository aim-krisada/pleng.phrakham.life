// ใบ v3/pleng#113 — the bar's row choice: one row only when the seek bar keeps ≥ 240px.
import { describe, it, expect } from 'vitest'
import { barLayout, oneRowMinWidth, SEEK_MIN, ONE_ROW_GAP } from './dockLayout.js'

// ฝึกร้อง at song 141: 10 buttons + 9 gaps, and the time label + gaps + padding beside the slider
const SING = { buttons: 568, seekFixed: 70 }

describe('barLayout', () => {
  it('the standard numbers: a 240px slider, 16px between it and the buttons', () => {
    expect(SEEK_MIN).toBe(240)
    expect(ONE_ROW_GAP).toBe(16)
  })

  it('one row exactly from the width where the slider gets 240px', () => {
    const min = oneRowMinWidth(SING)
    expect(min).toBe(568 + 16 + 240 + 70)
    expect(barLayout({ avail: min, hasSeek: true, ...SING })).toBe('one')
    expect(barLayout({ avail: min - 1, hasSeek: true, ...SING })).toBe('stack')
    expect(barLayout({ avail: 1184, hasSeek: true, ...SING })).toBe('one')
  })

  it('never shrinks the buttons: if they do not fit one line, two button rows (a phone)', () => {
    expect(barLayout({ avail: 359, hasSeek: true, ...SING })).toBe('stack2')
    expect(barLayout({ avail: 567, hasSeek: true, ...SING })).toBe('stack2')
    expect(barLayout({ avail: 568, hasSeek: true, ...SING })).toBe('stack')
  })

  it('a bar with no seek bar (แผ่นเพลง · แก้ไข) never becomes "one"', () => {
    expect(barLayout({ avail: 1184, buttons: 232, hasSeek: false })).toBe('stack')
    expect(barLayout({ avail: 200, buttons: 232, hasSeek: false })).toBe('stack2')
  })

  it('a longer time label or more buttons push the switch wider', () => {
    expect(oneRowMinWidth({ buttons: 568, seekFixed: 80 })).toBe(oneRowMinWidth(SING) + 10)
    expect(oneRowMinWidth({ buttons: 624, seekFixed: 70 })).toBe(oneRowMinWidth(SING) + 56)
  })

  it('not laid out yet (hidden page · test DOM) → no decision', () => {
    expect(barLayout({ avail: 0, hasSeek: true, ...SING })).toBe(null)
    expect(barLayout({ avail: NaN, hasSeek: true, ...SING })).toBe(null)
  })
})
