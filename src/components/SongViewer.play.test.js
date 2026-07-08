// The ดู surface must play in the SELECTED key, and changing the key WHILE playing must
// re-tune from the current position (live), NOT restart. It also drives every control
// through the shared studio dock (sing mode, B024): play/stop, the key/tempo/display
// dropdowns, loop, and the font buttons. Mock the audio engine and assert what reaches
// playSong / setTranspose.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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
    TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }, { value: 120, label: 'Allegro ♩=120' }],
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

// stub SongSheet but surface the follow-along highlight + layer flags it receives, so
// tests can assert the highlight moved and the display preset propagated.
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
  mount(SongViewer, { props: { song: p }, global: { stubs: { SongSheet: SongSheetStub, Icon: true } }, attachTo: document.body })

// dock helpers (sing mode) — buttons carry a stable data-tool id
const tool = (w, id) => w.find(`.sd-tbtn[data-tool="${id}"]`)
const playBtn = (w) => tool(w, 'play')
const sheet = (w) => w.findComponent({ name: 'SongSheet' })
async function pickMenu(w, id, label) {
  await tool(w, id).trigger('click') // open the dropdown
  await nextTick()
  const row = w.findAll('.sd-menu-row').find((r) => r.find('.sd-menu-lb').text() === label)
  if (!row) throw new Error(`menu option "${label}" not found in tool "${id}"`)
  await row.trigger('click')
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
  it('pick key THEN play → schedules original key + transpose (E→G = +3 semitones)', async () => {
    const w = mountViewer()
    await nextTick()
    await pickMenu(w, 'key', 'G')
    await playBtn(w).trigger('click')
    await nextTick()
    expect(playSongSpy).toHaveBeenCalled()
    expect(lastPlay()[0].key).toBe('E') // base pitch stays the original key…
    expect(lastPlay()[1].transpose).toBe(3) // …and the shift rides on transpose
  })

  it('change key WHILE playing → live re-tune (setTranspose), NOT a restart', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click') // start (E, transpose 0)
    playSongSpy.mockClear()

    await pickMenu(w, 'key', 'D') // change key mid-playback (E→D = -2)

    expect(setTransposeSpy).toHaveBeenCalledWith(-2) // re-tuned live
    expect(playSongSpy).not.toHaveBeenCalled() // did NOT restart
  })
})

describe('SongViewer play / stop / resume (US-A01)', () => {
  it('press play → starts playback from the top (startIndex 0), button shows หยุด', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    await nextTick()
    expect(playSongSpy).toHaveBeenCalledTimes(1)
    expect(lastOpts().startIndex).toBe(0)
    expect(playBtn(w).attributes('aria-label')).toBe('หยุด') // one sticky toggle button
  })

  it('highlight follows the currently-sounding note', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    lastOpts().onNote({ li: 1, si: 3 }, 2) // engine reports the sounding note
    await nextTick()
    expect(w.find('.sheet').attributes('data-seg')).toBe('1-3')
  })

  it('B006: a sung attack (syk set) advances the per-syllable highlight', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    lastOpts().onNote({ li: 2, si: 1, syk: 3 }, 7) // engine reports an attack + its slot
    await nextTick()
    expect(w.find('.sheet').attributes('data-syl')).toBe('2-1-3')
  })

  it('B006: a rest/held note (no syk) leaves the current word lit', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    lastOpts().onNote({ li: 0, si: 0, syk: 0 }, 0) // sung a word
    lastOpts().onNote({ li: 0, si: 1 }, 1) // then a rest — no syk
    await nextTick()
    expect(w.find('.sheet').attributes('data-syl')).toBe('0-0-0') // word stayed lit
  })

  it('B006: tapping the sheet jumps playback to that note index (US H1)', async () => {
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
    await playBtn(w).trigger('click') // play
    lastOpts().onNote({ li: 2, si: 0 }, 5) // reached note index 5
    await playBtn(w).trigger('click') // stop (records position 5)
    await nextTick()
    expect(playBtn(w).attributes('aria-label')).toBe('ฟังเพลง')
    playSongSpy.mockClear()
    await playBtn(w).trigger('click') // play again → resume
    expect(lastOpts().startIndex).toBe(5)
  })

  it('accepts the tier contract prop and never emits save (view-only, AC3)', () => {
    const w = mount(SongViewer, {
      props: { song, tier: 'editor' },
      global: { stubs: { SongSheet: SongSheetStub, Icon: true } },
    })
    expect(w.props('tier')).toBe('editor')
    expect(w.emitted('save')).toBeUndefined()
    // no save/edit affordance anywhere in the reading surface
    expect(w.html()).not.toContain('บันทึก')
  })
})

describe('SongViewer live tempo (US-A04)', () => {
  it('change tempo WHILE playing → re-schedule from the current note at the new bpm, NOT from the top', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click') // play from top at 92
    lastOpts().onNote({ li: 1, si: 0 }, 4) // engine reached note index 4
    playSongSpy.mockClear()
    await pickMenu(w, 'tempo', 'Allegro ♩=120') // speed up mid-playback
    expect(playSongSpy).toHaveBeenCalledTimes(1) // re-scheduled once
    expect(lastOpts().startIndex).toBe(4) // continued from note 4…
    expect(lastOpts().bpm).toBe(120) // …at the new tempo
  })

  it('changing tempo BEFORE playing just applies to the next play', async () => {
    const w = mountViewer()
    await nextTick()
    await pickMenu(w, 'tempo', 'Allegro ♩=120')
    expect(playSongSpy).not.toHaveBeenCalled() // not playing → no (re)start
    await playBtn(w).trigger('click')
    expect(lastOpts().bpm).toBe(120)
    expect(lastOpts().startIndex).toBe(0) // a fresh play starts from the top
  })

  it('the tempo button shows the current BPM as a badge', async () => {
    const w = mountViewer()
    await nextTick()
    expect(tool(w, 'tempo').find('.sd-badge').text()).toBe('92')
    await pickMenu(w, 'tempo', 'Allegro ♩=120')
    expect(tool(w, 'tempo').find('.sd-badge').text()).toBe('120')
  })
})

describe('SongViewer key / tempo / loop / readability (US-A02, US-A03)', () => {
  it('loop toggle → playback loops the selection (US-A02)', async () => {
    const w = mountViewer()
    await nextTick()
    await tool(w, 'loop').trigger('click') // turn วนซ้ำ on
    await playBtn(w).trigger('click')
    expect(lastOpts().loop).toBe(true)
  })

  it('key / tempo / loop are viewer-local and never mutate the source song (US-A02)', async () => {
    const w = mountViewer()
    await nextTick()
    await pickMenu(w, 'key', 'G')
    await tool(w, 'loop').trigger('click')
    // the original song content is untouched — transpose is temporary display only
    expect(song.content.key).toBe('E')
    expect(w.props('song').content.key).toBe('E')
  })

  it('the key button shows the current key as a badge (US-A03 "โชว์ค่า")', async () => {
    const w = mountViewer()
    await nextTick()
    expect(tool(w, 'key').find('.sd-badge').text()).toBe('E') // original
    await pickMenu(w, 'key', 'G')
    expect(tool(w, 'key').find('.sd-badge').text()).toBe('G')
  })

  it('ก+ / ก− change the reading font size (US-A03)', async () => {
    const w = mountViewer()
    await nextTick()
    const style = () => w.find('.sheet-scale').attributes('style') || ''
    await tool(w, 'fup').trigger('click')
    expect(style()).toContain('font-size: 1.1rem')
    await tool(w, 'fdown').trigger('click')
    await tool(w, 'fdown').trigger('click')
    expect(style()).toContain('font-size: 0.9rem')
  })

  it('แสดงผล → เนื้อล้วน switches the sheet to lyrics-only layers (US-A03)', async () => {
    const w = mountViewer()
    await nextTick()
    await pickMenu(w, 'display', 'เนื้อล้วน')
    expect(sheet(w).props('showLyric')).toBe(true)
    expect(sheet(w).props('showNote')).toBe(false)
    expect(sheet(w).props('showChord')).toBe(false)
    expect(sheet(w).props('mode')).toBe('lyrics')
  })

  it('คอร์ด → ซ่อนคอร์ด hides the chord layer even in a full display (B024)', async () => {
    const w = mountViewer()
    await nextTick()
    expect(sheet(w).props('showChord')).toBe(true) // default: ครบ + ตัวอักษร
    await pickMenu(w, 'chord', 'ซ่อนคอร์ด')
    expect(sheet(w).props('showChord')).toBe(false)
    expect(sheet(w).props('showNote')).toBe(true) // note layer untouched
  })

  it('section chip plays that ท่อน from its start (US-A03)', async () => {
    const w = mountViewer(sectionSong)
    await nextTick()
    const chips = w.findAll('.section-chip')
    expect(chips.length).toBe(2) // ทั้งเพลง + one section
    await chips.at(-1).trigger('click') // the section chip
    expect(lastOpts().range).toEqual({ fromLi: 0, toLi: 0 })
    expect(lastOpts().startIndex).toBe(0)
  })
})

describe('SongViewer follow-along scroll pause (B016)', () => {
  it('a manual scroll pauses auto-scroll so the next highlight does not snap the page back', async () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    // first sounding note → auto-scroll brings it into view (watcher awaits a tick first)
    lastOpts().onNote({ li: 0, si: 0 }, 0)
    await flushPromises()
    expect(scrollSpy).toHaveBeenCalledTimes(1)
    // the singer scrolls by hand → auto-scroll steps aside for ~3.5s
    window.dispatchEvent(new Event('wheel'))
    scrollSpy.mockClear()
    lastOpts().onNote({ li: 0, si: 1 }, 1)
    await flushPromises()
    expect(scrollSpy).not.toHaveBeenCalled() // page stays where the singer left it
    scrollSpy.mockRestore()
  })
})

describe('SongViewer song-identity re-sync (latent bug, DS-A04)', () => {
  it('editing the song (same number) keeps the chosen key; loading a different song resets it', async () => {
    const w = mountViewer()
    await nextTick()
    await pickMenu(w, 'key', 'G') // listener transposes to G
    // the editor re-emits the SAME song (number 1) with edited content
    await w.setProps({ song: { ...song, content: { ...song.content, key: 'E' } } })
    expect(tool(w, 'key').find('.sd-badge').text()).toBe('G') // an edit must NOT wipe the chosen key
    // a genuinely different song loads
    await w.setProps({ song: { number: 2, title_th: 'x', content: { ...song.content, key: 'A' } } })
    expect(tool(w, 'key').find('.sd-badge').text()).toBe('A') // now reset to the new song's key
  })
})
