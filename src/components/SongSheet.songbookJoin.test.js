// ใบ v3/pleng#101 — แผ่นเพลง แบบสมุดเพลง: the first verse prints its notes (syllables split, each under its note);
// a later verse that reuses the melody prints words only — and those lines can be written "ติดกันเป็นวรรค" with
// the same breaks as ฝึกร้อง (ใบ#100). Lines with notes never join, whatever is picked.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'

const seg = (note, syllables) => ({ type: 'segment', chord: 'C', note, syllables })
const line = (melodyFirst, ...items) => Object.assign(items, { _melodyFirst: melodyFirst })
// verse 1 (first use of the melody) + verse 2 (same melody → lyrics only in songbook)
const content = {
  key: 'C', timeSignature: '4/4',
  lines: [
    line(true, { type: 'section', name: 'ข้อ 1' }, seg('1 2 3 4', ['ข้า', 'เดิน', 'ทาง', 'ไกล']), { type: 'bar' }, seg('5 - - -', ['ไป', ''])),
    line(false, { type: 'section', name: 'ข้อ 2' }, seg('1 2 3 4', ['ข้า', 'เชื่อ', 'พระ', 'องค์']), { type: 'bar' }, seg('5 - - -', ['เจ้า', ''])),
  ],
}
const mountSheet = (props) => mount(SongSheet, { props: { content, mode: 'full', songbook: true, ...props } })
const lines = (w) => w.findAll('.song-line')

describe('ใบ#101 — สมุดเพลง: reused verses join, the verse with notes stays split', () => {
  it('lyricJoin on: verse 1 keeps its notes and split syllables; verse 2 is one joined run', () => {
    const w = mountSheet({ lyricJoin: true })
    const [v1, v2] = lines(w)
    expect(v1.classes()).not.toContain('song-line-join')
    expect(v1.findAll('.nt').length).toBeGreaterThan(0) // notes still print on the first verse
    expect(v1.findAll('.lyric-syl .syl').map((s) => s.text()).filter(Boolean)).toEqual(['ข้า', 'เดิน', 'ทาง', 'ไกล', 'ไป'])
    expect(v2.classes()).toContain('song-line-join')
    expect(v2.findAll('.nt').length).toBe(0)
    expect(v2.findAll('.lyric-words').map((x) => x.element.textContent).join('')).toBe('ข้าเชื่อพระองค์เจ้า')
  })
  it('lyricJoin off (แยกพยางค์): verse 2 is split exactly as before', () => {
    const w = mountSheet({ lyricJoin: false })
    const v2 = lines(w)[1]
    expect(v2.classes()).not.toContain('song-line-join')
    expect(v2.findAll('.lyric-words').map((x) => x.element.textContent).join('')).toBe('ข้า เชื่อ พระ องค์ เจ้า ')
  })
  it('แบบเต็ม (not songbook): every verse has notes, so nothing joins even with lyricJoin on', () => {
    const w = mountSheet({ songbook: false, lyricJoin: true })
    expect(w.find('.song-line-join').exists()).toBe(false)
  })
  it('a *** marker stays inline with the joined words (as a block it cost every refrain a printed row)', () => {
    const c = { ...content, lines: [content.lines[0], line(false, { type: 'marker', label: '***' }, ...content.lines[1].slice(1))] }
    const w = mount(SongSheet, { props: { content: c, mode: 'full', songbook: true, lyricJoin: true } })
    const v2 = lines(w)[1]
    expect(v2.classes()).toContain('song-line-join')
    expect(v2.find('.section-marker').exists()).toBe(true)
  })
})
