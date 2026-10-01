// ใบ v3/pleng#96 เสร็จเมื่อ 4 — the sheet shows the new meter where a melody's meter changes, like the
// book prints "4/4" before รับ in song 306; and a full 4/4 bar in that melody closes its line (B082).
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'
import { resolveContent } from '../lib/songModel.js'

const seg = (note) => ({ type: 'segment', chord: 'C', note })
const SONG = {
  version: 2, key: 'C', timeSignature: '6/8',
  stanzas: [
    { id: 'V', lines: [[seg('1 2 3'), { type: 'bar' }, seg('3 2 1')]] },
    { id: 'R', timeSignature: '4/4', lines: [[seg('1 2 3 4'), { type: 'bar' }, seg('5 4 3 2')]] },
  ],
  arrangement: [
    { stanza: 'V', label: 'ข้อ 1', syllables: [] },
    { stanza: 'R', label: 'รับ', syllables: [] },
  ],
}
const render = (c) => mount(SongSheet, { props: { content: { ...c, lines: resolveContent(c) }, mode: 'full' }, global: { stubs: { Icon: true } } })

describe('ใบ#96 — the sheet marks the meter change', () => {
  it('รับ’s heading carries 4/4; ข้อ 1’s does not', () => {
    const w = render(SONG)
    const labels = w.findAll('.section-label')
    expect(labels.length).toBe(2)
    expect(labels[0].find('.section-meter').exists()).toBe(false)
    expect(labels[1].find('.section-meter').text()).toBe('4/4')
    expect(labels[1].text()).toContain('รับ')
  })
  it('no melody meter → no meter mark anywhere (as before)', () => {
    const c = { ...SONG, stanzas: SONG.stanzas.map(({ timeSignature, ...s }) => s) }
    expect(render(c).findAll('.section-meter').length).toBe(0)
  })
})
