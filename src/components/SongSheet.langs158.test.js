// ใบ v1#158 — the sheet draws each language shown as one more line of words under the same notes,
// in the fixed order, and the follow-along lights the same slot in every line at once.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { resolveContent } from '../lib/songModel.js'
import SongSheet from './SongSheet.vue'

const content = (extra) => {
  const c = {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3 4' }]] }],
    arrangement: [{ stanza: 'A', syllables: ['ของ', 'ขวัญ', 'ที่', 'รอ'], ...extra }],
  }
  return { ...c, lines: resolveContent(c) }
}
const EN = { lyrics: { en: ['trea', '-sure', 'for', 'you'], zh: ['我', '们', '的', '主'] } }

describe('SongSheet — lines in more than one language', () => {
  it('a Thai-only song renders exactly the same with langs ["th"] as with no langs', () => {
    const a = mount(SongSheet, { props: { content: content({}) } }).html()
    const b = mount(SongSheet, { props: { content: content({}), langs: ['th'] } }).html()
    expect(b).toBe(a)
    expect(b).not.toContain('lyric-alt')
  })

  it('Thai + English: a second line of words under the same notes, hyphenated like a hymnal', () => {
    const w = mount(SongSheet, { props: { content: content(EN), langs: ['th', 'en'] } })
    expect(w.findAll('.syl[data-syl]').map((s) => s.text())).toEqual(['ของ', 'ขวัญ', 'ที่', 'รอ'])
    const en = w.findAll('.lyric-alt[data-lang="en"] .syl')
    expect(en.map((s) => s.text())).toEqual(['trea-', 'sure', 'for', 'you'])
    expect(w.find('.lyric-alt[data-lang="zh"]').exists()).toBe(false)
  })

  it('order is always th → en → zh, and Thai can be hidden', () => {
    const w = mount(SongSheet, { props: { content: content(EN), langs: ['en', 'zh'] } })
    expect(w.findAll('.syl[data-syl]').length).toBe(0)
    const rows = w.findAll('.segment > .lyric-alt').map((r) => r.attributes('data-lang'))
    expect(rows).toEqual(['en', 'zh'])
  })

  it('the karaoke lights the same slot in every visible line at once', () => {
    const w = mount(SongSheet, {
      props: { content: content(EN), langs: ['th', 'en', 'zh'], playingSyl: { li: 0, si: 0, syk: 2 } },
    })
    const lit = w.findAll('.syl-playing')
    expect(lit.map((s) => s.text())).toEqual(['ที่', 'for', '的'])
  })

  it('tapping an English word jumps to that note', async () => {
    const w = mount(SongSheet, { props: { content: content(EN), langs: ['th', 'en'], interactive: true } })
    await w.findAll('.lyric-alt[data-lang="en"] .syl')[3].trigger('click')
    expect(w.emitted('seek')[0][0]).toEqual({ li: 0, si: 0, syk: 3 })
  })

  it('words only (เนื้อล้วน): each other language is its own line of words', () => {
    const w = mount(SongSheet, { props: { content: content(EN), langs: ['th', 'en'], mode: 'lyrics' } })
    const line = w.find('.lyric-alt-line[data-lang="en"]')
    expect(line.exists()).toBe(true)
    expect(line.text().replace(/\s+/g, ' ').trim()).toBe('trea-sure for you')
  })
})
