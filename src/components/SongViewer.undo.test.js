// ย้อน / ทำซ้ำ in โหมดแก้ inline — a REGRESSION: the editor on `main` has always had both the
// buttons and the shortcuts, and the inline surface shipped without them. P'Aim: "ควรมีปุ่ม
// undo redo ด้วย ของเดิมมี พร้อม shortcut key".
// Covered here: undo restores exactly, every edit KIND is undoable (not half of them), the
// shortcut works while the caret is in the typing field, and the buttons tell the truth.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../lib/midi.js', () => ({
  playSong: vi.fn(() => new Promise(() => {})),
  playEnsemble: vi.fn(() => new Promise(() => {})),
  stopPlayback: () => {},
  setTranspose: () => {},
  keyTranspose: () => 0,
  songToNotes: () => [],
  buildPlayNotes: () => [],
  effectiveOrder: () => undefined,
  TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }],
}))
vi.mock('../lib/jsonIO.js', () => ({ downloadSong: vi.fn() }))
window.matchMedia = window.matchMedia || (() => ({ matches: false }))
// jsdom has no layout, so the desktop popup (which anchors to a measured note rect) can never
// appear here. Render the phone variant — same component, same buttons, same handlers.
window.innerWidth = 400
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'

const baseContent = () => ({
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] }],
  arrangement: [{ stanza: 'A', label: '', syllables: ['ก', 'ข'] }],
})

// A host that behaves like Studio: it owns the content and feeds edits back down, so undo is
// tested through the real loop (emit → prop → sheet), not against component internals.
function mountHost() {
  const Host = {
    components: { SongViewer },
    data: () => ({ song: { number: 1, title_th: 'ทดสอบ', content: baseContent() } }),
    methods: {
      apply(content) { this.song = { ...this.song, content } },
    },
    template: `<SongViewer :song="song" tier="editor" @update-content="apply" />`,
  }
  return mount(Host, { attachTo: document.body })
}
const viewer = (w) => w.findComponent(SongViewer)
const noteStr = (w) => w.vm.song.content.stanzas[0].lines[0][0].note
const syls = (w) => w.vm.song.content.arrangement[0].syllables
async function enterEdit(w) {
  await w.find('.sv-fab').trigger('click') // the ✏️ FAB, as a user does
  await nextTick()
  viewer(w).vm.selectUnit(0, 0, 0, 'note') // put the cursor on the first note
  await nextTick()
  await nextTick()
}
// drive the same handlers the keyboard drives
const press = async (w, key, mods = {}) => {
  const input = w.find('.sv-capture')
  await input.trigger('keydown', { key, ...mods })
  await nextTick()
}

describe('SongViewer — ย้อน / ทำซ้ำ', () => {
  it('undo restores the previous note exactly; redo puts the edit back', async () => {
    const w = mountHost()
    await enterEdit(w)
    await press(w, '5')
    expect(noteStr(w)).not.toBe('1 2')
    const edited = noteStr(w)
    await press(w, 'z', { ctrlKey: true })
    expect(noteStr(w)).toBe('1 2')
    await press(w, 'y', { ctrlKey: true })
    expect(noteStr(w)).toBe(edited)
  })

  it('Ctrl+Shift+Z also redoes (same contract as the editor on main)', async () => {
    const w = mountHost()
    await enterEdit(w)
    await press(w, '5')
    await press(w, 'z', { ctrlKey: true })
    expect(noteStr(w)).toBe('1 2')
    await press(w, 'z', { ctrlKey: true, shiftKey: true })
    expect(noteStr(w)).not.toBe('1 2')
  })

  it('covers EVERY edit kind, not half of them', async () => {
    const w = mountHost()
    await enterEdit(w)
    const v = viewer(w).vm
    const before = JSON.stringify(w.vm.song.content)
    // a word, a symbol, an accidental, a chord and a delete — one of each family
    v.applySymbol('_')
    await nextTick()
    v.applySymbol('|')
    await nextTick()
    v.setChord('G')
    await nextTick()
    v.deleteSel()
    await nextTick()
    expect(JSON.stringify(w.vm.song.content)).not.toBe(before)
    // walk all the way back
    for (let i = 0; i < 8 && JSON.stringify(w.vm.song.content) !== before; i++) {
      v.undoEdit()
      await nextTick()
    }
    expect(JSON.stringify(w.vm.song.content)).toBe(before)
  })

  it('lyric typing is undoable too', async () => {
    const w = mountHost()
    await enterEdit(w)
    const v = viewer(w).vm
    v.selectUnit(0, 0, 0, 'word')
    await nextTick()
    const input = w.find('.sv-capture')
    input.element.value = 'สรร'
    await input.trigger('input')
    await nextTick()
    expect(syls(w)[0]).toBe('สรร')
    v.undoEdit()
    await nextTick()
    expect(syls(w)[0]).toBe('ก')
  })

  it('the buttons state the truth — disabled with nothing to undo/redo', async () => {
    const w = mountHost()
    await enterEdit(w)
    const btns = () => w.findAll('.nib-hist')
    expect(btns()).toHaveLength(2)
    expect(btns()[0].attributes('disabled')).toBeDefined() // nothing edited yet
    expect(btns()[1].attributes('disabled')).toBeDefined()
    await press(w, '5')
    expect(btns()[0].attributes('disabled')).toBeUndefined()
    expect(btns()[1].attributes('disabled')).toBeDefined() // nothing to redo yet
    await btns()[0].trigger('click')
    await nextTick()
    expect(noteStr(w)).toBe('1 2')
    expect(btns()[1].attributes('disabled')).toBeUndefined()
  })

  it('the buttons print their shortcut (never a tooltip — hover does not exist here)', async () => {
    const w = mountHost()
    await enterEdit(w)
    const [undoBtn, redoBtn] = w.findAll('.nib-hist')
    expect(undoBtn.text()).toContain('ย้อน')
    expect(undoBtn.text()).toContain('Ctrl+Z')
    expect(redoBtn.text()).toContain('ทำซ้ำ')
    expect(redoBtn.text()).toContain('Ctrl+Y')
    expect(undoBtn.attributes('title')).toBeUndefined()
    expect(undoBtn.attributes('aria-label')).toContain('ย้อน')
  })

  it('never undoes past the moment ✏️ went on (found live: it jumped to the pre-load song)', async () => {
    const w = mountHost()
    // the shell settles the song AFTER mount (load → migrate → recovered copy): none of that
    // is the user's typing, so none of it may be an undo step
    w.vm.apply({ ...baseContent(), stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '3 4', chord: 'C' }]] }] })
    await nextTick()
    await enterEdit(w)
    expect(w.findAll('.nib-hist')[0].attributes('disabled')).toBeDefined() // nothing to undo yet
    await press(w, '5')
    const v = viewer(w).vm
    for (let i = 0; i < 4; i++) { v.undoEdit(); await nextTick() }
    expect(noteStr(w)).toBe('3 4') // back to what was on screen when แก้ opened — no further
  })

  it('undoing past the start is a no-op, and the song is unharmed', async () => {
    const w = mountHost()
    await enterEdit(w)
    const v = viewer(w).vm
    await press(w, '5')
    for (let i = 0; i < 5; i++) { v.undoEdit(); await nextTick() }
    expect(noteStr(w)).toBe('1 2')
    expect(syls(w)).toEqual(['ก', 'ข'])
  })

  // Regression (24 ก.ค.): ONE Ctrl+Z undid TWO edits. The capture field's keydown handler ran
  // undo, then the SAME native event bubbled to the window listener which ran it again — because
  // the field handler forgot stopPropagation (the transport path already had it). This test only
  // catches the bug because it (a) makes TWO distinct history steps — the clock is advanced past
  // BURST_MS so the two edits don't coalesce — and (b) delivers the key as a REAL bubbling
  // keydown on the field. A test that called vm.undoEdit() directly would see one call and pass
  // even with the double-handler present.
  it('one Ctrl+Z undoes exactly ONE edit, not two (real bubbling key)', async () => {
    vi.useFakeTimers()
    try {
      const w = mountHost()
      await enterEdit(w)
      await press(w, '5') // '1 2' → '5 2'  (step 1)
      vi.advanceTimersByTime(500) // past the 400ms burst → the next edit is its own step
      await press(w, '6') // '5 2' → '6 2'  (step 2)
      expect(noteStr(w)).toBe('6 2')
      await press(w, 'z', { ctrlKey: true }) // ONE press
      // exactly one step back. Before the fix this landed on '1 2' (both steps undone at once).
      expect(noteStr(w)).toBe('5 2')
    } finally {
      vi.useRealTimers()
    }
  })
})
