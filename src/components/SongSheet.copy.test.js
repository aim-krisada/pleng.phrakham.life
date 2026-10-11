// ใบ v3/pleng#107 — the invisible joiner that keeps a วรรค on one row (ใบ#104) must not leave the page.
// A reader who copies the words and pastes them into a chat or a document must get plain Thai, or a search
// in what they pasted fails on every word that spans a joiner. The screen keeps the joiner; the copy drops it.
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'

const WJ = '⁠'
const seg = (note, syllables) => ({ type: 'segment', chord: 'C', note, syllables })
const content = { key: 'C', timeSignature: '4/4', lines: [[seg('1 2 3 4', ['ข้า', 'เชื่อ', 'พระ', 'องค์']), seg('0 5 6 7', ['', 'ข้า', 'เชื่อ', 'จริง'])]] }

// jsdom has no ClipboardEvent, so stand one up: a copy event that records what the page put on the clipboard
function copyNow(target = document) {
  const put = {}
  const ev = new Event('copy', { bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'clipboardData', { value: { setData: (type, v) => { put[type] = v } } })
  target.dispatchEvent(ev)
  return { put, prevented: ev.defaultPrevented }
}
function select(el) {
  const r = document.createRange()
  r.selectNodeContents(el)
  const s = window.getSelection()
  s.removeAllRanges()
  s.addRange(r)
}

let w
afterEach(() => { window.getSelection().removeAllRanges(); if (w) w.unmount(); w = null })

describe('ใบ#107 — copying the joined words gives plain text', () => {
  it('the screen keeps the joiner, but what is copied has none — same words, same spaces', () => {
    w = mount(SongSheet, { props: { content, showChord: false, showNote: false, showLyric: true, lyricJoin: true }, attachTo: document.body })
    const line = w.find('.song-line-join').element
    expect(line.textContent).toContain(WJ) // the วรรค is still glued on screen (ใบ#104)
    select(line)
    const { put, prevented } = copyNow(line)
    expect(prevented).toBe(true)
    expect(put['text/plain']).not.toContain(WJ)
    expect(put['text/plain'].trim()).toBe('ข้าเชื่อพระองค์ ข้าเชื่อจริง')
  })

  it('a selection that starts above the sheet and runs into it is cleaned too', () => {
    const above = document.createElement('p')
    above.textContent = 'หัวเพลง'
    document.body.appendChild(above)
    w = mount(SongSheet, { props: { content, showChord: false, showNote: false, showLyric: true, lyricJoin: true }, attachTo: document.body })
    const r = document.createRange()
    r.setStart(above.firstChild, 0)
    r.setEndAfter(w.find('.song-line-join').element)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(r)
    const { put } = copyNow(above) // the browser fires copy where the selection starts — outside the sheet
    expect(put['text/plain']).toContain('หัวเพลง')
    expect(put['text/plain']).toContain('ข้าเชื่อพระองค์ ข้าเชื่อจริง')
    expect(put['text/plain']).not.toContain(WJ)
    above.remove()
  })

  it('with nothing to clean (แยกพยางค์), the browser copies exactly as it always has', () => {
    w = mount(SongSheet, { props: { content, showChord: false, showNote: false, showLyric: true, lyricJoin: false }, attachTo: document.body })
    select(w.find('.song-line').element)
    const { put, prevented } = copyNow(w.find('.song-line').element)
    expect(prevented).toBe(false)
    expect(put['text/plain']).toBeUndefined()
  })

  // ใบ v3/pleng#110 — a long วรรค now also carries <wbr> at each word end (where it may wrap). <wbr> is an empty
  // element, not a character, so nothing new can reach the clipboard: the copy is still plain Thai and spaces.
  it('a long วรรค with its word-end wrap points still copies as plain text — no invisible character at all', () => {
    const long = { key: 'C', timeSignature: '4/4', lines: [[
      seg('1 1 1 1', ['เฝ้า', 'หวัง', 'ถูก', 'รับ']), seg('1 1 1 1', ['ถึง', 'เบื้อง', 'พระ', 'พักตร์']),
      seg('0 1 1 1', ['', 'ประ', 'จักษ์', 'ข้าง']), seg('1 1 1 -', ['กาย', 'ที่', 'รัก', '']),
    ]] }
    w = mount(SongSheet, { props: { content: long, showChord: false, showNote: false, showLyric: true, lyricJoin: true }, attachTo: document.body })
    const line = w.find('.song-line-join').element
    expect(line.querySelector('wbr')).not.toBeNull()
    select(line)
    const { put } = copyNow(line)
    expect(put['text/plain'].trim()).toBe('เฝ้าหวังถูกรับถึงเบื้องพระพักตร์ ประจักษ์ข้างกายที่รัก')
    expect(put['text/plain']).not.toMatch(/\p{Cf}/u) // no joiner, no zero-width space, no format mark of any kind
  })

  it('a copy elsewhere on the page, away from the sheet, is left alone', () => {
    const other = document.createElement('p')
    other.textContent = `ก${WJ}ข`
    document.body.appendChild(other)
    w = mount(SongSheet, { props: { content, showChord: false, showNote: false, showLyric: true, lyricJoin: true }, attachTo: document.body })
    select(other)
    const { prevented } = copyNow(other)
    expect(prevented).toBe(false)
    other.remove()
  })
})
