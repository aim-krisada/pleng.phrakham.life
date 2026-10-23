// Each word sits exactly under its own note (พี่เอม 23 ต.ค. 2569: "เพลงแสดงคำร้อง (พยางค์) ควรอยู่ใต้โน๊ตพอดี"
// — ในหน้าแผ่นเพลง). The note row and the word row spread across a bar in different ways, so once ใบ#132
// let short lines grow to the margins, words sat up to 81 px away from their notes (song 114).
// pinWords() now places every word by its note's centre, and widenNoteSlots() makes each note slot at
// least as wide as its widest word so two words never run into each other.
// jsdom has no layout, so a fake one is laid out here: note k of a bar at 100 + 40k (20 px wide), each
// word 10 px per letter, the word row starting at x = 90.
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'
import { resolveContent } from '../lib/songModel.js'

const seg = (note, chord = 'C') => ({ type: 'segment', chord, note })
const bar = { type: 'bar' }
const A = [seg('1 2 3 4'), bar, seg('5 - - -', 'G')]
const A2 = [seg('1 2', 'C'), seg('3 4', 'F'), bar, seg('5 - - -', 'G')]
const song = (lines, syllables) => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'V', lines }],
  arrangement: [{ stanza: 'V', label: 'ข้อ 1', syllables }],
})
const words1 = ['ข้า', 'เดิน', 'ทาง', 'ไกลมาก', 'ไป', '', '', '']
const words2 = ['พระ', 'องค์', 'ทรง', 'นำ', 'ทาง', '', '', '']

const ROW_LEFT = 90
const ntLeft = (k) => 100 + 40 * k
const realRect = Element.prototype.getBoundingClientRect
function fakeLayout() {
  Element.prototype.getBoundingClientRect = function () {
    const box = (left, width) => ({ left, width, right: left + width, top: 0, bottom: 20, height: 20, x: left, y: 0 })
    if (this.classList.contains('nt')) return box(ntLeft(Number(this.dataset.idx)), 20)
    if (this.classList.contains('syl')) {
      const w = this.textContent.length * 10
      return box(ROW_LEFT + (parseFloat(this.style.left) || 0), w)
    }
    if (this.classList.contains('lyric-syl')) return box(ROW_LEFT, 300)
    return box(0, 0)
  }
}
afterEach(() => { Element.prototype.getBoundingClientRect = realRect })

const settle = () => new Promise((r) => setTimeout(r, 40)) // the sheet measures on a 16 ms timer
async function sheet(content) {
  const w = mount(SongSheet, {
    attachTo: document.body,
    props: { content: { ...content, lines: resolveContent(content) }, mode: 'full', songbook: true, fitLines: true },
  })
  await settle()
  window.dispatchEvent(new Event('resize'))
  await settle()
  return w
}
const centre = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2 }

describe('แผ่นเพลง — each word sits exactly under its own note', () => {
  it('every word is centred on its note, held notes included', async () => {
    fakeLayout()
    const w = await sheet(song([A], words1))
    const boxes = w.findAll('.lyric-syl')
    expect(boxes.length).toBe(2)
    for (const b of boxes) {
      expect(b.attributes('data-pin')).toBe('')
      const segEl = b.element.closest('.segment')
      for (const s of b.findAll('.syl')) {
        const nt = segEl.querySelector(`.nt[data-idx="${s.attributes('data-slot')}"]`)
        expect(Math.abs(centre(s.element) - centre(nt))).toBeLessThan(0.02)
      }
    }
    w.unmount()
  })

  it('a note slot is made at least as wide as its word, so long words on close notes cannot touch', async () => {
    fakeLayout()
    const w = await sheet(song([A], words1))
    const nts = w.findAll('.segment')[0].findAll('.nt')
    // ไกลมาก = 6 letters = 60 px; + a 0.3em gap (4.8 px at 16 px) = 64.8 px = 4.05em
    expect(nts[3].element.style.minWidth).toBe('max(1.05em, 4.050em)')
    w.unmount()
  })

  it('words stacked from the line below (ใบ#131) are pinned too, one row down', async () => {
    fakeLayout()
    const w = await sheet(song([A, A2], [...words1, ...words2]))
    const stacked = w.findAll('.syl-stacked')
    expect(stacked.length).toBeGreaterThan(0)
    for (const s of stacked) {
      expect(s.attributes('data-row')).toBe('1')
      expect(s.element.style.top).toBe('calc(1 * 1em * var(--lh-snug))')
      const nt = s.element.closest('.segment').querySelector(`.nt[data-idx="${s.attributes('data-slot')}"]`)
      expect(Math.abs(centre(s.element) - centre(nt))).toBeLessThan(0.02)
    }
    // the row is two lines tall, so the bar's height still reaches the last row
    expect(w.find('.lyric-syl').element.style.height).toBe('calc(2 * 1em * var(--lh-snug))')
    w.unmount()
  })

  it('a word with no note to sit under keeps the plain row', async () => {
    fakeLayout()
    const w = await sheet(song([A], words1))
    const b = w.findAll('.lyric-syl')[0]
    b.element.closest('.segment').querySelector('.nt[data-idx="3"]').remove() // word 3 loses its note
    window.dispatchEvent(new Event('resize'))
    await settle()
    expect(b.attributes('data-pin')).toBeUndefined()
    expect(b.findAll('.syl').every((s) => s.element.style.left === '')).toBe(true)
    w.unmount()
  })

  it('no layout (nothing measured yet) → nothing is moved', async () => {
    const w = await sheet(song([A], words1))
    expect(w.findAll('.lyric-syl[data-pin]').length).toBe(0)
    w.unmount()
  })
})
