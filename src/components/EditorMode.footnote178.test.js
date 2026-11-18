// พี่เปา 19 ต.ค. 2569 — "อยากให้เพิ่มช่องอ้างอิงเพลงเข้าไปด้วย เช่น (ล.305) ประมาณนี้ แต่ต้องให้เขียน
// ได้เองเลย เพราะจะมีตัวย่อหลายตัว บางเพลงอ้างอิงหลายอัน" → a free-text อ้างอิง box in the
// song-settings card. The parse itself is covered in lib/bookRefs.test.js; these cover the
// editor's wiring: what is on screen, what gets stored, and what comes back on reopen.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const songsRows = []
vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: table === 'songs' ? songsRows : [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (t) => makeQuery(t),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  songsRows.length = 0
})

const BASE = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2' }]] }],
  arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: ['พระ', 'เจ้า'] }],
}
const song = (extra = {}) => ({ id: 's1', number: 3, title_th: 'เพลงทดสอบ', title_en: '', content: { ...BASE }, ...extra })

// ComboSelect is REAL here — the point is the editor's own wiring
const mountEd = (s) =>
  mount(EditorMode, {
    props: { song: s, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, DockKey: true } },
  })
const refsInput = (w) => w.find('input[aria-label="อ้างอิงเล่มอื่น"]')
// หมายเหตุท้ายเพลง (content.footnote) — พี่เปา via P'Aim 18 พ.ย. 2569: "ใส่ text อิสระได้" with a * in the
// words explained under the song: "(*ความเชื่อ เล็งถึงยะโฮซูอะและคาเลบ…)".
import SongSheet from './SongSheet.vue'
import { diffSongRows } from '../lib/diff.js'

const box = (w) => w.find('textarea[aria-label="หมายเหตุท้ายเพลง"]')
const NOTE = '(*ความเชื่อ เล็งถึงยะโฮซูอะและคาเลบเชื่อวางใจในพระเจ้า)'

describe('หมายเหตุท้ายเพลง — the editor', () => {
  it('a song without one stores no key (its content stays as it was)', async () => {
    const w = mountEd(song())
    await nextTick()
    expect(box(w).exists()).toBe(true)
    expect('footnote' in w.vm.previewContent).toBe(false)
    w.unmount()
  })

  it('what is typed is stored on the song, line breaks kept, trailing space dropped', async () => {
    const w = mountEd(song())
    await nextTick()
    await box(w).setValue(NOTE + '\nบรรทัดสอง\n\n')
    expect(w.vm.previewContent.footnote).toBe(NOTE + '\nบรรทัดสอง')
    w.unmount()
  })

  it('comes back in the box on reopen, and is not stashed twice', async () => {
    const w = mountEd(song({ content: { ...BASE, footnote: NOTE } }))
    await nextTick()
    expect(box(w).element.value).toBe(NOTE)
    expect(w.vm.previewContent.footnote).toBe(NOTE)
    await box(w).setValue('')
    expect('footnote' in w.vm.previewContent).toBe(false)
    w.unmount()
  })

  it('a * typed in a word stays in the word', async () => {
    const w = mountEd(song({ content: { ...BASE, arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: ['พระ', 'เชื่อ*'] }] } }))
    await nextTick()
    expect(w.vm.previewContent.arrangement[0].syllables).toEqual(['พระ', 'เชื่อ*'])
    w.unmount()
  })
})

describe('หมายเหตุท้ายเพลง — the sheet and the history', () => {
  const resolved = (extra) => ({ ...BASE, ...extra, lines: [[{ type: 'segment', chord: 'C', note: '1 2', syllables: ['พระ', 'เจ้า'] }]] })
  it('shows under the song when the song has one', () => {
    const w = mount(SongSheet, { props: { content: resolved({ footnote: NOTE }), mode: 'full' }, global: { stubs: { Icon: true } } })
    expect(w.find('.song-footnote').text()).toBe(NOTE)
    w.unmount()
  })
  it('shows nothing when the song has none', () => {
    const w = mount(SongSheet, { props: { content: resolved({}), mode: 'full' }, global: { stubs: { Icon: true } } })
    expect(w.find('.song-footnote').exists()).toBe(false)
    w.unmount()
  })
  it('the change history says the footnote changed', () => {
    const a = { title_th: 'x', number: 1, content: { ...BASE } }
    expect(diffSongRows(a, { ...a, content: { ...BASE, footnote: NOTE } })).toEqual([`หมายเหตุท้ายเพลง: "${NOTE}"`])
    expect(diffSongRows({ ...a, content: { ...BASE, footnote: NOTE } }, a)).toEqual(['ลบหมายเหตุท้ายเพลง'])
  })
})

// ใบ#178 รอบ 2 — several notes: * marks numbered ¹ ² ³, one footnote line per mark
describe('หมายเหตุหลายข้อ — ดาวในเนื้อกลายเป็นเลข', () => {
  const C = { ...BASE, stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] }], arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: ['เชื่อ*', 'ไว้*'] }] }
  const sheet = (c) => mount(SongSheet, { props: { content: { ...c, lines: [[{ type: 'segment', note: '1 2', syllables: ['เชื่อ¹', 'ไว้²'] }]] }, mode: 'full' }, global: { stubs: { Icon: true } } })
  it('the sheet lists the notes with the same numbers', () => {
    const w = sheet({ ...C, footnote: 'ความเชื่อ\nการไว้ใจ' })
    const li = w.findAll('.song-footnote-list li').map((x) => x.text())
    expect(li).toEqual(['¹ ความเชื่อ', '² การไว้ใจ'])
    w.unmount()
  })
  it('the editor warns when marks and lines do not match', async () => {
    const w = mountEd(song({ content: { ...C, footnote: 'ความเชื่อ' } }))
    await nextTick()
    expect(w.find('.ed-footnote-warn').text()).toContain('ดาวในเนื้อมี 2 ตัว แต่หมายเหตุมี 1 บรรทัด')
    await box(w).setValue('ความเชื่อ\nการไว้ใจ')
    expect(w.find('.ed-footnote-warn').exists()).toBe(false)
    expect(w.findAll('.ed-footnote-list li').map((x) => x.text())).toEqual(['¹ ความเชื่อ', '² การไว้ใจ'])
    w.unmount()
  })
})
