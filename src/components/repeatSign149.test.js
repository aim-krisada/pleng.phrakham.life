// ใบ v3/pleng#149 — พี่เปา 4 พ.ย. 2569: "แก้เครื่องหมายให้หน้าตาถูกต้องหน่อยค่ะ", with a picture of a
// music book's เส้นย้อน (a thin line, a thick line, two SOLID dots on the inner side) beside ours: the
// dots came out as two hollow rings stacked into an "8", and the two lines looked the same weight.
//
// The look lives in the stylesheet, and jsdom lays nothing out, so the shape is held here by reading the
// rules themselves (as ใบ#129 / ใบ#130 do); the order of the strokes is held by mounting the sheet.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'

const STYLES = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8')

// the body of the one rule whose selector is exactly this one — not a rule it only ends a list of
// (`.a::before,\n.a::after {` is the shared dot rule, not the `.a::after` one)
function rule(selector) {
  let i = -1
  for (let at = STYLES.indexOf('\n' + selector + ' {'); at > -1; at = STYLES.indexOf('\n' + selector + ' {', at + 1)) {
    if (!/,\s*$/.test(STYLES.slice(Math.max(0, at - 3), at))) { i = at; break }
  }
  expect(i, `ไม่เจอกฎ ${selector}`).toBeGreaterThan(-1)
  return STYLES.slice(i, STYLES.indexOf('}', i) + 1)
}
// one length of a rule, in em (the sheet is em everywhere — ใบ#130)
function em(selector, prop, which = 0) {
  const m = rule(selector).match(new RegExp(`[\\s;{]${prop}:([^;]+);`))
  expect(m, `${selector} ไม่มี ${prop}`).toBeTruthy()
  if (/^\s*0\s*$/.test(m[1])) return 0
  const ems = [...m[1].matchAll(/([\d.]+)em/g)].map((x) => Number(x[1]))
  expect(ems.length, `${selector} ${prop} ไม่ใช่ em`).toBeGreaterThan(0)
  return ems[which]
}

const thick = () => em('.repeat-mark .rep-bar', 'width')
const thin = () => em('.repeat-mark .rep-thin', 'width')
const dotsBox = () => em('.repeat-mark .rep-dots', 'width')
const gap = () => em('.repeat-mark', 'gap')
// margin: <top> <sides> <bottom>
const side = (selector) => em(selector, 'margin', 1)

describe('ใบ#149 — the two lines of a repeat sign are a THICK one and a thin one', () => {
  it('each line is as wide as the border that draws it', () => {
    expect(em('.repeat-mark .rep-bar', 'border-left')).toBe(thick())
    expect(em('.repeat-mark .rep-thin', 'border-left')).toBe(thin())
  })
  it('the thin line is a plain bar line, and the thick one is three times it', () => {
    expect(thin()).toBe(em('.bar-line', 'border-left'))
    expect(thick() / thin()).toBeGreaterThanOrEqual(3)
  })
})

describe('ใบ#149 — the dots are solid, and two of them, not an "8"', () => {
  const dot = () => {
    const i = STYLES.indexOf('.repeat-mark .rep-dots::before,')
    return STYLES.slice(i, STYLES.indexOf('}', i) + 1)
  }
  it('a dot has no inside — only border — so no hole can show, whatever the box-sizing', () => {
    // `* { box-sizing: border-box }` never reaches ::before/::after: a 5px box with a 2.5px border
    // was a ring around a 5px hole. With no inside there is nothing for the hole to be.
    expect(dot()).toMatch(/[\s;{]width:\s*0;/)
    expect(dot()).toMatch(/[\s;{]height:\s*0;/)
    expect(dot()).toMatch(/border-radius:\s*50%/)
    expect(dot()).toMatch(/border:\s*[\d.]+em solid/)
    expect(dot()).not.toMatch(/(^|[\s;{])background(-color|-image)?:/) // ใบ#129 — must print
  })
  it('the dot fits its own column, and the two dots stand apart with a gap', () => {
    const r = Number(dot().match(/border:\s*([\d.]+)em/)[1])
    const size = 2 * r
    expect(size).toBeLessThanOrEqual(dotsBox())
    const top1 = em('.repeat-mark .rep-dots::before', 'top')
    const top2 = em('.repeat-mark .rep-dots::after', 'top')
    expect(top2 - top1, 'จุดสองจุดซ้อนกัน').toBeGreaterThan(size)
  })
  it('the dots are placed in em, so a taller (stacked) mark keeps them beside the notes', () => {
    expect(rule('.repeat-mark .rep-dots::before')).not.toMatch(/top:\s*[\d.]+%/)
    expect(rule('.repeat-mark .rep-dots::after')).not.toMatch(/top:\s*[\d.]+%/)
  })
})

describe('ใบ#149 — the sign takes the same room it always did, so no line breaks anywhere new', () => {
  // the width before ใบ#149: margins 0.5 + 0.5, thick 0.25, thin 0.125, dots 0.3125, two gaps of 0.125
  const BEFORE = 0.5 + 0.5 + 0.25 + 0.125 + 0.3125 + 2 * 0.125
  const single = () => 2 * side('.repeat-mark') + thick() + thin() + dotsBox() + 2 * gap()
  it('a start or an end sign is exactly as wide as before', () => {
    expect(single()).toBeCloseTo(BEFORE, 6)
  })
  it('a shared sign :‖: is exactly as wide as the two signs it stands for', () => {
    const both = 2 * side('.repeat-mark.rep-both') + thick() + 2 * thin() + 2 * dotsBox() + 4 * gap()
    expect(both).toBeCloseTo(2 * single(), 6)
  })
})

describe('ใบ#149 — each sign draws its strokes in the right order', () => {
  const seg = (note) => ({ type: 'segment', chord: 'C', note, lyric: 'ลา' })
  const mountLine = (line) =>
    mount(SongSheet, { props: { content: { key: 'C', timeSignature: '4/4', lines: [line] }, mode: 'full' } })
  const strokes = (el) => el.findAll('i').map((i) => i.classes()[0])

  it('start ‖: is thick · thin · dots, end :‖ is dots · thin · thick', () => {
    const w = mountLine([{ type: 'repeat-start' }, seg('1 2 3 4'), { type: 'bar' }, seg('5 - - -'), { type: 'repeat-end' }])
    expect(strokes(w.get('.rep-start'))).toEqual(['rep-bar', 'rep-thin', 'rep-dots'])
    expect(strokes(w.get('.rep-end'))).toEqual(['rep-dots', 'rep-thin', 'rep-bar'])
    expect(w.findAll('.rep-both').length).toBe(0)
  })
  it('an end straight followed by a start is ONE shared sign: dots · thin · thick · thin · dots', () => {
    const w = mountLine([
      { type: 'repeat-start' }, seg('1 2 3 4'), { type: 'repeat-end' },
      { type: 'repeat-start' }, seg('5 - - -'), { type: 'repeat-end' },
    ])
    const both = w.findAll('.rep-both')
    expect(both.length).toBe(1)
    expect(strokes(both[0])).toEqual(['rep-dots', 'rep-thin', 'rep-bar', 'rep-thin', 'rep-dots'])
    expect(both[0].attributes('aria-label')).toBeTruthy()
    // the outer start and end of the line are still their own signs
    expect(w.findAll('.rep-start').length).toBe(1)
    expect(w.findAll('.rep-end').length).toBe(1)
    // both bars still print, one on each side of the shared sign
    expect(w.findAll('.segment').length).toBe(2)
  })
  it('a start that follows something else is still a plain start', () => {
    const w = mountLine([seg('1 2 3 4'), { type: 'repeat-end' }, seg('5 - - -'), { type: 'repeat-start' }, seg('1 - - -')])
    expect(w.findAll('.rep-both').length).toBe(0)
    expect(w.findAll('.rep-start').length).toBe(1)
    expect(w.findAll('.rep-end').length).toBe(1)
  })
})
