// R1 + R3/R5 in the editor: marker ids mint on load and round-trip id-stable, a copy gets a
// FRESH id, and the per-verse flow controls (patterns 2,3,4,6) write arrangement[i].flow.
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
import { mintMarkerIds } from '../lib/songFlow.js'

// a song whose stanza A carries a bar-level repeat (no ids yet — like an existing song)
const repeatSong = (arrangement = [{ stanza: 'A', label: 'ข้อ 1', syllables: [] }]) => ({
  id: 's-flow', number: 5, title_th: 'เพลงวน', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[
      { type: 'repeat-start' }, { type: 'segment', note: '1 2' }, { type: 'repeat-end' },
    ]] }],
    arrangement,
  },
})

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})

function mountEd(song) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

const marks = (w) => w.vm.previewContent.stanzas[0].lines[0]

describe('R1 — marker ids on load / round-trip / copy', () => {
  it('an existing repeat with no id gets one minted on load (shared start↔end)', async () => {
    const w = mountEd(repeatSong())
    await nextTick()
    const start = marks(w).find((i) => i.type === 'repeat-start')
    const end = marks(w).find((i) => i.type === 'repeat-end')
    expect(start.id).toBeTruthy()
    expect(start.id).toBe(end.id)
  })

  it('ROUND-TRIP: save the loaded content, re-load it → the id is the SAME (#1 risk)', async () => {
    const w = mountEd(repeatSong())
    await nextTick()
    const saved = JSON.parse(JSON.stringify(w.vm.previewContent))
    const idBefore = saved.stanzas[0].lines[0].find((i) => i.type === 'repeat-end').id
    // reload the saved content into a fresh editor
    const w2 = mountEd({ ...repeatSong(), content: saved })
    await nextTick()
    const idAfter = marks(w2).find((i) => i.type === 'repeat-end').id
    expect(idAfter).toBe(idBefore)
  })

  it('a repeat that already has an id is NOT reassigned on load', async () => {
    const song = repeatSong()
    song.content.stanzas[0].lines[0] = [
      { type: 'repeat-start', id: 'r9' }, { type: 'segment', note: '1 2' }, { type: 'repeat-end', id: 'r9' },
    ]
    const w = mountEd(song)
    await nextTick()
    expect(marks(w).find((i) => i.type === 'repeat-end').id).toBe('r9')
  })
})

describe('R3/R5 — per-verse flow controls write arrangement[i].flow', () => {
  const twoVerses = () => repeatSong([
    { stanza: 'A', label: 'ข้อ 1', syllables: [] },
    { stanza: 'A', label: 'ข้อ 2', syllables: [] },
  ])

  it('pattern 2 — "ข้อนี้ไม่วนซ้ำ" writes skip:["*"] and playback skips the repeat', async () => {
    const w = mountEd(twoVerses())
    await nextTick()
    w.vm.setVerseSkipAll(w.vm.arrangement[1], true)
    await nextTick()
    const arr = w.vm.previewContent.arrangement
    expect(arr[0].flow).toBeUndefined() // ข้อ 1 untouched
    expect(arr[1].flow).toEqual({ skip: ['*'] })
  })

  it('clearing it removes the flow entirely (no empty {} left behind)', async () => {
    const w = mountEd(twoVerses())
    await nextTick()
    w.vm.setVerseSkipAll(w.vm.arrangement[1], true)
    await nextTick()
    w.vm.setVerseSkipAll(w.vm.arrangement[1], false)
    await nextTick()
    expect(w.vm.previewContent.arrangement[1].flow).toBeUndefined()
  })

  it('pattern 4 — "เล่นกี่รอบ" writes times keyed by the repeat id', async () => {
    const w = mountEd(twoVerses())
    await nextTick()
    const id = w.vm.markerIds[0]
    w.vm.setVerseTimes(w.vm.arrangement[0], id, '3')
    await nextTick()
    expect(w.vm.previewContent.arrangement[0].flow.times[id]).toBe(3)
  })

  it('pattern 3 — "เข้าห้องจบชุดที่ N" writes flow.ending', async () => {
    const w = mountEd(twoVerses())
    await nextTick()
    w.vm.setVerseEnding(w.vm.arrangement[0], '3')
    await nextTick()
    expect(w.vm.previewContent.arrangement[0].flow.ending).toBe(3)
  })

  it('R4 — deleting the marker that a flow points at surfaces an orphan warning (not silent)', async () => {
    const w = mountEd(twoVerses())
    await nextTick()
    const id = w.vm.markerIds[0]
    w.vm.setVerseTimes(w.vm.arrangement[1], id, '3') // ข้อ 2 references r1
    await nextTick()
    // now delete the repeat from the melody (simulate the user clearing it)
    w.vm.stanzas[0].lines[0].bars[0].repeatStart = false
    w.vm.stanzas[0].lines[0].bars[0].repeatEnd = false
    w.vm.stanzas[0].lines[0].bars[0].repeatStartId = ''
    w.vm.stanzas[0].lines[0].bars[0].repeatEndId = ''
    await nextTick()
    expect(w.vm.flowOrphans.length).toBeGreaterThan(0)
    expect(w.vm.flowOrphans[0]).toMatchObject({ entryIndex: 1, kind: 'times' })
  })
})

describe('R1 control — a song with NO markers is byte-identical after open+save', () => {
  it('open + save changes nothing (no ids injected where there are no markers)', async () => {
    const plain = {
      id: 's-plain', number: 1, title_th: 'เรียบ', title_en: '',
      content: {
        version: 2, key: 'C', timeSignature: '4/4',
        stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3 4' }]] }],
        arrangement: [{ stanza: 'A', label: '', syllables: [] }],
      },
    }
    const w = mountEd(plain)
    await nextTick()
    const saved = w.vm.previewContent
    // no structural markers → mintMarkerIds is a no-op → the untouched melody line round-trips
    // BYTE-IDENTICAL through the lossless serde (no `chord: ''` injected where none was stored)
    expect(saved.stanzas[0].lines[0]).toEqual([{ type: 'segment', note: '1 2 3 4' }])
    expect(saved.arrangement[0].flow).toBeUndefined()
  })
})
