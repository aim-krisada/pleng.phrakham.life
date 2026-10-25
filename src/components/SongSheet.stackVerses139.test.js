// ใบ v3/pleng#139 — the rest of พี่เปา's ask in ใบ#131 (พี่เอม 25 ต.ค. 2569: "Can you do as her request", and his pick:
// stack like a hymn book). On แผ่นเพลง (สมุดเพลง), a whole ท่อน sung again to a melody already printed — ร้อง 2,
// ร้อง 3, รับ 2 — no longer prints as a paragraph below the music: each of its lines is one more row of words
// under the line that printed that melody, slot for slot, named at the start of its row. A ท่อน sung again
// word for word shrinks to its heading "(ร้องซ้ำ)".
// Driven through resolveContent, the way the page uses it.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'
import { resolveContent } from '../lib/songModel.js'

const seg = (note, chord = 'C') => ({ type: 'segment', chord, note })
const bar = { type: 'bar' }
// verse melody A: two lines, 4 + 4 slots · refrain melody R: one line, 4 slots
const A1 = [seg('1 2 3 4'), bar]
const A2 = [seg('5 4 3 2'), bar, { type: 'end' }]
const R1 = [seg('3 3 2 2', 'F'), bar]
const v1 = ['ข้า', 'เดิน', 'ทาง', 'ไกล', 'พระ', 'องค์', 'ทรง', 'นำ']
const v2 = ['ฟ้า', 'ใส', 'สด', 'ชื่น', 'ใจ', 'เรา', 'เบิก', 'บาน']
const r1 = ['ร้อง', 'สรร', 'เสริญ', 'พระ']
const r2 = ['ขอบ', 'คุณ', 'พระ', 'เจ้า']
const content = (arrangement, extra = {}) => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [A1, A2] }, { id: 'R', lines: [R1] }],
  arrangement,
  ...extra,
})
const SONG = content([
  { stanza: 'A', label: 'ร้อง 1', syllables: v1 },
  { stanza: 'R', label: 'รับ 1', syllables: r1 },
  { stanza: 'A', label: 'ร้อง 2', syllables: v2 },
  { stanza: 'R', label: 'รับ 1', syllables: r1 }, // sung again word for word
  { stanza: 'R', label: 'รับ 2', syllables: r2 },
])
const sheet = (c, props = {}) =>
  mount(SongSheet, { props: { content: { ...c, lines: resolveContent(c) }, mode: 'full', songbook: true, ...props } })
const lineOf = (w, li) => w.find(`.song-line[data-li="${li}"]`)
const words = (els) => els.map((s) => s.text()).filter(Boolean)

describe('ใบ#139 — a ท่อน sung again stacks under the notes, like a hymn book', () => {
  it('ร้อง 2 sits under ร้อง 1, line for line, and has no paragraph of its own', () => {
    const w = sheet(SONG)
    // display lines: 0-1 ร้อง 1 · 2 รับ 1 · 3-4 ร้อง 2 · 5 รับ 1 again · 6 รับ 2
    expect(words(lineOf(w, 0).findAll('.syl-stacked'))).toEqual(['ฟ้า', 'ใส', 'สด', 'ชื่น'])
    expect(words(lineOf(w, 1).findAll('.syl-stacked'))).toEqual(['ใจ', 'เรา', 'เบิก', 'บาน'])
    expect(lineOf(w, 3).exists()).toBe(false)
    expect(lineOf(w, 4).exists()).toBe(false)
    expect(w.findAll('.song-line-lyrics').filter((l) => !l.find('.section-label').exists())).toHaveLength(0)
  })

  it('each stacked word keeps its OWN address, so the karaoke and a tap still reach it', () => {
    const w = sheet(SONG)
    const first = lineOf(w, 0).find('.syl-stacked')
    expect(first.attributes('data-syl')).toBe('3-0-0')
    expect(first.attributes('data-slot')).toBe('0')
    expect(first.attributes('data-row')).toBe('1')
  })

  it('every row is named at its start once a line carries more than one ท่อน', () => {
    const w = sheet(SONG)
    expect(lineOf(w, 0).findAll('.stack-label').map((l) => l.text())).toEqual(['ร้อง 1', 'ร้อง 2'])
    expect(lineOf(w, 2).findAll('.stack-label').map((l) => l.text())).toEqual(['รับ 1', 'รับ 2'])
  })

  it('a ท่อน sung again word for word becomes just its heading, "(ร้องซ้ำ)"', () => {
    const w = sheet(SONG)
    const again = lineOf(w, 5)
    expect(again.find('.section-label').text()).toContain('รับ 1')
    expect(again.find('.section-rubric').text()).toBe('(ร้องซ้ำ)')
    expect(again.findAll('.syl')).toHaveLength(0)
    // and its words are not stacked a second time under the refrain
    expect(words(lineOf(w, 2).findAll('.syl-stacked'))).toEqual(['ขอบ', 'คุณ', 'พระ', 'เจ้า'])
  })

  it('a later verse may fill a held box the first verse left empty — it still stacks, by the note boxes', () => {
    const held = content([
      { stanza: 'A', label: 'ร้อง 1', syllables: v1.slice(0, 7) }, // last box of line 2 left empty
      { stanza: 'A', label: 'ร้อง 2', syllables: v2 },
    ])
    const w = sheet(held)
    expect(words(lineOf(w, 1).findAll('.syl-stacked'))).toEqual(['ใจ', 'เรา', 'เบิก', 'บาน'])
  })

  it('a ท่อน in another key keeps its paragraph (its chords would not be the host’s)', () => {
    const c = content([
      { stanza: 'A', label: 'ร้อง 1', syllables: v1 },
      { stanza: 'A', label: 'ร้อง 2', key: 'D', syllables: v2 },
    ])
    const w = sheet(c)
    expect(w.findAll('.syl-stacked')).toHaveLength(0)
    expect(lineOf(w, 2).classes()).toContain('song-line-lyrics')
  })

  it('ติดกันเป็นวรรค / ตามต้นฉบับ keep the paragraph — those ways of writing exist for it', () => {
    const w = sheet(SONG, { lyricJoin: true })
    expect(w.findAll('.syl-stacked')).toHaveLength(0)
    expect(lineOf(w, 3).exists()).toBe(true)
  })

  it('โน้ตทุกเที่ยว (not สมุดเพลง) is untouched: every ท่อน prints its own notes', () => {
    const w = sheet(SONG, { songbook: false })
    expect(w.findAll('.syl-stacked')).toHaveLength(0)
    expect(w.findAll('.stack-label')).toHaveLength(0)
  })
})
