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

const mountViewer = () => mount(SongViewer, { props: { song }, global: { stubs: { SongSheet: true, Icon: true } } })
const keySelect = (w) => w.find('select[aria-label="เลือกคีย์"]')
const lastPlay = () => playSongSpy.mock.calls.at(-1)

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
