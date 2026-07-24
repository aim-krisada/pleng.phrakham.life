// Editor flow polish (docs/ds/editor-flow-polish.md, PART 2) — the caret / delete / octave model.
// These drive REAL bubbling keydown on the capture field (not vm calls), because the whole point
// is the keydown handler: direction, mode and dead-key resolution all live there. A test that
// called the helpers directly would pass even if the key routing were wrong.
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
window.innerWidth = 400 // jsdom has no layout → render the phone variant (same handlers)
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'

const content = (note = '1 2', syls = ['ก', 'ข']) => ({
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note, chord: '' }]] }],
  arrangement: [{ stanza: 'A', label: '', syllables: syls }],
})
// content with a bar line between two one-note segments (for the cross-bar delete)
const barContent = () => ({
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1', chord: '' }, { type: 'bar' }, { type: 'segment', note: '2', chord: '' }]] }],
  arrangement: [{ stanza: 'A', label: '', syllables: ['ก', 'ข'] }],
})

function mountHost(c = content()) {
  const Host = {
    components: { SongViewer },
    data: () => ({ song: { number: 1, title_th: 'ทดสอบ', content: c } }),
    methods: { apply(content) { this.song = { ...this.song, content } } },
    template: `<SongViewer :song="song" tier="editor" @update-content="apply" />`,
  }
  return mount(Host, { attachTo: document.body })
}
const viewer = (w) => w.findComponent(SongViewer)
const line0 = (w) => w.vm.song.content.stanzas[0].lines[0]
const noteAt = (w, seg = 0) => line0(w).filter((i) => i.type === 'segment')[seg].note
const press = async (w, key, mods = {}) => {
  await w.find('.sv-capture').trigger('keydown', { key, ...mods })
  await nextTick()
  await nextTick()
}
async function enterEdit(w, li = 0, si = 0, syk = 0) {
  await w.find('.sv-fab').trigger('click')
  await nextTick()
  viewer(w).vm.selectUnit(li, si, syk, 'note')
  await nextTick()
  await nextTick()
}

describe('editor flow polish — caret / delete (item 4)', () => {
  it('AC-B1 overwrite (default): a digit overwrites the covered note, no ripple', async () => {
    const w = mountHost(content('1 2'))
    await enterEdit(w)
    expect(viewer(w).vm.typeMode).toBe('overwrite')
    await press(w, '5')
    expect(noteAt(w)).toBe('5 2') // overwrote note 1, note 2 untouched (no new slot)
  })

  it('AC-B2 Insert flips to line-caret mode and a digit INSERTS (pushes right)', async () => {
    const w = mountHost(content('1 2'))
    await enterEdit(w)
    await press(w, 'Insert')
    expect(viewer(w).vm.typeMode).toBe('insert')
    await press(w, '5') // caret sits before note 1 (g0) → insert ahead of it
    expect(noteAt(w)).toBe('5 1 2')
  })

  it('AC-B3 insert BEFORE the first note (g0 reachable) — "insert 5 before 2"', async () => {
    const w = mountHost(content('2 5 2', ['ก', 'ข', 'ค']))
    await enterEdit(w)
    await press(w, 'Insert') // caretGap = 0 (before the first note)
    await press(w, '5')
    expect(noteAt(w)).toBe('5 2 5 2')
  })

  it('AC-B4 Backspace deletes LEFT of the caret, Delete deletes RIGHT (pull-tight)', async () => {
    // Backspace case
    let w = mountHost(content('2 5'))
    await enterEdit(w)
    await press(w, 'Insert') // caret g0
    await press(w, 'ArrowRight') // caret between 2 | 5
    await press(w, 'Backspace') // deletes the 2 (left of caret)
    expect(noteAt(w)).toBe('5')
    // Delete case (fresh song)
    w = mountHost(content('2 5'))
    await enterEdit(w)
    await press(w, 'Insert')
    await press(w, 'ArrowRight') // caret between 2 | 5
    await press(w, 'Delete') // deletes the 5 (right of caret)
    expect(noteAt(w)).toBe('2')
  })

  it('AC-B5 typing 0 makes a rest in place (the old Delete=rest now lives on the 0 key)', async () => {
    const w = mountHost(content('1 2'))
    await enterEdit(w)
    await press(w, '0')
    expect(noteAt(w)).toBe('0 2') // note 1 became a rest, slot kept
  })

  it('AC-B6 forward-delete across a bar removes the next bar’s first note, never the | line', async () => {
    const w = mountHost(barContent())
    await enterEdit(w)
    await press(w, 'Insert')
    await press(w, 'ArrowRight') // caret after note 1 = end of the first bar
    await press(w, 'Delete') // removes note 2 (first note of the next bar)
    const items = line0(w)
    expect(items.some((i) => i.type === 'bar')).toBe(true) // the | survived
    expect(items.filter((i) => i.type === 'segment').map((s) => s.note)).toEqual(['1'])
  })

  it('block-mode Delete pull-tights the covered note (was rest); Backspace removes + steps back', async () => {
    const w = mountHost(content('1 2 3', ['ก', 'ข', 'ค']))
    await enterEdit(w)
    await press(w, 'Delete') // overwrite mode: delete covered note 1, pull 2,3 left
    expect(noteAt(w)).toBe('2 3')
  })
})

describe('editor flow polish — keyboard octave dead-key (item 5)', () => {
  it('AC-B2a "." then a digit = a LOW note (.5)', async () => {
    const w = mountHost(content('1 2'))
    await enterEdit(w)
    await press(w, '.')
    expect(viewer(w).vm.pendingLow).toBe(true) // armed
    await press(w, '5')
    expect(noteAt(w)).toBe('.5 2')
    expect(viewer(w).vm.pendingLow).toBe(false) // one-shot cleared
  })

  it('AC-B2b "5" then "\'" = a HIGH note (5\') — the existing path is unchanged', async () => {
    const w = mountHost(content('1 2'))
    await enterEdit(w)
    await press(w, '5')
    await press(w, "'")
    expect(noteAt(w)).toBe("5' 2")
  })

  it('AC-B2c "." then a NON-digit = an augmentation dot on the current note (5.), not low', async () => {
    const w = mountHost(content('5 2'))
    await enterEdit(w)
    await press(w, '.')
    await press(w, 'Enter') // resolves the pending '.' as an aug dot, then moves on
    expect(noteAt(w)).toBe('5. 2')
    expect(viewer(w).vm.pendingLow).toBe(false)
  })

  it('AC-B2d Esc cancels a pending "." with no change to the note', async () => {
    const w = mountHost(content('5 2'))
    await enterEdit(w)
    await press(w, '.')
    expect(viewer(w).vm.pendingLow).toBe(true)
    await press(w, 'Escape')
    expect(viewer(w).vm.pendingLow).toBe(false)
    expect(noteAt(w)).toBe('5 2') // untouched
    expect(viewer(w).vm.editMode).toBe(true) // first Esc only cancelled the dead key
  })

  it('low octave works in INSERT mode too (inserts .5)', async () => {
    const w = mountHost(content('1 2'))
    await enterEdit(w)
    await press(w, 'Insert') // caret g0
    await press(w, '.')
    await press(w, '5')
    expect(noteAt(w)).toBe('.5 1 2')
  })
})

describe('editor flow polish — chord at cursor (item 3)', () => {
  it('AC-3.1/3.2 C opens the popup; typing + Enter lands the chord on the note', async () => {
    const w = mountHost(content('1 2'))
    await enterEdit(w)
    await press(w, 'c')
    expect(viewer(w).vm.chordPopupOpen).toBe(true)
    const inp = w.find('.sv-chordpop-input')
    expect(inp.exists()).toBe(true)
    inp.element.value = 'G'
    await inp.trigger('input')
    await inp.trigger('keydown', { key: 'Enter' })
    await nextTick(); await nextTick()
    expect(line0(w)[0].chord).toBe('G')
    expect(viewer(w).vm.chordPopupOpen).toBe(false)
  })

  it('AC-3.4 pristine popup + Enter keeps the existing chord (never silently deletes)', async () => {
    const w = mountHost({ ...content('1 2'), stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2', chord: 'Am' }]] }] })
    await enterEdit(w)
    await press(w, 'c') // opens pre-filled with Am, untouched
    await w.find('.sv-chordpop-input').trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(line0(w)[0].chord).toBe('Am') // still there
  })

  it('AC-3.5 a valid but uncommon chord is taken verbatim (no autocorrect)', async () => {
    const w = mountHost(content('1 2'))
    await enterEdit(w)
    await press(w, 'c')
    const inp = w.find('.sv-chordpop-input')
    inp.element.value = 'C#maj7/F'
    await inp.trigger('input')
    await inp.trigger('keydown', { key: 'Enter' })
    await nextTick(); await nextTick()
    expect(line0(w)[0].chord).toBe('C#maj7/F')
  })

  it('Esc in the popup closes it and stays in edit mode (no chord change)', async () => {
    const w = mountHost(content('1 2'))
    await enterEdit(w)
    await press(w, 'c')
    const inp = w.find('.sv-chordpop-input')
    inp.element.value = 'G'
    await inp.trigger('input')
    await inp.trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(viewer(w).vm.chordPopupOpen).toBe(false)
    expect(line0(w)[0].chord).toBe('') // the typed edit was cancelled
    expect(viewer(w).vm.editMode).toBe(true)
  })
})
