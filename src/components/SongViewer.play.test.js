// The ดู surface must play in the SELECTED key, and changing the key WHILE playing must
// re-tune from the current position (live), NOT restart. Mock the audio engine and assert
// the transpose handed to playSong / setTranspose.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy, setTransposeSpy } = vi.hoisted(() => ({
  playSongSpy: vi.fn(() => Promise.resolve(true)),
  setTransposeSpy: vi.fn(),
}))
vi.mock('../lib/midi.js', () => {
  const KEY_MIDI = { C: 60, Db: 61, D: 62, Eb: 63, E: 64, F: 65, Gb: 66, G: 67, Ab: 68, A: 69, Bb: 70, B: 71 }
  return {
    playSong: playSongSpy,
    stopPlayback: () => {},
    setTranspose: setTransposeSpy,
    keyTranspose: (from, to) => (KEY_MIDI[to] ?? 60) - (KEY_MIDI[from] ?? 60),
    TEMPO_MARKS: [{ value: 92, label: 'Andante' }],
  }
})

// jsdom lacks these two browser APIs the follow-along scroll uses; stub them so the
// highlight watcher doesn't throw an unhandled rejection during the run.
window.matchMedia = window.matchMedia || (() => ({ matches: false }))
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}

import SongViewer from './SongViewer.vue'

const song = {
  number: 1,
  title_th: 'ทดสอบ',
  content: {
    version: 2,
    key: 'E',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1', chord: 'E' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: [] }],
  },
}

// stub SongSheet but surface the follow-along highlight it receives, so a test can
// assert the highlight moved to the currently-sounding note.
const SongSheetStub = {
  name: 'SongSheet',
  props: ['content', 'mode', 'chordSystem', 'displayKey', 'playingSeg'],
  template: '<div class="sheet" :data-seg="playingSeg ? playingSeg.li + \'-\' + playingSeg.si : \'\'"></div>',
}
const mountViewer = () => mount(SongViewer, { props: { song }, global: { stubs: { SongSheet: SongSheetStub, Icon: true } } })
const keySelect = (w) => w.find('select[aria-label="เลือกคีย์"]')
const lastPlay = () => playSongSpy.mock.calls.at(-1)
const lastOpts = () => lastPlay()[1]

beforeEach(() => {
  playSongSpy.mockClear()
  setTransposeSpy.mockClear()
})

describe('SongViewer playback key', () => {
  it('pick key THEN play → schedules original key + transpose (E→G = +3 semitones)', async () => {
    const w = mountViewer()
    await nextTick()
    await keySelect(w).setValue('G')
    await w.find('.vw-play').trigger('click')
    await nextTick()
    expect(playSongSpy).toHaveBeenCalled()
    expect(lastPlay()[0].key).toBe('E') // base pitch stays the original key…
    expect(lastPlay()[1].transpose).toBe(3) // …and the shift rides on transpose
  })

  it('change key WHILE playing → live re-tune (setTranspose), NOT a restart', async () => {
    const w = mountViewer()
    await nextTick()
    w.find('.vw-play').trigger('click') // start (E, transpose 0)
    playSongSpy.mockClear()

    keySelect(w).element.value = 'D'
    keySelect(w).trigger('change') // change key mid-playback (E→D = -2)
    await nextTick()

    expect(setTransposeSpy).toHaveBeenCalledWith(-2) // re-tuned live
    expect(playSongSpy).not.toHaveBeenCalled() // did NOT restart
  })
})

describe('SongViewer play / stop / resume (US-A01)', () => {
  it('press play → starts playback from the top (startIndex 0), button shows หยุด', async () => {
    const w = mountViewer()
    await nextTick()
    w.find('.vw-play').trigger('click')
    await nextTick()
    expect(playSongSpy).toHaveBeenCalledTimes(1)
    expect(lastOpts().startIndex).toBe(0)
    expect(w.find('.vw-play').text()).toContain('หยุด')
  })

  it('highlight follows the currently-sounding note', async () => {
    const w = mountViewer()
    await nextTick()
    w.find('.vw-play').trigger('click')
    lastOpts().onNote({ li: 1, si: 3 }, 2) // engine reports the sounding note
    await nextTick()
    expect(w.find('.sheet').attributes('data-seg')).toBe('1-3')
  })

  it('stop then play → RESUMES from where it stopped, not from the top', async () => {
    const w = mountViewer()
    await nextTick()
    w.find('.vw-play').trigger('click') // play
    lastOpts().onNote({ li: 2, si: 0 }, 5) // reached note index 5
    w.find('.vw-play').trigger('click') // stop (records position 5)
    expect(w.find('.vw-play').text()).toContain('ฟังเพลง')
    playSongSpy.mockClear()
    w.find('.vw-play').trigger('click') // play again → resume
    expect(lastOpts().startIndex).toBe(5)
  })

  it('accepts the tier contract prop and never emits save (view-only, AC3)', () => {
    const w = mount(SongViewer, {
      props: { song, tier: 'editor' },
      global: { stubs: { SongSheet: SongSheetStub, Icon: true } },
    })
    expect(w.props('tier')).toBe('editor')
    expect(w.emitted('save')).toBeUndefined()
    // no save/edit affordance in the control bar
    expect(w.html()).not.toContain('บันทึก')
  })
})
