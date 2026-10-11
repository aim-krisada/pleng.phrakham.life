// ใบ v3/pleng#105 — the sheet writes เนื้อล้วน with the book's own breaks when it is handed them,
// and with the tune's breaks everywhere the book has nothing. Both ways already in use are untouched.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'
import { bookLineKey } from '../lib/lyricPhrase.js'

const seg = (note, syllables) => ({ type: 'segment', chord: 'C', note, syllables })
// "แม้เล็กน้อยแต่ | เป็นสิ่งที่ข้ามี" by the tune (แต่ is held); "แม้เล็กน้อย | แต่เป็นสิ่งที่ข้ามี" in the book
const row = [seg('2 2 2', ['แม้', 'เล็ก', 'น้อย']), seg('6 - 7', ['แต่', '', 'เป็น']), seg('1 1 1', ['สิ่ง', 'ที่', 'ข้า']), seg('5 - -', ['มี', '', ''])]
const other = [seg('1 2 3 4', ['ข้า', 'เดิน', 'ทาง', 'ไกล'])]
const content = { key: 'C', timeSignature: '4/4', lines: [row, other] }

// ใบ v3/pleng#107 — since ใบ#104 the joined text also carries an invisible WORD JOINER (U+2060) at every joint
// INSIDE a วรรค, so the browser cannot wrap a วรรค in half. It has no width and no glyph, so what a reader SEES
// is the text with it taken out — that is what `words` compares. `raw` keeps it, to check the วรรค hold together.
const WJ = '⁠'
const raw = (w, i = 0) => w.findAll('.song-line')[i].findAll('.lyric-words').map((x) => x.element.textContent).join('').trim()
const words = (w, i = 0) => raw(w, i).split(WJ).join('')
const mountSheet = (props) => mount(SongSheet, { props: { content, showChord: false, showNote: false, showLyric: true, ...props } })

const bookMap = { [bookLineKey(row.map((s, si) => ({ ...s, si })))]: [2] } // the book breaks after น้อย

describe('ใบ#105 เสร็จเมื่อ 1 — ตามต้นฉบับ on the sheet', () => {
  it('with the book handed in, the line is spaced the way the book prints it', () => {
    const w = mountSheet({ lyricJoin: true, bookPhrases: bookMap })
    expect(words(w)).toBe('แม้เล็กน้อย แต่เป็นสิ่งที่ข้ามี')
  })

  it('without it, the tune decides — the behaviour ใบ#100 shipped, unchanged', () => {
    const w = mountSheet({ lyricJoin: true })
    expect(words(w)).toBe('แม้เล็กน้อยแต่ เป็นสิ่งที่ข้ามี')
  })

  it('a line the book does not have falls back to the tune, on the very same sheet', () => {
    const w = mountSheet({ lyricJoin: true, bookPhrases: bookMap })
    expect(words(w, 0)).toBe('แม้เล็กน้อย แต่เป็นสิ่งที่ข้ามี') // from the book
    expect(words(w, 1)).toBe(words(mountSheet({ lyricJoin: true }), 1)) // from the tune
  })

  // ใบ#104 and ใบ#105 together: the book decides WHERE the spaces go, and every วรรค between two spaces is
  // still one piece the wrap cannot tear. The only places left to wrap are the book's own spaces.
  it('with the book, each วรรค is still held together — the only wrap points are the spaces the book prints', () => {
    const w = mountSheet({ lyricJoin: true, bookPhrases: bookMap })
    expect(raw(w)).toBe(`แม้${WJ}เล็ก${WJ}น้อย แต่${WJ}เป็น${WJ}สิ่ง${WJ}ที่${WJ}ข้า${WJ}มี${WJ}`)
  })

  it('แยกพยางค์ ignores the book entirely — a space after every syllable, as always', () => {
    const w = mountSheet({ lyricJoin: false, bookPhrases: bookMap })
    expect(words(w)).toBe('แม้ เล็ก น้อย แต่ เป็น สิ่ง ที่ ข้า มี')
  })

  it('handing in a book changes nothing where the notes also show (only เนื้อล้วน joins)', () => {
    const w = mount(SongSheet, { props: { content, mode: 'full', bookPhrases: bookMap, lyricJoin: true } })
    expect(w.find('.song-line-join').exists()).toBe(false)
  })
})
