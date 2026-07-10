// B075 — Ctrl+Z must undo the LATEST edit first, one step at a time.
// พี่เปา repro: กด Ctrl+Z ย้อนไป "ตัวที่ไม่ใช่การแก้ล่าสุด" (ข้ามการแก้ล่าสุด).
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

const SONG = {
  id: 'song-1',
  number: 12,
  title_th: 'S0',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['พระ'] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

// a Ctrl+Z / Ctrl+Shift+Z the same way the browser delivers it to the window listener
function ctrlZ(shift = false) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: shift, bubbles: true }))
}

async function mountEditor() {
  const wrapper = mount(EditorMode, {
    props: { song: SONG, tier: 'approver', active: true },
    global: { stubs: { Icon: true } },
  })
  await nextTick()
  await nextTick() // let the immediate props.song watcher's nextTick(resetHistory) settle
  return wrapper
}

// commit the pending debounced snapshot (watcher debounce is 400ms)
async function settle() {
  vi.advanceTimersByTime(500)
  await nextTick()
  await nextTick()
}

describe('B075 — undo returns the latest edit first', () => {
  beforeEach(() => vi.useFakeTimers())

  it('edit A → edit B (each committed) → Ctrl+Z gives A', async () => {
    const w = await mountEditor()
    expect(w.vm.meta.title_th).toBe('S0')

    w.vm.meta.title_th = 'A'
    await nextTick()
    await settle()

    w.vm.meta.title_th = 'B'
    await nextTick()
    await settle()

    ctrlZ()
    await nextTick()
    await nextTick()
    expect(w.vm.meta.title_th).toBe('A') // NOT S0, NOT B
  })

  it('rapid edit A → edit B (no pause between) → Ctrl+Z should still give A', async () => {
    const w = await mountEditor()

    w.vm.meta.title_th = 'A'
    await nextTick()
    // no settle — user keeps typing within the debounce window
    w.vm.meta.title_th = 'B'
    await nextTick()
    await settle()

    ctrlZ()
    await nextTick()
    await nextTick()
    expect(w.vm.meta.title_th).toBe('A')
  })

  it('edit B then immediate Ctrl+Z (before debounce settles) flushes B and gives A', async () => {
    const w = await mountEditor()
    w.vm.meta.title_th = 'A'
    await nextTick(); await settle()

    w.vm.meta.title_th = 'B'
    await nextTick()
    // no settle — undo must flush the pending edit itself
    ctrlZ()
    await nextTick(); await nextTick()
    expect(w.vm.meta.title_th).toBe('A')
  })

  it('three deliberate edits → Ctrl+Z steps back one at a time (C→B→A→S0)', async () => {
    const w = await mountEditor()
    for (const v of ['A', 'B', 'C']) {
      w.vm.meta.title_th = v
      await nextTick(); await settle()
    }
    for (const expected of ['B', 'A', 'S0']) {
      ctrlZ()
      await nextTick(); await nextTick()
      expect(w.vm.meta.title_th).toBe(expected)
    }
  })

  it('Ctrl+Z then Ctrl+Shift+Z (redo) returns B', async () => {
    const w = await mountEditor()
    w.vm.meta.title_th = 'A'
    await nextTick(); await settle()
    w.vm.meta.title_th = 'B'
    await nextTick(); await settle()

    ctrlZ()
    await nextTick(); await nextTick()
    expect(w.vm.meta.title_th).toBe('A')

    ctrlZ(true) // redo
    await nextTick(); await nextTick()
    expect(w.vm.meta.title_th).toBe('B')
  })
})
