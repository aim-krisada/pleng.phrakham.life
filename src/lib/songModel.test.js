// resolveContent expands a v2 song (stanzas + arrangement) into flat singing-order
// lines. B059 adds per-line stanza tags so the songbook sheet can print each melody once.
import { describe, it, expect } from 'vitest'
import { resolveContent, migrateToV2 } from './songModel.js'

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

describe('resolveContent — stanza-first tags (B059)', () => {
  it('marks the first use of each stanza first=true and later reuses first=false', () => {
    const lines = resolveContent(v2)
    // 3 arrangement entries × 1 line each = 3 flat lines
    expect(lines.length).toBe(3)
    expect(lines[0]._stanza).toBe('V')
    expect(lines[0]._stanzaFirst).toBe(true) // ข้อ 1 — melody printed here
    expect(lines[1]._stanza).toBe('R')
    expect(lines[1]._stanzaFirst).toBe(true) // รับ — its own first (different stanza)
    expect(lines[2]._stanza).toBe('V')
    expect(lines[2]._stanzaFirst).toBe(false) // ข้อ 2 reuses V — lyrics only on the sheet
  })

  it('each reused verse still carries its OWN words (not the first verse\'s)', () => {
    const lines = resolveContent(v2)
    // line 2 (ข้อ 2) is stanza V reused — the joined lyric is verse-2 words
    const lyrics = lines[2].filter((it) => it.type === 'segment').map((it) => it.lyric)
    expect(lyrics).toEqual(['จ', 'ฉ'])
  })

  it('v1 (migrated single stanza) has every line first=true — notes never dropped', () => {
    const { content } = migrateToV2({
      key: 'C',
      lines: [[{ type: 'segment', chord: 'C', note: '1', lyric: 'ก' }]],
    })
    const lines = resolveContent(content)
    expect(lines.every((l) => l._stanzaFirst === true)).toBe(true)
  })
})
