// R3 §4.1 — flow.skipSections trims a section from ONE verse's rendition, applied AFTER the
// afterEachVerse refrain is expanded ("กางก่อน แล้วค่อยตัด"): the whole sequence is laid out
// first (verse·refrain·verse·refrain…), then a verse that skips the refrain gets no trailing one.
import { describe, it, expect } from 'vitest'
import { resolvePlayOrder } from './songModel.js'

const song = (arrangement) => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [
    { id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] }, // verse melody
    { id: 'B', lines: [[{ type: 'segment', note: '5 5 5' }]] }, // refrain
  ],
  arrangement,
})

// label each range by its source verse melody vs the refrain (A = li 0, B = li 1)
const shape = (order) => order.map((r) => (r.fromLi === 1 ? 'รับ' : 'ข้อ'))

describe('flow.skipSections vs afterEachVerse (§4.1 table)', () => {
  it('CONTROL: refrain after every verse when no one skips', () => {
    const order = resolvePlayOrder(song([
      { stanza: 'A', label: 'ข้อ 1' },
      { stanza: 'B', label: 'รับ', afterEachVerse: true },
      { stanza: 'A', label: 'ข้อ 2' },
      { stanza: 'A', label: 'ข้อ 3' },
    ]))
    expect(shape(order)).toEqual(['ข้อ', 'รับ', 'ข้อ', 'รับ', 'ข้อ', 'รับ'])
  })

  it('ข้อ 3 skipSections:["B"] → ข้อ 3 has NO trailing refrain, the others keep theirs', () => {
    const order = resolvePlayOrder(song([
      { stanza: 'A', label: 'ข้อ 1' },
      { stanza: 'B', label: 'รับ', afterEachVerse: true },
      { stanza: 'A', label: 'ข้อ 2' },
      { stanza: 'A', label: 'ข้อ 3', flow: { skipSections: ['B'] } },
    ]))
    expect(shape(order)).toEqual(['ข้อ', 'รับ', 'ข้อ', 'รับ', 'ข้อ']) // no รับ after ข้อ 3
  })

  it('skipSections naming a section NOT in the appended sequence is a no-op (not an error)', () => {
    const order = resolvePlayOrder(song([
      { stanza: 'A', label: 'ข้อ 1' },
      { stanza: 'B', label: 'รับ', afterEachVerse: true },
      { stanza: 'A', label: 'ข้อ 2', flow: { skipSections: ['Z'] } }, // Z isn't a real section
    ]))
    expect(shape(order)).toEqual(['ข้อ', 'รับ', 'ข้อ', 'รับ'])
  })
})
