// B097 — undo/redo must keep the NOTES and the LYRIC boxes under them in sync, across
// every edit type, and must NOT count pure navigation (switch ท่อน / switch เที่ยว) as a step.
// P'Aim's symptom (12 ก.ค.): after an edit + Ctrl+Z the note looks right but the lyric box
// below shows the WRONG เที่ยว — because applyState() called resetLens() and lensChoice was
// never in the snapshot. These tests pin the doc-state / view-state split that fixes it.
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

// stanza A bears 2 attack notes (2 syllable slots) and is used by TWO เที่ยว (ร้อง 1/2);
// stanza B bears 1 note used by a third เที่ยว — enough to exercise verse-lens + stanza-switch.
const SONG = {
  id: 'song-1',
  number: 12,
  title_th: 'S0',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      { id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1' }, { type: 'segment', note: '2' }]] },
      { id: 'B', lines: [[{ type: 'segment', chord: 'G', note: '3' }]] },
    ],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: ['ก', 'ข'] },
      { stanza: 'A', label: 'ร้อง 2', syllables: ['ค', 'ง'] },
      { stanza: 'B', label: 'ร้อง 3', syllables: ['จ'] },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

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

// the active stanza's first segment's note (proxy for "the notes are intact")
function firstNote(w) {
  return w.vm.stanzas[0].lines[0].bars[0].segments[0].note
}

describe('B097 — undo/redo keeps notes + lyric boxes in sync', () => {
  beforeEach(() => vi.useFakeTimers())

  it('edit เที่ยว 2 words → Ctrl+Z restores words AND notes and stays on เที่ยว 2 (PAim repro)', async () => {
    const w = await mountEditor()

    // navigate to เที่ยว 2 (view-only) — this must NOT be an undo step
    w.vm.focusRow(1)
    await nextTick()
    await settle()
    expect(w.vm.lensChoice).toBe(1)
    expect(w.vm.activeStanza).toBe(0)

    // edit a word of เที่ยว 2
    w.vm.setSyl(w.vm.arrangement[1], 0, 'ZZ')
    await nextTick()
    await settle()
    expect(w.vm.arrangement[1].syllables[0]).toBe('ZZ')

    // Ctrl+Z: the word reverts, the notes are untouched, and the lens is STILL เที่ยว 2
    ctrlZ()
    await nextTick(); await nextTick()
    expect(w.vm.arrangement[1].syllables[0]).toBe('ค') // word restored
    expect(firstNote(w)).toBe('1') // notes intact (never edited)
    expect(w.vm.lensChoice).toBe(1) // still showing เที่ยว 2 — the fix
    expect(w.vm.activeStanza).toBe(0)

    // redo mirrors
    ctrlZ(true)
    await nextTick(); await nextTick()
    expect(w.vm.arrangement[1].syllables[0]).toBe('ZZ')
    expect(w.vm.lensChoice).toBe(1)
  })

  it('switching ท่อน is NOT an undo step — Ctrl+Z undoes the edit, not the navigation', async () => {
    const w = await mountEditor()

    // a real note edit
    w.vm.stanzas[0].lines[0].bars[0].segments[0].note = '5'
    await nextTick()
    await settle()
    const stepsAfterEdit = w.vm.history.length
    expect(firstNote(w)).toBe('5')

    // switch to stanza B just to look (pure navigation)
    w.vm.selectStanza(1)
    await nextTick()
    await settle()
    expect(w.vm.activeStanza).toBe(1)
    expect(w.vm.history.length).toBe(stepsAfterEdit) // NO new step from the switch

    // Ctrl+Z must undo the NOTE edit, not merely flip the stanza back
    ctrlZ()
    await nextTick(); await nextTick()
    expect(firstNote(w)).toBe('1') // the edit was undone
  })

  it('note edit → Ctrl+Z restores, redo returns', async () => {
    const w = await mountEditor()
    w.vm.stanzas[0].lines[0].bars[0].segments[0].note = '5'
    await nextTick(); await settle()
    expect(firstNote(w)).toBe('5')

    ctrlZ()
    await nextTick(); await nextTick()
    expect(firstNote(w)).toBe('1')

    ctrlZ(true)
    await nextTick(); await nextTick()
    expect(firstNote(w)).toBe('5')
  })

  it('chord edit → Ctrl+Z restores, redo returns', async () => {
    const w = await mountEditor()
    const bar = w.vm.stanzas[0].lines[0].bars[0]
    expect(bar.segments[0].chord).toBe('C')

    w.vm.applyChordAt(bar, 0, 0, 'F')
    await nextTick(); await settle()
    expect(w.vm.stanzas[0].lines[0].bars[0].segments[0].chord).toBe('F')

    ctrlZ()
    await nextTick(); await nextTick()
    expect(w.vm.stanzas[0].lines[0].bars[0].segments[0].chord).toBe('C')

    ctrlZ(true)
    await nextTick(); await nextTick()
    expect(w.vm.stanzas[0].lines[0].bars[0].segments[0].chord).toBe('F')
  })

  it('add ท่อน (stanza) → Ctrl+Z removes it, redo restores it', async () => {
    const w = await mountEditor()
    expect(w.vm.stanzas.length).toBe(2)

    w.vm.addStanza()
    await nextTick(); await settle()
    expect(w.vm.stanzas.length).toBe(3)

    ctrlZ()
    await nextTick(); await nextTick()
    expect(w.vm.stanzas.length).toBe(2)
    expect(w.vm.activeStanza).toBeLessThan(2) // view clamped back into range

    ctrlZ(true)
    await nextTick(); await nextTick()
    expect(w.vm.stanzas.length).toBe(3)
  })

  it('meta edit still undoes/redoes (B075 kept green through the split)', async () => {
    const w = await mountEditor()
    w.vm.meta.title_th = 'A'
    await nextTick(); await settle()
    w.vm.meta.title_th = 'B'
    await nextTick(); await settle()

    ctrlZ()
    await nextTick(); await nextTick()
    expect(w.vm.meta.title_th).toBe('A')

    ctrlZ(true)
    await nextTick(); await nextTick()
    expect(w.vm.meta.title_th).toBe('B')
  })
})
