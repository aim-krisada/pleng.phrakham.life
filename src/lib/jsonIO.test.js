// US-C01 / DS-C01 — a downloaded song must round-trip: writing it to JSON and
// reading it back yields the same data (this is the promise US-C02 relies on to
// reopen the file). Also covers the meaningful-filename rule.
import { describe, it, expect } from 'vitest'
import { exportSong, songFilename } from './jsonIO.js'

const song = {
  id: 42, // extra viewer-only field that must NOT leak into the file
  number: 12,
  title_th: 'พระเจ้าดีต่อฉัน',
  title_en: 'God is good',
  content: {
    version: 2,
    key: 'C',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1', lyric: 'พระ' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['พระ'] }],
  },
}

describe('exportSong (DS-C01 round-trip)', () => {
  it('serialises then parses back to an equal object', () => {
    const data = exportSong(song)
    const roundTripped = JSON.parse(JSON.stringify(data))
    expect(roundTripped).toEqual(data)
  })

  it('keeps only the portable fields (drops viewer-only keys like id)', () => {
    const data = exportSong(song)
    expect(Object.keys(data).sort()).toEqual(['content', 'number', 'title_en', 'title_th'])
    expect(data.content).toEqual(song.content)
  })

  it('normalises a blank song to null/empty rather than undefined', () => {
    const data = exportSong({})
    expect(data).toEqual({ number: null, title_th: '', title_en: '', content: null })
    // undefined would vanish through JSON — assert the file keeps every key.
    expect(JSON.parse(JSON.stringify(data))).toEqual(data)
  })
})

describe('songFilename (DS-C01 meaningful name)', () => {
  it('prefixes the number and uses the Thai title', () => {
    expect(songFilename(song)).toBe('12 พระเจ้าดีต่อฉัน.json')
  })

  it('falls back to the English title when no Thai title', () => {
    expect(songFilename({ title_en: 'God is good' })).toBe('God is good.json')
  })

  it('strips filesystem-illegal characters', () => {
    expect(songFilename({ title_th: 'a/b:c*?' })).toBe('abc.json')
  })

  it('falls back to song.json when nothing usable', () => {
    expect(songFilename({ title_th: '   ' })).toBe('song.json')
    expect(songFilename({})).toBe('song.json')
  })
})
