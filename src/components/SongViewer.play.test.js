// The ดู surface plays in the SELECTED key, re-tunes live on key/tempo change, and drives
// every control through the bottom "music player". The dock is now the DockKey core engine,
// fed by <SingTransport> (ITEMS_SING): row 2 = ไทม์ไลน์ · คีย์ · เลือกท่อน, row 1 = transport,
// and the ⚙ Setting page holds คอร์ด/ความเร็ว/แสดงผล/วนซ้ำ. SongViewer mounts it directly.
// This suite mocks the audio engine and asserts what reaches playSong / setTranspose.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const { playSongSpy, playEnsembleSpy, setTransposeSpy } = vi.hoisted(() => ({
  playSongSpy: vi.fn(() => new Promise(() => {})),
  playEnsembleSpy: vi.fn(() => new Promise(() => {})),
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
    playEnsemble: playEnsembleSpy,
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
import { setEnsembleMode } from '../store.js'

// SongViewer now mounts its own dock (the DockKey engine via <SingTransport>) — no external
// wiring to reproduce. A thin wrapper just carries the song/tier props.
const Harness = {
  components: { SongViewer },
  props: { song: { type: Object, required: true }, tier: { type: String, default: 'guest' } },
  template: `<div><SongViewer :song="song" :tier="tier" /></div>`,
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
// two ท่อน → resolveContent puts a section marker on li 0 and li 1 (fromLi/toLi 0 and 1).
// Lets us test unticking one ท่อน out of the all-ticked default (B105).
const twoSecSong = {
  number: 5,
  title_th: 'สองท่อน',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      { id: 'A', lines: [[{ type: 'segment', note: '1', chord: 'C' }]] },
      { id: 'B', lines: [[{ type: 'segment', note: '2', chord: 'G' }]] },
    ],
    arrangement: [
      { stanza: 'A', label: 'ท่อน 1', syllables: [] },
      { stanza: 'B', label: 'ท่อน 2', syllables: [] },
    ],
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
// Track every mounted viewer and unmount it after each test. The mocked playSong never
// resolves, so a viewer left playing stays reactive; because soundMode (B105) is a SHARED
// store ref (unlike the per-instance tempo/key refs), a later setSoundMode() would otherwise
// re-fire every lingering playing viewer's watcher and pollute the spy count.
const mountedViewers = []
const mountViewer = (p = song) => {
  const w = mount(Harness, { props: { song: p }, global: { stubs: { SongSheet: SongSheetStub, Icon: true } }, attachTo: document.body })
  mountedViewers.push(w)
  return w
}

// ---- transport helpers (the DockKey/SingTransport DOM inside the dock) ----
const playBtn = (w) => w.find('.dk-play')
const gear = (w) => w.find('.dk-gear')
const keyBadge = (w) => w.find('[data-cell="key"] .dk-badge')
const sheet = (w) => w.findComponent({ name: 'SongSheet' })
async function openSettings(w) {
  if (!w.find('.dk-panel').exists()) { await gear(w).trigger('click'); await nextTick() }
}
// วนซ้ำ lives in the ⚙ Setting page now (not on the bar by default)
async function toggleLoop(w) {
  await openSettings(w)
  await w.find('.dk-panel [data-setting="repeat"] .dk-switch').trigger('click')
  await nextTick()
}
// the page's setting ids → the adapter's descriptor ids in the Setting page
const SROW = { display: 'layer', tempo: 'speed', chord: 'chord' }
async function pickSelect(w, id, value) {
  if (id === 'key') { // คีย์ is a bar dropdown (row 2), not a Setting-page select
    await w.find('[data-cell="key"] .dk-pbtn').trigger('click')
    await nextTick()
    const opt = w.findAll('[data-cell="key"] .dk-ddrow').find((r) => r.text().trim() === String(value))
    await opt.trigger('click')
    await nextTick()
    return
  }
  await openSettings(w)
  await w.find(`.dk-panel [data-setting="${SROW[id] || id}"] select`).setValue(String(value))
  await nextTick()
}
const lastPlay = () => playSongSpy.mock.calls.at(-1)
const lastOpts = () => lastPlay()[1]

beforeEach(() => {
  localStorage.clear()
  playSongSpy.mockClear()
  playEnsembleSpy.mockClear()
  setTransposeSpy.mockClear()
  // these tests assert the SOLO path (playSong args: transpose/voices/instrument). The viewer's
  // default is now เต็มวง (playEnsemble), so force solo here; a dedicated test covers ensemble.
  setEnsembleMode('solo')
})
afterEach(() => {
  while (mountedViewers.length) { try { mountedViewers.pop().unmount() } catch { /* already gone */ } }
})

describe('SongViewer playback key', () => {
  it('step key up THEN play → schedules original key + transpose (E→F = +1)', async () => {
    const w = mountViewer()
    await nextTick()
    await pickSelect(w, 'key', 'F') // E → F
    await playBtn(w).trigger('click')
    await nextTick()
    expect(playSongSpy).toHaveBeenCalled()
    expect(lastPlay()[0].key).toBe('E') // base pitch stays the original key…
    expect(lastPlay()[1].transpose).toBe(1) // …the shift rides on transpose
  })

  it('change key WHILE playing → reschedules in the new key (B107: sampler can\'t detune)', async () => {
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click') // start (E, transpose 0)
    playSongSpy.mockClear()
    await pickSelect(w, 'key', 'Eb') // E → Eb (−1) mid-playback
    // With the real Grand piano (B107 default) the notes ahead can't be detuned like the
    // synth's oscillators, so a live key change re-schedules them in the new key instead.
    expect(playSongSpy).toHaveBeenCalled()
    expect(lastPlay()[1].transpose).toBe(-1)
    expect(setTransposeSpy).not.toHaveBeenCalled()
  })
})

describe('SongViewer เต็มวง (ensemble · B107 §6b.2)', () => {
  it('เต็มวง → routes to playEnsemble (piano lead), not playSong', async () => {
    setEnsembleMode('ensemble')
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    await nextTick()
    expect(playEnsembleSpy).toHaveBeenCalled()
    expect(playSongSpy).not.toHaveBeenCalled()
    expect(playEnsembleSpy.mock.calls[0][1].lead).toBe('piano')
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

// B105 — the sound mode (ทำนอง/คอร์ด/รวม, store.soundMode) applies in real time, like tempo:
// switch it mid-play and playback re-schedules the notes ahead with the new voices from the
// current note — no manual stop+restart.
describe('SongViewer live sound mode (B105)', () => {
  beforeEach(async () => {
    const { setSoundMode } = await import('../store.js')
    setSoundMode('melody') // reset the shared store ref between tests
  })

  it('change sound mode WHILE playing → re-schedule from the current note with the new voices', async () => {
    const { setSoundMode } = await import('../store.js')
    const w = mountViewer()
    await nextTick()
    await playBtn(w).trigger('click')
    expect(lastOpts().voices).toBe('melody') // default mode reaches playSong
    lastOpts().onNote({ li: 1, si: 0 }, 2)
    playSongSpy.mockClear()
    setSoundMode('both') // switch mid-playback
    await nextTick()
    expect(playSongSpy).toHaveBeenCalledTimes(1) // immediate re-schedule (not waiting for restart)
    expect(lastOpts().startIndex).toBe(2) // continues from the current note
    expect(lastOpts().voices).toBe('both') // now sounds the new mode
  })

  it('changing sound mode BEFORE playing just applies to the next play', async () => {
    const { setSoundMode } = await import('../store.js')
    const w = mountViewer()
    await nextTick()
    setSoundMode('chords')
    await nextTick()
    expect(playSongSpy).not.toHaveBeenCalled() // nothing playing → no re-schedule
    await playBtn(w).trigger('click')
    expect(lastOpts().voices).toBe('chords')
    expect(lastOpts().startIndex).toBe(0)
  })
})

describe('SongViewer key / tempo / loop / readability (US-A02, US-A03)', () => {
  it('loop toggle → playback loops (US-A02)', async () => {
    const w = mountViewer()
    await nextTick()
    await toggleLoop(w)
    await playBtn(w).trigger('click')
    expect(lastOpts().loop).toBe(true)
  })

  it('key / tempo / loop are viewer-local and never mutate the source song (US-A02)', async () => {
    const w = mountViewer()
    await nextTick()
    await pickSelect(w, 'key', 'G')
    await toggleLoop(w)
    expect(song.content.key).toBe('E')
    expect(w.props('song').content.key).toBe('E')
  })

  it('the key control shows the current key as a badge on the bar (dropdown)', async () => {
    const w = mountViewer()
    await nextTick()
    expect(keyBadge(w).text()).toBe('E')
    await pickSelect(w, 'key', 'F')
    expect(keyBadge(w).text()).toBe('F')
  })

  it('the reading font size comes from the global store (Aa top-nav tool, not the dock)', async () => {
    const { readingFontScale } = await import('../store.js')
    readingFontScale.value = 1
    const w = mountViewer()
    await nextTick()
    const style = () => w.find('.sheet-scale').attributes('style') || ''
    expect(style()).toContain('font-size: 1rem')
    readingFontScale.value = 1.4
    await nextTick()
    expect(style()).toContain('font-size: 1.4rem')
    readingFontScale.value = 1 // restore for other tests
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
    expect(w.find('.st-seltrig').exists()).toBe(false)
    expect(w.find('[aria-label="ท่อนก่อน"]').exists()).toBe(false)
  })

  it('a song with a ท่อน shows the selector', async () => {
    const w = mountViewer(sectionSong)
    await nextTick()
    expect(w.find('.st-seltrig').exists()).toBe(true)
  })

  // B105: every ท่อน is ticked by default (= whole song), so the selector reads honestly and
  // "play whole song" the first time plays the whole song with no order (undefined).
  it('B105: default-ticks every ท่อน; the whole song plays with no order', async () => {
    const w = mountViewer(twoSecSong)
    await nextTick()
    // all ท่อน ticked → the selector shows icon-only (no subset badge, not highlighted) · mobile width
    expect(w.find('.st-seltrig b').exists()).toBe(false)
    expect(w.find('.st-seltrig').classes()).not.toContain('sub')
    await w.find('.st-seltrig').trigger('click') // open the selector sheet
    await nextTick()
    const rows = w.findAll('.st-ssrow')
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.classes().includes('on'))).toBe(true) // both ticked
    await playBtn(w).trigger('click')
    expect(lastOpts().order).toBeUndefined() // all ท่อน = whole song, not a collapsed order
  })

  // B105: unticking one ท่อน out of the all-ticked default feeds playSong the remaining order.
  it('B105: unticking a ท่อน plays only the rest (feeds an order)', async () => {
    const w = mountViewer(twoSecSong)
    await nextTick()
    await w.find('.st-seltrig').trigger('click')
    await nextTick()
    await w.findAll('.st-ssrow')[0].trigger('click') // untick ท่อน 1 → only ท่อน 2 left
    await nextTick()
    await playBtn(w).trigger('click')
    expect(lastOpts().order).toEqual([{ name: 'ท่อน 2', fromLi: 1, toLi: 1 }])
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
    await pickSelect(w, 'key', 'F') // E → F
    await w.setProps({ song: { ...song, content: { ...song.content, key: 'E' } } })
    expect(keyBadge(w).text()).toBe('F') // an edit must NOT wipe the chosen key
    await w.setProps({ song: { number: 2, title_th: 'x', content: { ...song.content, key: 'A' } } })
    expect(keyBadge(w).text()).toBe('A') // reset to the new song's key
  })
})

// B064: editing the SAME song's stored bpm/key (แก้ไข → publish) must reach ฝึกร้อง.
// The stored tempo/key lived in local refs that only re-synced on a song-identity change,
// so an edited speed/key never showed. Re-sync when the stored value itself changes.
describe('SongViewer edit-then-sing re-sync (B064)', () => {
  const bpmSong = { number: 1, title_th: 'x', content: { ...song.content, bpm: 80 } }

  it('editing the same song bpm → ฝึกร้อง plays at the new speed', async () => {
    const w = mountViewer(bpmSong)
    await nextTick()
    await playBtn(w).trigger('click')
    expect(lastOpts().bpm).toBe(80) // original stored speed
    await playBtn(w).trigger('click') // pause
    await w.setProps({ song: { ...bpmSong, content: { ...bpmSong.content, bpm: 140 } } })
    await playBtn(w).trigger('click')
    expect(lastOpts().bpm).toBe(140) // the edited speed reaches the reader
  })

  it('a lyric-only edit (bpm unchanged) keeps the listener’s chosen tempo (DS-A04)', async () => {
    const w = mountViewer(bpmSong)
    await nextTick()
    await pickSelect(w, 'tempo', '120') // listener picks a tempo
    await w.setProps({ song: { ...bpmSong, content: { ...bpmSong.content, key: bpmSong.content.key } } })
    await playBtn(w).trigger('click')
    expect(lastOpts().bpm).toBe(120) // unchanged bpm → chosen tempo survives the edit
  })

  it('editing the same song key → ฝึกร้อง shows the new key', async () => {
    const w = mountViewer()
    await nextTick()
    await w.setProps({ song: { ...song, content: { ...song.content, key: 'G' } } }) // E → G edit
    expect(keyBadge(w).text()).toBe('G')
  })
})
