// ใบ v3/pleng#110 — wordEnds: where a วรรค too long for the line may wrap. Only at the end of a word, as the
// browser's own Thai word breaker (Intl.Segmenter) reads the whole line — never inside a word.
import { describe, it, expect } from 'vitest'
import { wordEnds } from './lyricPhrase.js'

const segs = (...syllableLists) => syllableLists.map((syllables, si) => ({ si, note: '', syllables }))

describe('ใบ#110 — wordEnds', () => {
  it('marks the syllables that end a word, read on the whole line ("ประ"+"จักษ์" is one word)', () => {
    const s = segs(['ถึง', 'เบื้อง', 'พระ', 'พักตร์'], ['', 'ประ', 'จักษ์', 'ข้าง'])
    const ends = wordEnds(s)
    expect(ends.has('0-0')).toBe(true) // ถึง | เบื้อง
    expect(ends.has('0-3')).toBe(true) // พักตร์ | ประจักษ์
    expect(ends.has('1-1')).toBe(false) // ประ + จักษ์ — inside one word
    expect(ends.has('1-2')).toBe(true) // ประจักษ์ | ข้าง
    expect(ends.has('1-3')).toBe(false) // the line's last syllable
  })

  it("agrees with Intl.Segmenter('th') on the same words", () => {
    const sy = ['เฝ้า', 'หวัง', 'ถูก', 'รับ', 'ประ', 'จักษ์', 'ข้าง', 'กาย', 'ที่', 'รัก']
    const ends = wordEnds(segs(sy))
    const bounds = new Set()
    for (const p of new Intl.Segmenter('th', { granularity: 'word' }).segment(sy.join(''))) bounds.add(p.index)
    let off = 0
    sy.forEach((w, k) => { off += w.length; if (k < sy.length - 1) expect(ends.has(`0-${k}`)).toBe(bounds.has(off)) })
  })

  it("skips empty slots and never marks the line's last syllable", () => {
    const ends = wordEnds(segs(['ข้า', '', 'เดิน'], ['ไป', '', '']))
    expect(ends.has('1-0')).toBe(false) // ไป is the last word of the line
    expect(ends.has('0-1')).toBe(false) // an empty slot is never a syllable
    expect(ends.has('0-0')).toBe(true)
  })

  it('a browser without a word breaker gets null — nothing is claimed', () => {
    expect(wordEnds(segs(['ข้า', 'เดิน']), { segmenter: null })).toBeNull()
  })
})
