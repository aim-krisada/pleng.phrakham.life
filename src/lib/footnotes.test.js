// ใบ v3/pleng#178 — several footnotes: `*` in the words → ¹ ² ³, one footnote line per mark (P'Aim 18 พ.ย. 2569)
import { describe, it, expect } from 'vitest'
import { footnoteItems, footnoteStarCount, numberFootnoteStars, supNum } from './footnotes.js'
import { resolveContent } from './songModel.js'

const S = (arrangement, footnote) => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] }, { id: 'R', lines: [[{ type: 'segment', note: '3 4' }]] }],
  arrangement, ...(footnote != null ? { footnote } : {}),
})
const syls = (c) => resolveContent(c).map((l) => l.filter((x) => x.type === 'segment').flatMap((x) => x.syllables))

describe('footnotes', () => {
  it('supNum writes small digits, two-digit numbers too', () => {
    expect(supNum(1)).toBe('¹')
    expect(supNum(12)).toBe('¹²')
  })
  it('one item per non-empty line', () => {
    expect(footnoteItems(' ก \n\n ข\r\n')).toEqual(['ก', 'ข'])
    expect(footnoteItems(undefined)).toEqual([])
  })
  it('each * becomes the next number in song order', () => {
    const c = S([{ stanza: 'A', syllables: ['เชื่อ*', 'ไว้*'] }, { stanza: 'R', syllables: ['รัก*', 'เขา'] }], 'ก\nข\nค')
    expect(syls(c)).toEqual([['เชื่อ¹', 'ไว้²'], ['รัก³', 'เขา']])
    expect(footnoteStarCount(c)).toBe(3)
  })
  it('a ท่อน sung again with the same words keeps its numbers', () => {
    const R = { stanza: 'R', syllables: ['รัก*', 'เขา'] }
    const c = S([R, { stanza: 'A', syllables: ['เชื่อ*', 'ไว้'] }, { ...R }], 'ก\nข')
    expect(syls(c)).toEqual([['รัก¹', 'เขา'], ['เชื่อ²', 'ไว้'], ['รัก¹', 'เขา']])
    expect(footnoteStarCount(c)).toBe(2)
  })
  it('no footnote lines → the * is left as typed', () => {
    const c = S([{ stanza: 'A', syllables: ['เชื่อ*', 'ไว้'] }])
    expect(numberFootnoteStars(c)).toBe(c)
    expect(syls(c)).toEqual([['เชื่อ*', 'ไว้']])
  })
  it('the stored song is not changed', () => {
    const c = S([{ stanza: 'A', syllables: ['เชื่อ*', 'ไว้'] }], 'ก')
    resolveContent(c)
    expect(c.arrangement[0].syllables).toEqual(['เชื่อ*', 'ไว้'])
  })
})

// ใบ#178 รอบ 3 — the editor names the word each number sits on
import { footnoteMarks } from './footnotes.js'
describe('footnoteMarks', () => {
  it('lists each mark with its word and ท่อน, a repeated ท่อน adds none', () => {
    const R = { stanza: 'R', label: 'รับ', syllables: ['รัก*', 'เขา'] }
    const c = S([{ stanza: 'A', label: 'ข้อ 1', syllables: ['เชื่อ*', 'ไว้'] }, R, { ...R }], 'ก\nข')
    expect(footnoteMarks(c)).toMatchObject([{ n: 1, word: 'เชื่อ', where: 'ข้อ 1', before: '', after: 'ไว้', ei: 0, k: 0, text: 'ก' }, { n: 2, word: 'รัก', where: 'รับ', before: '', after: 'เขา', ei: 1, k: 0, text: 'ข' }])
  })
})

// ใบ#178 รอบ 4 — notes live on the words (arrangement[].notes), one per * in that row
import { reconcileNotes, moveLineNotesToWords, footnoteFree } from './footnotes.js'
describe('หมายเหตุของคำ', () => {
  it('reads each note from its word, and the footnote is all free text', () => {
    const c = S([{ stanza: 'A', syllables: ['เชื่อ*', 'ไว้*'], notes: ['ก', ''] }], 'อิสระ')
    expect(footnoteMarks(c).map((m) => m.text)).toEqual(['ก', ''])
    expect(footnoteFree(c)).toBe('อิสระ')
    expect(syls(c)).toEqual([['เชื่อ¹', 'ไว้²']])
  })
  it('no note written yet → the * stays a *', () => {
    const c = S([{ stanza: 'A', syllables: ['เชื่อ*', 'ไว้'], notes: [''] }])
    expect(numberFootnoteStars(c)).toBe(c)
  })
  it('a * added before keeps every note on its word', () => {
    expect(reconcileNotes(['เชื่อ', 'ไว้*'], ['เชื่อ*', 'ไว้*'], ['ข'])).toEqual(['', 'ข'])
    expect(reconcileNotes(['เชื่อ*', 'ไว้'], ['เชื่อ*', 'ไว้*'], ['ก'])).toEqual(['ก', ''])
  })
  it('a * removed takes only its own note away', () => {
    expect(reconcileNotes(['ก*', 'ข*', 'ค*'], ['ก*', 'ข', 'ค*'], ['1', '2', '3'])).toEqual(['1', '3'])
  })
  it('retyping a starred word keeps its note', () => {
    expect(reconcileNotes(['เชื่อ*'], ['เชือ*'], ['ก'])).toEqual(['ก'])
  })
  it('an older song: footnote lines move onto the words, extra lines stay free text', () => {
    const c = S([{ stanza: 'A', syllables: ['เชื่อ*', 'ไว้'] }, { stanza: 'R', syllables: ['รัก*', 'เขา'] }], 'ก\nข\nอิสระ')
    expect(footnoteFree(c)).toBe('อิสระ')
    const m = moveLineNotesToWords(c)
    expect(m.arrangement.map((e) => e.notes)).toEqual([['ก'], ['ข']])
    expect(m.footnote).toBe('อิสระ')
    expect(moveLineNotesToWords({ ...c, arrangement: m.arrangement, footnote: m.footnote })).toBe(null)
  })
})
