// ใบ v1#158 — the editor with words in more than one language.
//  · one row of word boxes per language shown, all editable; a blank box is red like Thai
//  · ◀ ▶ shift ONLY the language whose box is focused
//  · a paste box per language, same split rules (space = new word, "-" = same word)
//  · a per-language ตรวจแล้ว saved in content.langVerified
//  · Thai never changes when another language is edited; a Thai-only song saves as before;
//    undo covers the new words; melody edits carry every language's words with their notes
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
import { setSongLangChoice } from '../store.js'

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
const inner = (w) => w.vm.$.setupState

const song = (row, extra = {}) => ({
  id: 's1',
  number: 2,
  title_th: 'ของขวัญ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3 4' }, { type: 'bar' }, { type: 'segment', note: '5 6 7 1' }]] }],
    arrangement: [{ stanza: 'A', label: 'ข้อ 1', ...row }],
    ...extra,
  },
})
const TH = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ']
const EN = ['Wait', 'ing', 'be', 'side', 'you', 'there', 'is', 'a']
const BOTH = () => song({ syllables: [...TH], lyrics: { en: [...EN] } })

describe('a Thai-only song is unchanged', () => {
  it('saves byte-identical content: no lyrics, no langVerified key', async () => {
    const src = song({ syllables: [...TH] })
    const w = mountEd(src)
    await nextTick()
    const pc = inner(w).previewContent
    expect(pc.arrangement[0]).not.toHaveProperty('lyrics')
    expect(pc).not.toHaveProperty('langVerified')
    expect(pc.arrangement[0].syllables).toEqual(TH)
    w.unmount()
  })
  it('shows one row of word boxes (Thai) and no other-language box', async () => {
    const w = mountEd(song({ syllables: [...TH] }))
    await nextTick()
    expect(w.findAll('input.syl-box[data-slot]').length).toBe(8)
    expect(w.findAll('input.syl-lang').length).toBe(0)
    // the only language control is the editor's "+ English" / "+ 中文"
    expect(w.findAll('.lang-btn[data-lang]').length).toBe(0)
    expect(w.findAll('.lang-add').length).toBe(2)
    w.unmount()
  })
})

describe('word boxes per language', () => {
  it('Thai + English both on → two rows of boxes; a blank English box is red', async () => {
    setSongLangChoice(['th', 'en'])
    const src = BOTH()
    src.content.arrangement[0].lyrics.en[3] = ''
    const w = mountEd(src)
    await nextTick()
    const en = w.findAll('input.syl-lang[data-lang="en"]')
    expect(en.length).toBe(8)
    expect(w.findAll('input.syl-box[data-slot]').length).toBe(8)
    expect(w.find('input[data-lslot="3"][data-lang="en"]').classes()).toContain('syl-empty')
    expect(w.find('input[data-lslot="2"][data-lang="en"]').classes()).not.toContain('syl-empty')
    w.unmount()
  })

  it('English only → no Thai boxes (Thai is still saved untouched)', async () => {
    setSongLangChoice(['en'])
    const w = mountEd(BOTH())
    await nextTick()
    expect(w.findAll('input.syl-box[data-slot]').length).toBe(0)
    expect(w.findAll('input.syl-lang[data-lang="en"]').length).toBe(8)
    expect(inner(w).previewContent.arrangement[0].syllables).toEqual(TH)
    w.unmount()
  })

  it('typing in an English box changes English only', async () => {
    setSongLangChoice(['th', 'en'])
    const w = mountEd(BOTH())
    await nextTick()
    const box = w.find('input[data-lslot="0"][data-lang="en"]')
    box.element.value = 'Hello'
    await box.trigger('input')
    const row = inner(w).previewContent.arrangement[0]
    expect(row.lyrics.en[0]).toBe('Hello')
    expect(row.syllables).toEqual(TH)
    w.unmount()
  })
})

describe('◀ ▶ act on one language only', () => {
  it('▶ on an English box pushes English; Thai stays put', async () => {
    setSongLangChoice(['th', 'en'])
    const w = mountEd(BOTH())
    await nextTick()
    const s = inner(w)
    s.pushSlot(1, 'en')
    await nextTick()
    const row = s.previewContent.arrangement[0]
    expect(row.lyrics.en).toEqual(['Wait', '', 'ing', 'be', 'side', 'you', 'there', 'is', 'a'])
    expect(row.syllables).toEqual(TH)
    w.unmount()
  })
  it('◀ on a Thai box pulls Thai; English stays put', async () => {
    const w = mountEd(BOTH())
    await nextTick()
    const s = inner(w)
    s.pullSlot(0)
    await nextTick()
    const row = s.previewContent.arrangement[0]
    expect(row.syllables).toEqual(TH.slice(1))
    expect(row.lyrics.en).toEqual(EN)
    w.unmount()
  })
  it('the ◀ ▶ buttons shown on a focused English box act on English', async () => {
    setSongLangChoice(['th', 'en'])
    const w = mountEd(BOTH())
    await nextTick()
    await w.find('input[data-lslot="2"][data-lang="en"]').trigger('focus')
    const tools = w.findAll('.slot-tools')
    expect(tools.length).toBe(1)
    await tools[0].findAll('button')[0].trigger('click') // ◀
    const row = inner(w).previewContent.arrangement[0]
    expect(row.lyrics.en).toEqual(['Wait', 'ing', 'side', 'you', 'there', 'is', 'a'])
    expect(row.syllables).toEqual(TH)
    w.unmount()
  })
})

describe('paste box per language', () => {
  it('spaces = new word, hyphen = same word; Thai is never touched', async () => {
    const w = mountEd(song({ syllables: [...TH] }))
    await nextTick()
    const s = inner(w)
    s.setRowLyricText(s.arrangement[0], 'There is a trea-sure great-er than', 'en')
    const row = s.previewContent.arrangement[0]
    expect(row.lyrics.en).toEqual(['There', 'is', 'a', 'trea', '-sure', 'great', '-er', 'than'])
    expect(row.syllables).toEqual(TH)
    expect(s.rowLyricText(s.arrangement[0], 'en')).toBe('There is a trea-sure great-er than')
    w.unmount()
  })
  it('the editor can start English on a Thai-only song (+ English)', async () => {
    const w = mountEd(song({ syllables: [...TH] }))
    await nextTick()
    await w.find('[data-add-lang="en"]').trigger('click')
    await nextTick()
    expect(inner(w).edLangs).toEqual(['th', 'en'])
    expect(w.findAll('input.syl-lang[data-lang="en"]').length).toBe(8)
    // nothing typed yet → nothing extra saved
    expect(inner(w).previewContent.arrangement[0]).not.toHaveProperty('lyrics')
    w.unmount()
  })
})

describe('per-language ตรวจแล้ว', () => {
  it('saves in content.langVerified and round-trips', async () => {
    setSongLangChoice(['th', 'en'])
    const w = mountEd(BOTH())
    await nextTick()
    const cb = w.find('[data-verify-lang="en"] input')
    expect(cb.element.checked).toBe(false)
    cb.element.checked = true
    await cb.trigger('change')
    expect(inner(w).previewContent.langVerified).toEqual({ en: true })
    w.unmount()
    const w2 = mountEd(song({ syllables: [...TH], lyrics: { en: [...EN] } }, { langVerified: { en: true } }))
    await nextTick()
    expect(w2.find('[data-verify-lang="en"] input').element.checked).toBe(true)
    expect(inner(w2).previewContent.langVerified).toEqual({ en: true })
    w2.unmount()
  })
})

describe('no loss', () => {
  it('a song with English loads and saves its English unchanged', async () => {
    const w = mountEd(BOTH())
    await nextTick()
    expect(inner(w).previewContent.arrangement[0].lyrics).toEqual({ en: EN })
    w.unmount()
  })
  it('undo brings back an English edit', async () => {
    vi.useFakeTimers()
    setSongLangChoice(['th', 'en'])
    const w = mountEd(BOTH())
    await nextTick()
    const s = inner(w)
    s.setSyl(s.arrangement[0], 0, 'CHANGED', 'en')
    await nextTick()
    vi.advanceTimersByTime(500)
    await nextTick()
    expect(s.previewContent.arrangement[0].lyrics.en[0]).toBe('CHANGED')
    s.undo()
    await nextTick()
    expect(s.previewContent.arrangement[0].lyrics.en[0]).toBe('Wait')
    vi.useRealTimers()
    w.unmount()
  })
  it('deleting a ห้อง takes its words in EVERY language with it', async () => {
    const w = mountEd(BOTH())
    await nextTick()
    const s = inner(w)
    const line = s.lines[0]
    s.removeBar(line, 0)
    await nextTick()
    const row = s.previewContent.arrangement[0]
    expect(row.syllables).toEqual(TH.slice(4))
    expect(row.lyrics.en).toEqual(EN.slice(4))
    w.unmount()
  })
  it('moving a ห้อง carries every language with it', async () => {
    const w = mountEd(BOTH())
    await nextTick()
    const s = inner(w)
    s.moveBar(0, 0, 1)
    await nextTick()
    const row = s.previewContent.arrangement[0]
    expect(row.syllables).toEqual([...TH.slice(4), ...TH.slice(0, 4)])
    expect(row.lyrics.en).toEqual([...EN.slice(4), ...EN.slice(0, 4)])
    w.unmount()
  })
})
