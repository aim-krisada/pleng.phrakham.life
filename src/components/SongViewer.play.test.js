// The ดู surface must play in the SELECTED key, and changing the key WHILE playing must
// re-tune from the current position (live), NOT restart. Mock the audio engine and assert
// the transpose handed to playSong / setTranspose.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy, setTransposeSpy } = vi.hoisted(() => ({
  // stays pending on purpose = "still playing" — gives tests a deterministic playing
  // state (the real engine resolves only when the melody ends or is stopped).
  playSongSpy: vi.fn(() => new Promise(() => {})),
  setTransposeSpy: vi.fn(),
}))
vi.mock('../lib/midi.js', () => {
  const KEY_MIDI = { C: 60, Db: 61, D: 62, Eb: 63, E: 64, F: 65, Gb: 66, G: 67, Ab: 68, A: 69, Bb: 70, B: 71 }
  return {
    playSong: playSongSpy,
    stopPlayback: () => {},
    setTranspose: setTransposeSpy,
    keyTranspose: (from, to) => (KEY_MIDI[to] ?? 60) - (KEY_MIDI[from] ?? 60),
    // a fixed 3-note play order so onSeek can look up an index by (li, si, syk)
    songToNotes: () => [
      { li: 0, si: 0, syk: 0, midi: 60 },
      { li: 0, si: 0, syk: 1, midi: 62 },
      { li: 0, si: 1, syk: 0, midi: 64 },
    ],
    TEMPO_MARKS: [{ value: 92, label: 'Andante' }, { value: 120, label: 'Allegro' }],
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

// a song whose arrangement carries a section label → resolveContent emits a {type:'section'}
// marker so the viewer shows section chips (US-A03 "เลือกท่อน").
const sectionSong = {
  number: 3,
  title_th: 'มีท่อน',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1', chord: 'C' }]] }],
    arrangement: [{ stanza: 'A', label: 'ท่อน 1', syllables: [] }],
  },
}

// stub SongSheet but surface the follow-along highlight it receives, so a test can
// assert the highlight moved to the currently-sounding note.
const SongSheetStub = {
  name: 'SongSheet',
  props: ['content', 'mode', 'chordSystem', 'displayKey', 'playingSeg', 'playingSyl', 'interactive'],
  emits: ['seek'],
  template:
    '<div class="sheet" :data-seg="playingSeg ? playingSeg.li + \'-\' + playingSeg.si : \'\'"' +
    ' :data-syl="playingSyl ? playingSyl.li + \'-\' + playingSyl.si + \'-\' + playingSyl.syk : \'\'"' +
    ' @click="$emit(\'seek\', { li: 0, si: 1, syk: 0 })"></div>',
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

  it('B006: a sung attack (syk set) advances the per-syllable highlight', async () => {
    const w = mountViewer()
    await nextTick()
    w.find('.vw-play').trigger('click')
    lastOpts().onNote({ li: 2, si: 1, syk: 3 }, 7) // engine reports an attack + its slot
    await nextTick()
    expect(w.find('.sheet').attributes('data-syl')).toBe('2-1-3')
  })

  it('B006: a rest/held note (no syk) leaves the current word lit', async () => {
    const w = mountViewer()
    await nextTick()
    w.find('.vw-play').trigger('click')
    lastOpts().onNote({ li: 0, si: 0, syk: 0 }, 0) // sung a word
    lastOpts().onNote({ li: 0, si: 1 }, 1) // then a rest — no syk
    await nextTick()
    expect(w.find('.sheet').attributes('data-syl')).toBe('0-0-0') // word stayed lit
  })

  it('B006: tapping the sheet jumps playback to that note index (US H1)', async () => {
    const w = mountViewer()
    await nextTick()
    w.find('.vw-play').trigger('click')
    playSongSpy.mockClear()
    await w.find('.sheet').trigger('click') // stub emits seek {li:0, si:1, syk:0} → index 2
    expect(playSongSpy).toHaveBeenCalledTimes(1)
    expect(lastOpts().startIndex).toBe(2)
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

describe('SongViewer live tempo (US-A04)', () => {
  const tempoSelect = (w) => w.find('select[aria-label="ความเร็ว"]')

  it('change tempo WHILE playing → re-schedule from the current note at the new bpm, NOT from the top', async () => {
    const w = mountViewer()
    await nextTick()
    w.find('.vw-play').trigger('click') // play from top at 92
    lastOpts().onNote({ li: 1, si: 0 }, 4) // engine reached note index 4
    playSongSpy.mockClear()
    tempoSelect(w).element.value = '120'
    await tempoSelect(w).trigger('change') // speed up mid-playback
    await nextTick()
    expect(playSongSpy).toHaveBeenCalledTimes(1) // re-scheduled once
    expect(lastOpts().startIndex).toBe(4) // continued from note 4…
    expect(lastOpts().bpm).toBe(120) // …at the new tempo
  })

  it('changing tempo BEFORE playing just applies to the next play', async () => {
    const w = mountViewer()
    await nextTick()
    tempoSelect(w).element.value = '120'
    await tempoSelect(w).trigger('change')
    expect(playSongSpy).not.toHaveBeenCalled() // not playing → no (re)start
    w.find('.vw-play').trigger('click')
    expect(lastOpts().bpm).toBe(120)
    expect(lastOpts().startIndex).toBe(0) // a fresh play starts from the top
  })
})

describe('SongViewer key / tempo / loop / readability (US-A02, US-A03)', () => {
  it('loop checkbox → playback loops the selection (US-A02)', async () => {
    const w = mountViewer()
    await nextTick()
    await w.find('.vw-check input[type="checkbox"]').setValue(true)
    w.find('.vw-play').trigger('click')
    expect(lastOpts().loop).toBe(true)
  })

  it('key / tempo / loop are viewer-local and never mutate the source song (US-A02)', async () => {
    const w = mountViewer()
    await nextTick()
    await keySelect(w).setValue('G')
    await w.find('.vw-check input[type="checkbox"]').setValue(true)
    // the original song content is untouched — transpose is temporary display only
    expect(song.content.key).toBe('E')
    expect(w.props('song').content.key).toBe('E')
  })

  it('ก+ / ก− change the reading font size (US-A03)', async () => {
    const w = mountViewer()
    await nextTick()
    const style = () => w.find('.sheet-scale').attributes('style') || ''
    await w.find('button[aria-label="ใหญ่ขึ้น"]').trigger('click')
    expect(style()).toContain('font-size: 1.1rem')
    await w.find('button[aria-label="เล็กลง"]').trigger('click')
    await w.find('button[aria-label="เล็กลง"]').trigger('click')
    expect(style()).toContain('font-size: 0.9rem')
  })

  it('เนื้อล้วน toggle switches the sheet to lyrics-only mode (US-A03)', async () => {
    const w = mountViewer()
    await nextTick()
    const lyricsBtn = w.findAll('.vw-seg button').find((b) => b.text() === 'เนื้อล้วน')
    await lyricsBtn.trigger('click')
    expect(w.findComponent({ name: 'SongSheet' }).props('mode')).toBe('lyrics')
  })

  it('section chip plays that ท่อน from its start (US-A03)', async () => {
    const w = mount(SongViewer, { props: { song: sectionSong }, global: { stubs: { SongSheet: SongSheetStub, Icon: true } } })
    await nextTick()
    const chips = w.findAll('.section-chip')
    expect(chips.length).toBe(2) // ทั้งเพลง + one section
    await chips.at(-1).trigger('click') // the section chip
    expect(lastOpts().range).toEqual({ fromLi: 0, toLi: 0 })
    expect(lastOpts().startIndex).toBe(0)
  })
})

describe('SongViewer song-identity re-sync (latent bug, DS-A04)', () => {
  it('editing the song (same number) keeps the chosen key; loading a different song resets it', async () => {
    const w = mountViewer()
    await nextTick()
    await keySelect(w).setValue('G') // listener transposes to G
    // the editor re-emits the SAME song (number 1) with edited content
    await w.setProps({ song: { ...song, content: { ...song.content, key: 'E' } } })
    expect(keySelect(w).element.value).toBe('G') // an edit must NOT wipe the chosen key
    // a genuinely different song loads
    await w.setProps({ song: { number: 2, title_th: 'x', content: { ...song.content, key: 'A' } } })
    expect(keySelect(w).element.value).toBe('A') // now reset to the new song's key
  })
})
