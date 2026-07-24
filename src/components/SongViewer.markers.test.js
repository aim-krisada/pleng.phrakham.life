// Marker-entry UI wiring (docs/ds/marker-entry-ui.md §7) — the ENTRY surface for jump/navigation
// markers (D.C./D.S./Segno/Coda/To-Coda/Fine). The engine (withJumpMarker / applyJumpCommand /
// resolvePlayOrder) is proven elsewhere (songEdit.jump.test.js, resolver-derived); this proves the
// UI drives that engine correctly: a preset lands a REAL {type:'jump'} command at the caret, its
// placeholders grow + place with auto-linked ids, the orphan guard fires until the routing is
// complete, and edit/delete work. It drives the SAME vm handlers the panel's clicks call.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { resolvePlayOrder } from '../lib/songModel.js'

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
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}

import SongViewer from './SongViewer.vue'

// two verses on ONE stanza + a refrain, so a D.S. actually changes the play order (a repeat back
// to the Segno) and resolvePlayOrder returns a jump-adjusted order.
const song = () => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [
    { id: 'V', lines: [[{ type: 'segment', note: '1' }, { type: 'segment', note: '2' }, { type: 'segment', note: '3' }, { type: 'segment', note: '4' }]] },
    { id: 'R', lines: [[{ type: 'segment', note: '5' }, { type: 'segment', note: '6' }]] },
  ],
  arrangement: [
    { stanza: 'V', label: '', syllables: ['ก', 'ข', 'ค', 'ง'] },
    { stanza: 'R', label: 'รับ', syllables: ['จ', 'ฉ'] },
  ],
})

function mountHost(c = song()) {
  const Host = {
    components: { SongViewer },
    data: () => ({ song: { number: 1, title_th: 'ทดสอบ', content: c } }),
    methods: { apply(content) { this.song = { ...this.song, content } } },
    template: `<SongViewer :song="song" tier="editor" @update-content="apply" />`,
  }
  return mount(Host, { attachTo: document.body })
}
const viewer = (w) => w.findComponent(SongViewer)
const jumpsIn = (w) => w.vm.song.content.stanzas.flatMap((s) => s.lines.flat()).filter((i) => i && i.type === 'jump')
async function enterEdit(w, li = 0, si = 0) {
  await w.find('.sv-fab').trigger('click')
  await nextTick()
  viewer(w).vm.selectUnit(li, si, 0, 'note')
  await nextTick(); await nextTick()
}

describe('marker-entry UI — preset → command + dropzone', () => {
  it('AC-2: a preset lands its COMMAND at the caret as a real {type:jump} and grows placeholder drops', async () => {
    const w = mountHost()
    await enterEdit(w, 0, 3) // caret on the 4th note (D.S. exit point)
    const vm = viewer(w).vm
    const preset = vm.$.exposed // sanity: exposed API present
    expect(preset).toBeTruthy()
    // choose "D.S. al Coda" = ds al:coda command + segno/to-coda/coda drops
    vm.chooseJumpPreset({ id: 'p-ds-coda', th: '', place: [{ kind: 'ds', al: 'coda' }, { kind: 'segno', drop: true }, { kind: 'to-coda', drop: true }, { kind: 'coda', drop: true }] })
    await nextTick(); await nextTick()
    const ds = jumpsIn(w).find((j) => j.kind === 'ds')
    expect(ds).toMatchObject({ type: 'jump', kind: 'ds', al: 'coda' })
    expect(ds.id).toBeTruthy()
    expect(vm.pendingDrops.map((d) => d.kind)).toEqual(['segno', 'to-coda', 'coda'])
    expect(vm.pendingDrops.every((d) => !d.placed)).toBe(true)
    w.unmount()
  })

  it('AC-3: the orphan guard reports the missing partner until every drop is placed', async () => {
    const w = mountHost()
    await enterEdit(w, 0, 3)
    const vm = viewer(w).vm
    vm.chooseJumpPreset({ id: 'p-ds', th: '', place: [{ kind: 'ds' }, { kind: 'segno', drop: true }] })
    await nextTick(); await nextTick()
    // a D.S. with no Segno yet → ds-orphan
    expect(vm.orphanJumps.some((o) => o.kind === 'ds-orphan')).toBe(true)
    // place the Segno at a note earlier in the song → orphan clears
    viewer(w).vm.selectUnit(0, 0, 0, 'note')
    await nextTick()
    vm.placeDropAtCaret(0)
    await nextTick(); await nextTick()
    expect(jumpsIn(w).some((j) => j.kind === 'segno')).toBe(true)
    expect(vm.orphanJumps.length).toBe(0)
    w.unmount()
  })

  it('AC-6: placing a full D.S. routing makes resolvePlayOrder honour it (play order changes)', async () => {
    const w = mountHost()
    const before = resolvePlayOrder(w.vm.song.content)
    await enterEdit(w, 0, 3)
    const vm = viewer(w).vm
    vm.chooseJumpPreset({ id: 'p-ds', th: '', place: [{ kind: 'ds' }, { kind: 'segno', drop: true }] })
    await nextTick(); await nextTick()
    viewer(w).vm.selectUnit(0, 0, 0, 'note')
    await nextTick()
    vm.placeDropAtCaret(0)
    await nextTick(); await nextTick()
    const after = resolvePlayOrder(w.vm.song.content)
    // a completed D.S. adds a repeat pass → the resolved order is longer than the plain order
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before))
    expect(vm.playOrderCrumbs.length).toBeGreaterThan(1)
    w.unmount()
  })

  it('AC-7: change al in place, then delete removes exactly that marker', async () => {
    const w = mountHost()
    await enterEdit(w, 0, 3)
    const vm = viewer(w).vm
    vm.chooseJumpCommand({ kind: 'dc' })
    await nextTick(); await nextTick()
    const dc = jumpsIn(w).find((j) => j.kind === 'dc')
    expect(dc.al).toBeUndefined()
    vm.changeMarker(dc.id, { al: 'fine' })
    await nextTick(); await nextTick()
    expect(jumpsIn(w).find((j) => j.kind === 'dc').al).toBe('fine')
    vm.deleteMarker({ id: dc.id, kind: 'dc', al: 'fine' })
    await nextTick(); await nextTick()
    expect(jumpsIn(w).some((j) => j.kind === 'dc')).toBe(false)
    w.unmount()
  })

  it('AC-1: note keys are NOT stolen — a plain digit still edits the note while markers exist', async () => {
    const w = mountHost()
    await enterEdit(w, 0, 0)
    const vm = viewer(w).vm
    vm.chooseJumpCommand({ kind: 'dc' })
    await nextTick(); await nextTick()
    // a plain digit still overwrites the selected note (the marker menu never intercepts note keys)
    await w.find('.sv-capture').trigger('keydown', { key: '7' })
    await nextTick(); await nextTick()
    expect(w.vm.song.content.stanzas[0].lines[0].find((i) => i.type === 'segment').note).toBe('7')
    w.unmount()
  })
})
