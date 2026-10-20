// ใบ v3/pleng#128 — แผ่นเพลง names the song's cross-references to other books in the head, next to
// key and meter, in the SHORT form (พี่เปา 19 ต.ค. 2569: "หน้าแผ่นเพลงใส่เป็นอักษรย่อได้").
// The long reading form ("เล่มเล็ก 305") stays on the catalog card and ฝึกร้อง — ใบ#125 §8 here.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'

const seg = (note) => ({ type: 'segment', chord: 'C', note })
const SONG = { key: 'G', timeSignature: '6/8', lines: [[seg('1 2 3')]] }

const render = (props = {}) => mount(SongSheet, {
  props: { content: SONG, mode: 'full', songHead: true, ...props },
  global: { stubs: { Icon: true } },
})
const headText = (w) => (w.find('.sheet-head').exists() ? w.find('.sheet-head').text().replace(/\s+/g, ' ') : null)

describe('ใบ#128 — อ้างอิง in the head of แผ่นเพลง', () => {
  it('names the book refs after the key and meter, as abbreviations', () => {
    expect(headText(render({ bookRefs: [{ book: 'ล', no: 305 }] }))).toBe('คีย์ G จังหวะ 6/8 อ้างอิง ล.305')
  })

  it('several books all show, in the order they were entered', () => {
    const w = render({ bookRefs: [{ book: 'ล', no: 305 }, { book: 'ย', no: 274 }, { book: 'สอ', no: 12 }] })
    expect(headText(w)).toBe('คีย์ G จังหวะ 6/8 อ้างอิง ล.305 · ย.274 · สอ.12')
  })

  it('a book the system does not know is printed as typed (the box is free text — ใบ#125)', () => {
    expect(headText(render({ bookRefs: [{ book: 'กข', no: 7 }] }))).toBe('คีย์ G จังหวะ 6/8 อ้างอิง กข.7')
  })

  it('a reference with no number prints the book alone', () => {
    expect(headText(render({ bookRefs: [{ book: 'ว' }] }))).toBe('คีย์ G จังหวะ 6/8 อ้างอิง ว')
  })

  it('a song with no refs keeps exactly the head it had before — no stray คำว่าอ้างอิง', () => {
    expect(headText(render())).toBe('คีย์ G จังหวะ 6/8')
    expect(headText(render({ bookRefs: [] }))).toBe('คีย์ G จังหวะ 6/8')
    expect(render().find('.sheet-head-refs').exists()).toBe(false)
  })

  it('a malformed entry is dropped rather than printed as a blank', () => {
    expect(headText(render({ bookRefs: [{ no: 5 }, null, { book: 'ล', no: 305 }] }))).toBe('คีย์ G จังหวะ 6/8 อ้างอิง ล.305')
  })

  it('refs alone are enough for a head — a song with neither key nor meter still gets one', () => {
    const bare = { key: '', timeSignature: '', lines: [[seg('1 2 3')]] }
    expect(headText(render({ content: bare, bookRefs: [{ book: 'ล', no: 305 }] }))).toBe('อ้างอิง ล.305')
  })

  it('nothing to say = no head at all, and the printed title keeps its old gap', () => {
    const bare = { key: '', timeSignature: '', lines: [[seg('1 2 3')]] }
    const w = render({ content: bare, songTitle: '143. มารับแผ่นดิน' })
    expect(w.find('.sheet-head').exists()).toBe(false)
    expect(w.find('.sheet-print-title').classes()).not.toContain('has-head')
  })

  it('goes on paper, not just on screen', () => {
    const w = render({ bookRefs: [{ book: 'ล', no: 305 }], songTitle: '143. มารับแผ่นดิน' })
    expect(w.find('.sheet-head').classes()).not.toContain('no-print')
    expect(w.find('.sheet-print-title').classes()).toContain('has-head')
  })

  it('ฝึกร้อง and the editor preview are untouched — no head unless asked for', () => {
    const w = mount(SongSheet, {
      props: { content: SONG, bookRefs: [{ book: 'ล', no: 305 }] },
      global: { stubs: { Icon: true } },
    })
    expect(w.find('.sheet-head').exists()).toBe(false)
    expect(w.text()).not.toContain('ล.305')
  })
})
