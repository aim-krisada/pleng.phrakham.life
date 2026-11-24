// ใบ v3/pleng#183 — สร้างเพลงใหม่จากทำนองนี้: keep the tune, empty the words
import { describe, it, expect } from 'vitest'
import { melodyOnly, songFromMelody } from './copyMelody.js'

const content = {
  version: 2,
  key: 'D',
  timeSignature: '3/4',
  bpm: 96,
  bookRefs: [{ book: 'ล', no: 305 }],
  langVerified: { en: true },
  footnote: '¹ คำอธิบาย',
  oldKey: 'something the old song had',
  lyricSets: [{ name: 'ชุด 1' }, { name: 'ชุด 2' }],
  stanzas: [
    { id: 'A', lines: [[{ type: 'segment', chord: 'D', note: '1 2 3' }, { type: 'bar' }]], timeSignature: '3/4' },
    { id: 'B', lines: [[{ type: 'meter', ts: '4/4' }, { type: 'segment', chord: 'G', note: '5 - 6', lyric: 'คำเก่า' }]] },
  ],
  arrangement: [
    { stanza: 'A', label: 'ร้อง 1', syllables: ['พระ', 'เจ้า', 'ดี'], set: 0, lyrics: { en: ['God', 'is', 'good'] }, notes: ['x'] },
    { stanza: 'A', label: 'ร้อง 1', syllables: ['อีก', 'ชุด', 'หนึ่ง'], set: 1 },
    { stanza: 'B', label: 'รับ', syllables: ['สรร', 'เสริญ'], afterEachVerse: true, key: 'E' },
  ],
}

describe('melodyOnly', () => {
  const out = melodyOnly(content)

  it('keeps the key, meter, speed and every melody (notes, chords, bars, meter marks)', () => {
    expect(out).toMatchObject({ version: 2, key: 'D', timeSignature: '3/4', bpm: 96 })
    expect(out.stanzas[0]).toEqual(content.stanzas[0])
    expect(out.stanzas[1].lines[0]).toEqual([{ type: 'meter', ts: '4/4' }, { type: 'segment', chord: 'G', note: '5 - 6' }])
  })

  it('keeps the play order with every word box empty (one per box)', () => {
    expect(out.arrangement).toEqual([
      { stanza: 'A', label: 'ร้อง 1', syllables: ['', '', ''] },
      { stanza: 'B', label: 'รับ', syllables: ['', ''], key: 'E', afterEachVerse: true },
    ])
  })

  it('drops everything that belonged to the old words or the old song', () => {
    for (const k of ['bookRefs', 'langVerified', 'footnote', 'oldKey', 'lyricSets']) expect(out).not.toHaveProperty(k)
    expect(JSON.stringify(out)).not.toMatch(/พระ|God|คำเก่า|อีก|สรร/)
  })

  it('never changes the song it copies from', () => {
    const before = JSON.stringify(content)
    melodyOnly(content)
    expect(JSON.stringify(content)).toBe(before)
  })

  it('a song with one set of words keeps all its rows', () => {
    const one = { ...content, lyricSets: undefined, arrangement: content.arrangement.map(({ set, ...r }) => r) }
    expect(melodyOnly(one).arrangement.length).toBe(3)
  })

  it('an empty song does not break', () => {
    expect(melodyOnly(null)).toEqual({ version: 2, key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] })
  })
})

describe('songFromMelody', () => {
  it('is a new song: no id, no number, no title, unchecked — same book and theme', () => {
    const s = songFromMelody({ content, category: 'dek-lek', theme: 'นมัสการ' })
    expect(s).toMatchObject({ id: null, number: null, title_th: '', title_en: '', category: 'dek-lek', theme: 'นมัสการ', verified: false })
    expect(s.content.arrangement[0].syllables).toEqual(['', '', ''])
  })
})
