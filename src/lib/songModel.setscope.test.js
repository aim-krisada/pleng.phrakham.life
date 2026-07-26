// 717 multi-lyric — scopeToLyricSet: the song narrowed to ONE set, as a standalone song.
//
// The export path (MP3 + its estimate) derives the sheet AND the play order from `content`
// alone — deliberately, so no caller can pass one and forget the other. That means the set
// has to be baked into the content, which is what this does. The trap it has to avoid: leave
// a >1 `lyricSets` behind and resolveContent filters a SECOND time, snapping the export back
// to set 0 no matter which tab the reader is on.
import { describe, it, expect } from 'vitest'
import { resolveContent, resolvePlayOrder, scopeToLyricSet, lyricSetCount } from './songModel.js'

const line = (n) => [{ type: 'segment', note: n }]
const entry = (set, label, extra = {}) => ({ stanza: label === 'รับ' ? 'B' : 'A', set, label, syllables: [], ...extra })
const content = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  lyricSets: [{ name: 'ชุดหนึ่ง' }, { name: 'ชุดสอง' }],
  stanzas: [
    { id: 'A', lines: [line('1'), line('2')] },
    { id: 'B', lines: [line('3'), line('4')] },
  ],
  arrangement: [
    entry(0, ''),
    entry(0, 'รับ', { afterEachVerse: true }), // the strophic directive lives in set 0 only
    entry(0, 'ข้อ2'),
    entry(0, 'ข้อ3'),
    entry(1, ''),
    entry(1, 'รับ'),
    entry(1, 'ข้อ2'),
    entry(1, 'รับ'),
  ],
}

describe('scopeToLyricSet', () => {
  it.each([0, 1])('set %i: keeps only that set’s entries', (set) => {
    const scoped = scopeToLyricSet(content, set)
    expect(scoped.arrangement).toHaveLength(4)
    expect(scoped.arrangement.every((e) => e.set === set)).toBe(true)
    expect(scoped.lyricSets).toEqual([content.lyricSets[set]])
  })

  it('reads as an ordinary song, so nothing filters it a second time', () => {
    // the trap: a leftover 2-entry lyricSets would make resolveContent re-filter to set 0 and
    // the export would ignore the tab exactly as it did before.
    const scoped = scopeToLyricSet(content, 1)
    expect(lyricSetCount(scoped)).toBe(0)
    expect(resolveContent(scoped)).toHaveLength(8) // set 1's 4 blocks × 2 lines — not set 0's
  })

  it.each([0, 1])('set %i: sheet + play order match what the viewer resolves with opts', (set) => {
    // the export path (no opts, scoped content) and the reading path (raw content + opts) must
    // agree, or the MP3 stops being "what you just heard".
    const scoped = scopeToLyricSet(content, set)
    expect(resolveContent(scoped).length).toBe(resolveContent(content, { set }).length)
    expect(resolvePlayOrder(scoped)).toEqual(resolvePlayOrder(content, { set }))
  })

  it('set 0 keeps its strophic expansion; set 1 has none to keep', () => {
    expect(resolvePlayOrder(scopeToLyricSet(content, 0))).toHaveLength(6) // ข้อ1·รับ ข้อ2·รับ ข้อ3·รับ
    expect(resolvePlayOrder(scopeToLyricSet(content, 1))).toBeNull()
  })

  it('an out-of-range set falls back to the first — never to the concatenation', () => {
    expect(scopeToLyricSet(content, 99).arrangement.every((e) => e.set === 0)).toBe(true)
    expect(scopeToLyricSet(content, undefined).arrangement.every((e) => e.set === 0)).toBe(true)
  })

  it('back-compat — a song with no lyric sets is returned untouched', () => {
    const plain = { ...content, lyricSets: undefined }
    expect(scopeToLyricSet(plain, 0)).toBe(plain) // same object, not a copy
  })

  it('leaves the melody alone — one set is still the whole song’s tune', () => {
    expect(scopeToLyricSet(content, 1).stanzas).toBe(content.stanzas)
  })
})
