// The ดู surface must play in the SELECTED key — both when you pick a key THEN press
// play, and when you change the key WHILE it is already playing (the real-time feel the
// reviewer expected). Mock the audio engine and assert the key handed to playSong.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy } = vi.hoisted(() => ({ playSongSpy: vi.fn(() => Promise.resolve(true)) }))
vi.mock('../lib/midi.js', () => ({
  playSong: playSongSpy,
  stopPlayback: () => {},
  TEMPO_MARKS: [{ value: 92, label: 'Andante' }],
}))

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
const lastKey = () => playSongSpy.mock.calls.at(-1)[0].key

beforeEach(() => playSongSpy.mockClear())

describe('SongViewer playback key', () => {
  it('pick key THEN play → plays in the selected key (G, not original E)', async () => {
    const w = mountViewer()
    await nextTick()
    await keySelect(w).setValue('G')
    await w.find('.vw-play').trigger('click')
    await nextTick()
    expect(playSongSpy).toHaveBeenCalled()
    expect(lastKey()).toBe('G')
  })

  it('change key WHILE playing → re-plays in the new key in real time (D)', async () => {
    const w = mountViewer()
    await nextTick()
    // start play, then flip the key BEFORE awaiting — so `playing` is still true when the
    // key changes (the play→false transition runs on a later microtask). This mirrors the
    // reviewer's flow: press play, then twist the key and expect the sound to follow.
    w.find('.vw-play').trigger('click')
    expect(lastKey()).toBe('E')
    playSongSpy.mockClear()
    keySelect(w).element.value = 'D'
    keySelect(w).trigger('change')
    await nextTick()
    expect(playSongSpy).toHaveBeenCalled()
    expect(lastKey()).toBe('D')
  })
})
