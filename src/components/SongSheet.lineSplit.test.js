// ใบ v3/pleng#116 — on the sheet: เนื้อล้วน writes เพลง 627's 8-bar line as two lyric lines, in all three ways of
// writing the words; a sheet with notes (and its songbook verses) keeps every line exactly as typed.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'
import { resolveContent } from '../lib/songModel.js'
import { bookLineKey } from '../lib/lyricPhrase.js'
import { lineShape } from '../lib/lyricLineSplit.js'
import { song627 } from '../lib/lyricLineSplit.fixture.js'

const content = { key: song627.key, timeSignature: song627.timeSignature, lines: resolveContent(song627) }
const WJ = '⁠'
// what each sheet line reads as, with ' / ' where it is cut into a new lyric line; spaces squeezed
function rows(w) {
  return w.findAll('.song-line').map((l) => {
    const el = l.element.cloneNode(true)
    el.querySelectorAll('.lyric-cut').forEach((c) => c.replaceWith(' / '))
    return el.textContent.split(WJ).join('').replace(/\s+/g, ' ').trim()
  })
}
const lyricsOnly = (props) => mount(SongSheet, { props: { content, showChord: false, showNote: false, showLyric: true, ...props } })

// the book's phrasing of the long line: วรรค ends after "เป็น" (syllable 4) and after "กลาง" (syllable 9)
const line1 = lineShape(content.lines[1]).segs
const bookCut = { [bookLineKey(line1)]: [4, 9] }
// a book that runs the whole line as one วรรค past the bar line — the book wins, so no cut
const bookWhole = { [bookLineKey(line1)]: [4] }

describe('ใบ#116 — เพลง 627 เนื้อล้วน: every verse is 4 lines (เสร็จเมื่อ 1, 3)', () => {
  it('ติดกันเป็นวรรค: the long line is cut after "ศูนย์กลาง", before "ไม่ใช่"', () => {
    const r = rows(lyricsOnly({ lyricJoin: true }))
    expect(r[1]).toBe('มีพระคริสต์ทรงเป็นแกนสารและศูนย์กลาง / ไม่ใช่เพื่อหลักธรรมหรือพิธีศักดิ์สิทธิ์')
    expect(r[4]).toBe('ติดตามพระองค์ไปทรงฉายส่องหนทาง / พระคริสต์ทรงเป็นน้ำชีวิตทิพย์อาหาร')
    expect(r[16]).toBe('โดยน้ำมันชโลมสรรเสริญอธิษฐาน / ไม่ใช่สำเร็จด้วยสมองหรือพิธี')
    r.forEach((row, i) => expect(row.split(' / ')).toHaveLength(i % 3 === 1 ? 2 : 1)) // 7 verses × 4 lines
    // the second half starts a run of its own (a new row), not the tail of the first
    const line = lyricsOnly({ lyricJoin: true }).findAll('.song-line')[1]
    expect(line.findAll('.lyric-cut')).toHaveLength(1)
    expect(line.findAll(':scope > .lyric-words')).toHaveLength(2)
  })

  it('แยกพยางค์: the same cut, each syllable still spaced', () => {
    const r = rows(lyricsOnly({ lyricJoin: false }))
    expect(r[1]).toBe('มี พระ คริสต์ ทรง เป็น แกน สาร และ ศูนย์ กลาง / ไม่ ใช่ เพื่อ หลัก ธรรม หรือ พิ ธี ศักดิ์ สิทธิ์')
    expect(r[0]).toBe('♦ ข้อ 1ใน ชี วิต ทุก วัน หรือ ประ ชุม ทุก อย่าง') // the verse heading, then the words, uncut
  })

  it('ตามต้นฉบับ: where the book has the line, its วรรค decide — a วรรค end on the bar line = the cut', () => {
    const r = rows(lyricsOnly({ lyricJoin: true, bookPhrases: bookCut }))
    expect(r[1]).toBe('มีพระคริสต์ทรงเป็น แกนสารและศูนย์กลาง / ไม่ใช่เพื่อหลักธรรมหรือพิธีศักดิ์สิทธิ์')
  })

  it('ตามต้นฉบับ: a book that carries the วรรค over that bar line keeps the line whole', () => {
    const r = rows(lyricsOnly({ lyricJoin: true, bookPhrases: bookWhole }))
    expect(r[1]).toBe('มีพระคริสต์ทรงเป็น แกนสารและศูนย์กลางไม่ใช่เพื่อหลักธรรมหรือพิธีศักดิ์สิทธิ์')
  })

  it('ตามต้นฉบับ for a song the book does not have = the tune, so the same cut', () => {
    expect(rows(lyricsOnly({ lyricJoin: true, bookPhrases: {} }))[1]).toBe(rows(lyricsOnly({ lyricJoin: true }))[1])
  })

  it('the karaoke keys are the same with or without the cut (every syllable keeps its address)', () => {
    const keys = lyricsOnly({ lyricJoin: true }).findAll('[data-syl]').map((x) => x.attributes('data-syl'))
    expect(keys).toContain('1-4-0') // "ไม่", the first syllable after the cut
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('ใบ#116 — notes on the sheet: nothing changes (เสร็จเมื่อ 5)', () => {
  it('ฝึกร้อง with notes / chords: no cut', () => {
    for (const p of [{ showNote: true, showChord: true }, { showNote: true, showChord: false }, { showNote: false, showChord: true }]) {
      const w = mount(SongSheet, { props: { content, showLyric: true, lyricJoin: true, ...p } })
      expect(w.findAll('.lyric-cut')).toHaveLength(0)
    }
  })

  it('แผ่นเพลง สมุดเพลง (verse 2 printed as words under verse 1\'s notes): no cut, lines as typed', () => {
    for (const lyricJoin of [true, false]) {
      const w = mount(SongSheet, { props: { content, mode: 'full', songbook: true, lyricJoin } })
      expect(w.findAll('.lyric-cut')).toHaveLength(0)
    }
  })
})
