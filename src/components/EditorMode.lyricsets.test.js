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
    // the SAVED text is never rewritten by opening the editor — arabic is a display rule
    // (lyricSetName), not a migration. Editing a song must not silently rewrite its data.
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

  // ---- ลบชุด (delete a lyric set) ----
  const song3 = {
    id: 's3', number: 717, title_th: '717x3', title_en: '',
    content: {
      version: 2, key: 'C', timeSignature: '4/4',
      lyricSets: [{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๒' }, { label: 'ทำนอง ๓' }],
      stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2' }]] }],
      arrangement: [
        { stanza: 'A', set: 0, syllables: ['หนึ่งเอ', 'หนึ่งบี'] },
        { stanza: 'A', set: 1, syllables: ['สองเอ', 'สองบี'] },
        { stanza: 'A', set: 2, syllables: ['สามเอ', 'สามบี'] },
      ],
    },
  }
  const removeSet = (w, i) => { w.vm.askRemoveLyricSet(i); w.vm.doRemoveLyricSet() }

  it('deletes a MIDDLE set: its rows go, later sets reindex, melody stays', async () => {
    const w = mountEd(song3)
    removeSet(w, 1) // delete ทำนอง ๒
    await nextTick()
    const pc = w.vm.previewContent
    expect(pc.lyricSets).toHaveLength(2)
    // set 0 kept as-is; former set 2 reindexed to 1; the ทำนอง ๒ words are gone
    expect(pc.arrangement.map((r) => r.set)).toEqual([0, 1])
    const words = pc.arrangement.flatMap((r) => r.syllables)
    expect(words).toContain('หนึ่งเอ')
    expect(words).toContain('สามเอ')
    expect(words).not.toContain('สองเอ')
    expect(pc.stanzas).toHaveLength(1) // melody untouched
  })

  it('deleting down to ONE set collapses to an ordinary song (no lyricSets / no set keys)', async () => {
    const w = mountEd(song3)
    removeSet(w, 2)
    await nextTick()
    removeSet(w, 1)
    await nextTick()
    const pc = w.vm.previewContent
    expect('lyricSets' in pc).toBe(false)
    expect(pc.arrangement.every((r) => !('set' in r))).toBe(true)
    expect(pc.arrangement.flatMap((r) => r.syllables)).toContain('หนึ่งเอ') // set 0 words survive
    expect(pc.stanzas).toHaveLength(1)
  })

  it('never deletes the LAST set (guard)', async () => {
    const w = mountEd(song3)
    removeSet(w, 2); await nextTick()
    removeSet(w, 1); await nextTick() // now collapsed to ordinary (lyricSets empty)
    removeSet(w, 0); await nextTick() // guard: no-op, still has its one row + melody
    const pc = w.vm.previewContent
    expect(pc.arrangement.length).toBeGreaterThanOrEqual(1)
    expect(pc.stanzas).toHaveLength(1)
  })
})

// ---- naming a set ("different words must have different names") --------------------------
describe('EditorMode — naming a lyric set', () => {
  const SET1 = 'บรรดาคนบาป เชิญท่านเข้ามา'
  const SET2 = 'ผู้ที่ถูกบาปทำร้ายจงมา'
  // the shape the merge SQL writes: both `name` and `label`, same value
  const named717 = {
    ...song717,
    id: 's4',
    title_th: SET1,
    content: {
      ...song717.content,
      lyricSets: [{ name: SET1, label: SET1 }, { name: SET2, label: SET2 }],
    },
  }
  const rename = async (w, i, v) => {
    w.vm.startRenameSet(i)
    await nextTick()
    w.vm.setNameDraft = v
    w.vm.commitRenameSet()
    await nextTick()
  }

  it('round-trips a named song exactly — same keys in, same keys out', () => {
    const pc = mountEd(named717).vm.previewContent
    expect(pc.lyricSets).toEqual([{ name: SET1, label: SET1 }, { name: SET2, label: SET2 }])
  })

  it('the tabs show the set NAMES, not ทำนอง ๑/๒', () => {
    const w = mountEd(named717)
    expect(w.findAll('.eset-tab').map((t) => t.text())).toEqual([SET1, SET2])
  })

  it('renaming writes `name` AND keeps `label` in step (deployed readers render label)', async () => {
    const w = mountEd(song717) // label-only legacy song
    await rename(w, 1, SET2)
    expect(w.vm.previewContent.lyricSets).toEqual([
      { label: 'ทำนอง ๑' }, // untouched set stays byte-identical
      { name: SET2, label: SET2 },
    ])
    expect(w.findAll('.eset-tab')[1].text()).toBe(SET2)
  })

  it('trims, and clearing the name restores the positional ทำนอง 2 (arabic)', async () => {
    const w = mountEd(song717)
    await rename(w, 1, '   ' + SET2 + '  ')
    expect(w.vm.previewContent.lyricSets[1]).toEqual({ name: SET2, label: SET2 })
    await rename(w, 1, '   ')
    expect(w.vm.previewContent.lyricSets[1]).toEqual({ label: 'ทำนอง 2' })
    expect(w.findAll('.eset-tab')[1].text()).toBe('ทำนอง 2')
  })

  it('Esc cancels — the name is left as it was', async () => {
    const w = mountEd(named717)
    w.vm.startRenameSet(1)
    await nextTick()
    w.vm.setNameDraft = 'ชื่อที่ไม่ได้ตั้งใจ'
    w.vm.cancelRenameSet()
    await nextTick()
    expect(w.vm.previewContent.lyricSets[1].name).toBe(SET2)
  })

  it('a new set opens its name field, pre-filled with the default', async () => {
    const w = mountEd(plainSong)
    w.vm.addLyricSet()
    await nextTick(); await nextTick() // addLyricSet opens the rename on the next tick
    expect(w.vm.editingSetId).toBe(1)
    expect(w.vm.setNameDraft).toBe('ทำนอง 2')
    expect(w.find('.eset-rename').exists()).toBe(true)
    // naming it lands in the saved shape
    w.vm.setNameDraft = SET2
    w.vm.commitRenameSet()
    await nextTick()
    expect(w.vm.previewContent.lyricSets[1]).toEqual({ name: SET2, label: SET2 })
  })

  it('back-compat: a set the author never names saves as {label} only — no junk keys', async () => {
    const w = mountEd(plainSong)
    w.vm.addLyricSet()
    await nextTick(); await nextTick()
    w.vm.cancelRenameSet() // author dismissed the name field
    await nextTick()
    expect(w.vm.previewContent.lyricSets).toEqual([{ label: 'ทำนอง 1' }, { label: 'ทำนอง 2' }])
  })

  it('announces add + rename on the aria-live channel (focus moves into the name field)', async () => {
    const w = mountEd(plainSong)
    w.vm.addLyricSet()
    await nextTick(); await nextTick()
    expect(w.vm.removeSetMsg).toContain('เพิ่มชุดเนื้อร้องแล้ว')
    w.vm.setNameDraft = SET2
    w.vm.commitRenameSet()
    await nextTick()
    expect(w.vm.removeSetMsg).toContain(SET2)
    expect(w.find('.sr-only[aria-live="polite"], span[aria-live="polite"]').exists()).toBe(true)
  })

  it('an ordinary song cannot rename its lone set (its name IS title_th)', async () => {
    const w = mountEd(plainSong)
    w.vm.startRenameSet(0)
    await nextTick()
    expect(w.vm.editingSetId).toBe(-1)
    expect(w.find('.eset-rename').exists()).toBe(false)
    expect('lyricSets' in w.vm.previewContent).toBe(false) // still byte-identical
  })
})

// 717 — the editor opens on the set the READER was on. The tabs exist so a singer can pick
// their words; landing on set 1 every time means the first thing an author does in แก้ไข is
// re-pick the set they already picked in ดู. Studio carries the reader's tab across as
// `initialSet`, and the editor adopts it on the way IN (props.active flipping true).
describe('EditorMode — 717 opens on the reader’s set', () => {
  const mountAt = (song, initialSet, active = false) =>
    mount(EditorMode, {
      props: { song, tier: 'approver', active, initialSet },
      attachTo: document.body,
      global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, DockKey: true, ComboSelect: true } },
    })

  it.each([0, 1])('entering แก้ไข with the reader on set %i selects that set', async (set) => {
    const w = mountAt(song717, set)
    await w.setProps({ active: true }) // ดู → แก้ไข
    await nextTick()
    expect(w.vm.activeSet).toBe(set)
  })

  it('the row lens lands on a row of that set, so the first edit targets it', async () => {
    const w = mountAt(song717, 1)
    await w.setProps({ active: true })
    await nextTick()
    expect(w.vm.arrangement[w.vm.lensChoice].set).toBe(1)
  })

  it('a set deleted since the reader picked it clamps instead of going out of range', async () => {
    const w = mountAt(song717, 5) // only 2 sets exist
    await w.setProps({ active: true })
    await nextTick()
    expect(w.vm.activeSet).toBe(1) // clamped to the last set, never undefined
  })

  it('back-compat — an ordinary song ignores initialSet and stays on set 0', async () => {
    const w = mountAt(plainSong, 1)
    await w.setProps({ active: true })
    await nextTick()
    expect(w.vm.activeSet).toBe(0)
    expect('lyricSets' in w.vm.previewContent).toBe(false) // and still saves byte-identical
  })
})
