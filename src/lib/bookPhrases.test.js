// ใบ v3/pleng#105 — the data file of book phrasing: it is fetched only when asked for, it covers
// the songs the tool could read, and a song it does not cover says so instead of looking broken.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  bookPhrasesKnown, loadBookPhrases, bookPhraseMap, bookPhraseCoverage, bookPhraseNotice,
  _resetBookPhrasesForTest,
} from './bookPhrases.js'
import { bookLineKey } from './lyricPhrase.js'
import real from '../data/bookPhrases.anuchon.json'

const song = (number, category = 'anuchon') => ({ number, category })
const seg = (syllables) => ({ type: 'segment', note: '1 2 3 4', syllables })

beforeEach(() => { _resetBookPhrasesForTest() })

describe('ใบ#105 — which books have phrasing at all', () => {
  it('เล่มอนุชน does; the other books do not yet, and say so rather than pretending', () => {
    expect(bookPhrasesKnown(song(33))).toBe(true)
    expect(bookPhrasesKnown(song(33, 'main'))).toBe(false)
    expect(bookPhrasesKnown(song(33, 'children'))).toBe(false)
    expect(bookPhrasesKnown(null)).toBe(false)
    expect(bookPhraseNotice(song(33, 'main'), null, [])).toContain('เล่มนี้ยังไม่ได้ทำวรรคจากหนังสือ')
  })
})

describe('ใบ#105 — the file is fetched only when a reader asks for it', () => {
  it('nothing is loaded until loadBookPhrases is called, and it is loaded only once', async () => {
    expect(bookPhraseMap(song(33))).toBe(null)
    loadBookPhrases(song(33))
    loadBookPhrases(song(33)) // a second ask must not start a second fetch
    await new Promise((r) => setTimeout(r, 0))
    expect(bookPhraseMap(song(33))).not.toBe(null)
  })

  it('a song number written as text, or with a stray space, finds the same entry', async () => {
    loadBookPhrases(song(33))
    await new Promise((r) => setTimeout(r, 0))
    expect(bookPhraseMap(song('33'))).toBe(bookPhraseMap(song(33)))
    expect(bookPhraseMap(song(' 033 '))).toBe(bookPhraseMap(song(33)))
    expect(bookPhraseMap(song(null))).toBe(null)
  })
})

describe('ใบ#105 — เพลง 33 came out of the book exactly as the book prints it', () => {
  const m = real.songs['33']
  it('ข้อ 3 บรรทัด 1: "ข้าจะถวายสิ่งใดดี?  แด่ผู้การุณย์มั่นคง" — one break, after ดี?', () => {
    expect(m['ข้าจะถวายสิ่งใดดี?แด่ผู้การุณย์มั่นคง']).toEqual([6])
  })
  it('ข้อ 3 บรรทัด 2: the book breaks it in three — ไม่หวงเวลา · ปัญญา · ความมั่งมี', () => {
    expect(m['ไม่หวงเวลาปัญญาความมั่งมีมอบทุกสิ่งคืนสู่พระองค์']).toEqual([3, 5, 8])
  })
  it('ข้อ 2 บรรทัด 2 breaks after น้อย and มี — NOT after แต่, where the tune breathes', () => {
    expect(m['แม้เล็กน้อยแต่เป็นสิ่งที่ข้ามียอมนอบน้อมให้ทรงครองใจ']).toEqual([2, 8])
  })
  it('ข้อ 1 inherits its melody’s phrasing, so the verse under the staff is covered too', () => {
    expect(m['ข้าจะถวายสิ่งใดดี?แด่ผู้พลีชนม์วางวาย']).toEqual([6])
  })
})

describe('ใบ#105 — how much of what is on screen the book covers', () => {
  const l1 = [seg(['ข้า', 'เดิน', 'ทาง', 'ไกล'])]
  const l2 = [seg(['ข้า', 'เชื่อ', 'พระ', 'องค์'])]
  const lines = [l1, [{ type: 'section', name: 'ข้อ 2' }], l2]
  const map = { [bookLineKey(l1)]: [1] }

  it('lines with no words at all (a section marker) are not counted', () => {
    expect(bookPhraseCoverage(lines, map)).toEqual({ total: 2, covered: 1 })
    expect(bookPhraseCoverage([], map)).toEqual({ total: 0, covered: 0 })
  })

  it('covered in part → the reader is told how much, and that the rest came from the tune', () => {
    const note = bookPhraseNotice(song(33), map, lines)
    expect(note).toContain('1 บรรทัดจาก 2 บรรทัด')
    expect(note).toContain('ตามทำนอง')
  })

  it('covered in full → nothing is said (no noise on a song that is fine)', () => {
    const full = { [bookLineKey(l1)]: [1], [bookLineKey(l2)]: [] }
    expect(bookPhraseNotice(song(33), full, lines)).toBe('')
  })

  it('not covered at all → one plain sentence, no code words', () => {
    const note = bookPhraseNotice(song(999), null, lines)
    expect(note).toBe('เพลงนี้ยังไม่มีวรรคจากหนังสือ ตอนนี้จึงเว้นวรรคตามทำนองให้ก่อน')
  })
})
