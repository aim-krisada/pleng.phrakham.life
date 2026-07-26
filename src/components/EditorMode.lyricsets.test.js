// 717 multi-lyric — EDITOR side. Guards that saving an ordinary song (no lyricSets) stays
// byte-identical (no new keys), that a 717 song round-trips lyricSets + arrangement[].set, and
// that ＋ เพิ่มชุด bootstraps a second set on the shared melody. previewContent is the exact
// object the editor saves, so asserting on it is the real "save shape" check.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
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

const plainSong = {
  id: 's1', number: 5, title_th: 'เพลงปกติ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['กา', 'ขา', 'คา', 'งา'] }],
  },
}
const song717 = {
  id: 's2', number: 717, title_th: '717', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    lyricSets: [{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๒' }],
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2' }]] }],
    arrangement: [
      { stanza: 'A', set: 0, syllables: ['หนึ่งเอ', 'หนึ่งบี'] },
      { stanza: 'A', set: 1, syllables: ['สองเอ', 'สองบี'] },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})
const mountEd = (song) =>
  mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, DockKey: true, ComboSelect: true } },
  })

describe('EditorMode — 717 lyric sets save shape + back-compat', () => {
  it('back-compat: an ordinary song saves with NO lyricSets key and NO `set` on rows', () => {
    const pc = mountEd(plainSong).vm.previewContent
    expect('lyricSets' in pc).toBe(false)
    expect(pc.arrangement.every((r) => !('set' in r))).toBe(true)
  })

  it('a 717 song round-trips lyricSets + arrangement[].set', () => {
    const pc = mountEd(song717).vm.previewContent
    expect(pc.lyricSets).toHaveLength(2)
    expect(pc.lyricSets[1].label).toBe('ทำนอง ๒')
    expect(pc.arrangement.map((r) => r.set)).toEqual([0, 1])
  })

  it('＋ เพิ่มชุด bootstraps set 0 on the existing rows and adds a new empty set', async () => {
    const w = mountEd(plainSong)
    w.vm.addLyricSet()
    await nextTick()
    const pc = w.vm.previewContent
    expect(pc.lyricSets).toHaveLength(2) // ทำนอง ๑ (bootstrap) + ทำนอง ๒ (new)
    // the pre-existing row is now set 0, the new row set 1, and it starts wordless
    const sets = pc.arrangement.map((r) => r.set)
    expect(sets).toContain(0)
    expect(sets).toContain(1)
    const newRow = pc.arrangement.find((r) => r.set === 1)
    expect(newRow.syllables).toEqual([])
  })
})
