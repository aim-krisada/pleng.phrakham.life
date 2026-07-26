// 717 — WHICH lyric set did the search match?
//
// Search has always read EVERY set's words, so a line from set 2 finds the song. The catalog
// card, though, previewed the FIRST set always — so the reader got a result containing not one
// word they typed and nothing on it to explain why. (Until 26 ก.ค. the card also printed each
// set's stored name, which happens to BE that set's first line, so the gap was hidden by
// coincidence; captioning sets by position removed the coincidence.)
//
// These run against the LIVE 717 row — the fixture the /v2 port and the setid work already
// share — because what has to hold is a property of the real data, not of a hand-written stub.
import { describe, it, expect } from 'vitest'
import { matchedLyricSet, searchSnippet, lyricSetText, snippet, filterSongs } from './songSearch.js'
import { lyricSetName } from './songModel.js'
import live717 from './__fixtures__/717-live.json'

const live = JSON.parse(JSON.stringify(live717))
const SET_1_FIRST_LINE = live.content.lyricSets[0].name
const SET_2_FIRST_LINE = live.content.lyricSets[1].name

// space-insensitive containment: Thai has no word spaces, so the words the card shows are
// syllable-separated while the phrase a person types is not.
const bare = (s) => (s || '').replace(/\s+/g, '')
const shows = (text, phrase) => bare(text).includes(bare(phrase))

// an ordinary song — the ~120 in the library today, no lyricSets at all
const plainSong = {
  id: 's1',
  number: 5,
  title_th: 'เพลงปกติ',
  content: {
    version: 2,
    key: 'C',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] }],
    arrangement: [{ stanza: 'A', syllables: ['กา', 'ขา'] }],
  },
}

describe('717 — the card previews the set that matched', () => {
  it('a line from set 2 attributes to set 2, and the preview SHOWS what was typed', () => {
    expect(matchedLyricSet(live.content, SET_2_FIRST_LINE)).toBe(1)
    const s = searchSnippet(live.content, SET_2_FIRST_LINE)
    expect(s.set).toBe(1)
    expect(s.sets).toBe(2)
    expect(shows(s.text, SET_2_FIRST_LINE)).toBe(true)
    // the bug in one line: the OLD preview (always set 1) did not contain the typed phrase
    expect(shows(snippet(live.content), SET_2_FIRST_LINE)).toBe(false)
  })

  it('a line from set 1 attributes to set 1 and previews EXACTLY what it did before', () => {
    expect(matchedLyricSet(live.content, SET_1_FIRST_LINE)).toBe(0)
    const s = searchSnippet(live.content, SET_1_FIRST_LINE)
    expect(s.set).toBe(0)
    expect(s.text).toBe(snippet(live.content)) // byte parity → no label, no visible change
  })

  it('the label comes from lyricSetName, so the card cannot caption a set its own way', () => {
    // what SongList renders is 'พบใน ' + this. The reader tabs, the print heading and the
    // editor all call the same function, so they can never disagree.
    expect(lyricSetName(live.content.lyricSets[1], 1)).toBe('เนื้อร้องที่ 2')
    expect(lyricSetName(live.content.lyricSets[0], 0)).toBe('เนื้อร้องที่ 1')
  })

  it('matching by NUMBER / TITLE / nothing keeps the first set — no label', () => {
    expect(matchedLyricSet(live.content, '717')).toBe(0)
    expect(matchedLyricSet(live.content, live.title_th)).toBe(0)
    expect(matchedLyricSet(live.content, '')).toBe(0)
    expect(matchedLyricSet(live.content, 'ไม่มีคำนี้ในเพลงเลยจริงๆ')).toBe(0)
    expect(searchSnippet(live.content, '717').text).toBe(snippet(live.content))
  })

  it('spacing and typos still land on the right set (matches how search itself matches)', () => {
    // typed with no spaces at all
    expect(matchedLyricSet(live.content, bare(SET_2_FIRST_LINE))).toBe(1)
    // one wrong character — search tolerates it, so the attribution must too
    const typo = SET_2_FIRST_LINE.slice(0, 3) + 'ฏ' + SET_2_FIRST_LINE.slice(4)
    expect(typo).not.toBe(SET_2_FIRST_LINE)
    expect(matchedLyricSet(live.content, typo)).toBe(1)
  })

  it('a line from the MIDDLE of set 2 is still attributed to set 2', () => {
    const syls = live.content.arrangement.filter((a) => a.set === 1)[2].syllables
    const phrase = syls.filter(Boolean).slice(0, 6).join('')
    expect(matchedLyricSet(live.content, phrase)).toBe(1)
    // known limit, asserted so it is a decision and not a surprise: the preview is the head of
    // set 2, so a phrase from deeper inside that set is named by the label but not shown.
    expect(searchSnippet(live.content, phrase).set).toBe(1)
  })

  it('the whole path: searching set 2 returns 717, and the card reports set 2', () => {
    const hits = filterSongs([plainSong, live], SET_2_FIRST_LINE)
    expect(hits).toEqual([live])
    expect(searchSnippet(hits[0].content, SET_2_FIRST_LINE).set).toBe(1)
  })
})

describe('717 — an ordinary single-set song is untouched', () => {
  const deepPhrase = 'ขา'
  it('reports no sets and previews byte-identically, whatever is typed', () => {
    for (const q of ['', 'กา', deepPhrase, 'เพลงปกติ', '5', 'ไม่เกี่ยว']) {
      const s = searchSnippet(plainSong.content, q)
      expect(s).toEqual({ text: snippet(plainSong.content), set: 0, sets: 0 })
    }
  })

  it('a lone lyricSets entry is not "multi" either (nothing to disambiguate)', () => {
    const lone = { ...plainSong.content, lyricSets: [{ name: 'เดี่ยว' }] }
    expect(searchSnippet(lone, 'กา')).toEqual({ text: snippet(lone), set: 0, sets: 0 })
    expect(matchedLyricSet(lone, 'กา')).toBe(0)
  })

  it('v1 flat-line content has no sets at all', () => {
    const v1 = { key: 'C', lines: [[{ type: 'segment', note: '1', lyric: 'พระ' }]] }
    expect(searchSnippet(v1, 'พระ')).toEqual({ text: snippet(v1), set: 0, sets: 0 })
    expect(lyricSetText(v1, 1)).toBe('พระ') // no arrangement → the whole lyric, never empty
  })
})

describe('717 — set membership: shared entries and three sets', () => {
  // A refrain everyone sings carries NO `set`, so it belongs to every set. Three sets, so the
  // "last set" case is exercised rather than assumed from two.
  const three = {
    version: 2,
    key: 'C',
    lyricSets: [{ name: 'ก' }, { name: 'ข' }, { name: 'ค' }],
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3' }]] }],
    arrangement: [
      { stanza: 'A', set: 0, syllables: ['อรุณ', 'รุ่ง', 'ฟ้า'] },
      { stanza: 'A', syllables: ['ร่วม', 'ขับ', 'ขาน'] }, // shared refrain — no `set`
      { stanza: 'A', set: 1, syllables: ['สายัณห์', 'ลม', 'โชย'] },
      { stanza: 'A', set: 2, syllables: ['ราตรี', 'ดาว', 'พราว'] },
    ],
  }

  it('each set sees its own words plus the shared refrain, and nobody else’s', () => {
    expect(lyricSetText(three, 0)).toBe('อรุณ รุ่ง ฟ้า ร่วม ขับ ขาน')
    expect(lyricSetText(three, 1)).toBe('ร่วม ขับ ขาน สายัณห์ ลม โชย')
    expect(lyricSetText(three, 2)).toBe('ร่วม ขับ ขาน ราตรี ดาว พราว')
  })

  it('a phrase from the SHARED refrain gets no label — it is in every set', () => {
    expect(matchedLyricSet(three, 'ร่วมขับขาน')).toBe(0)
    expect(searchSnippet(three, 'ร่วมขับขาน').set).toBe(0)
  })

  it('the LAST set is reachable and labelled by its position', () => {
    expect(matchedLyricSet(three, 'ราตรีดาวพราว')).toBe(2)
    const s = searchSnippet(three, 'ราตรีดาวพราว')
    expect(s.sets).toBe(3)
    expect(shows(s.text, 'ราตรีดาวพราว')).toBe(true)
    expect(lyricSetName(three.lyricSets[s.set], s.set)).toBe('เนื้อร้องที่ 3')
  })

  it('a numeric-STRING set reads as that set, not as shared (import/SQL round-trips)', () => {
    const asStrings = { ...three, arrangement: three.arrangement.map((e) => (e.set == null ? e : { ...e, set: String(e.set) })) }
    expect(matchedLyricSet(asStrings, 'ราตรีดาวพราว')).toBe(2)
    expect(lyricSetText(asStrings, 1)).toBe('ร่วม ขับ ขาน สายัณห์ ลม โชย')
  })
})

// ---- NEGATIVE CONTROL: the caption must stay out of everything ----------------------------
// isSetCaption exists so "เนื้อร้องที่ N" — byte-identical app chrome on every multi-set song —
// never enters the search index. The card work must not smuggle it back in through the preview
// or the attribution, or typing "เนื้อร้อง" would match, and badge, every multi-set song.
describe('717 — the positional caption is still not searchable (negative control)', () => {
  it('typing the caption matches nothing, and attributes nothing', () => {
    expect(filterSongs([plainSong, live], 'เนื้อร้อง')).toEqual([])
    expect(filterSongs([plainSong, live], 'เนื้อร้องที่ 2')).toEqual([])
    expect(matchedLyricSet(live.content, 'เนื้อร้องที่ 2')).toBe(0)
    expect(matchedLyricSet(live.content, 'เนื้อร้อง')).toBe(0)
  })

  it('no set’s searchable text contains the caption — the label is render-time only', () => {
    for (let i = 0; i < live.content.lyricSets.length; i++) {
      expect(lyricSetText(live.content, i)).not.toContain('เนื้อร้องที่')
      expect(searchSnippet(live.content, SET_2_FIRST_LINE).text).not.toContain('เนื้อร้องที่')
    }
  })

  it('a row whose STORED names are caption-shaped is still not matched by them', () => {
    // earlier editors saved the caption of the day into `name`/`label`; those rows exist
    const stale = JSON.parse(JSON.stringify(live))
    stale.content.lyricSets = stale.content.lyricSets.map((s, i) => ({ ...s, name: `เนื้อร้องที่ ${i + 1}`, label: `ทำนอง ${i + 1}` }))
    expect(filterSongs([plainSong, stale], 'เนื้อร้องที่ 2')).toEqual([])
    expect(matchedLyricSet(stale.content, 'เนื้อร้องที่ 2')).toBe(0)
    // …while its actual WORDS still find it and still attribute correctly
    expect(filterSongs([plainSong, stale], SET_2_FIRST_LINE)).toEqual([stale])
    expect(matchedLyricSet(stale.content, SET_2_FIRST_LINE)).toBe(1)
  })
})
