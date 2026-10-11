// ใบ v3/pleng#105 — the third way to write เนื้อล้วน: the breaks the PRINTED songbook drew.
// The book wins wherever it has the line; everywhere else the tune's breaks stay exactly as ใบ#100
// left them, so nothing a reader already uses changes.
import { describe, it, expect } from 'vitest'
import { phraseBreaks, bookLineKey, bookPhraseBreaks } from './lyricPhrase.js'

const S = (si, note, syllables) => ({ si, note, syllables })
const write = (segs, opts) => {
  const br = phraseBreaks(segs, opts)
  let out = ''
  segs.forEach((s) => (s.syllables || []).forEach((w, k) => { if (w) out += w + (br.has(`${s.si}-${k}`) ? ' ' : '') }))
  return out.trim()
}

// เพลง 33 ข้อ 2, line 2. The tune breathes after "แต่" (a held note); the book breaks after "น้อย".
const line33 = [
  S(0, '2 2 2', ['แม้', 'เล็ก', 'น้อย']),
  S(1, '6 - 7', ['แต่', '', 'เป็น']),
  S(2, '1 1 1', ['สิ่ง', 'ที่', 'ข้า']),
  S(3, '5 - 6', ['มี', '', 'ยอม']),
  S(4, '7 1 2', ['นอบ', 'น้อม', 'ให้']),
  S(5, '3 - 2', ['ทรง', '', 'ครอง']),
  S(6, '5 - -', ['ใจ', '', '']),
]

describe('ใบ#105 — ตามต้นฉบับ: where the book breaks, not where the tune breathes', () => {
  it('a line is looked up by its own words, with nothing between them', () => {
    expect(bookLineKey(line33)).toBe('แม้เล็กน้อยแต่เป็นสิ่งที่ข้ามียอมนอบน้อมให้ทรงครองใจ')
    expect(bookLineKey([])).toBe('')
    expect(bookLineKey([S(0, '1 2', ['', ''])])).toBe('')
  })

  it('the book spaces เพลง 33 ข้อ 2 its own way, which is NOT where the tune breathes', () => {
    const key = bookLineKey(line33)
    const byTune = write(line33)
    const byBook = write(line33, { book: { [key]: [2, 8] } })
    expect(byBook).toBe('แม้เล็กน้อย แต่เป็นสิ่งที่ข้ามี ยอมนอบน้อมให้ทรงครองใจ')
    expect(byTune).not.toBe(byBook) // the two ways really do differ here — that is why ใบ#105 exists
  })

  it('a line the book has nothing for keeps the tune breaks (nothing breaks, nothing is guessed)', () => {
    const byTune = write(line33)
    expect(write(line33, { book: { 'คนละเพลงกันเลย': [1] } })).toBe(byTune)
    expect(write(line33, { book: {} })).toBe(byTune)
    expect(write(line33, { book: null })).toBe(byTune)
  })

  it('a line the book prints with NO break inside it is written as one run (not a fallback)', () => {
    const key = bookLineKey(line33)
    expect(write(line33, { book: { [key]: [] } })).toBe('แม้เล็กน้อยแต่เป็นสิ่งที่ข้ามียอมนอบน้อมให้ทรงครองใจ')
    expect(bookPhraseBreaks(line33, { [key]: [] }).size).toBe(0) // found, with no breaks
    expect(bookPhraseBreaks(line33, {})).toBe(null) // not found at all
  })

  it('a break on the last syllable, or past the end, is ignored — a new line is already a break', () => {
    const key = bookLineKey(line33)
    const br = bookPhraseBreaks(line33, { [key]: [-1, 15, 16, 99] })
    expect([...br]).toEqual([]) // 15 is the last syllable (ใจ); the rest are out of range
  })

  it('the book is read off the SYLLABLES, so blank เอื้อน slots never shift a break', () => {
    const segs = [S(0, '1 - 2 - 3', ['ข้า', '', 'เดิน', '', 'ทาง']), S(1, '4 5', ['ไกล', 'มา'])]
    const key = bookLineKey(segs)
    expect(key).toBe('ข้าเดินทางไกลมา')
    const br = bookPhraseBreaks(segs, { [key]: [1] }) // after the 2nd syllable, "เดิน"
    expect([...br]).toEqual(['0-2'])
  })
})
