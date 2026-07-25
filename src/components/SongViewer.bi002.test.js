// BI-002 — เสียงค้าง: a song left PLAYING when the pencil ✏️ is pressed became unstoppable, because
// the reading transport (SingTransport) is hidden in edit mode so there was no ⏹ to reach. The fix:
// entering edit STOPS playback. This proves it end-to-end on the mounted component — start reading
// playback through the real transport, toggle edit exactly as the ✏️ FAB does, and assert the audio
// engine was stopped and the editor does not come up mid-play.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const stopSpy = vi.hoisted(() => vi.fn())
vi.mock('../lib/midi.js', () => ({
  playSong: vi.fn(() => new Promise(() => {})), // never resolves → `playing` stays true, like a real play
  playEnsemble: vi.fn(() => new Promise(() => {})),
  stopPlayback: stopSpy,
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
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'
import SingTransport from './SingTransport.vue'

const song = {
  number: 1,
  title_th: 'ทดสอบ',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['ก', 'ข'] }],
  },
}
const mountViewer = () => mount(SongViewer, { props: { song, tier: 'editor' } })

describe('BI-002 — entering edit mode stops playback (no stuck audio)', () => {
  it('stops the audio engine the moment the pencil turns on', async () => {
    const w = mountViewer() // reading mode
    // start playback the way the reading transport does (@toggle-play → togglePlay → startPlay)
    w.findComponent(SingTransport).vm.$emit('toggle-play')
    await nextTick()
    stopSpy.mockClear() // ignore the reset stopPlayback() startPlay does on its way up

    await w.find('.sv-fab').trigger('click') // enter โหมดแก้, exactly as the ✏️ FAB
    await nextTick()

    expect(w.find('.sv-save-bar').exists()).toBe(true) // we really did enter the editor
    expect(stopSpy).toHaveBeenCalled() // …and the playback engine was stopped on the way in
  })

  it('the editor does not come up mid-play — the whole-song ฟัง button is not in its playing state', async () => {
    const w = mountViewer()
    w.findComponent(SingTransport).vm.$emit('toggle-play')
    await nextTick()
    await w.find('.sv-fab').trigger('click')
    await nextTick()
    // isWholePlaying = playing && !previewScope; after the enter-stop it must be false, so the
    // edit-mode "ทั้งเพลง" button shows ▶ (play), never ⏸ — the singer is not left with hidden audio.
    const wholeBtn = w.findAll('.sv-play-btn')[0]
    expect(wholeBtn.classes()).not.toContain('on')
  })

  it('does NOT cut off playback STARTED from inside the editor (only the transition IN stops)', async () => {
    const w = mountViewer()
    await w.find('.sv-fab').trigger('click') // enter edit first (no playback yet)
    await nextTick()
    stopSpy.mockClear()
    // now press ฟัง ทั้งเพลง inside the editor
    await w.findAll('.sv-play-btn')[0].trigger('click')
    await nextTick()
    // startPlay resets once with stopPlayback(), but playback is now RUNNING — the whole-song
    // button reflects it. The editMode watch must NOT fire again (editMode did not change), so the
    // edit-mode ฟัง loop is never severed by the BI-002 stop.
    expect(w.findAll('.sv-play-btn')[0].classes()).toContain('on')
  })
})
