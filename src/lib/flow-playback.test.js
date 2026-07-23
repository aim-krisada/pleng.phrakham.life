// R3 end-to-end at the PLAY layer: a per-verse `flow` changes how a shared melody repeats
// for ONE arrangement row, without copying the melody. Proves store→play closes: the sheet
// (resolveContent) still writes the melody once; buildPlayNotes expands each verse per its flow.
import { describe, it, expect } from 'vitest'
import { resolveContent } from './songModel.js'
import { buildPlayNotes } from './midi.js'
import { mintMarkerIds } from './songFlow.js'

// stanza A = one line with a bar-level repeat ‖: 1 2 :‖ (default: the phrase sings twice).
const repeatSong = (arrangement) => mintMarkerIds({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[
    { type: 'repeat-start' },
    { type: 'segment', note: '1 2' },
    { type: 'repeat-end' },
  ]] }],
  arrangement,
}).content

const resolved = (c) => ({ ...c, lines: resolveContent(c) })
// notes belonging to arrangement row `ei` (its display line index == ei here, one line/stanza)
const notesOfVerse = (c, ei) => buildPlayNotes(resolved(c)).filter((n) => n.li === ei && n.midi != null)

describe('R3 — flow.skip skips a repeat for one verse (song 105 headline)', () => {
  it('CONTROL: no flow → every verse repeats the phrase (2 notes → 4 played)', () => {
    const c = repeatSong([{ stanza: 'A', label: 'ข้อ 1' }, { stanza: 'A', label: 'ข้อ 2' }])
    expect(notesOfVerse(c, 0).length).toBe(4)
    expect(notesOfVerse(c, 1).length).toBe(4)
  })

  it('skip:["*"] on ข้อ 2-3 → those verses sing the phrase ONCE, no melody copied', () => {
    // exactly the song-105 shape from the spec §3: ข้อ 1 loops, ข้อ 2-3 do not.
    const c = repeatSong([
      { stanza: 'A', label: 'ข้อ 1' },
      { stanza: 'A', label: 'ข้อ 2', flow: { skip: ['*'] } },
      { stanza: 'A', label: 'ข้อ 3', flow: { skip: ['*'] } },
    ])
    expect(notesOfVerse(c, 0).length).toBe(4) // ข้อ 1 still repeats
    expect(notesOfVerse(c, 1).length).toBe(2) // ข้อ 2 sings once
    expect(notesOfVerse(c, 2).length).toBe(2) // ข้อ 3 sings once
  })

  it('skip:["r1"] (specific id) → skips only that repeat', () => {
    const c = repeatSong([{ stanza: 'A', label: 'ข้อ 1', flow: { skip: ['r1'] } }])
    // r1 is the minted id of the only repeat
    expect(notesOfVerse(c, 0).length).toBe(2)
  })

  it('R4: skip of a non-existent id is IGNORED (falls back to the melody, plays 2×)', () => {
    const c = repeatSong([{ stanza: 'A', label: 'ข้อ 1', flow: { skip: ['rZ'] } }])
    expect(notesOfVerse(c, 0).length).toBe(4) // orphan ref → melody default, never guessed
  })
})

describe('R3 — flow.times loops a repeat a different count', () => {
  it('times:{r1:3} → the phrase sings 3× for that verse', () => {
    const c = repeatSong([{ stanza: 'A', label: 'ข้อ 1', flow: { times: { r1: 3 } } }])
    expect(notesOfVerse(c, 0).length).toBe(6) // 2 notes × 3 passes
  })
})

describe('R2 — repeat-end.times sets the melody default', () => {
  it('times:3 on the repeat-end → every verse loops 3× by default', () => {
    const c = mintMarkerIds({
      version: 2, key: 'C', timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [[
        { type: 'repeat-start' }, { type: 'segment', note: '1 2' }, { type: 'repeat-end', times: 3 },
      ]] }],
      arrangement: [{ stanza: 'A', label: 'ข้อ 1' }],
    }).content
    expect(notesOfVerse(c, 0).length).toBe(6)
  })
})

describe('R3 — flow.ending re-targets which alternate ending a verse takes', () => {
  // melody: ‖: 1 | [volta1] 2 :‖ [volta2] 3 [volta3] 4  — three distinct endings
  const threeEndings = (arrangement) => mintMarkerIds({
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[
      { type: 'repeat-start' }, { type: 'segment', note: '1' }, { type: 'bar' },
      { type: 'volta', num: 1 }, { type: 'segment', note: '2' }, { type: 'repeat-end' }, { type: 'bar' },
      { type: 'volta', num: 2 }, { type: 'segment', note: '3' }, { type: 'bar' },
      { type: 'volta', num: 3 }, { type: 'segment', note: '4' },
    ]] }],
    arrangement,
  }).content
  const midisOf = (c, ei) => buildPlayNotes(resolved(c)).filter((n) => n.li === ei && n.midi != null).map((n) => n.midi)

  it('CONTROL: no flow → pass 1 takes ending 1, pass 2 takes ending 2 (1,2,1,3)', () => {
    const c = threeEndings([{ stanza: 'A', label: 'ข้อ 1' }])
    // pass1: 1 (common) → 2 (ending1) → back; pass2: 1 (common) → 3 (ending2). ending3 never.
    expect(midisOf(c, 0)).toEqual([60, 62, 60, 64]) // C D C E
  })

  it('flow.ending:3 → the terminal pass takes ending 3 instead of ending 2', () => {
    const c = threeEndings([{ stanza: 'A', label: 'ข้อ 1', flow: { ending: 3 } }])
    // pass1: 1 → ending1 (2); pass2 (terminal): 1 → ending3 (4). ending2 skipped.
    expect(midisOf(c, 0)).toEqual([60, 62, 60, 65]) // C D C F
  })
})

describe('R2 — volta.num as a LIST', () => {
  const listVolta = mintMarkerIds({
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[
      { type: 'repeat-start' }, { type: 'segment', note: '1' }, { type: 'bar' },
      { type: 'volta', num: 1 }, { type: 'segment', note: '2' }, { type: 'repeat-end' }, { type: 'bar' },
      { type: 'volta', num: [2, 3] }, { type: 'segment', note: '3' },
    ]] }],
    arrangement: [{ stanza: 'A', label: 'ข้อ 1' }],
  }).content
  it('an ending numbered [2,3] plays on pass 2 (default), same as a single 2', () => {
    const notes = buildPlayNotes({ ...listVolta, lines: resolveContent(listVolta) })
      .filter((n) => n.midi != null).map((n) => n.midi)
    expect(notes).toEqual([60, 62, 60, 64]) // pass1: C D · pass2: C E(ending[2,3])
  })
})
