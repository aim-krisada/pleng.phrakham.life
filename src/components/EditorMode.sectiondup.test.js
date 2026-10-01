// ใบ v3/pleng#94 (รอบ 2) — ทำซ้ำ instead of คัดลอก/วาง. พี่เปา tried คัดลอก→วาง and could not find where
// to paste, so พี่เอม (1 ต.ค. 2569) asked for one tap that inserts the copy right after its source:
//   ทำซ้ำเนื้อ (เนื้อ card) → the same words on the SAME melody (ผูก)
//   ทำซ้ำท่อน (ท่อน row)    → words + key + its OWN copy of the melody (แก้แยกกันได้)
// The new ท่อน can be moved with ▲▼/drag as before. These tests also keep the parts of the first
// round that stay: the ผูก mark in the panel and แยกทำนอง on the header.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

// A = 3 notes · B = 2 notes. Rows 2 and 4 already share melody B (ผูก). Row 2 is the refrain.
const SONG = {
  id: 's-94d',
  number: 94,
  title_th: 'ลองทำซ้ำท่อน',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      { id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3' }]] },
      { id: 'B', lines: [[{ type: 'segment', chord: 'F', note: '5 6' }]] },
    ],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: ['ก', 'ข', 'ค'], key: 'D' },
      { stanza: 'B', label: 'รับ', syllables: ['ง', 'จ'], afterEachVerse: true },
      { stanza: 'A', label: 'ร้อง 2', syllables: ['ฉ', 'ช', 'ซ'] },
      { stanza: 'B', label: 'รับ 2', syllables: ['ฌ', 'ญ'] },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  window.confirm = () => true
})

async function mountEd(song = SONG) {
  const w = mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
  await nextTick()
  await nextTick()
  return w
}
const contentOf = (w) => w.emitted('change').at(-1)[0].content
const rows = (w) => contentOf(w).arrangement
const stanzaOut = (w, id) => contentOf(w).stanzas.find((s) => s.id === id)
const notesOf = (st) => st.lines.flat().filter((it) => it.type === 'segment').map((it) => it.note)
const btn = (w, aria) => w.find(`button[aria-label="${aria}"]`)
async function select(w, i) {
  w.vm.focusRow(i)
  await nextTick()
  await nextTick()
}

describe('ใบ#94 รอบ 2 — ทำซ้ำท่อน (ท่อน row)', () => {
  it('every ท่อน row has a worded ทำซ้ำ button, and no paste button is left anywhere', async () => {
    const w = await mountEd()
    for (let i = 1; i <= 4; i++) expect(btn(w, 'ทำซ้ำท่อน ' + i).exists()).toBe(true)
    expect(btn(w, 'ทำซ้ำท่อน 1').text()).toContain('ทำซ้ำ')
    const labels = w.findAll('button').map((b) => b.attributes('aria-label') || '')
    expect(labels.some((l) => /^วาง(ทั้งท่อน|เนื้อ|ทำนอง)/.test(l))).toBe(false)
    expect(labels.some((l) => /^คัดลอก(ทั้งท่อน|เนื้อ|ทำนอง)/.test(l))).toBe(false)
  })

  it('one tap → a copy right after the source, selected: same words · key · name, its OWN identical melody', async () => {
    const w = await mountEd()
    await btn(w, 'ทำซ้ำท่อน 1').trigger('click')
    await nextTick()
    const r = rows(w)
    expect(r.map((x) => x.label)).toEqual(['ร้อง 1', 'ร้อง 1', 'รับ', 'ร้อง 2', 'รับ 2'])
    expect(r[1].syllables).toEqual(['ก', 'ข', 'ค'])
    expect(r[1].key).toBe('D')
    expect(r[1].stanza).not.toBe('A')
    expect(notesOf(stanzaOut(w, r[1].stanza))).toEqual(['1 2 3'])
    expect(w.vm.lensChoice).toBe(1) // the new ท่อน is the one being edited
    expect(w.vm.linkedRows(1)).toEqual([]) // not linked to anything

    // its melody is its own: editing it leaves the source alone
    w.vm.stanzas.find((s) => s.id === r[1].stanza).lines[0].bars[0].segments[0].note = '7 7 7'
    await nextTick()
    expect(notesOf(stanzaOut(w, 'A'))).toEqual(['1 2 3'])
  })

  it('a ท่อน in the middle is copied in place — the ท่อน below shift down, nothing else changes', async () => {
    const w = await mountEd()
    await btn(w, 'ทำซ้ำท่อน 3').trigger('click')
    await nextTick()
    expect(rows(w).map((x) => x.label)).toEqual(['ร้อง 1', 'รับ', 'ร้อง 2', 'ร้อง 2', 'รับ 2'])
    expect(rows(w)[4]).toMatchObject({ stanza: 'B', syllables: ['ฌ', 'ญ'] })
  })

  it('the copy of the refrain does NOT take its "ร้องรับทุกข้อ" mark (one refrain per song)', async () => {
    const w = await mountEd()
    await btn(w, 'ทำซ้ำท่อน 2').trigger('click')
    await nextTick()
    expect(rows(w)[1].afterEachVerse).toBe(true)
    expect(rows(w)[2].afterEachVerse).toBeFalsy()
  })

  it('a copied melody never inherits a marker id (one id = one marker)', async () => {
    const w = await mountEd()
    w.vm.stanzas[0].lines[0].markerId = 'm-1'
    await nextTick()
    w.vm.duplicateSection(0)
    await nextTick()
    const copy = w.vm.stanzas.find((s) => s.id === w.vm.arrangement[1].stanza)
    expect(copy.lines[0].markerId).toBe('')
    expect(w.vm.stanzas[0].lines[0].markerId).toBe('m-1')
  })
})

describe('ใบ#94 รอบ 2 — ทำซ้ำเนื้อ (เนื้อ card)', () => {
  it('one tap → a ท่อน right after with the same words on the SAME melody (ผูก)', async () => {
    const w = await mountEd()
    await select(w, 0)
    const b = btn(w, 'ทำซ้ำเนื้อท่อนนี้')
    expect(b.exists()).toBe(true)
    expect(b.text()).toContain('ทำซ้ำเนื้อ')
    await b.trigger('click')
    await nextTick()
    const r = rows(w)
    expect(r.map((x) => x.label)).toEqual(['ร้อง 1', 'ร้อง 1', 'รับ', 'ร้อง 2', 'รับ 2'])
    expect(r[1]).toMatchObject({ stanza: 'A', syllables: ['ก', 'ข', 'ค'], key: 'D' })
    expect(contentOf(w).stanzas.length).toBe(2) // no new melody
    expect(w.vm.lensChoice).toBe(1)
    // ผูก: it shows as linked in the panel, and one note edit is heard in both
    expect(w.vm.linkedRows(1)).toEqual([0, 3])
    expect(w.findAll('.srow')[1].find('.mchip').classes('linked')).toBe(true)
  })
})

describe('ใบ#94 — the ผูก mark and แยกทำนอง stay', () => {
  it('a linked ท่อน is marked in the panel and on its header, then แยก gives it its own identical melody', async () => {
    const w = await mountEd()
    expect(w.vm.linkedRows(1)).toEqual([3])
    const chip = w.findAll('.srow')[1].find('.mchip')
    expect(chip.classes('linked')).toBe(true)
    expect(chip.attributes('title')).toContain('ผูกกับท่อน 4')

    await select(w, 1)
    expect(w.find('.cs-linked').text()).toContain('ผูกกับท่อน 4')
    await btn(w, 'แยกทำนองของท่อนนี้').trigger('click')
    await nextTick()
    const id = rows(w)[1].stanza
    expect(id).not.toBe('B')
    expect(notesOf(stanzaOut(w, id))).toEqual(['5 6'])
    expect(rows(w)[1].syllables).toEqual(['ง', 'จ'])
    expect(rows(w)[3].stanza).toBe('B')
    expect(btn(w, 'แยกทำนองของท่อนนี้').exists()).toBe(false)
  })

  it('the melody copy/paste buttons are gone from the header', async () => {
    const w = await mountEd()
    await select(w, 0)
    expect(w.find('.cshead').text()).not.toContain('คัดลอกทำนอง')
    expect(w.find('.cshead').text()).not.toContain('วางทำนอง')
  })
})

describe('ใบ#94 — no new song field (Suggestion 6.1)', () => {
  it('rows and melodies keep only the keys v3 already reads', async () => {
    const w = await mountEd()
    const rowKeys = new Set(rows(w).flatMap((r) => Object.keys(r)))
    const stKeys = new Set(Object.keys(contentOf(w).stanzas[0]))
    w.vm.duplicateSection(0)
    w.vm.duplicateWords(2)
    await nextTick()
    for (const r of rows(w)) for (const k of Object.keys(r)) expect(rowKeys.has(k)).toBe(true)
    for (const s of contentOf(w).stanzas) for (const k of Object.keys(s)) expect(stKeys.has(k)).toBe(true)
  })
})

describe('ใบ#94 — ทำซ้ำ and แยก undo like any edit', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  async function settle() {
    vi.advanceTimersByTime(500)
    await nextTick()
    await nextTick()
  }
  for (const [name, run] of [
    ['ทำซ้ำท่อน', (w) => w.vm.duplicateSection(0)],
    ['ทำซ้ำเนื้อ', (w) => w.vm.duplicateWords(0)],
    ['แยกทำนอง', (w) => w.vm.unlinkRow(1)],
  ]) {
    it(`${name} → undo → exactly as before · redo → again`, async () => {
      const w = await mountEd()
      await settle()
      const before = JSON.stringify({ a: w.vm.arrangement, s: w.vm.stanzas })
      run(w)
      await nextTick()
      await settle()
      const after = JSON.stringify({ a: w.vm.arrangement, s: w.vm.stanzas })
      expect(after).not.toBe(before)
      w.vm.undo()
      await nextTick()
      await nextTick()
      expect(JSON.stringify({ a: w.vm.arrangement, s: w.vm.stanzas })).toBe(before)
      w.vm.redo()
      await nextTick()
      await nextTick()
      expect(JSON.stringify({ a: w.vm.arrangement, s: w.vm.stanzas })).toBe(after)
    })
  }
})
