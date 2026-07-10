// B052 — search by lyrics + fuzzy. Covers v1 flat lines, v2 arrangement syllables,
// typo tolerance, Thai normalisation, and perf at catalogue scale (120 songs).
import { describe, it, expect } from 'vitest'
import {
  filterSongs,
  searchSongs,
  scoreSong,
  lyricsText,
  notesText,
  notesCompact,
  isNoteQuery,
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

// A v2 melody carrying every notation quirk note search must see through: octave dots
// above ('.5.') and below (".5", "5,"), an up-octave prime "1'", held '-', beam '_',
// a bar '|', and a rest '0'. notesCompact must reduce it to bare degrees '5563107'.
const v2edge = {
  number: 200,
  title_th: 'เพลงขอบเขต',
  content: {
    version: 2,
    key: 'D',
    stanzas: [
      {
        id: 'A',
        lines: [
          [
            { type: 'segment', chord: 'D', note: ".5. 5_ 6" },
            { type: 'bar' },
            { type: 'segment', chord: 'A', note: "3 - 1' 0 7" },
          ],
        ],
      },
    ],
    arrangement: [{ stanza: 'A', label: '', syllables: ['ก', 'ข', 'ค'] }],
  },
}

describe('notesCompact — bare scale-degree reduction', () => {
  it('strips octave dots, holds, beams, primes and joins to bare degrees', () => {
    expect(notesCompact(v2edge.content)).toBe('5563107')
  })

  it('keeps rests (0) but drops every decoration', () => {
    expect(notesCompact(v2imported.content)).toBe('55613')
    expect(notesCompact(v1.content)).toBe('1235')
  })
})

describe('isNoteQuery — routes only melody queries to the note path', () => {
  it('treats spaced or decorated degree strings as notes', () => {
    expect(isNoteQuery('5 5 6 1')).toBe(true)
    expect(isNoteQuery('55 61')).toBe(true)
    expect(isNoteQuery(".5 1' -")).toBe(true)
  })

  it('treats a bare run of >=3 degrees as notes too (B074 union with number search)', () => {
    expect(isNoteQuery('5561')).toBe(true)
    expect(isNoteQuery('1235')).toBe(true)
    expect(isNoteQuery('555')).toBe(true) // 3-digit run: melody query (still finds number too)
    expect(isNoteQuery('117')).toBe(true)
    expect(isNoteQuery('100')).toBe(true) // has a pitched 1, 3 chars → note+number union
  })

  it('leaves 1-2 digit bare numbers as number lookups, not notes', () => {
    expect(isNoteQuery('42')).toBe(false)
    expect(isNoteQuery('7')).toBe(false)
    expect(isNoteQuery('1')).toBe(false)
  })

  it('is not a note query when any non-note glyph is present', () => {
    expect(isNoteQuery('เยซู')).toBe(false)
    expect(isNoteQuery('song 42')).toBe(false)
    expect(isNoteQuery('89')).toBe(false) // 8/9 are not scale degrees
  })
})

describe('note search is space-insensitive (space-less)', () => {
  const cat = [v1, v2imported]

  it('finds the same song whether notes are spaced, half-spaced, or joined', () => {
    const spaced = filterSongs(cat, '5 5 6 1')
    const half = filterSongs(cat, '55 61')
    const joined = filterSongs(cat, '5561')
    expect(spaced).toEqual([v2imported])
    expect(half).toEqual([v2imported])
    expect(joined).toEqual([v2imported])
  })

  it('matches through octave dots / holds / bar in the query itself', () => {
    // '.5.5.6' (dotted) and '.5 .5 .6' and '556' all reduce to the same degrees.
    expect(filterSongs(cat, '.5.5.6')).toEqual([v2imported])
    expect(filterSongs([v2edge], "5 5 6 3 1' 0 7")).toEqual([v2edge])
    expect(filterSongs([v2edge], '5563107')).toEqual([v2edge])
  })

  it('finds a v1 song space-lessly too', () => {
    expect(filterSongs(cat, '1235')).toEqual([v1])
    expect(filterSongs(cat, '12 35')).toEqual([v1])
  })

  it('scores a melody-sequence hit just after exact hits (B074 ranking), space-insensitively', () => {
    // Melody match is exact-contiguous but ranks after a number/title/lyric hit (0),
    // so the song numbered 100 stays above songs whose melody merely contains the run.
    expect(scoreSong(v2imported, '5561')).toBeGreaterThan(0)
    expect(scoreSong(v2imported, '5561')).toBe(scoreSong(v2imported, '55 61'))
  })

  it('does not match a note run the song does not contain', () => {
    // v2imported degrees are '55613'; '6666' is absent → no false positive.
    expect(filterSongs(cat, '6666')).toEqual([])
  })
})

// Regression for the note-search-verify pass: a melody query is an EXACT-SEQUENCE
// request. P'Aim searched "5 5 5 6 1 6 1 2 2 2 2" and got songs 1, 29 and 43, but only
// song 1 actually contains that run — 29 and 43 were near-miss fuzzy hits (edit distance
// 2). These fixtures reproduce the real notesCompact() of those three songs.
describe('note search is an exact sequence (no fuzzy near-miss)', () => {
  const mkNotes = (degrees) => ({
    number: 0,
    title_th: '',
    content: { version: 2, key: 'C', stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: degrees.split('').join(' ') }]] }] },
  })
  // Real notesCompact() from Supabase (2026-07-10): song 1 opens with the queried run;
  // songs 29 & 43 differ by 2 notes and must NOT match.
  const song1 = { ...mkNotes('555616122222133235653232165613255561612222213323565323216561211356676533211212367117566532126'), number: 1, title_th: 'พระเจ้าเป็นความรัก' }
  const song29 = { ...mkNotes('555611123223321176665611555611123223321176665611'), number: 29, title_th: 'ใครเปรียบพระเยซูได้' }
  const song43 = { ...mkNotes('321235556110222343120321235661112223432105434531161111543453132223232123121652223443210'), number: 43, title_th: 'ชีวิตแสนสุข' }
  const cat = [song1, song29, song43]
  const Q = '5 5 5 6 1 6 1 2 2 2 2'

  it('returns only the song that truly contains the run (not the near-misses)', () => {
    expect(filterSongs(cat, Q).map((s) => s.number)).toEqual([1])
  })

  it('song 1 contains the contiguous sequence; 29 and 43 do not', () => {
    expect(notesCompact(song1.content)).toContain('55561612222')
    expect(notesCompact(song29.content)).not.toContain('55561612222')
    expect(notesCompact(song43.content)).not.toContain('55561612222')
  })

  it('gives identical results with, without, and with mixed spaces', () => {
    const spaced = filterSongs(cat, '5 5 5 6 1 6 1 2 2 2 2').map((s) => s.number)
    const joined = filterSongs(cat, '55561612222').map((s) => s.number)
    const mixed = filterSongs(cat, '5556 1612222').map((s) => s.number)
    const trailing = filterSongs(cat, '5 5 5 6 1 6 1 2 2 2 2 ').map((s) => s.number)
    expect(spaced).toEqual([1])
    expect(joined).toEqual([1])
    expect(mixed).toEqual([1])
    expect(trailing).toEqual([1])
  })

  it('a one-note-off query matches nothing (no fuzzy fallthrough for note queries)', () => {
    // song 1 is '...55561612222...'; '55561612223' (last note off) must not fuzzy-hit it.
    expect(filterSongs(cat, '55561612223')).toEqual([])
  })
})

// B074 — P'Aim searched "555" and got 0 songs: a bare 3-digit run was routed to number
// search only (no song 555), never to the melody path. Now a bare run of >=3 digits is a
// UNION: it searches the song number (ranks first) AND the melody sequence (ranks after),
// so "555" finds the song opening 5-5-5 while "100"/"117" keep finding their numbered song.
describe('B074 — short bare-digit query = number + melody union', () => {
  const mk = (number, degrees, title = '') => ({
    number,
    title_th: title,
    content: { version: 2, key: 'C', stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: degrees }]] }] },
  })
  // song 1 opens 5-5-5-6-1 (the real "พระเจ้าเป็นความรัก"); there is no song numbered 555.
  const song1 = mk(1, '5 5 5 6 1', 'พระเจ้าเป็นความรัก')
  // song 100: its NUMBER is 100 but its melody is 3-2-1 (does not contain 1-0-0).
  const song100 = mk(100, '3 2 1', 'บทที่ร้อย')
  // song 7: melody contains the run 1-0-0, but its number is not 100.
  const song7 = mk(7, '4 1 0 0 4', 'ทำนองมีหนึ่งศูนย์ศูนย์')
  // catalog order deliberately puts the melody-100 song BEFORE song 100 to prove ranking.
  const cat = [song7, song1, song100]

  it('"555" finds the song whose melody opens 5-5-5 (was 0 songs before B074)', () => {
    expect(filterSongs(cat, '555').map((s) => s.number)).toEqual([1])
  })

  it('spaced "5 5 5" and joined "555" return the same song', () => {
    expect(filterSongs(cat, '5 5 5').map((s) => s.number)).toEqual([1])
    expect(filterSongs(cat, '555').map((s) => s.number)).toEqual([1])
  })

  it('"100" ranks the song numbered 100 first, then melody 1-0-0 songs', () => {
    // song 7 (melody 1-0-0) sits earlier in catalog order, yet the exact number
    // match (song 100) must come first — number beats melody in the union.
    expect(searchSongs(cat, '100').map((r) => r.song.number)).toEqual([100, 7])
  })

  it('"117"-style: exact number ranks above a melody 1-1-7 hit', () => {
    const c = [mk(3, '1 1 7 2'), mk(117, '5 4 3')]
    expect(searchSongs(c, '117').map((r) => r.song.number)).toEqual([117, 3])
  })

  it('1-2 digit queries stay pure number lookups (no melody noise)', () => {
    expect(isNoteQuery('1')).toBe(false)
    expect(isNoteQuery('42')).toBe(false)
    // "42" returns only the song numbered 42, not a song whose melody has 4 then 2.
    const c = [mk(42, '1 2 3'), mk(5, '4 2 1')]
    expect(filterSongs(c, '42').map((s) => s.number)).toEqual([42])
  })
})

describe('note path does not disturb lyric / number / title search', () => {
  // A song whose NUMBER is 12 and whose notes happen to contain '12' as well.
  const numbered = {
    number: 12,
    title_th: 'บทเพลงหมายเลขสิบสอง',
    content: { key: 'C', lines: [[{ type: 'segment', note: '1', lyric: 'ก' }, { type: 'segment', note: '2', lyric: 'ข' }]] },
  }
  const cat = [numbered, v2imported]

  it('a short number query stays a number lookup (no note-path noise)', () => {
    // '12' is not a note query → only the exact haystack hit on the song number.
    expect(filterSongs(cat, '12').map((s) => s.number)).toEqual([12])
  })

  it('lyric search is unchanged by the note path', () => {
    expect(filterSongs([v1, v2], 'เยซู')).toEqual([v2])
    expect(filterSongs([v1, v2], 'มั่นคง')).toEqual([v2])
  })

  it('title search is unchanged', () => {
    expect(filterSongs([v1, v2], 'พระเจ้าดี')).toEqual([v1])
  })
})

describe('search by old book number (B053)', () => {
  // A song that lived at ล.282 (เล่มเล็ก) and ย.274 (เล่มเยอรมัน) in the paper books.
  const withRefs = {
    number: 100,
    title_th: 'ขอสรรเสริญพระเจ้า',
    content: { key: 'G', lines: [[{ type: 'segment', note: '1', lyric: 'ขอ' }]] },
    book_refs: [{ book: 'ล', no: 282 }, { book: 'ย', no: 274 }],
    scripture: 'ยฮ.3:16',
  }
  // A near-neighbour at ล.281 — one digit off. It must NOT show up for a ล.282 lookup.
  const neighbour = {
    number: 5,
    title_th: 'เพลงใกล้เคียง',
    content: { key: 'C', lines: [[{ type: 'segment', note: '1', lyric: 'ใกล้' }]] },
    book_refs: [{ book: 'ล', no: 281 }],
  }
  const cat = [withRefs, neighbour]

  it('finds the song by "code.number" (ล.282)', () => {
    expect(filterSongs(cat, 'ล.282')).toEqual([withRefs])
  })

  it('finds the song by "code number" with a space (ล 282)', () => {
    expect(filterSongs(cat, 'ล 282')).toEqual([withRefs])
  })

  it('finds the song by a different book code (ย.274)', () => {
    expect(filterSongs(cat, 'ย.274')).toEqual([withRefs])
  })

  it('finds the song by the collection real name (เล่มเล็ก 282)', () => {
    expect(filterSongs(cat, 'เล่มเล็ก 282')).toEqual([withRefs])
  })

  it('is exact — a one-digit-off neighbour (ล.281) does NOT match ล.282', () => {
    expect(filterSongs(cat, 'ล.282')).toEqual([withRefs])
    expect(filterSongs(cat, 'ล 282')).toEqual([withRefs])
    // and searching the neighbour's own number returns only it
    expect(filterSongs(cat, 'ล.281')).toEqual([neighbour])
  })

  it('is also searchable by scripture reference', () => {
    expect(filterSongs(cat, 'ยฮ.3:16')).toEqual([withRefs])
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
