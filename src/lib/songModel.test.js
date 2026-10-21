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

describe('resolveContent — adjacent-repeat dedup (B059-refine, narrowed by ใบ#131)', () => {
  // The song 77 shape: a refrain whose line 0 enters on the downbeat and whose lines 1 and 2
  // enter on a "0 1" pickup, then a different ending on line 3.
  // B059-refine collapsed all three into ONE printed melody. ใบ#131 takes that back: the "1" in
  // that pickup is a note somebody SINGS, so lines 1 and 2 carry one syllable more than line 0
  // and their words cannot sit under line 0's notes. พี่เปา reported exactly this on 20 ต.ค. 2569.
  // Lines 1 and 2 are identical to each other, so the second of them still collapses.
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

  it('a SUNG pickup makes its own melody — only a true repeat of it collapses (ใบ#131)', () => {
    const lines = resolveContent(refrain)
    expect(lines[0]._melodyFirst).toBe(true)  // downbeat statement — notes shown
    expect(lines[1]._melodyFirst).toBe(true)  // enters a syllable earlier → its own notes
    expect(lines[2]._melodyFirst).toBe(false) // identical to line 1, pickup and all → words only
    expect(lines[3]._melodyFirst).toBe(true)  // different ending → notes shown
  })

  it('a pickup of SILENCE is still normalised away — that was the point of B059-refine', () => {
    const rested = {
      ...refrain,
      stanzas: [{ id: 'R', lines: [
        [{ type: 'segment', note: '1 1 1 1' }, { type: 'bar' }, { type: 'segment', note: '7 6 5 4' }],
        [{ type: 'segment', note: '0 0' }, { type: 'bar' }, { type: 'segment', note: '1 1 1 1' }, { type: 'bar' }, { type: 'segment', note: '7 6 5 4' }],
      ] }],
    }
    const lines = resolveContent(rested)
    expect(lines[0]._melodyFirst).toBe(true)
    expect(lines[1]._melodyFirst).toBe(false) // same notes, same syllables → words only
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

  it('melodyLineSignature drops a SILENT pickup bar but keeps a full first bar', () => {
    const restPickup = [{ type: 'segment', note: '0 0' }, { type: 'bar' }, { type: 'segment', note: '1 1 1 1' }]
    const onDownbeat = [{ type: 'segment', note: '1 1 1 1' }]
    expect(melodyLineSignature(restPickup, 4)).toBe(melodyLineSignature(onDownbeat, 4))
  })

  it('melodyLineSignature KEEPS a pickup that is sung — it is a syllable (ใบ#131)', () => {
    const sungPickup = [{ type: 'segment', note: '0 1' }, { type: 'bar' }, { type: 'segment', note: '1 1 1 1' }]
    const onDownbeat = [{ type: 'segment', note: '1 1 1 1' }]
    expect(melodyLineSignature(sungPickup, 4)).not.toBe(melodyLineSignature(onDownbeat, 4))
    expect(melodyLineSignature(sungPickup, 4)).toContain('0 1')
  })

  it('a held or tied pickup is silence for this purpose — no new syllable', () => {
    const held = [{ type: 'segment', note: '- -' }, { type: 'bar' }, { type: 'segment', note: '1 1 1 1' }]
    const onDownbeat = [{ type: 'segment', note: '1 1 1 1' }]
    expect(melodyLineSignature(held, 4)).toBe(melodyLineSignature(onDownbeat, 4))
  })
})
