// ใบ v3/pleng#99 — the underline must carry on to a เอื้อน note (no word of its own), across a beat
// (แบบ ข, เพลง ฟังเถิด: `3_` ฟาก at the end of beat 2 → `2_` with no word at the start of beat 3) and
// across two chord segments of one bar (แบบ ก, เพลง 424: `1_.` ใจ | `2__`). What must still break it:
// a note that starts a new word, a bar line, a '-' hold, a rest, a triplet. The arc rule of
// v3/pleng#48/#53 (slurBeamOnly) must not move.
import { describe, it, expect } from 'vitest'
import { beamGroups, segmentBeamLink, slurBeamOnly } from './notation.js'

const runs = (notes, syl, opts) => beamGroups(notes, syl, opts).beams.map((b) => [b.start, b.end])

describe('ใบ#99 แบบ ข — across a beat', () => {
  it('`1_. 3__ 2_` (ฟัง ฟาก –): 3__ ends beat 1, 2_ (no word) starts beat 2 → one underline', () => {
    expect(runs('1_. 3__ 2_', ['ฟัง', 'ฟาก', ''])).toEqual([[1, 2]])
  })
  it('a long เอื้อน keeps going beat after beat', () => {
    expect(runs('1_ 2_ 3_ 4_ 5_', ['คำ', '', '', '', ''])).toEqual([[0, 4]])
  })
  it('without words the old beat rule stands (no syllables / a wordless line)', () => {
    expect(runs('1_ 2_ 3_ 4_')).toEqual([[0, 1], [2, 3]])
    expect(runs('1_ 2_ 3_ 4_', ['', '', '', ''])).toEqual([[0, 1], [2, 3]])
  })
  it('a line that IS sung, passed in: a segment holding only เอื้อน notes still joins across its beat', () => {
    expect(runs('2_ 3_ 4_ 5_', ['', '', '', ''], { lyrics: true })).toEqual([[0, 3]])
  })
})

describe('ใบ#99 — what still breaks the underline', () => {
  it('a note that starts a NEW word', () => {
    expect(runs('1_ 2_ 3_ 4_', ['ก', '', 'ข', ''])).toEqual([[0, 1], [2, 3]])
  })
  it('a "-" hold', () => {
    expect(runs('1_ 2_ - 3_', ['ก', '', '', ''])).toEqual([[0, 1]])
  })
  it('a rest', () => {
    expect(runs('1_ 0_ 2_ 3_', ['ก', '', '', ''])).toEqual([[2, 3]])
  })
  it('a triplet is never beamed into a run', () => {
    expect(runs('1_ {2 3 4} 5_', ['ก', '', '', '', ''])).toEqual([])
  })
})

describe('ใบ#99 แบบ ก — across two chord segments of one bar', () => {
  it('เพลง 424: `1_.` (ใจ) then `2__` (no word) in the next segment → bridged at level 1', () => {
    expect(segmentBeamLink({ note: '1_.', syllables: ['ใจ'] }, { note: '2__', syllables: [''] }, true)).toMatchObject({ from: 0, to: 0, levels: 1 })
  })
  it('two sixteenths share both levels', () => {
    expect(segmentBeamLink({ note: '1__', syllables: ['ก'] }, { note: '2__', syllables: [''] }, true).levels).toBe(2)
  })
  it('no bridge: the next segment starts a word · ends on a hold · rest · quarter note · triplet · unsung line', () => {
    expect(segmentBeamLink({ note: '1_', syllables: ['ก'] }, { note: '2_', syllables: ['ข'] }, true)).toBeNull()
    expect(segmentBeamLink({ note: '1_ -', syllables: ['ก', ''] }, { note: '2_', syllables: [''] }, true)).toBeNull()
    expect(segmentBeamLink({ note: '0_', syllables: [''] }, { note: '2_', syllables: [''] }, true)).toBeNull()
    expect(segmentBeamLink({ note: '1', syllables: ['ก'] }, { note: '2_', syllables: [''] }, true)).toBeNull()
    expect(segmentBeamLink({ note: '{1 2 3}', syllables: ['ก', '', ''] }, { note: '2_', syllables: [''] }, true)).toBeNull()
    expect(segmentBeamLink({ note: '1_', syllables: ['ก'] }, { note: '2_', syllables: [''] }, false)).toBeNull()
  })
})

describe('ใบ#99 เสร็จเมื่อ 5 — the arc rule of #48/#53 is unchanged', () => {
  const beamOnly = (notes, syl) => beamGroups(notes, syl).groups.filter((g) => g.group === 'slur').map((g) => slurBeamOnly(g.tokens))
  it('#53: a slur over TWO beats keeps its arc, even though its underline now joins', () => {
    expect(runs('(6_ 5_ 4_ 3_)', ['คำ', '', '', ''])).toEqual([[0, 3]])
    expect(beamOnly('(6_ 5_ 4_ 3_)', ['คำ', '', '', ''])).toEqual([false])
  })
  it('a slur inside ONE beat is still drawn as its underline alone', () => {
    expect(beamOnly('(6_ 5_)', ['คำ', ''])).toEqual([true])
  })
  it('#48: a repeated pitch keeps its arc', () => {
    expect(beamOnly('(.6__ .6__)', ['คำ', ''])).toEqual([false])
  })
})
