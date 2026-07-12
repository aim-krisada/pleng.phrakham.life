// B102 AC-5 — the "ร้องรับทุกข้อ" checkbox is a plain-language helper that writes/removes the
// strophic `afterEachVerse` directive on the refrain ท่อน. It must: write the directive into the
// saved content (previewContent = SSOT), keep a single refrain per song, be covered by undo/redo,
// and survive a save→reload (persist). Drives toggleAfterEachVerse — the same handler the checkbox
// @change calls.
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

// two ท่อน: a verse (row 0) and a refrain (row 1)
const SONG = {
  id: 'song-1', number: 141, title_th: 'โอพระเยซู', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [
      { id: 'A', lines: [[{ type: 'segment', note: '1 2' }]] },
      { id: 'B', lines: [[{ type: 'segment', note: '5 5' }]] },
    ],
    arrangement: [
      { stanza: 'A', label: 'ข้อ 1', syllables: [] },
      { stanza: 'B', label: 'รับ', syllables: [] },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

async function mountEditor() {
  const w = mount(EditorMode, {
    props: { song: SONG, tier: 'approver', active: true },
    global: { stubs: { Icon: true } },
  })
  await nextTick()
  await nextTick()
  return w
}
async function settle() {
  vi.advanceTimersByTime(500)
  await nextTick()
  await nextTick()
}
const refrainEntry = (w) => w.vm.previewContent.arrangement[1]

describe('B102 — "ร้องรับทุกข้อ" checkbox writes/removes the directive', () => {
  beforeEach(() => vi.useFakeTimers())

  it('ticking the refrain row writes afterEachVerse into the saved content', async () => {
    const w = await mountEditor()
    expect(refrainEntry(w).afterEachVerse).toBeUndefined() // absent by default

    w.vm.toggleAfterEachVerse(1, true)
    await nextTick()
    expect(refrainEntry(w).afterEachVerse).toBe(true)

    w.vm.toggleAfterEachVerse(1, false)
    await nextTick()
    expect(refrainEntry(w).afterEachVerse).toBeUndefined() // removed → not serialized
  })

  it('only ONE refrain per song — ticking a second row clears the first', async () => {
    const w = await mountEditor()
    w.vm.toggleAfterEachVerse(0, true)
    await nextTick()
    w.vm.toggleAfterEachVerse(1, true)
    await nextTick()
    expect(w.vm.previewContent.arrangement[0].afterEachVerse).toBeUndefined()
    expect(w.vm.previewContent.arrangement[1].afterEachVerse).toBe(true)
  })

  it('undo/redo covers the directive change', async () => {
    const w = await mountEditor()
    w.vm.toggleAfterEachVerse(1, true)
    await nextTick()
    await settle() // commit the edit to history

    w.vm.undo()
    await nextTick(); await nextTick()
    expect(refrainEntry(w).afterEachVerse).toBeUndefined() // undone

    w.vm.redo()
    await nextTick(); await nextTick()
    expect(refrainEntry(w).afterEachVerse).toBe(true) // redone
  })
})
