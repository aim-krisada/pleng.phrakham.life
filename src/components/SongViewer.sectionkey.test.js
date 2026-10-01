// ใบ v3/pleng#95 ข้อ 2 + 4 — ฝึกร้อง (the sing page) plays a ท่อน in its own key, and a
// whole-song key change rides on ONE transpose so the ท่อน keeps its distance from the song key.
// The audio engine is mocked: we assert what reaches playSong / setTranspose, and run the REAL
// songToNotes on what the viewer handed over to prove the pitches.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy, setTransposeSpy } = vi.hoisted(() => ({
  playSongSpy: vi.fn(() => new Promise(() => {})),
  setTransposeSpy: vi.fn(),
}))
vi.mock('../lib/midi.js', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, playSong: playSongSpy, playEnsemble: vi.fn(() => new Promise(() => {})), stopPlayback: () => {}, setTranspose: setTransposeSpy }
})

window.matchMedia = window.matchMedia || (() => ({ matches: false }))
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'
import { songToNotes, KEY_MIDI } from '../lib/midi.js'
import { setEnsembleMode } from '../store.js'

const Harness = {
  components: { SongViewer },
  props: { song: { type: Object, required: true } },
  template: `<div><SongViewer :song="song" tier="guest" /></div>`,
}
const SongSheetStub = { name: 'SongSheet', props: ['content', 'mode', 'chordSystem', 'displayKey', 'playingSeg', 'playingSyl', 'interactive', 'showChord', 'showNote', 'showLyric', 'songTitle'], template: '<div class="sheet"></div>' }

// รับ 1 (song key C) and รับ 2 (its own key A) on ONE melody — พี่เปา's case
const song = {
  number: 85,
  title_th: 'ลองคีย์ท่อน',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3' }]] }],
    arrangement: [
      { stanza: 'A', label: 'รับ 1', syllables: [] },
      { stanza: 'A', label: 'รับ 2', syllables: [], key: 'A' },
    ],
  },
}

const mounted = []
const mountViewer = () => {
  const w = mount(Harness, { props: { song }, global: { stubs: { SongSheet: SongSheetStub, Icon: true } }, attachTo: document.body })
  mounted.push(w)
  return w
}
async function pickKey(w, value) {
  await w.find('[data-cell="key"] .dk-pbtn').trigger('click')
  await nextTick()
  await w.findAll('[data-cell="key"] .dk-ddrow').find((r) => r.text().trim() === value).trigger('click')
  await nextTick()
}

beforeEach(() => {
  localStorage.clear()
  playSongSpy.mockClear()
  setTransposeSpy.mockClear()
  setEnsembleMode('solo')
})
afterEach(() => {
  while (mounted.length) { try { mounted.pop().unmount() } catch { /* gone */ } }
})

describe('ใบ#95 — ฝึกร้อง plays a ท่อน in its own key', () => {
  it('รับ 2 sounds from A, รับ 1 (same melody) from C — the song key stays C', async () => {
    const w = mountViewer()
    await w.find('.dk-play').trigger('click')
    await nextTick()
    const [content] = playSongSpy.mock.calls.at(-1)
    expect(content.key).toBe('C')
    const notes = songToNotes(content).filter((n) => n.midi != null)
    const C = KEY_MIDI.C
    const A = KEY_MIDI.A
    expect(notes.map((n) => n.midi)).toEqual([C, C + 2, C + 4, A, A + 2, A + 4])
  })

  it('ข้อ 4 — picking D for the whole song is ONE transpose (+2) on top, so รับ 2 moves with it', async () => {
    const w = mountViewer()
    await pickKey(w, 'D')
    await w.find('.dk-play').trigger('click')
    await nextTick()
    const [content, opts] = playSongSpy.mock.calls.at(-1)
    expect(opts.transpose).toBe(2)
    const midi = songToNotes(content).filter((n) => n.midi != null).map((n) => n.midi + opts.transpose)
    // รับ 1 now from D, รับ 2 from B — still 3 semitones apart, exactly as written (C vs A)
    expect(midi[0] - midi[3]).toBe(KEY_MIDI.C - KEY_MIDI.A)
    expect(midi[3]).toBe(KEY_MIDI.A + 2)
  })
})
