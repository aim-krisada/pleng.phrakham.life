// ใบ v3/pleng#148 — karaoke in the sheet windows of แก้ไข: find the word being sung, and scroll the window
// (only the window) to it when it is out of view.
import { describe, it, expect, beforeEach } from 'vitest'
import { singTarget, keepInBox } from './singFollow.js'

const rect = (top, h) => ({ top, bottom: top + h, left: 0, right: 100, width: 100, height: h })

let box
beforeEach(() => {
  document.body.innerHTML = `
    <div id="box">
      <span data-seg="2-0"><span data-syl="2-0-1">คำ</span></span>
      <span data-seg="3-1">ท่อน</span>
    </div>`
  box = document.getElementById('box')
  window.matchMedia = () => ({ matches: false })
})

describe('singTarget', () => {
  it('finds the exact syllable first', () => {
    expect(singTarget(box, { li: 2, si: 0 }, { li: 2, si: 0, syk: 1 }).dataset.syl).toBe('2-0-1')
  })
  it('falls back to the segment when the sheet shows no syllables (lyrics only)', () => {
    expect(singTarget(box, { li: 3, si: 1 }, { li: 3, si: 1, syk: 0 }).dataset.seg).toBe('3-1')
    expect(singTarget(box, { li: 3, si: 1 }, null).dataset.seg).toBe('3-1')
  })
  it('nothing sung, or no window → nothing', () => {
    expect(singTarget(box, null, null)).toBe(null)
    expect(singTarget(null, { li: 2, si: 0 }, null)).toBe(null)
  })
})

describe('keepInBox', () => {
  it('a word in view leaves the window where it is', () => {
    const moves = []
    box.scrollTo = (o) => moves.push(o)
    box.getBoundingClientRect = () => rect(0, 600)
    const el = box.querySelector('[data-syl]')
    el.getBoundingClientRect = () => rect(200, 20)
    expect(keepInBox(box, el)).toBe(false)
    expect(moves).toEqual([])
  })
  it('a word below the window brings it a third of the way down', () => {
    const moves = []
    box.scrollTo = (o) => moves.push(o)
    box.getBoundingClientRect = () => rect(100, 600)
    Object.defineProperty(box, 'clientHeight', { value: 600 })
    box.scrollTop = 50
    const el = box.querySelector('[data-syl]')
    el.getBoundingClientRect = () => rect(900, 20)
    expect(keepInBox(box, el)).toBe(true)
    expect(moves[0].top).toBe(50 + 900 - 100 - 200)
  })
})
