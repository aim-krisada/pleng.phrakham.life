// 717 — reading an arrangement entry's `set` robustly.
//
// The library is safe today only because the merge SQL happened to write `set` as an int. Any
// tool that stringifies its JSON (an import script, a hand-edited row, a SQL cast) writes "1",
// and a `===` against a number would match NO set — that row would vanish from EVERY tab,
// leaving a half-missing or empty sheet. That is a worse failure than the wrong-words case
// this feature exists to prevent, so the CODE has to be safe, not just the current data.
import { describe, it, expect } from 'vitest'
import { lyricSetIndex, inLyricSet } from './songModel.js'

describe('lyricSetIndex', () => {
  it('reads whole numbers as themselves', () => {
    expect(lyricSetIndex(0)).toBe(0)
    expect(lyricSetIndex(1)).toBe(1)
    expect(lyricSetIndex(12)).toBe(12)
  })

  it('reads a NUMERIC STRING as that number — the case the live data got lucky on', () => {
    expect(lyricSetIndex('0')).toBe(0)
    expect(lyricSetIndex('1')).toBe(1)
  })

  it('reads absent / blank / junk as SHARED (null), never as set 0', () => {
    // shared must stay distinguishable from "set 0", or a common refrain would silently
    // become set 0's private property and disappear from every other set.
    for (const v of [null, undefined, '', 'x', {}, [], NaN, 1.5, Infinity]) {
      expect(lyricSetIndex(v), String(v)).toBeNull()
    }
  })
})

describe('inLyricSet', () => {
  it('keeps an entry tagged with the active set', () => {
    expect(inLyricSet({ set: 1 }, 1)).toBe(true)
    expect(inLyricSet({ set: '1' }, 1)).toBe(true) // the regression this guards
  })

  it('drops an entry belonging to another set', () => {
    expect(inLyricSet({ set: 0 }, 1)).toBe(false)
    expect(inLyricSet({ set: '0' }, 1)).toBe(false)
  })

  it('keeps an untagged entry on EVERY set’s sheet (a shared refrain)', () => {
    for (const active of [0, 1, 2]) {
      expect(inLyricSet({}, active)).toBe(true)
      expect(inLyricSet({ set: null }, active)).toBe(true)
    }
  })

  it('a whole set written as strings still yields a complete sheet', () => {
    const arrangement = [
      { set: '0', label: 'ข้อ1' },
      { set: '0', label: 'รับ' },
      { set: '1', label: 'ข้อ1' },
      { label: 'ปิดท้าย' }, // shared
    ]
    expect(arrangement.filter((e) => inLyricSet(e, 0)).map((e) => e.label)).toEqual(['ข้อ1', 'รับ', 'ปิดท้าย'])
    expect(arrangement.filter((e) => inLyricSet(e, 1)).map((e) => e.label)).toEqual(['ข้อ1', 'ปิดท้าย'])
    // the old `(e.set ?? active) === active` would have returned ONLY the shared row for both
    expect(arrangement.filter((e) => (e.set ?? 0) === 0).map((e) => e.label)).toEqual(['ปิดท้าย'])
  })
})
