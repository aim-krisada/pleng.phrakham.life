// B052 — search by lyrics + fuzzy. Covers v1 flat lines, v2 arrangement syllables,
// typo tolerance, Thai normalisation, and perf at catalogue scale (120 songs).
import { describe, it, expect } from 'vitest'
import {
  filterSongs,
  searchSongs,
  scoreSong,
  lyricsText,
  notesText,
  snippet,
  fuzzyBudget,
  fuzzyDistance,
} from './songSearch.js'

// v1 song: lyrics on flat segment lines.
const v1 = {
  number: 12,
  title_th: 'พระเจ้าดีต่อฉัน',
  content: {
    key: 'C',
    lines: [
      [
        { type: 'segment', note: '1', lyric: 'พระ' },
        { type: 'segment', note: '2', lyric: 'เจ้า' },
        { type: 'segment', note: '3', lyric: 'ทรง' },
        { type: 'segment', note: '5', lyric: 'สถิต' },
      ],
    ],
  },
}

// v2 song: lyrics live in arrangement.syllables (blanks = held/rest boxes),
// hyphen tokens continue a word.
const v2 = {
  number: 77,
  title_th: 'ความรักมั่นคง',
  content: {
    key: 'G',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 - 2 3' }]] }],
    arrangement: [
      { stanza: 'A', label: '', syllables: ['ความ', 'รัก', '', 'มั่น', '-คง', 'พระ', 'เยซู'] },
    ],
  },
}

// v2 song from the DA import batch: melody in stanzas[].lines[] (v1-shaped item
// arrays), with octave dots / holds / underscores on the note strings — the exact
// shape 'notesText' must strip to plain scale degrees for note search.
const v2imported = {
  number: 100,
  title_th: 'บทเพลงนำเข้า',
  content: {
    version: 2,
    key: 'E',
    stanzas: [
      {
        id: 'A',
        lines: [
          [
            { type: 'segment', chord: 'E', note: '.5. .5_ .6' },
            { type: 'bar' },
            { type: 'segment', chord: "C#m", note: "1' - .3_" },
          ],
        ],
      },
    ],
    arrangement: [{ stanza: 'A', label: '', syllables: ['ร้อง', 'เพลง', 'ใหม่'] }],
  },
}

const catalog = [v1, v2]

describe('lyricsText — v1 and v2', () => {
  it('reads v1 flat lines', () => {
    expect(lyricsText(v1.content)).toBe('พระ เจ้า ทรง สถิต')
  })

  it('reads v2 arrangement syllables, joining hyphen tokens and skipping blanks', () => {
    // 'มั่น' + '-คง' -> 'มั่นคง' (one word), blank slot dropped
    expect(lyricsText(v2.content)).toBe('ความ รัก มั่นคง พระ เยซู')
  })

  it('snippet works for a v2 song (was blank before B052)', () => {
    expect(snippet(v2.content)).toContain('ความ รัก')
  })
})

describe('notesText — v1 and v2', () => {
  it('reads v1 flat-line notes', () => {
    expect(notesText(v1.content)).toBe('1 2 3 5')
  })

  it('reads v2 stanza notes, stripping octave dots / holds / accidentals', () => {
    // '.5. .5_ .6' -> '5 5 6', "1' - .3_" -> '1 3'
    expect(notesText(v2imported.content)).toBe('5 5 6 1 3')
  })

  it('reads notes across a multi-note v2 stanza segment', () => {
    expect(notesText(v2.content)).toBe('1 2 3')
  })
})

describe('search by notes (B058) — v2 songs are note-searchable', () => {
  const notesCatalog = [v1, v2imported]

  it('finds a v2 song by a note sequence', () => {
    expect(filterSongs(notesCatalog, '5 5 6 1')).toEqual([v2imported])
  })

  it('still finds a v1 song by its notes', () => {
    expect(filterSongs(notesCatalog, '1 2 3 5')).toEqual([v1])
  })
})

describe('search by lyrics', () => {
  it('finds a v1 song by a lyric fragment (not just the title)', () => {
    expect(filterSongs(catalog, 'สถิต')).toEqual([v1])
  })

  it('finds a v2 song by a lyric fragment', () => {
    expect(filterSongs(catalog, 'เยซู')).toEqual([v2])
  })

  it('matches across the hyphen-joined word in v2', () => {
    expect(filterSongs(catalog, 'มั่นคง')).toEqual([v2])
  })

  it('still finds by title and number', () => {
    expect(filterSongs(catalog, 'พระเจ้าดี')).toEqual([v1])
    expect(filterSongs(catalog, '77')).toEqual([v2])
  })

  it('returns everything for an empty query', () => {
    expect(filterSongs(catalog, '   ')).toEqual(catalog)
  })
})

describe('fuzzy — tolerant of typos and spacing', () => {
  it('finds a song when the lyric phrase has one wrong character', () => {
    // 'ความรัก' typo -> 'ความรัด'
    expect(filterSongs(catalog, 'ความรัด')).toEqual([v2])
  })

  it('finds a song when a phrase is spaced differently', () => {
    // stored as 'ความ รัก'; user types with no space
    expect(filterSongs(catalog, 'ความรัก')).toEqual([v2])
  })

  it('tolerates two typos in a longer phrase', () => {
    // 'พระเจ้าทรงสถิต' with two altered chars
    expect(filterSongs(catalog, 'พระเจ้าซรงสถิด')).toEqual([v1])
  })

  it('does not fuzzy-match very short queries (avoids noise)', () => {
    expect(fuzzyBudget('ก')).toBe(0)
    expect(fuzzyBudget('กขค')).toBe(0)
    expect(fuzzyBudget('กขคง')).toBe(1)
  })

  it('rejects a query that is nothing like any song', () => {
    expect(filterSongs(catalog, 'xyzzy quux nope')).toEqual([])
  })

  it('scoreSong ranks exact substrings above fuzzy hits', () => {
    expect(scoreSong(v2, 'เยซู')).toBe(0)
    expect(scoreSong(v2, 'ความรัด')).toBeGreaterThan(0)
  })
})

describe('fuzzyDistance — approximate substring primitive', () => {
  it('is 0 when the pattern is an exact substring', () => {
    expect(fuzzyDistance('abcdefg', 'cde', 2)).toBe(0)
  })

  it('counts a single substitution', () => {
    expect(fuzzyDistance('abcdefg', 'cxe', 2)).toBe(1)
  })

  it('stops early and reports over-budget when too different', () => {
    expect(fuzzyDistance('abcdefg', 'zzz', 1)).toBeGreaterThan(1)
  })
})

describe('searchSongs — ranked results', () => {
  it('returns exact matches before fuzzy ones', () => {
    // both songs get 'พระ' somewhere; v1 title contains it (exact), keep order
    const results = searchSongs(catalog, 'พระ')
    expect(results.every((r) => r.score === 0)).toBe(true)
    expect(results.map((r) => r.song)).toEqual([v1, v2])
  })

  it('drops non-matches', () => {
    expect(searchSongs(catalog, 'เยซู').map((r) => r.song)).toEqual([v2])
  })
})

describe('perf — 120-song catalogue', () => {
  function makeSong(n) {
    return {
      number: n,
      title_th: `เพลงทดสอบหมายเลข ${n}`,
      content: {
        key: 'C',
        stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3 4 5' }]] }],
        arrangement: [
          {
            stanza: 'A',
            label: '',
            syllables: 'สรร เสริญ พระ องค์ ผู้ ทรง ฤทธิ์ นิ -รันดร์ กาล'.split(' '),
          },
        ],
      },
    }
  }
  const big = Array.from({ length: 120 }, (_, i) => makeSong(i + 1))

  it('fuzzy-searches 120 songs well under a frame budget', () => {
    const start = performance.now()
    for (let i = 0; i < 20; i++) filterSongs(big, 'สรรเสิญพระอวค์') // typo'd phrase
    const perQuery = (performance.now() - start) / 20
    expect(perQuery).toBeLessThan(50) // generous; typically a few ms
  })

  it('still matches the intended songs at scale', () => {
    expect(filterSongs(big, 'นิรันดร์').length).toBe(120)
    // A short exact number query stays precise (no fuzzy noise from '41'/'43').
    expect(filterSongs(big, '42').map((s) => s.number)).toEqual([42])
    // The exact-substring hit ranks first even when fuzzy neighbours tag along.
    expect(searchSongs(big, 'หมายเลข 42')[0].song.number).toBe(42)
  })
})
