// ใบ v3/pleng#111 ข้อ 6 — on the ฝึกร้อง page Space = เล่น / พัก, but ONLY when Space is not
// already doing something: never while typing in a text field (the editor's boxes included),
// never on a focused button / slider (Space presses those), never while ฝึกร้อง is hidden behind
// another mode (Studio keeps all three mounted), and a held-down key does not flip-flop.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy, stopSpy } = vi.hoisted(() => ({
  playSongSpy: vi.fn(() => new Promise(() => {})),
  stopSpy: vi.fn(),
}))
vi.mock('../lib/midi.js', () => {
  const NOTES = [
    { li: 0, si: 0, syk: 0, midi: 60, beats: 1 },
    { li: 0, si: 1, syk: 0, midi: 64, beats: 1 },
  ]
  return {
    playSong: playSongSpy,
    playEnsemble: vi.fn(() => new Promise(() => {})),
    stopPlayback: stopSpy,
    setTranspose: () => {},
    keyTranspose: () => 0,
    songToNotes: () => NOTES,
    buildPlayNotes: () => NOTES,
    effectiveOrder: () => undefined,
    TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }],
    TEMPO_MIN: 40,
    TEMPO_MAX: 240,
    TEMPO_STEP: 2,
    clampTempo: (n) => Math.min(240, Math.max(40, Math.round(Number(n) || 0))),
  }
})

window.matchMedia = window.matchMedia || (() => ({ matches: false }))
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'

const song = {
  number: 1,
  title_th: 'ทดสอบ',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 3', chord: 'C' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: [] }],
  },
}
// like Studio: ฝึกร้อง beside an editor-ish field, either one hidden with display:none (v-show)
const Harness = {
  components: { SongViewer },
  props: { mode: { type: String, default: 'view' } },
  template: `<div>
    <div v-show="mode === 'view'"><SongViewer :song="song" /></div>
    <div v-show="mode === 'edit'" class="ed"><input class="ed-field" aria-label="โน้ต" /><textarea class="ed-ta" aria-label="เนื้อ"></textarea></div>
  </div>`,
  data: () => ({ song }),
}
const space = (target = document.body, extra = {}) => {
  const e = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true, ...extra })
  target.dispatchEvent(e)
  return e
}
const playBtn = (w) => w.find('.dk-play')

beforeEach(() => { playSongSpy.mockClear(); localStorage.clear(); document.body.innerHTML = '' })

describe('ฝึกร้อง — Space toggles เล่น / พัก', () => {
  it('Space on the page body starts playing, Space again pauses; the page does not scroll', async () => {
    const w = mount(Harness, { attachTo: document.body, global: { stubs: { Icon: true } } })
    await nextTick()
    expect(playBtn(w).attributes('aria-label')).toBe('เล่น')
    const e = space()
    await nextTick()
    expect(e.defaultPrevented).toBe(true)
    expect(playSongSpy).toHaveBeenCalledTimes(1)
    expect(playBtn(w).attributes('aria-label')).toBe('พัก')
    space()
    await nextTick()
    expect(playBtn(w).attributes('aria-label')).toBe('เล่น')
    w.unmount()
  })

  it('a held-down Space (key repeat) does not flip-flop', async () => {
    const w = mount(Harness, { attachTo: document.body, global: { stubs: { Icon: true } } })
    await nextTick()
    space()
    await nextTick()
    const e = space(document.body, { repeat: true })
    await nextTick()
    expect(e.defaultPrevented).toBe(true)
    expect(playBtn(w).attributes('aria-label')).toBe('พัก')
    w.unmount()
  })

  it('Space with Ctrl / Alt / ⌘ is left alone', async () => {
    const w = mount(Harness, { attachTo: document.body, global: { stubs: { Icon: true } } })
    await nextTick()
    for (const mod of ['ctrlKey', 'altKey', 'metaKey']) space(document.body, { [mod]: true })
    await nextTick()
    expect(playSongSpy).not.toHaveBeenCalled()
    w.unmount()
  })
})

describe('Space never toggles play while typing or on a control', () => {
  it('typing in a text field (the editor’s boxes): no play, the space is typed', async () => {
    const w = mount(Harness, { props: { mode: 'view' }, attachTo: document.body, global: { stubs: { Icon: true } } })
    await nextTick()
    for (const sel of ['.ed-field', '.ed-ta']) {
      const el = w.find(sel).element
      el.focus()
      const e = space(el)
      expect(e.defaultPrevented).toBe(false)
    }
    await nextTick()
    expect(playSongSpy).not.toHaveBeenCalled()
    w.unmount()
  })

  it('in the editor mode (ฝึกร้อง hidden): no play even from the page body', async () => {
    const w = mount(Harness, { props: { mode: 'edit' }, attachTo: document.body, global: { stubs: { Icon: true } } })
    await nextTick()
    const e = space()
    await nextTick()
    expect(e.defaultPrevented).toBe(false)
    expect(playSongSpy).not.toHaveBeenCalled()
    w.unmount()
  })

  it('a focused button keeps Space for itself (no double toggle)', async () => {
    const w = mount(Harness, { attachTo: document.body, global: { stubs: { Icon: true } } })
    await nextTick()
    const gear = w.find('.dk-gear').element
    gear.focus()
    const e = space(gear)
    await nextTick()
    expect(e.defaultPrevented).toBe(false)
    expect(playSongSpy).not.toHaveBeenCalled()
    w.unmount()
  })

  it('the seek slider keeps Space for itself', async () => {
    const w = mount(Harness, { attachTo: document.body, global: { stubs: { Icon: true } } })
    await nextTick()
    const seek = w.find('[role="slider"]').element
    const e = space(seek)
    await nextTick()
    expect(e.defaultPrevented).toBe(false)
    expect(playSongSpy).not.toHaveBeenCalled()
    w.unmount()
  })
})
