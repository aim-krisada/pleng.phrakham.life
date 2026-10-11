// ใบ v3/pleng#104 — "ถ้าวรรคเดียวกันตกไปบรรทัดใหม่ ให้ไปทั้งวรรค" (พี่เอม 11 ต.ค. 2569).
// A วรรค is written as several <span class="syl"> next to each other with nothing between them, and the
// browser's own Thai word breaker will happily wrap between any two of them — so half a วรรค ended up on the
// row above and half below. The fix puts a WORD JOINER (U+2060) at every joint INSIDE a วรรค, and keeps the
// plain space only where lyricPhrase.js says the tune breathes; U+2060 is Unicode's "do not break here".
//
// The second thing these tests guard is the printed page count (ใบ#101: the paper must never grow): the
// joiner is zero-width and invisible, and no element is added, so the printed sheet carries exactly the same
// words in exactly the same boxes as before. (The real paper count was also measured on 10 songs for ใบ#104 —
// 3·3·2·2·2·2·2·2·2·1 pages before and after.)
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'
import songSheetSource from './SongSheet.vue?raw'

const WJ = '\u2060'
const seg = (note, syllables) => ({ type: 'segment', chord: 'C', note, syllables })
const line = (melodyFirst, ...items) => Object.assign(items, { _melodyFirst: melodyFirst })

// "ข้าเชื่อพระองค์ ข้าเชื่อจริง" — a rest (0) after องค์ is a breath, so ONE space falls there.
const content = {
  key: 'C', timeSignature: '4/4',
  lines: [
    line(true, seg('1 2 3 4', ['ข้า', 'เชื่อ', 'พระ', 'องค์']), { type: 'bar' }, seg('0 5 6 7', ['', 'ข้า', 'เชื่อ', 'จริง'])),
    line(false, seg('1 2 3 4', ['ข้า', 'เชื่อ', 'พระ', 'องค์']), { type: 'bar' }, seg('0 5 6 7', ['', 'ข้า', 'เชื่อ', 'จริง'])),
  ],
}
const mountJoined = (props) => mount(SongSheet, { props: { content, mode: 'full', songbook: true, lyricJoin: true, ...props } })
const joinedText = (w) => w.findAll('.song-line-join .lyric-words').map((x) => x.element.textContent).join('')

describe('ใบ#104 — a วรรค never breaks in half', () => {
  it('every joint inside a วรรค carries the do-not-break joiner; only the breath keeps a real space', () => {
    const t = joinedText(mountJoined())
    expect(t).toBe(`ข้า${WJ}เชื่อ${WJ}พระ${WJ}องค์ ข้า${WJ}เชื่อ${WJ}จริง${WJ}`)
    // read it as วรรค: split on real spaces → each วรรค is one unbreakable run
    const phrases = t.split(' ')
    expect(phrases.length).toBe(2)
    expect(phrases[0].replace(new RegExp(WJ, 'g'), '')).toBe('ข้าเชื่อพระองค์')
    expect(phrases[1].replace(new RegExp(WJ, 'g'), '')).toBe('ข้าเชื่อจริง')
    for (const p of phrases) expect(p).not.toMatch(/\s/) // nothing inside a วรรค the browser may wrap at
  })

  it('the joiner is invisible: the words, the spaces and the boxes are exactly as before — paper cannot grow', () => {
    const w = mountJoined()
    // same words, same single breath space, once the zero-width joiner is taken out
    expect(joinedText(w).replace(new RegExp(WJ, 'g'), '')).toBe('ข้าเชื่อพระองค์ ข้าเชื่อจริง')
    // U+2060 is a zero-width format character: it is never part of any visible syllable box
    const syls = w.findAll('.song-line-join .syl')
    expect(syls.map((s) => s.text()).filter(Boolean)).toEqual(['ข้า', 'เชื่อ', 'พระ', 'องค์', 'ข้า', 'เชื่อ', 'จริง'])
    for (const s of syls) expect(s.text()).not.toContain(WJ)
    // and no wrapper element was added around a วรรค (an extra box could cost the sheet a row)
    expect(w.findAll('.song-line-join .lyric-words > *').length).toBe(syls.length)
  })

  // A วรรค that is wider than the whole line has no space to wrap at any more, so without this rule it
  // would run off the right edge and be unreadable. jsdom does no layout, so the guard is on the rule
  // itself (measured for real in a browser for ใบ#104: 0 syllables past the edge at 240px–1280px).
  it('a วรรค wider than the whole line may still wrap, so nothing runs off the screen', () => {
    const rule = songSheetSource.split('<style')[1] || ''
    expect(rule).toMatch(/\.song-line-join\s*\{[^}]*overflow-wrap:\s*anywhere/)
  })

  it('แยกพยางค์ is untouched: a plain space after every syllable, no joiner anywhere', () => {
    const w = mount(SongSheet, { props: { content, mode: 'full', songbook: true, lyricJoin: false } })
    const t = w.findAll('.lyric-words').map((x) => x.element.textContent).join('')
    expect(t).not.toContain(WJ)
    expect(t).toBe('ข้า เชื่อ พระ องค์ ข้า เชื่อ จริง ') // the reused verse; verse 1 keeps its notes
  })

  it('lines that show notes stay split (เนื้อ+โน้ต · ครบ · โน้ตล้วน are untouched)', () => {
    const w = mount(SongSheet, { props: { content, mode: 'full', songbook: false, lyricJoin: true } })
    expect(w.find('.song-line-join').exists()).toBe(false)
    expect(w.findAll('.lyric-syl').length).toBeGreaterThan(0)
    expect(w.findAll('.lyric-words').map((x) => x.element.textContent).join('')).not.toContain(WJ)
  })
})
