// 717 multi-lyric — a song row holds ONE title (`title_th`, the FIRST lyric set's name), so
// before this the second set's name existed nowhere the catalog searched: merging the two
// halves of song 717 into one row would have made "ผู้ที่ถูกบาปทำร้ายจงมา" unfindable. These
// tests use the real names from that song so a regression reads as the actual failure.
import { describe, it, expect } from 'vitest'
import { lyricSetNames, lyricSetsText, songHaystack, scoreSong, filterSongs } from './songSearch.js'

const SET1 = 'บรรดาคนบาป เชิญท่านเข้ามา'
const SET2 = 'ผู้ที่ถูกบาปทำร้ายจงมา'

// the shape the merge SQL writes: BOTH `name` and `label`, same value
const song717 = {
  id: 's717', number: 717, title_th: SET1, title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    lyricSets: [{ name: SET1, label: SET1 }, { name: SET2, label: SET2 }],
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2' }]] }],
    arrangement: [
      { stanza: 'A', set: 0, syllables: ['บรร', '-ดา'] },
      { stanza: 'A', set: 1, syllables: ['ผู้', 'ที่'] },
    ],
  },
}
// an ordinary song — the 100+ existing library, no lyricSets at all
const plainSong = {
  id: 's1', number: 5, title_th: 'เพลงปกติ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '3 4' }]] }],
    arrangement: [{ stanza: 'A', syllables: ['กา', 'ขา'] }],
  },
}

describe('songSearch — lyric-set names are indexed (717)', () => {
  it('lyricSetNames: reads `name`, and the older `label` when it differs', () => {
    expect(lyricSetNames(song717.content)).toEqual([SET1, SET2])
    // legacy 717 data (label only) is still indexed — under BOTH the arabic text now on the
    // tab (type what you see and you find it) and the raw Thai text still in the database
    expect(lyricSetNames({ lyricSets: [{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๒' }] }))
      .toEqual(['ทำนอง 1', 'ทำนอง ๑', 'ทำนอง 2', 'ทำนอง ๒'])
    // name and label disagree → BOTH searchable (nobody loses the name they remember)
    expect(lyricSetNames({ lyricSets: [{ name: 'ใหม่', label: 'เก่า' }, { label: 'ข' }] }))
      .toEqual(['ใหม่', 'เก่า', 'ข'])
    // neither → the positional fallback, so a set is never unnamed in the index
    expect(lyricSetNames({ lyricSets: [{}, {}] })).toEqual(['ทำนอง 1', 'ทำนอง 2'])
  })

  it('back-compat: songs with no lyricSets (and a lone set) contribute nothing', () => {
    expect(lyricSetNames(plainSong.content)).toEqual([])
    expect(lyricSetsText(plainSong.content)).toBe('')
    expect(lyricSetNames({ lyricSets: [{ name: 'เดี่ยว' }] })).toEqual([])
    expect(lyricSetsText({})).toBe('')
    expect(lyricSetsText(undefined)).toBe('')
  })

  it('the haystack carries the second set name; the plain song is unchanged', () => {
    expect(songHaystack(song717)).toContain(SET2)
    expect(songHaystack(plainSong)).not.toContain('lyricset')
    expect(songHaystack(plainSong)).toContain('เพลงปกติ')
  })

  it('searching the SECOND set name finds the song', () => {
    expect(scoreSong(song717, SET2)).not.toBeNull()
    expect(filterSongs([plainSong, song717], SET2)).toEqual([song717])
    // a distinctive fragment of it works too (people type what they remember)
    expect(filterSongs([plainSong, song717], 'ถูกบาปทำร้าย')).toEqual([song717])
  })

  it('a second-set name ranks like a title — above a mere lyric hit', () => {
    const lyricOnly = {
      id: 's9', number: 9, title_th: 'อื่น', title_en: '',
      content: {
        version: 2, key: 'C', timeSignature: '4/4',
        stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1' }]] }],
        arrangement: [{ stanza: 'A', syllables: [SET2] }], // the phrase buried in the words
      },
    }
    expect(scoreSong(song717, SET2)).toBe(-2) // set name starts with the query → title tier
    expect(scoreSong(lyricOnly, SET2)).toBe(0) // plain lyric hit
    expect(filterSongs([lyricOnly, song717], SET2)[0]).toBe(song717)
  })

  it('the first set name still finds it, and unrelated queries still miss', () => {
    expect(filterSongs([plainSong, song717], SET1)).toEqual([song717])
    expect(filterSongs([plainSong, song717], 'ไม่มีคำนี้ในเพลงเลยจริงๆ')).toEqual([])
  })
})
