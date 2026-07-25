// Bulk-lyric engine (songLyrics) — paste a verse's words, land them on the melody's attack notes.
// Expectations are derived from the model's rule (a verse's syllables align 1:1 with syllable-bearing
// note boxes; words sit on ATTACK notes, held/rest boxes stay blank), mirroring the old boxed
// editor's per-verse textarea so the inline editor gets the identical behaviour.
import { describe, it, expect } from 'vitest'
import {
  stanzaNoteKinds, wordsToSyllables, syllablesToWords, verseLyricText, syllablesFromText,
  segmentThai, withVerseText, withVerseAutoSegmented,
} from './songLyrics.js'

// a melody "1 - 3": attack, held (the '-'), attack → two syllable slots on the attacks
const song = (note, syllables = []) => ({
  version: 2,
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note }]] }],
  arrangement: [{ stanza: 'A', label: '', syllables }],
})

describe('stanzaNoteKinds', () => {
  it('lists attack / held in reading order, dropping struct brackets', () => {
    expect(stanzaNoteKinds(song('1 - 3'), 'A')).toEqual(['attack', 'held', 'attack'])
    expect(stanzaNoteKinds(song('( 1 2 )'), 'A')).toEqual(['attack', 'attack']) // brackets bear no slot
    expect(stanzaNoteKinds(song('1 0 3'), 'A')).toEqual(['attack', 'held', 'attack']) // 0 = rest = blank
  })
  it('empty for an unknown stanza', () => {
    expect(stanzaNoteKinds(song('1 2'), 'Z')).toEqual([])
  })
})

describe('wordsToSyllables ⇄ syllablesToWords', () => {
  it('words land on attack notes; held/rest slots stay blank', () => {
    expect(wordsToSyllables(song('1 - 3'), 'A', ['ก', 'ข'])).toEqual(['ก', '', 'ข'])
  })
  it('extra words overflow past the melody; trailing blanks are trimmed', () => {
    expect(wordsToSyllables(song('1 - 3'), 'A', ['ก', 'ข', 'ค', 'ง'])).toEqual(['ก', '', 'ข', 'ค', 'ง'])
    expect(wordsToSyllables(song('1 2 3'), 'A', ['ก'])).toEqual(['ก']) // trailing blanks trimmed
  })
  it('reads back only the attack-slot words (round-trips)', () => {
    const syl = wordsToSyllables(song('1 - 3'), 'A', ['ก', 'ข'])
    expect(syllablesToWords(song('1 - 3'), 'A', syl)).toEqual(['ก', 'ข'])
  })
})

describe('verseLyricText ⇄ syllablesFromText (the textarea round-trip)', () => {
  it('text → syllables → text is stable', () => {
    const c = song('1 - 3')
    const syl = syllablesFromText(c, 'A', 'ก ข')
    expect(syl).toEqual(['ก', '', 'ข'])
    expect(verseLyricText(c, 'A', syl)).toBe('ก ข')
  })
  it('a hyphen keeps two syllables inside one word (no space)', () => {
    // "1 2" = two attacks; "พระ-เจ้า" = one word, two syllables → both land, joined by hyphen back
    const c = song('1 2')
    const syl = syllablesFromText(c, 'A', 'พระ-เจ้า')
    expect(syl).toEqual(['พระ', '-เจ้า'])
    expect(verseLyricText(c, 'A', syl)).toBe('พระ-เจ้า')
  })
})

describe('segmentThai', () => {
  it('splits on commas into phrases, then into tokens', () => {
    expect(segmentThai('ก,ข')).toEqual(['ก', 'ข']) // deterministic regardless of the Thai dictionary
  })
  it('breaks a spaceless run into more than one token (ICU word dict)', () => {
    const toks = segmentThai('ไปโรงเรียน')
    expect(toks.length).toBeGreaterThan(1) // it actually segmented, not one blob
    expect(toks.join('')).toBe('ไปโรงเรียน') // and lost nothing
  })
  it('empty / whitespace → no tokens', () => {
    expect(segmentThai('')).toEqual([])
    expect(segmentThai('   ')).toEqual([])
  })
})

describe('withVerseText / withVerseAutoSegmented (immutable content writes)', () => {
  it('sets the verse\'s syllables from the pasted text, sharing untouched content', () => {
    const c = song('1 - 3')
    const next = withVerseText(c, 0, 'ก ข')
    expect(next.arrangement[0].syllables).toEqual(['ก', '', 'ข'])
    expect(next).not.toBe(c)
    expect(next.stanzas).toBe(c.stanzas) // melody untouched → shared ref
  })
  it('is a no-op (same ref) for a bad index / non-arrangement content', () => {
    const c = song('1 2')
    expect(withVerseText(c, 9, 'x')).toBe(c)
    expect(withVerseText({ version: 2 }, 0, 'x')).toEqual({ version: 2 })
  })
  it('auto-segments a verse pasted as a spaceless blob onto its notes', () => {
    // three attacks; one word "ไปโรงเรียน" pasted (no spaces) → segment → maps across the notes
    const c = song('1 2 3', ['ไปโรงเรียน'])
    const next = withVerseAutoSegmented(c, 0)
    const words = syllablesToWords(next, 'A', next.arrangement[0].syllables)
    expect(words.length).toBeGreaterThan(1) // it split the blob
    expect(words.join('')).toBe('ไปโรงเรียน') // conserving every character
  })
})
