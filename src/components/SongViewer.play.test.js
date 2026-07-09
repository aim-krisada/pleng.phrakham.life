// The ดู surface plays in the SELECTED key, re-tunes live on key/tempo change, and drives
// every control through the shared studio dock. B043 reshaped the controls into the bottom
// "music player": the <StudioDock> hosts one full-width <SingTransport> (progress + markers
// + ⏮ ▶/⏸ ⏭ 🔁) whose ⚙ panel holds display/chord/key/tempo/font/download/print. This
// suite mocks the audio engine and asserts what reaches playSong / setTranspose.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy, setTransposeSpy } = vi.hoisted(() => ({
  playSongSpy: vi.fn(() => new Promise(() => {})),
  setTransposeSpy: vi.fn(),
}))
vi.mock('../lib/midi.js', () => {
  const KEY_MIDI = { C: 60, Db: 61, D: 62, Eb: 63, E: 64, F: 65, Gb: 66, G: 67, Ab: 68, A: 69, Bb: 70, B: 71 }
  const NOTES = [
    { li: 0, si: 0, syk: 0, midi: 60, beats: 1 },
    { li: 0, si: 0, syk: 1, midi: 62, beats: 1 },
    { li: 0, si: 1, syk: 0, midi: 64, beats: 1 },
  ]
  return {
    playSong: playSongSpy,
    stopPlayback: () => {},
    setTranspose: setTransposeSpy,
    keyTranspose: (from, to) => (KEY_MIDI[to] ?? 60) - (KEY_MIDI[from] ?? 60),
    songToNotes: () => NOTES,
    buildPlayNotes: () => NOTES,
    effectiveOrder: (secs, sel) =>
      !sel || !sel.size ? undefined : (secs || []).filter((s) => sel.has(s.name)).map((s) => ({ name: s.name, fromLi: s.fromLi, toLi: s.toLi })),
    TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }, { value: 120, label: 'Allegro ♩=120' }],
  }
})

window.matchMedia = window.matchMedia || (() => ({ matches: false }))
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
// jsdom has no pointer capture — the scrub handler guards it, but stub so nothing throws
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'
import StudioDock from './StudioDock.vue'

// Reproduce Studio's wiring: SongViewer emits its dock config; the shared StudioDock renders
// it. The sing dock is one full-width top-region custom control (SingTransport).
const Harness = {
  components: { SongViewer, StudioDock },
  props: { song: { type: Object, required: true }, tier: { type: String, default: 'guest' } },
  data: () => ({ dock: null }),
  template: `<div>
    <SongViewer :song="song" :tier="tier" @dock="dock = $event" />
    <StudioDock v-if="dock" mode="sing" :tools="dock.tools" :default-tools="dock.defaultTools" />
  </div>`,
}

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
// a song whose arrangement carries a section label → the transport shows markers + selector
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

const SongSheetStub = {
  name: 'SongSheet',
  props: ['content', 'mode', 'chordSystem', 'displayKey', 'playingSeg', 'playingSyl', 'interactive', 'showChord', 'showNote', 'showLyric', 'songTitle'],
  emits: ['seek'],
  template:
    '<div class="sheet" :data-seg="playingSeg ? playingSeg.li + \'-\' + playingSeg.si : \'\'"' +
    ' :data-syl="playingSyl ? playingSyl.li + \'-\' + playingSyl.si + \'-\' + playingSyl.syk : \'\'"' +
    ' @click="$emit(\'seek\', { li: 0, si: 1, syk: 0 })"></div>',
}
const mountViewer = (p = song) =>
  mount(Harness, { props: { song: p }, global: { stubs: { SongSheet: SongSheetStub, Icon: true } }, attachTo: document.body })

// ---- transport helpers (the SingTransport DOM inside the dock) ----
const playBtn = (w) => w.find('.mp-play')
const loopBtn = (w) => w.find('.mp-transport button[aria-label="วนซ้ำ"]')
const gear = (w) => w.find('.mp-more')
const sheet = (w) => w.findComponent({ name: 'SongSheet' })
async function openSettings(w) {
  if (!w.find('.mp-panel').exists()) { await gear(w).trigger('click'); await nextTick() }
}
const row = (w, id) => w.find(`[data-setting="${id}"]`)
async function pickSelect(w, id, value) {
  await openSettings(w)
  await row(w, id).find('select').setValue(value)
  await nextTick()
}
async function stepper(w, id, which) {
  await openSettings(w)
  const btns = row(w, id).findAll('.mp-stp')
  await btns[which === 'next' ? 1 : 0].trigger('click')
  await nextTick()
}
const lastPlay = () => playSongSpy.mock.calls.at(-1)
const lastOpts = () => lastPlay()[1]

beforeEach(() => {
  localStorage.clear()
  playSongSpy.mockClear()
  setTransposeSpy.mockClear()
})

describe('SongViewer playback key', () => {
  it('step key up THEN play → schedules original key + transpose (E→F = +1)', async () => {
    const w = mountViewer()
    await nextTick()
    await stepper(w, 'key', 'next') // E → F
    await playBtn(w).trigger('click')
    await nextTick()
    expect(playSongSpy).toHaveBeenCalled()
    expect(lastPlay()[0].key).toBe('E') // base pitch stays the original key…
    expect(lastPlay()[1].transpose).toBe(1) // …the shift rides on transpose
  })

  it('change key WHILE playing → live re-tune (setTranspose), NOT a restart', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click') // start (E, transpose 0)
    playSongSpy.mockClear()
    await stepper(w, 'key', 'prev') // E → Eb (−1) mid-playback
    expect(setTransposeSpy).toHaveBeenCalledWith(-1)
    expect(playSongSpy).not.toHaveBeenCalled() // did NOT restart
  })
})

describe('SongViewer play / stop / resume (US-A01)', () => {
  it('press play → starts from the top (startIndex 0), button shows พัก', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    await nextTick()
    expect(playSongSpy).toHaveBeenCalledTimes(1)
    expect(lastOpts().startIndex).toBe(0)
    expect(playBtn(w).attributes('aria-label')).toBe('พัก')
  })

  it('highlight follows the currently-sounding note', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    lastOpts().onNote({ li: 1, si: 3 }, 2)
    await nextTick()
    expect(w.find('.sheet').attributes('data-seg')).toBe('1-3')
  })

  it('B006: a sung attack (syk set) advances the per-syllable highlight', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    lastOpts().onNote({ li: 2, si: 1, syk: 3 }, 7)
    await nextTick()
    expect(w.find('.sheet').attributes('data-syl')).toBe('2-1-3')
  })

  it('B006: a rest/held note (no syk) leaves the current word lit', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    lastOpts().onNote({ li: 0, si: 0, syk: 0 }, 0)
    lastOpts().onNote({ li: 0, si: 1 }, 1)
    await nextTick()
    expect(w.find('.sheet').attributes('data-syl')).toBe('0-0-0')
  })

  it('tapping the sheet jumps playback to that note index (US H1)', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    playSongSpy.mockClear()
    await w.find('.sheet').trigger('click') // stub emits seek {li:0, si:1, syk:0} → index 2
    expect(playSongSpy).toHaveBeenCalledTimes(1)
    expect(lastOpts().startIndex).toBe(2)
  })

  it('stop then play → RESUMES from where it stopped, not from the top', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    lastOpts().onNote({ li: 2, si: 0 }, 2)
    await playBtn(w).trigger('click') // pause (records position 2)
    await nextTick()
    expect(playBtn(w).attributes('aria-label')).toBe('เล่น')
    playSongSpy.mockClear()
    await playBtn(w).trigger('click') // play again → resume
    expect(lastOpts().startIndex).toBe(2)
  })

  it('accepts the tier contract prop and never emits save (view-only, AC3)', () => {
    const w = mount(SongViewer, {
      props: { song, tier: 'editor' },
      global: { stubs: { SongSheet: SongSheetStub, Icon: true } },
    })
    expect(w.props('tier')).toBe('editor')
    expect(w.emitted('save')).toBeUndefined()
    expect(w.html()).not.toContain('บันทึก')
  })
})

describe('SongViewer live tempo (US-A04)', () => {
  it('change tempo WHILE playing → re-schedule from the current note at the new bpm', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    lastOpts().onNote({ li: 1, si: 0 }, 2)
    playSongSpy.mockClear()
    await pickSelect(w, 'tempo', '120')
    expect(playSongSpy).toHaveBeenCalledTimes(1)
    expect(lastOpts().startIndex).toBe(2)
    expect(lastOpts().bpm).toBe(120)
  })

  it('changing tempo BEFORE playing just applies to the next play', async () => {
    const w = mountViewer()
    await nextTick()
    await pickSelect(w, 'tempo', '120')
    expect(playSongSpy).not.toHaveBeenCalled()
    await playBtn(w).trigger('click')
    expect(lastOpts().bpm).toBe(120)
    expect(lastOpts().startIndex).toBe(0)
  })
})

describe('SongViewer key / tempo / loop / readability (US-A02, US-A03)', () => {
  it('loop toggle → playback loops (US-A02)', async () => {
    const w = mountViewer()
    await nextTick()
    await loopBtn(w).trigger('click')
    await playBtn(w).trigger('click')
    expect(lastOpts().loop).toBe(true)
  })

  it('key / tempo / loop are viewer-local and never mutate the source song (US-A02)', async () => {
    const w = mountViewer()
    await nextTick()
    await stepper(w, 'key', 'next')
    await loopBtn(w).trigger('click')
    expect(song.content.key).toBe('E')
    expect(w.props('song').content.key).toBe('E')
  })

  it('the settings panel shows the current key on the stepper', async () => {
    const w = mountViewer()
    await nextTick()
    await openSettings(w)
    expect(row(w, 'key').find('.mp-stpv').text()).toBe('E')
    await stepper(w, 'key', 'next')
    expect(row(w, 'key').find('.mp-stpv').text()).toBe('F')
  })

  it('ก+ / ก− change the reading font size (US-A03)', async () => {
    const w = mountViewer()
    await nextTick()
    const style = () => w.find('.sheet-scale').attributes('style') || ''
    await stepper(w, 'font', 'next')
    expect(style()).toContain('font-size: 1.1rem')
    await stepper(w, 'font', 'prev')
    await stepper(w, 'font', 'prev')
    expect(style()).toContain('font-size: 0.9rem')
  })

  it('แสดงผล → เนื้อล้วน switches the sheet to lyrics-only layers (US-A03)', async () => {
    const w = mountViewer()
    await nextTick()
    await pickSelect(w, 'display', 'lyric')
    expect(sheet(w).props('showLyric')).toBe(true)
    expect(sheet(w).props('showNote')).toBe(false)
    expect(sheet(w).props('showChord')).toBe(false)
    expect(sheet(w).props('mode')).toBe('lyrics')
  })

  it('คอร์ด → ซ่อนคอร์ด hides the chord layer even in a full display (B024)', async () => {
    const w = mountViewer()
    await nextTick()
    expect(sheet(w).props('showChord')).toBe(true)
    await pickSelect(w, 'chord', 'hidden')
    expect(sheet(w).props('showChord')).toBe(false)
    expect(sheet(w).props('showNote')).toBe(true)
  })
})

describe('SongViewer section selection (B043)', () => {
  it('a plain (v1) song hides ⏮/⏭ + the selector, keeps ▶ (F = เงียบ)', async () => {
    const w = mountViewer(song)
    await nextTick()
    expect(playBtn(w).exists()).toBe(true)
    expect(w.find('.mp-seltrig').exists()).toBe(false)
    expect(w.find('.mp-transport button[aria-label="ท่อนก่อน"]').exists()).toBe(false)
  })

  it('a song with a ท่อน shows the selector; picking it feeds playSong an order', async () => {
    const w = mountViewer(sectionSong)
    await nextTick()
    expect(w.find('.mp-seltrig').exists()).toBe(true)
    await w.find('.mp-seltrig').trigger('click') // open the selector sheet
    await nextTick()
    await w.find('.mp-ssrow').trigger('click') // pick ท่อน 1
    await nextTick()
    await playBtn(w).trigger('click')
    expect(lastOpts().order).toEqual([{ name: 'ท่อน 1', fromLi: 0, toLi: 0 }])
  })
})

describe('SongViewer follow-along scroll pause (B016 / B038)', () => {
  it('a manual scroll pauses auto-scroll so the next highlight does not snap the page back', async () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    lastOpts().onNote({ li: 0, si: 0, syk: 0 }, 0) // sung syllable → B038 scroll
    await flushPromises()
    expect(scrollSpy).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('wheel'))
    scrollSpy.mockClear()
    lastOpts().onNote({ li: 0, si: 1, syk: 0 }, 1)
    await flushPromises()
    expect(scrollSpy).not.toHaveBeenCalled()
    scrollSpy.mockRestore()
  })

  it('B038: auto-scroll targets the exact syllable span [data-syl]', async () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    lastOpts().onNote({ li: 0, si: 0, syk: 1 }, 1)
    await flushPromises()
    // the sheet stub reflects the syllable it was asked to highlight
    expect(w.find('.sheet').attributes('data-syl')).toBe('0-0-1')
    expect(scrollSpy).toHaveBeenCalled()
    scrollSpy.mockRestore()
  })
})

describe('SongViewer song-identity re-sync (DS-A04)', () => {
  it('editing the song (same number) keeps the chosen key; loading a different song resets it', async () => {
    const w = mountViewer()
    await nextTick()
    await stepper(w, 'key', 'next') // E → F
    await w.setProps({ song: { ...song, content: { ...song.content, key: 'E' } } })
    await openSettings(w)
    expect(row(w, 'key').find('.mp-stpv').text()).toBe('F') // an edit must NOT wipe the chosen key
    await w.setProps({ song: { number: 2, title_th: 'x', content: { ...song.content, key: 'A' } } })
    await openSettings(w)
    expect(row(w, 'key').find('.mp-stpv').text()).toBe('A') // reset to the new song's key
  })
})
