// resolveContent expands a v2 song (stanzas + arrangement) into flat singing-order
// lines. B059 tags each line `_melodyFirst` so the songbook sheet prints each melody once:
// false = a reused stanza OR a line that repeats the one just above it (pickup-normalised).
import { describe, it, expect } from 'vitest'
import { resolveContent, migrateToV2, melodyLineSignature } from './songModel.js'

// One verse-melody (stanza V, 1 line, 2 notes) reused by 2 verses, plus a refrain
// (stanza R, 1 line, 1 note) sung once — the classic hymn shape from the B059 brief.
const v2 = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [
    { id: 'V', lines: [[{ type: 'segment', chord: 'C', note: '1' }, { type: 'segment', chord: 'G', note: '2' }]] },
    { id: 'R', lines: [[{ type: 'segment', chord: 'F', note: '4' }]] },
  ],
  arrangement: [
    { stanza: 'V', label: 'ข้อ 1', syllables: ['ก', 'ข'] },
    { stanza: 'R', label: 'รับ', syllables: ['ค'] },
    { stanza: 'V', label: 'ข้อ 2', syllables: ['จ', 'ฉ'] },
  ],
}

describe('resolveContent — melody-first tags (B059)', () => {
  it('stanza reuse: first use first=true, later reuse first=false', () => {
    const lines = resolveContent(v2)
    expect(lines.length).toBe(3)
    expect(lines[0]._melodyFirst).toBe(true) // ข้อ 1 — melody printed here
    expect(lines[1]._melodyFirst).toBe(true) // รับ — its own first (different stanza)
    expect(lines[2]._melodyFirst).toBe(false) // ข้อ 2 reuses V — lyrics only on the sheet
  })

  it('each reused verse still carries its OWN words (not the first verse\'s)', () => {
    const lines = resolveContent(v2)
    const lyrics = lines[2].filter((it) => it.type === 'segment').map((it) => it.lyric)
    expect(lyrics).toEqual(['จ', 'ฉ'])
  })

  it('v1 (migrated single stanza) has every line first=true — notes never dropped', () => {
    const { content } = migrateToV2({
      key: 'C',
      lines: [[{ type: 'segment', chord: 'C', note: '1', lyric: 'ก' }]],
    })
    const lines = resolveContent(content)
    expect(lines.every((l) => l._melodyFirst === true)).toBe(true)
  })
})

describe('resolveContent — adjacent-repeat dedup (B059-refine)', () => {
  // A refrain that sings the same phrase on lines 0,1,2 (line 0 on the downbeat, lines 1,2
  // with a "0 1" pickup) then a different ending on line 3 — the song 77 shape. All three
  // must collapse to ONE printed melody; the ending stays.
  const refrain = {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'R', lines: [
      [{ type: 'segment', note: '1 1 1 1' }, { type: 'bar' }, { type: 'segment', note: '7 6 5 4' }],
      [{ type: 'segment', note: '0 1' }, { type: 'bar' }, { type: 'segment', note: '1 1 1 1' }, { type: 'bar' }, { type: 'segment', note: '7 6 5 4' }],
      [{ type: 'segment', note: '0 1' }, { type: 'bar' }, { type: 'segment', note: '1 1 1 1' }, { type: 'bar' }, { type: 'segment', note: '7 6 5 4' }],
      [{ type: 'segment', note: '3 3 3 3' }],
    ] }],
    arrangement: [{ stanza: 'R', label: 'รับ', syllables: Array(16).fill('x') }],
  }

  it('collapses adjacent repeats of the same phrase (pickup-normalised) to one melody', () => {
    const lines = resolveContent(refrain)
    expect(lines[0]._melodyFirst).toBe(true)  // downbeat statement — notes shown
    expect(lines[1]._melodyFirst).toBe(false) // same phrase, "0 1" pickup → words only
    expect(lines[2]._melodyFirst).toBe(false) // same again → words only
    expect(lines[3]._melodyFirst).toBe(true)  // different ending → notes shown
  })

  it('an AABA verse (same tune on lines 0 and 2, NOT adjacent) keeps every melody', () => {
    const aaba = {
      version: 2, key: 'C', timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [
        [{ type: 'segment', note: '1 2 3 4' }],
        [{ type: 'segment', note: '5 6 5 4' }],
        [{ type: 'segment', note: '1 2 3 4' }], // == line 0 but line 1 sits between
        [{ type: 'segment', note: '3 2 1 0' }],
      ] }],
      arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: Array(16).fill('x') }],
    }
    const lines = resolveContent(aaba)
    expect(lines.map((l) => l._melodyFirst)).toEqual([true, true, true, true])
  })

  it('melodyLineSignature drops a leading pickup bar but keeps a full first bar', () => {
    const withPickup = [{ type: 'segment', note: '0 1' }, { type: 'bar' }, { type: 'segment', note: '1 1 1 1' }]
    const onDownbeat = [{ type: 'segment', note: '1 1 1 1' }]
    expect(melodyLineSignature(withPickup, 4)).toBe(melodyLineSignature(onDownbeat, 4))
  })
})
