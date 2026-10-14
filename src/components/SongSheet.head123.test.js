// ใบ v3/pleng#123 — แผ่นเพลง states the song's key and meter once at the top, like any printed score, and a
// key or meter that changes in the middle of the song is still named where it changes (ใบ#95 · ใบ#96).
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'
import { resolveContent } from '../lib/songModel.js'
import { transposeKey } from '../lib/chords.js'

const seg = (note) => ({ type: 'segment', chord: 'C', note })
// song 306's shape: ข้อ 6/8 (the song's meter) · รับ 4/4 (its own melody meter) · ข้อ 2 back on 6/8
const SONG_306 = {
  version: 2, key: 'G', timeSignature: '6/8',
  stanzas: [
    { id: 'A', lines: [[seg('1 2 3'), { type: 'bar' }, seg('3 2 1')]] },
    { id: 'B', timeSignature: '4/4', lines: [[seg('1 2 3 4'), { type: 'bar' }, seg('5 4 3 2')]] },
  ],
  arrangement: [
    { stanza: 'A', label: '', syllables: [] },
    { stanza: 'B', label: 'รับ', syllables: [] },
    { stanza: 'A', label: 'ข้อ 2', syllables: [] },
  ],
}
// song 85's shape: a C song whose รับ 2 is in A (ใบ#95)
const SONG_85 = {
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'V', lines: [[seg('5 5 5 5')]] }, { id: 'R', lines: [[seg('1 2 3 4')]] }],
  arrangement: [
    { stanza: 'V', label: 'ร้อง 1', syllables: [] },
    { stanza: 'R', label: 'รับ 1', syllables: [] },
    { stanza: 'R', label: 'รับ 2', syllables: [], key: 'A' },
    { stanza: 'V', label: 'ร้อง 2', syllables: [] },
  ],
}
const render = (c, props = {}) => mount(SongSheet, {
  props: { content: { ...c, lines: resolveContent(c) }, mode: 'full', songHead: true, ...props },
  global: { stubs: { Icon: true } },
})
const sections = (w) => w.findAll('.section-label').map((l) => ({
  text: l.text(),
  key: l.find('.section-key').exists() ? l.find('.section-key').text() : '',
  meter: l.find('.section-meter').exists() ? l.find('.section-meter').text() : '',
}))

describe('ใบ#123 — the head: key and meter once at the top of the sheet', () => {
  it('names the key and the main meter, before the first line of music', () => {
    const w = render(SONG_306)
    const head = w.find('.sheet-head')
    expect(head.exists()).toBe(true)
    expect(head.text().replace(/\s+/g, ' ')).toBe('คีย์ G จังหวะ 6/8')
    // it sits above every line of the song
    const html = w.html()
    expect(html.indexOf('sheet-head')).toBeLessThan(html.indexOf('song-line'))
  })

  it('every song gets it — a v1 song (flat lines) too', () => {
    const v1 = { key: 'D', timeSignature: '3/4', lines: [[seg('1 2 3')]] }
    const w = mount(SongSheet, { props: { content: v1, songHead: true }, global: { stubs: { Icon: true } } })
    expect(w.find('.sheet-head').text().replace(/\s+/g, ' ')).toBe('คีย์ D จังหวะ 3/4')
  })

  it('follows the key the sheet is shown in, like the chords (a G song printed in A says คีย์ A)', () => {
    const w = render(SONG_306, { displayKey: 'A' })
    expect(w.find('.sheet-head').text().replace(/\s+/g, ' ')).toBe('คีย์ A จังหวะ 6/8')
  })

  it('is printed too: the printed title keeps a smaller gap so the head fits under it', () => {
    const w = render(SONG_306, { songTitle: '306. ทดสอบ' })
    expect(w.find('.sheet-print-title').classes()).toContain('has-head')
    // the head carries no no-print class: it goes on paper as well as on screen
    expect(w.find('.sheet-head').classes()).not.toContain('no-print')
  })

  it('is off unless asked for — ฝึกร้อง and the editor preview stay as they are', () => {
    const w = mount(SongSheet, { props: { content: { ...SONG_306, lines: resolveContent(SONG_306) }, songTitle: 'x' }, global: { stubs: { Icon: true } } })
    expect(w.find('.sheet-head').exists()).toBe(false)
    expect(w.find('.sheet-print-title').classes()).not.toContain('has-head')
  })
})

describe('ใบ#123 — a change in the middle is still named where it happens', () => {
  it('song 306: รับ still shows 4/4 and ข้อ 2 shows 6/8 again', () => {
    const s = sections(render(SONG_306))
    expect(s.map((x) => x.meter)).toEqual(['', '4/4', '6/8'])
    expect(s[1].text).toContain('รับ')
  })

  it('song 85: รับ 2 shows its own key, and ร้อง 2 shows the song key coming back', () => {
    const s = sections(render(SONG_85))
    expect(s.map((x) => x.key)).toEqual(['', '', 'คีย์ A', 'คีย์ C'])
    // the head names the song key once
    expect(render(SONG_85).find('.sheet-head').text().replace(/\s+/g, ' ')).toBe('คีย์ C จังหวะ 4/4')
  })

  it('a ท่อน key moves with the shown key (A in a C song, shown in D → B)', () => {
    const s = sections(render(SONG_85, { displayKey: 'D' }))
    expect(s.map((x) => x.key)).toEqual(['', '', 'คีย์ B', 'คีย์ D'])
  })

  it('a ท่อน that sets the key it is already in is not marked (song 693)', () => {
    const c = { ...SONG_85, arrangement: SONG_85.arrangement.map((e, i) => (i === 1 ? { ...e, key: 'C' } : e)) }
    expect(sections(render(c)).map((x) => x.key)).toEqual(['', '', 'คีย์ A', 'คีย์ C'])
  })

  it('the key mark shows on ฝึกร้อง too (same sheet), even with no head', () => {
    const w = render(SONG_85, { songHead: false })
    expect(w.find('.sheet-head').exists()).toBe(false)
    expect(sections(w).map((x) => x.key)).toEqual(['', '', 'คีย์ A', 'คีย์ C'])
  })

  it('a song that OPENS on its own meter/key says it in the head, not twice', () => {
    const c = {
      version: 2, key: 'C', timeSignature: '4/4',
      stanzas: [{ id: 'X', timeSignature: '3/4', lines: [[seg('1 2 3')]] }, { id: 'Y', lines: [[seg('1 2 3 4')]] }],
      arrangement: [{ stanza: 'X', label: 'ข้อ 1', syllables: [], key: 'D' }, { stanza: 'Y', label: 'รับ', syllables: [] }],
    }
    const w = render(c)
    expect(w.find('.sheet-head').text().replace(/\s+/g, ' ')).toBe('คีย์ D จังหวะ 3/4')
    expect(sections(w)).toEqual([
      { text: '♦ ข้อ 1', key: '', meter: '' },
      { text: expect.stringContaining('รับ'), key: 'คีย์ C', meter: '4/4' },
    ])
    // without the head (ฝึกร้อง) the first heading keeps saying it, as before
    expect(sections(render(c, { songHead: false }))[0]).toEqual({ text: expect.stringContaining('ข้อ 1'), key: 'คีย์ D', meter: '3/4' })
  })

  it('a song with no change anywhere has no mark in the middle (as before)', () => {
    const c = { ...SONG_306, stanzas: SONG_306.stanzas.map(({ timeSignature, ...s }) => s) }
    const w = render(c)
    expect(w.findAll('.section-meter').length).toBe(0)
    expect(w.findAll('.section-key').length).toBe(0)
  })
})

describe('ใบ#123 — transposeKey', () => {
  it('moves a key name by the song’s distance, spelled like the key menu', () => {
    expect(transposeKey('A', 'C', 'D')).toBe('B')
    expect(transposeKey('C', 'C', 'Eb')).toBe('Eb')
    expect(transposeKey('A', 'C', 'Db')).toBe('Bb')
    expect(transposeKey('G', 'G', 'G')).toBe('G')
    expect(transposeKey('E', 'E', '')).toBe('E')
  })
  it('leaves an unknown name alone', () => {
    expect(transposeKey('', 'C', 'D')).toBe('')
    expect(transposeKey('H', 'C', 'D')).toBe('H')
  })
})

describe('ใบ#123 — the printed page count does not go up (ใบ#101)', () => {
  // The head sits inside the 6mm gap the printed title always left above the music, so nothing under it
  // moves. Measured on all 653 published songs (A4, default แผ่นเพลง): 0 songs gained a page; a head on a
  // line of its own (an earlier try) pushed 29 one-page songs onto a second page.
  it('title gap + head line + head gap = the old 6mm title gap', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'SongSheet.vue'), 'utf8')
    const print = src.slice(src.indexOf('<style'))
    const mm = (re) => Number((print.match(re) || [])[1])
    const oldGap = mm(/\.sheet-print-title \{[^}]*margin: 0 0 ([\d.]+)mm/)
    const titleGap = mm(/\.sheet-print-title\.has-head \{ margin-bottom: ([\d.]+)mm/)
    const block = print.slice(print.search(/@media print \{\s*\.sheet-head \{/))
    const lineH = Number((block.match(/[^-]height: ([\d.]+)mm/) || [])[1])
    const headGap = Number((block.match(/margin: 0 0 ([\d.]+)mm/) || [])[1])
    expect(oldGap).toBe(6)
    expect(block).toMatch(/line-height: 4mm/)
    expect(titleGap + lineH + headGap).toBeCloseTo(oldGap, 6)
  })
})
