// ใบ v3/pleng#178 รอบ 4 — หมายเหตุของคำ (P'Aim 18 พ.ย. 2569: "พอใส่ดาวปุ๊บก็มีช่องขึ้นมาให้ใส่เลย" ·
// "ทั้งใส่ใหม่และแก้และลบ"). A * typed in a word box opens a small note box right under it; the note is
// stored on the word's row and stays with that word when other stars are added or removed.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import SongSheet from './SongSheet.vue'
import { setSongLangChoice } from '../store.js'
import { resolveContent } from '../lib/songModel.js'

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  setSongLangChoice(['th'])
})

const mountEd = (song) =>
  mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, DockKey: true, ComboSelect: true } },
  })
const pc = (w) => w.vm.$.setupState.previewContent
const song = (row, extra = {}) => ({
  id: 's1', number: 2, title_th: 'โมเซ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3 4' }]] }],
    arrangement: [{ stanza: 'A', label: 'ข้อ 1', ...row }],
    ...extra,
  },
})
const box = (w, i) => w.find(`input.syl-box[data-slot="${i}"]`)
const pop = (w) => w.find('.syl-note-pop')

describe('หมายเหตุของคำ — the box under the word', () => {
  it('typing * opens a box right there; what is typed is saved on that word', async () => {
    const w = mountEd(song({ syllables: ['โม', 'เซ', 'เชื่อ', 'ใจ'] }))
    await nextTick()
    expect(pop(w).exists()).toBe(false)
    await box(w, 2).setValue('เชื่อ*')
    expect(pop(w).exists()).toBe(true)
    expect(pop(w).text()).toContain('หมายเหตุของคำ “เชื่อ”')
    await pop(w).find('textarea').setValue('ความเชื่อของยะโฮซูอะ')
    expect(pc(w).arrangement[0].notes).toEqual(['ความเชื่อของยะโฮซูอะ'])
    w.unmount()
  })
  it('focusing a starred word opens its box again to edit', async () => {
    const w = mountEd(song({ syllables: ['โม', 'เซ', 'เชื่อ*', 'ใจ'], notes: ['เดิม'] }))
    await nextTick()
    await box(w, 0).trigger('focus')
    expect(pop(w).exists()).toBe(false)
    await box(w, 2).trigger('focus')
    expect(pop(w).find('textarea').element.value).toBe('เดิม')
    await pop(w).find('textarea').setValue('ใหม่')
    expect(pc(w).arrangement[0].notes).toEqual(['ใหม่'])
    w.unmount()
  })
  it('ลบดาวและหมายเหตุ takes the * out of the word and the note with it', async () => {
    const w = mountEd(song({ syllables: ['โม*', 'เซ', 'เชื่อ*', 'ใจ'], notes: ['ก', 'ข'] }))
    await nextTick()
    await box(w, 2).trigger('focus')
    await pop(w).findAll('button').find((b) => b.text().includes('ลบดาว')).trigger('click')
    expect(pc(w).arrangement[0].syllables).toEqual(['โม*', 'เซ', 'เชื่อ', 'ใจ'])
    expect(pc(w).arrangement[0].notes).toEqual(['ก'])
    expect(pop(w).exists()).toBe(false)
    w.unmount()
  })
  it('a * added on an earlier word: the old note stays with its own word', async () => {
    const w = mountEd(song({ syllables: ['โม', 'เซ', 'เชื่อ*', 'ใจ'], notes: ['ของเชื่อ'] }))
    await nextTick()
    await box(w, 0).setValue('โม*')
    expect(pc(w).arrangement[0].notes).toEqual(['', 'ของเชื่อ'])
    w.unmount()
  })
  it('deleting the * by hand in the word box removes its note too', async () => {
    const w = mountEd(song({ syllables: ['โม*', 'เซ', 'เชื่อ*', 'ใจ'], notes: ['ก', 'ข'] }))
    await nextTick()
    await box(w, 0).setValue('โม')
    expect(pc(w).arrangement[0].notes).toEqual(['ข'])
    w.unmount()
  })
  it('a song with no * saves no notes key', async () => {
    const w = mountEd(song({ syllables: ['โม', 'เซ', 'เชื่อ', 'ใจ'] }))
    await nextTick()
    expect(pc(w).arrangement[0]).not.toHaveProperty('notes')
    w.unmount()
  })
})

describe('หมายเหตุของคำ — the list in the settings card', () => {
  it('lists every mark with its word, and edits the same note', async () => {
    const w = mountEd(song({ syllables: ['โม', 'เซ', 'เชื่อ*', 'ใจ'], notes: [''] }))
    await nextTick()
    const li = w.findAll('.ed-wordnotes li')
    expect(li.length).toBe(1)
    expect(li[0].text()).toContain('เชื่อ')
    expect(li[0].classes()).toContain('ed-footnote-warn') // not written yet
    await li[0].find('input').setValue('ความเชื่อ')
    expect(pc(w).arrangement[0].notes).toEqual(['ความเชื่อ'])
    w.unmount()
  })
  it('an older song (notes as footnote lines) opens with them on the words; extra lines stay free text', async () => {
    const w = mountEd(song({ syllables: ['โม', 'เซ', 'เชื่อ*', 'ใจ'] }, { footnote: 'ความเชื่อ\nข้อความอิสระ' }))
    await nextTick()
    expect(pc(w).arrangement[0].notes).toEqual(['ความเชื่อ'])
    expect(pc(w).footnote).toBe('ข้อความอิสระ')
    w.unmount()
  })
})

describe('หมายเหตุของคำ — the sheet', () => {
  it('numbers the word and lists its note, then the free text', () => {
    const c = song({ syllables: ['โม', 'เซ', 'เชื่อ*', 'ใจ'], notes: ['ความเชื่อ'] }, { footnote: 'อิสระ' }).content
    const w = mount(SongSheet, { props: { content: { ...c, lines: resolveContent(c) }, mode: 'full' }, global: { stubs: { Icon: true } } })
    expect(w.text()).toContain('เชื่อ¹')
    expect(w.findAll('.song-footnote-list li').map((x) => x.text())).toEqual(['¹ ความเชื่อ'])
    expect(w.find('.song-footnote-free').text()).toBe('อิสระ')
    w.unmount()
  })
})

import { diffSongRows } from '../lib/diff.js'
describe('หมายเหตุของคำ — the change history', () => {
  it('says a word note changed', () => {
    const c = song({ syllables: ['เชื่อ*'], notes: ['ก'] }).content
    const a = { title_th: 'x', number: 1, content: c }
    const b = { ...a, content: { ...c, arrangement: [{ ...c.arrangement[0], notes: ['ข'] }] } }
    expect(diffSongRows(a, b)).toEqual(['แก้หมายเหตุของคำ'])
  })
})
