// ใบ v1#158 — one melody, words in more than one language (th · en · zh).
// The model rules: which languages a song HAS, which of them to SHOW for the reader's one
// shared choice, the toggle (fixed order, never zero), the missing-language line, and that
// resolveContent carries the extra lines to the sheet without changing a Thai-only song.
import { describe, it, expect } from 'vitest'
import {
  songLangs, rowLyrics, orderLangs, shownLangs, toggleLangChoice, missingLangText,
  displayLangTokens, resolveContent,
} from './songModel.js'

const v2 = (arrangement) => ({
  version: 2,
  key: 'C',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3 4' }]] }],
  arrangement,
})

describe('rowLyrics', () => {
  it('Thai is the existing syllables; another language is lyrics[lang]; missing = []', () => {
    const row = { syllables: ['ก', 'ข'], lyrics: { en: ['a', 'b'] } }
    expect(rowLyrics(row, 'th')).toEqual(['ก', 'ข'])
    expect(rowLyrics(row, 'en')).toEqual(['a', 'b'])
    expect(rowLyrics(row, 'zh')).toEqual([])
    expect(rowLyrics(null, 'en')).toEqual([])
  })
})

describe('songLangs — the languages a song has', () => {
  it('a Thai-only song has Thai only', () => {
    expect(songLangs(v2([{ stanza: 'A', syllables: ['ก', 'ข'] }]))).toEqual(['th'])
  })
  it('Thai + English, in the fixed order, whatever order they are stored in', () => {
    const c = v2([{ stanza: 'A', syllables: ['ก'], lyrics: { zh: ['我'], en: ['I'] } }])
    expect(songLangs(c)).toEqual(['th', 'en', 'zh'])
  })
  it('a language whose slots are all blank does not count', () => {
    expect(songLangs(v2([{ stanza: 'A', syllables: ['ก'], lyrics: { en: ['', ' '] } }]))).toEqual(['th'])
  })
  it('English only (no Thai word) = English only', () => {
    expect(songLangs(v2([{ stanza: 'A', syllables: [], lyrics: { en: ['I'] } }]))).toEqual(['en'])
  })
  it('no words at all (a new song) and a v1 song read as Thai', () => {
    expect(songLangs(v2([{ stanza: 'A', syllables: [] }]))).toEqual(['th'])
    expect(songLangs({ lines: [] })).toEqual(['th'])
    expect(songLangs(null)).toEqual(['th'])
  })
})

describe('shownLangs / toggleLangChoice / missingLangText — the toggle rules', () => {
  const has = ['th', 'en']
  it('shows the chosen languages the song has, always th → en → zh', () => {
    expect(orderLangs(['zh', 'en', 'th', 'en', 'xx'])).toEqual(['th', 'en', 'zh'])
    expect(shownLangs(['en', 'th'], has).shown).toEqual(['th', 'en'])
    expect(shownLangs(['en'], has).shown).toEqual(['en'])
  })
  it('none of the chosen languages → the song’s own languages, Thai first', () => {
    expect(shownLangs(['zh'], has)).toEqual({ shown: ['th', 'en'], missing: ['zh'] })
    expect(shownLangs(['zh'], ['en']).shown).toEqual(['en'])
  })
  it('turning a language on adds it; the order stays fixed regardless of click order', () => {
    expect(toggleLangChoice(['en'], has, 'th')).toEqual(['th', 'en'])
    expect(toggleLangChoice(['th'], ['th', 'en', 'zh'], 'zh')).toEqual(['th', 'zh'])
    expect(toggleLangChoice(['th', 'zh'], ['th', 'en', 'zh'], 'en')).toEqual(['th', 'en', 'zh'])
  })
  it('the last language shown cannot be turned off', () => {
    expect(toggleLangChoice(['th'], has, 'th')).toEqual(['th'])
    expect(shownLangs(toggleLangChoice(['en'], has, 'en'), has).shown).toEqual(['en'])
    // two on → one off is fine
    expect(toggleLangChoice(['th', 'en'], has, 'th')).toEqual(['en'])
  })
  it('a chosen language this song lacks is kept for the next song', () => {
    const next = toggleLangChoice(['th', 'zh'], has, 'en') // this song has no 中文
    expect(next).toEqual(['th', 'en', 'zh'])
    expect(shownLangs(next, ['th', 'zh']).shown).toEqual(['th', 'zh'])
  })
  it('the short Thai line names what is missing and what the song has', () => {
    expect(missingLangText(['th', 'zh'], has)).toBe('เพลงนี้ยังไม่มี 中文 · มี ไทย · English')
    expect(missingLangText(['th', 'en'], has)).toBe('')
  })
})

describe('displayLangTokens — hyphenated words under the notes', () => {
  it('"trea" "-sure" reads "trea-" "sure"; blanks stay blank, also across a held box', () => {
    expect(displayLangTokens(['trea', '-sure', 'is'])).toEqual(['trea-', 'sure', 'is'])
    expect(displayLangTokens(['mea', '', '-sure'])).toEqual(['mea-', '', 'sure'])
    expect(displayLangTokens([' ', 'I '])).toEqual(['', 'I'])
  })
})

describe('resolveContent carries the other languages to the sheet', () => {
  it('a Thai-only song resolves exactly as before (no `lyrics` key on any segment)', () => {
    const lines = resolveContent(v2([{ stanza: 'A', syllables: ['ก', 'ข', 'ค', 'ง'] }]))
    const seg = lines[0].find((x) => x.type === 'segment')
    expect(seg).toEqual({ type: 'segment', note: '1 2 3 4', lyric: 'ก ข ค ง', syllables: ['ก', 'ข', 'ค', 'ง'] })
  })
  it('each segment gets one slot per note box per language, padded, in display form', () => {
    const c = {
      version: 2,
      key: 'C',
      stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2' }, { type: 'bar' }, { type: 'segment', note: '3 4' }]] }],
      arrangement: [{ stanza: 'A', syllables: ['ก', 'ข', 'ค', 'ง'], lyrics: { en: ['trea', '-sure'] } }],
    }
    const segs = resolveContent(c)[0].filter((x) => x.type === 'segment')
    expect(segs[0].lyrics).toEqual({ en: ['trea-', 'sure'] })
    expect(segs[1].lyrics).toEqual({ en: ['', ''] })
    expect(segs[0].syllables).toEqual(['ก', 'ข']) // Thai untouched
  })
  it('a ท่อน without the language still gets blank rows (rows line up across the song)', () => {
    const c = v2([
      { stanza: 'A', syllables: ['ก', 'ข', 'ค', 'ง'], lyrics: { en: ['a', 'b', 'c', 'd'] } },
      { stanza: 'A', syllables: ['จ', 'ฉ', 'ช', 'ซ'] },
    ])
    const lines = resolveContent(c)
    expect(lines[1].find((x) => x.type === 'segment').lyrics).toEqual({ en: ['', '', '', ''] })
  })
})
