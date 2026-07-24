// ฟังตอนแก้ — the transport that lives inside the pencil (P'Aim 24 ก.ค.).
// The point of these tests is NOT that a button exists; it is that pressing it reaches the SAME
// audio path as โหมดฟัง. So the suite mocks midi.js at the boundary and compares the option
// object playSong actually receives from an edit-mode press against the one the dock's own ▶
// produces. Anything that drifts (instrument, arranger recipe, transpose, voices) fails here.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy, playEnsembleSpy } = vi.hoisted(() => ({
  playSongSpy: vi.fn(() => new Promise(() => {})),
  playEnsembleSpy: vi.fn(() => new Promise(() => {})),
}))
// A REAL buildPlayNotes/effectiveOrder (not a stub) so `order` narrowing is exercised for real:
// the notes a preview schedules must actually be the cursor's lines and nothing else.
vi.mock('../lib/midi.js', async () => {
  const real = await vi.importActual('../lib/midi.js')
  return {
    ...real,
    playSong: playSongSpy,
    playEnsemble: playEnsembleSpy,
    stopPlayback: () => {},
    setTranspose: () => {},
  }
})

window.matchMedia = window.matchMedia || (() => ({ matches: false }))
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'
import { setEnsembleMode, setLeadInstrument, setSoundMode } from '../store.js'

// two ท่อน × two lines each, so "this line" and "this ท่อน" are genuinely different ranges
const song = {
  number: 7,
  title_th: 'ฟังตอนแก้',
  content: {
    version: 2,
    key: 'C',
    bpm: 90,
    timeSignature: '4/4',
    stanzas: [
      {
        id: 'A',
        lines: [
          [{ type: 'segment', note: '1 2 3 4', chord: 'C' }],
          [{ type: 'segment', note: '5 6 7 1', chord: 'G' }],
        ],
      },
    ],
    arrangement: [
      { stanza: 'A', label: 'ข้อ 1', syllables: ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ'] },
      { stanza: 'A', label: 'รับ', syllables: ['ด', 'ต', 'ถ', 'ท', 'น', 'บ', 'ป', 'ผ'] },
    ],
  },
}

// SongSheet is stubbed everywhere else in this component's suites — the sheet's own rendering is
// covered by SongSheet.test.js, and stubbing keeps these assertions about the audio wiring.
const SongSheetStub = { props: ['content'], template: '<div class="sheet-stub" />' }

const mounted = []
function mountViewer() {
  const w = mount(SongViewer, {
    props: { song, tier: 'guest' },
    global: { stubs: { SongSheet: SongSheetStub, SingTransport: true, NoteInputBar: true, Icon: true } },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}
const playBtns = (w) => w.findAll('.sv-play-btn')
const lastOpts = () => playSongSpy.mock.calls[playSongSpy.mock.calls.length - 1][1]
// the notes a call actually scheduled, as "li:si:syk" — the honest answer to "what did we hear"
const scheduled = () => {
  const [content, opts] = playSongSpy.mock.calls[playSongSpy.mock.calls.length - 1]
  return real.buildPlayNotes(content, { order: opts.order }).map((n) => `${n.li}:${n.si}:${n.syk}`)
}
let real
beforeEach(async () => {
  real = await vi.importActual('../lib/midi.js')
  playSongSpy.mockClear()
  playEnsembleSpy.mockClear()
  setEnsembleMode('solo')
  setLeadInstrument('grand')
  setSoundMode('melody')
})
afterEach(() => {
  while (mounted.length) { try { mounted.pop().unmount() } catch { /* already gone */ } }
})

// enter the pencil and park the cursor on the first unit of a given display line
async function enterEditOn(w, li) {
  w.vm.toggleEdit()
  await nextTick()
  w.vm.selectUnit(li, 0, 0, 'note')
  await nextTick()
  return w
}

describe('ฟังตอนแก้ — a song-maker can hear without leaving the pencil', () => {
  it('the pencil surface shows the play controls (visible buttons, not a hidden gesture)', async () => {
    const w = mountViewer()
    expect(playBtns(w).length).toBe(0) // reading: no edit transport
    await enterEditOn(w, 0)
    const labels = playBtns(w).map((b) => b.text())
    expect(labels.length).toBe(3)
    expect(labels.join(' ')).toContain('ทั้งเพลง')
    expect(labels.join(' ')).toContain('ท่อนนี้')
    expect(labels.join(' ')).toContain('บรรทัดนี้')
    // none of them is gated behind hover/pointer — they are plain in-flow buttons
    for (const b of playBtns(w)) expect(b.element.hasAttribute('disabled')).toBe(false)
  })

  it('ฟังบรรทัดนี้ schedules exactly the cursor line — nothing before, nothing after', async () => {
    const w = await enterEditOn(mountViewer(), 1)
    await w.vm.playScope('line')
    await flushPromises()
    expect(playSongSpy).toHaveBeenCalledTimes(1)
    expect(lastOpts().order).toEqual([{ name: null, fromLi: 1, toLi: 1 }])
    expect(new Set(scheduled().map((s) => s.split(':')[0]))).toEqual(new Set(['1']))
  })

  it('ฟังท่อนนี้ schedules the whole ท่อน the cursor sits in — and only that ท่อน', async () => {
    const w = await enterEditOn(mountViewer(), 2) // first line of the second arrangement row (รับ)
    await w.vm.playScope('section')
    await flushPromises()
    const { order } = lastOpts()
    expect(order).toEqual([{ name: 'รับ', fromLi: 2, toLi: 3 }])
    expect(new Set(scheduled().map((s) => s.split(':')[0]))).toEqual(new Set(['2', '3']))
  })

  it('ฟังทั้งเพลง from the pencil plays the same order as โหมดฟัง (no narrowing)', async () => {
    const w = await enterEditOn(mountViewer(), 1)
    await w.vm.playWholeFromEditor()
    await flushPromises()
    const lis = new Set(scheduled().map((s) => s.split(':')[0]))
    expect(lis).toEqual(new Set(['0', '1', '2', '3']))
  })

  // ⭐ the load-bearing test: P'Aim's rule is that the golden piano must not change by a hair.
  it('every sound option is identical between โหมดฟัง and the pencil — only `order` differs', async () => {
    // 1) โหมดฟัง: press the dock's OWN ▶ — the event SingTransport emits, not a shortcut into
    // the component. This is the reference sound the pencil must match.
    const listen = mountViewer()
    listen.findComponent({ name: 'SingTransport' }).vm.$emit('toggle-play')
    await flushPromises()
    expect(playSongSpy).toHaveBeenCalledTimes(1)
    const listenOpts = { ...lastOpts() }

    playSongSpy.mockClear()

    // 2) the pencil, scoped to one line
    const edit = await enterEditOn(mountViewer(), 1)
    await edit.vm.playScope('line')
    await flushPromises()
    const editOpts = { ...lastOpts() }

    // `order` is the whole point of a scope; startIndex/onNote/onInstrumentPending are per-call
    // plumbing. EVERYTHING else — the instrument, the arranger recipe, transpose, voices, bpm,
    // loop, songId — must match, or the editor would be a different sound.
    const strip = (o) => {
      const { order, startIndex, onNote, onInstrumentPending, ...rest } = o
      return rest
    }
    expect(strip(editOpts)).toEqual(strip(listenOpts))
    expect(editOpts.instrument).toBe('grand')
    expect(editOpts.order).not.toEqual(listenOpts.order)
  })

  it('รวมวง in the pencil goes through playEnsemble — the same branch โหมดฟัง takes', async () => {
    setEnsembleMode('ensemble')
    const w = await enterEditOn(mountViewer(), 0)
    await w.vm.playScope('line')
    await flushPromises()
    expect(playSongSpy).not.toHaveBeenCalled()
    expect(playEnsembleSpy).toHaveBeenCalledTimes(1)
    expect(playEnsembleSpy.mock.calls[0][1].order).toEqual([{ name: null, fromLi: 0, toLi: 0 }])
    setEnsembleMode('solo')
  })

  it('a partial play says what it is playing, and stops saying it when it stops', async () => {
    const w = await enterEditOn(mountViewer(), 3)
    await w.vm.playScope('line')
    await nextTick()
    expect(w.find('.sv-play-now').text()).toContain('ท่อน รับ')
    expect(w.find('.sv-play-now').text()).toContain('บรรทัดที่ 2') // 2nd line OF ITS ท่อน
    await w.vm.playScope('line') // press the lit button again = stop
    await nextTick()
    expect(w.find('.sv-play-now').exists()).toBe(false)
  })

  it('ฟังทั้งเพลง while a scope preview sounds widens to the whole song (never a silent pause)', async () => {
    const w = await enterEditOn(mountViewer(), 1)
    await w.vm.playScope('line')
    await flushPromises()
    playSongSpy.mockClear()
    await w.vm.playWholeFromEditor()
    await flushPromises()
    expect(playSongSpy).toHaveBeenCalledTimes(1)
    expect(lastOpts().order).toBeUndefined() // whole song, no narrowing
    expect(w.find('.sv-play-now').text()).toContain('ทั้งเพลง')
  })

  it('leaving the pencil leaves no scope behind — the dock plays the whole song again', async () => {
    const w = await enterEditOn(mountViewer(), 1)
    await w.vm.playScope('line')
    await flushPromises()
    w.vm.toggleEdit() // ✓ เสร็จ
    await nextTick()
    playSongSpy.mockClear()
    await w.vm.playWholeFromEditor()
    await flushPromises()
    expect(lastOpts().order).toBeUndefined()
  })
})
