// 717 multi-lyric — a song row holds ONE title (`title_th`, the FIRST lyric set's name), so
// before this the second set's name existed nowhere the catalog searched: merging the two
// halves of song 717 into one row would have made "ผู้ที่ถูกบาปทำร้ายจงมา" unfindable. These
// tests use the real names from that song so a regression reads as the actual failure.
import { describe, it, expect } from 'vitest'
import { lyricSetNames, lyricSetsText, songHaystack, scoreSong, filterSongs, lyricsText } from './songSearch.js'
import live717 from '../components/__fixtures__/717-live.json'

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
  it('lyricSetNames: reads the stored `name`/`label` — hidden search text now, never chrome', () => {
    expect(lyricSetNames(song717.content)).toEqual([SET1, SET2])
    // name and label disagree → BOTH searchable (nobody loses the name they remember)
    expect(lyricSetNames({ lyricSets: [{ name: 'ใหม่', label: 'เก่า' }, { label: 'ข' }] }))
      .toEqual(['ใหม่', 'เก่า', 'ข'])
  })

  it('the positional CAPTION is never indexed — in any of its three shapes', () => {
    // Chrome is identical on every multi-set song. Indexing it would make "เนื้อร้อง" a
    // title-prefix hit on all of them and bury the songs whose words somebody actually typed.
    expect(lyricSetNames({ lyricSets: [{}, {}] })).toEqual([])
    expect(lyricSetNames({ lyricSets: [{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๒' }] })).toEqual([])
    expect(lyricSetNames({ lyricSets: [{ label: 'ทำนอง 1' }, { label: 'ทำนอง 2' }] })).toEqual([])
    expect(lyricSetNames({ lyricSets: [{ label: 'เนื้อร้องที่ 1' }, { name: 'เนื้อร้องที่ 2' }] })).toEqual([])
    // a stale caption left behind by deleting a middle set is dropped too — it names a position
    // this set no longer sits at, so indexing it would answer for a set that isn't there
    expect(lyricSetNames({ lyricSets: [{ label: 'เนื้อร้องที่ 1' }, { label: 'เนื้อร้องที่ 3' }] })).toEqual([])
    // but a real name that merely CONTAINS the word survives — free text is never chrome
    expect(lyricSetNames({ lyricSets: [{ name: 'เนื้อร้องที่ 2 ของโบสถ์เรา' }, { name: 'ข' }] }))
      .toEqual(['เนื้อร้องที่ 2 ของโบสถ์เรา', 'ข'])
  })

  it('typing the caption does not drag in every multi-set song', () => {
    // the negative control for the change above: chrome must not behave like a title
    expect(scoreSong(song717, 'เนื้อร้องที่ 2')).toBeNull()
    expect(filterSongs([plainSong, song717], 'เนื้อร้อง')).toEqual([])
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

// ---- "ต้องหาเจอ" (P'Aim, 26 ก.ค.) --------------------------------------------------------
// The gate on hiding the set names was never the mechanism, it was the RESULT: typing the first
// line of set 2 must still return song 717. These run against the LIVE row (the fixture the /v2
// port and the setid work already share), not a hand-written stub, because the thing that has to
// hold is a property of the real data: every set's words are indexed syllable by syllable, so a
// set is findable by its own words with or without a name attached to it.
describe('songSearch — a set is findable by its OWN WORDS, name or no name (717 live row)', () => {
  const live = JSON.parse(JSON.stringify(live717))
  const FIRST_LINE_OF_SET_2 = live.content.lyricSets[1].name
  const decoy = { ...plainSong, id: 'decoy' }

  it('the first line of set 2 finds song 717', () => {
    expect(filterSongs([decoy, live], FIRST_LINE_OF_SET_2)).toEqual([live])
  })

  it('…and still finds it with every set name stripped from the row', () => {
    // this is the property that made it safe to stop displaying the names at all: the words
    // themselves carry the song. If this ever fails, hiding the names DID cost findability.
    const nameless = JSON.parse(JSON.stringify(live))
    nameless.content.lyricSets = nameless.content.lyricSets.map(() => ({}))
    expect(lyricSetNames(nameless.content)).toEqual([]) // nothing left but the words
    expect(filterSongs([decoy, nameless], FIRST_LINE_OF_SET_2)).toEqual([nameless])
    // the words of set 2 are in the index because lyricsText walks EVERY arrangement entry
    expect(lyricsText(nameless.content).replace(/\s+/g, ''))
      .toContain(FIRST_LINE_OF_SET_2.replace(/\s+/g, ''))
  })

  it('the stored name keeps it ranked like a title, so it comes back FIRST', () => {
    // findability does not depend on the hidden name; ranking still benefits from it
    expect(scoreSong(live, FIRST_LINE_OF_SET_2)).toBe(-2)
    const nameless = JSON.parse(JSON.stringify(live))
    nameless.content.lyricSets = nameless.content.lyricSets.map(() => ({}))
    expect(scoreSong(nameless, FIRST_LINE_OF_SET_2)).toBe(0) // found, just not title-tier
  })

  it('a line from the middle of set 2 finds it too (people type what they remember)', () => {
    const syls = live.content.arrangement.filter((a) => a.set === 1)[2].syllables
    const phrase = syls.filter(Boolean).slice(0, 6).join('')
    expect(filterSongs([decoy, live], phrase)).toEqual([live])
  })
})
