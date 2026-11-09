// ใบ v1#158 (ต่อ) — "_" in the English/中文 paste box = this attack note box stays blank (the
// syllable before is held on). Real data: อนุชน เพลง 2 "ของขวัญ" (fixture fetched read-only).
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
import live from './__fixtures__/anuchon-2-live.json'
import expected from './__fixtures__/anuchon-2-en-expected.json'

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  setSongLangChoice(['th', 'en'])
})

const mountEd = (song) =>
  mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, DockKey: true, ComboSelect: true } },
  })
const inner = (w) => w.vm.$.setupState
const fresh = () => JSON.parse(JSON.stringify(live))
const trim = (a) => {
  const out = [...a]
  while (out.length && !String(out[out.length - 1] ?? '').trim()) out.pop()
  return out
}

describe('อนุชน 2 ของขวัญ — paste English with "_"', () => {
  it('fixture is the real song: 3 rows ร้อง1 · รับ · ร้อง2', () => {
    expect(live.id).toBe(expected.id)
    expect(live.content.arrangement.map((a) => a.label)).toEqual(expected.paste.map((p) => p.label))
  })

  it('ร้อง1 and ร้อง2 land exactly on the expected boxes', async () => {
    const w = mountEd(fresh())
    await nextTick()
    const s = inner(w)
    for (const k of [0, 2]) {
      s.setRowLyricText(s.arrangement[k], expected.paste[k].text, 'en')
      expect(trim(s.arrangement[k].lyrics.en), expected.paste[k].label).toEqual(trim(expected.en[k]))
    }
    w.unmount()
  })

  // รับ: the expected words match box for box up to slot 67. Slot 68 is a HELD box (the Thai
  // word "ของ" sits on it), yet the expected array puts "will" there. Paste fills ATTACK boxes
  // only, so slot 68 cannot be reached from the paste box — reported, not bent.
  it('รับ matches up to slot 67; slot 68 is a held box (Thai "ของ" on it)', async () => {
    const w = mountEd(fresh())
    await nextTick()
    const s = inner(w)
    const row = s.arrangement[1]
    s.setRowLyricText(row, expected.paste[1].text, 'en')
    expect(row.lyrics.en.slice(0, 68)).toEqual(expected.en[1].slice(0, 68))
    expect(s.stanzaKindList(row.stanza)[68]).toBe('held')
    expect(row.syllables[68]).toBe('ของ')
    expect(expected.en[1][68]).toBe('will')
    w.unmount()
  })
  it.fails('รับ exact match (fails while slot 68 is a held box)', async () => {
    const w = mountEd(fresh())
    await nextTick()
    const s = inner(w)
    s.setRowLyricText(s.arrangement[1], expected.paste[1].text, 'en')
    expect(trim(s.arrangement[1].lyrics.en)).toEqual(trim(expected.en[1]))
    w.unmount()
  })

  it('Thai rows are untouched', async () => {
    const w = mountEd(fresh())
    await nextTick()
    const s = inner(w)
    const before = s.arrangement.map((r) => [...r.syllables])
    const thText = s.arrangement.map((r) => s.rowLyricText(r))
    expected.paste.forEach((p, k) => s.setRowLyricText(s.arrangement[k], p.text, 'en'))
    expect(s.arrangement.map((r) => r.syllables)).toEqual(before)
    expect(s.arrangement.map((r) => s.rowLyricText(r))).toEqual(thText)
    // Thai text never shows "_"
    for (const t of thText) expect(t.split(' ')).not.toContain('_')
    w.unmount()
  })

  it('round trip: words → shown text → paste back → same words', async () => {
    const w = mountEd(fresh())
    await nextTick()
    const s = inner(w)
    expected.paste.forEach((p, k) => {
      const row = s.arrangement[k]
      s.setRowLyricText(row, p.text, 'en')
      const once = [...row.lyrics.en]
      const shown = s.rowLyricText(row, 'en')
      expect(shown, p.label).toBe(p.text)
      // paste the shown text into an empty row → same words
      row.lyrics = { en: [] }
      s.setRowLyricText(row, shown, 'en')
      expect(row.lyrics.en).toEqual(once)
    })
    w.unmount()
  })

  it('shows "trea- _ -sure" and typing over one word keeps every other word on its box', async () => {
    const w = mountEd(fresh())
    await nextTick()
    const s = inner(w)
    const row = s.arrangement[0]
    s.setRowLyricText(row, expected.paste[0].text, 'en')
    const before = [...row.lyrics.en]
    expect(s.rowLyricText(row, 'en')).toContain('trea- _ -sure,')
    s.setRowLyricText(row, s.rowLyricText(row, 'en').replace('Great-er', 'Bright-er'), 'en')
    const after = [...before]
    after[before.indexOf('Great')] = 'Bright'
    expect(row.lyrics.en).toEqual(after)
    w.unmount()
  })
})

describe('"_" and "-" rules', () => {
  const tiny = () => ({
    id: 's1',
    number: 1,
    title_th: 't',
    content: {
      version: 2,
      key: 'C',
      timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3 4' }, { type: 'bar' }, { type: 'segment', note: '5 6 7 1' }]] }],
      arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ'] }],
    },
  })
  it('plain "trea-sure" still works; "trea- _ -sure" keeps one box blank', async () => {
    const w = mountEd(tiny())
    await nextTick()
    const s = inner(w)
    const row = s.arrangement[0]
    s.setRowLyricText(row, 'a trea-sure', 'en')
    expect(row.lyrics.en).toEqual(['a', 'trea', '-sure'])
    s.setRowLyricText(row, 'a trea- _ -sure', 'en')
    expect(row.lyrics.en).toEqual(['a', 'trea', '', '-sure'])
    expect(s.rowLyricText(row, 'en')).toBe('a trea- _ -sure')
    s.setRowLyricText(row, 'a _ _ b', 'en')
    expect(row.lyrics.en).toEqual(['a', '', '', 'b'])
    expect(s.rowLyricText(row, 'en')).toBe('a _ _ b')
    w.unmount()
  })
  it('Thai paste ignores the rule: "_" is just a word', async () => {
    const w = mountEd(tiny())
    await nextTick()
    const s = inner(w)
    const row = s.arrangement[0]
    s.setRowLyricText(row, 'ก _ ข', 'th')
    expect(row.syllables).toEqual(['ก', '_', 'ข'])
    w.unmount()
  })
})
