// ใบ v3/pleng#144 — ฝึกร้อง opens with the song's full title, then คีย์ · จังหวะ · อ้างอิง — the SAME head
// แผ่นเพลง shows (SongHead + lib/songHead.js) — and the top bar no longer carries the song's name.
//   AC1 title first, not cut · head line below, like the sheet's
//   AC2 changing the key on the bar changes the key in the head
//   AC3 no song title in the top bar (Studio no longer teleports one)
//   AC4 sad path: a song with no meter / no refs leaves that item out — no blank, no dash
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('../lib/midi.js', () => {
  const KEY_MIDI = { C: 60, Db: 61, D: 62, Eb: 63, E: 64, F: 65, Gb: 66, G: 67, Ab: 68, A: 69, Bb: 70, B: 71 }
  const NOTES = [{ li: 0, si: 0, syk: 0, midi: 60, beats: 1 }]
  return {
    playSong: vi.fn(() => new Promise(() => {})),
    playEnsemble: vi.fn(() => new Promise(() => {})),
    stopPlayback: () => {},
    setTranspose: vi.fn(),
    keyTranspose: (from, to) => (KEY_MIDI[to] ?? 60) - (KEY_MIDI[from] ?? 60),
    songToNotes: () => NOTES,
    buildPlayNotes: () => NOTES,
    effectiveOrder: () => undefined,
    TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }],
    TEMPO_MIN: 40,
    TEMPO_MAX: 240,
    TEMPO_STEP: 1,
    clampTempo: (n) => Math.min(240, Math.max(40, Math.round(Number(n) || 0))),
  }
})

window.matchMedia = window.matchMedia || (() => ({ matches: false }))
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'
import SongSheet from './SongSheet.vue'
import { resolveContent } from '../lib/songModel.js'

const LONG = 'พระเจ้าทรงเป็นที่ลี้ภัยและเป็นกำลังของเรา ทรงเป็นความช่วยเหลือที่พร้อมเสมอในยามยากลำบาก'
const make = (extra = {}, content = {}) => ({
  number: 12,
  title_th: LONG,
  scripture: 'สดุดี 46:1',
  book_refs: [{ book: 'ล', no: 305 }, { book: 'ย', no: 274 }],
  ...extra,
  content: {
    version: 2, key: 'E', timeSignature: '3/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3', chord: 'E' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: [] }],
    ...content,
  },
})

const mounted = []
afterEach(() => { while (mounted.length) mounted.pop().unmount() })
const mountV = (song) => {
  const w = mount(SongViewer, { props: { song }, global: { stubs: { SongSheet: true, Icon: true } }, attachTo: document.body })
  mounted.push(w)
  return w
}
const headText = (w) => w.find('.sv-head .sheet-head').text().replace(/\s+/g, ' ').trim()

describe('ใบ#144 — the head at the top of ฝึกร้อง', () => {
  it('AC1 — the first thing on the page is the full title, shown on screen, then คีย์ · จังหวะ · อ้างอิง', async () => {
    const w = mountV(make())
    await nextTick()
    const root = w.find('.sv-root').element
    const head = w.find('.sv-head')
    expect(root.firstElementChild).toBe(head.element) // before the lyric-set picker and the music
    const h1 = head.find('h1.sheet-print-title')
    expect(h1.text()).toBe(`12. ${LONG}`) // the whole name — nothing cut off
    expect(h1.classes()).toContain('on-screen')
    expect(headText(w)).toBe('คีย์ E จังหวะ 3/4 อ้างอิง ล.305 · ย.274')
    // the scripture caption stays, under the head
    expect(head.find('.scripture-tag').text()).toContain('สดุดี 46:1')
    // the old "แหล่งเพลง:" caption is gone — อ้างอิง in the head says the same thing
    expect(w.text()).not.toContain('แหล่งเพลง')
  })

  it('AC1 — it is the SAME head แผ่นเพลง draws: identical markup for the same song', async () => {
    const s = make()
    const w = mountV(s)
    await nextTick()
    const c = { ...s.content, lines: resolveContent(s.content) }
    const sheet = mount(SongSheet, { props: { content: c, mode: 'full', songHead: true, bookRefs: s.book_refs, songTitle: `12. ${LONG}`, screenTitle: true } })
    const norm = (h) => h.replace(/ data-v-[\w-]+=""/g, '').replace(/\s+/g, ' ')
    expect(norm(w.find('.sv-head .sheet-head').html())).toBe(norm(sheet.find('.sheet-head').html()))
    expect(norm(w.find('.sv-head .sheet-print-title').html())).toBe(norm(sheet.find('.sheet-print-title').html()))
    sheet.unmount()
  })

  it('AC1 — the title wraps instead of being cut (no ellipsis, no nowrap) and follows the Aa size', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'SongHead.vue'), 'utf8')
    const rule = (src.match(/\.sheet-print-title\.on-screen \{[^}]*\}/) || [''])[0]
    expect(rule).toMatch(/display: block/)
    expect(rule).toMatch(/overflow-wrap: anywhere/)
    expect(rule).not.toMatch(/ellipsis|nowrap/)
    expect(rule).toMatch(/font-size: [\d.]+em/) // em, so the Aa size on .sv-head scales it
    const viewer = fs.readFileSync(path.resolve(__dirname, 'SongViewer.vue'), 'utf8')
    expect(viewer).toMatch(/class="sv-head no-print" :style="\{ fontSize: readingFontScale \+ 'rem' \}"/)
  })

  it('AC2 — picking another key on the bar changes the key in the head', async () => {
    const w = mountV(make())
    await nextTick()
    await w.find('[data-cell="key"] .dk-pbtn').trigger('click')
    await nextTick()
    await w.findAll('[data-cell="key"] .dk-ddrow').find((r) => r.text().trim() === 'G').trigger('click')
    await nextTick()
    expect(headText(w)).toContain('คีย์ G')
    expect(headText(w)).not.toContain('คีย์ E')
  })

  it('AC4 — no meter and no refs: only คีย์ shows — no empty slot, dash or stray word', async () => {
    const w = mountV(make({ book_refs: [], scripture: '' }, { timeSignature: '' }))
    await nextTick()
    expect(headText(w)).toBe('คีย์ E')
    expect(w.find('.sv-head').text()).not.toMatch(/จังหวะ|อ้างอิง|—|undefined|null/)
    expect(w.find('.sv-head .scripture-tag').exists()).toBe(false)
  })

  it('AC4 — a song with no key, meter or refs gets the title alone, with no head line at all', async () => {
    const w = mountV(make({ book_refs: [] }, { key: '', timeSignature: '' }))
    await nextTick()
    expect(w.find('.sv-head .sheet-print-title').exists()).toBe(true)
    expect(w.find('.sv-head .sheet-head').exists()).toBe(false)
  })
})

describe('ใบ#144 — AC3: no song title in the top bar', () => {
  it('Studio no longer teleports a title into #shell-title (ฝึกร้อง and แผ่นเพลง alike)', () => {
    const studio = fs.readFileSync(path.resolve(__dirname, '../views/Studio.vue'), 'utf8')
    expect(studio).not.toMatch(/<Teleport to="#shell-title">/)
    expect(studio).not.toMatch(/sb-title-static/)
  })
})
