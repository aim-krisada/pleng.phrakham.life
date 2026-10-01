// ใบ v3/pleng#97 — the fermata hold (𝄐) can be 0 = no extra hold: the note sounds exactly its written
// value. Some songs print 𝄐 only as a cue for the singers (พี่เปา 1 ต.ค. 2569); the floor used to be 0.5.
// The trap the ใบ warned about: 0 must stay 0 — never read as "not set" (→ default 2) nor pushed up to 0.5.
import { describe, it, expect } from 'vitest'
import { songToNotes } from './midi.js'
import { storedHold, HOLD_MIN, HOLD_DEFAULT } from './notation.js'
import { exportPlayNotes } from './audioExport.js'

const seg = (note, holds) => ({ type: 'segment', note, ...(holds ? { holds } : {}) })
const beatsOf = (content) => songToNotes(content).reduce((s, n) => s + n.beats, 0)
const beats = (note, holds) => beatsOf({ key: 'C', timeSignature: '4/4', lines: [[seg(note, holds)]] })

describe('ใบ#97 — storedHold keeps 0 apart from "not set"', () => {
  it('the floor is 0 and the default stays 2', () => {
    expect(HOLD_MIN).toBe(0)
    expect(HOLD_DEFAULT).toBe(2)
  })
  it('0 → 0 · missing → null · below 0 → 0 · 0.5 and up unchanged', () => {
    expect(storedHold({ holds: { 0: 0 } }, 0)).toBe(0)
    expect(storedHold({ holds: { 0: '0' } }, 0)).toBe(0)
    expect(storedHold({ holds: {} }, 0)).toBeNull()
    expect(storedHold({}, 0)).toBeNull()
    expect(storedHold(null, 0)).toBeNull()
    expect(storedHold({ holds: { 0: -1 } }, 0)).toBe(0)
    expect(storedHold({ holds: { 0: 0.5 } }, 0)).toBe(0.5)
    expect(storedHold({ holds: { 0: 3 } }, 0)).toBe(3)
  })
})

describe('ใบ#97 เสร็จเมื่อ 2 + 4 — what plays', () => {
  it('hold 0 → the fermata note lasts exactly its written value', () => {
    expect(beats('5^', { 0: 0 })).toBeCloseTo(1, 6) // a quarter, nothing added
    expect(beats('1^ -', { 0: 0 })).toBeCloseTo(2, 6) // digit + '-' = 2, nothing added
    expect(beats('5_^', { 0: 0 })).toBeCloseTo(0.5, 6)
  })
  it('a fresh 𝄐 with no stored value still gets the default 2', () => {
    expect(beats('5^')).toBeCloseTo(1 + 2, 6)
  })
  it('values from 0.5 up play exactly as before', () => {
    expect(beats('5^', { 0: 0.5 })).toBeCloseTo(1.5, 6)
    expect(beats('5^', { 0: 2 })).toBeCloseTo(3, 6)
    expect(beats('5^', { 0: 3.5 })).toBeCloseTo(4.5, 6)
  })
  it('the MP3 path (exportPlayNotes) plays the same 0 hold as live', () => {
    const content = {
      version: 2, key: 'C', timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [[seg('1 2 5^ 3', { 2: 0 })]] }],
      arrangement: [{ stanza: 'A', label: '', syllables: [] }],
    }
    const durs = exportPlayNotes(content).filter((n) => n.midi != null).map((n) => n.beats)
    expect(durs).toEqual([1, 1, 1, 1])
  })
})
