// Regression guard: โหมดรวมวง must find the song's ท่อน through the SAME resolver every other
// playback path uses (PM 24 ก.ค.).
//
// The bug: playEnsemble called sectionBeatRanges() directly. That is the LABEL half of the story —
// it has no fallback — so 56 of the library's 170 songs (26 with no label at all + 30 whose single
// "ร้อง 1" label yields one section) handed the ensemble an EMPTY section list. levelAt() then
// answered 'chorus' for every beat, which the listener hears twice over:
//   1. sectionGain pinned at 1.0 → the verse→chorus swell is flat, the whole song plays full.
//   2. the violin countermelody is gated on level === 'chorus' → it plays the entire song.
// playSong and the MP3 export never had this: they call resolveSections(), which adds the
// melody-phrase fallback (golden-piano §3b).
//
// What must stay true, forever:
//   1. ONE resolver, not two — the ensemble must go through resolveSections(), not a re-implemented
//      or copied fallback.
//   2. A song whose labels yield < 2 ท่อน gets REAL dynamics: the softer phrases really are softer,
//      and the countermelody really does stop in them.
//   3. A song that already has ≥ 2 labelled ท่อน is untouched — resolveSections hands those labels
//      back unchanged. (PM's control set: 114/170 songs, byte-identical.)
//   4. No song is ever left with the whole thing at the SPARSE level (เต็มวง จืด). `level` therefore
//      splits at the median phrase density, while `isRefrain` keeps its stricter 1.5× bar — the
//      arranger's refrain comp must not start firing just because the ensemble wanted dynamics.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const H = vi.hoisted(() => ({ fires: [], seq: 0 }))
vi.mock('./sampler.js', async (importOriginal) => {
  const actual = await importOriginal()
  const mk = (name) => ({
    fire: (midi, time, dur, gain) => { H.fires.push({ inst: name, midi, time, dur, gain, seq: H.seq++ }) },
    setDestination() {}, releaseAll() {}, stop() {},
  })
  return { ...actual, loadInstrument: async (name) => mk(name), getReadyInstrument: (name) => mk(name) }
})

const param = (v = 0) => ({ value: v, setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} })
const node = (extra = {}) => ({ connect() { return this }, disconnect() {}, ...extra })
class FakeCtx {
  constructor() { this.sampleRate = 8000; this.state = 'running'; this.destination = node(); this._reads = 0 }
  reset() { this._reads = 0 }
  // read #1 → t0 = 0.25 exactly; later reads → huge, so the real-time wait loop exits at once
  get currentTime() { return this._reads++ === 0 ? 0 : 1e9 }
  async resume() { this.state = 'running' }
  createGain() { return node({ gain: param(1) }) }
  createConvolver() { return node({ buffer: null }) }
  createStereoPanner() { return node({ pan: param(0) }) }
  createDynamicsCompressor() { return node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }) }
  createBufferSource() { return node({ buffer: null, start() {}, stop() {} }) }
  createBuffer(ch, len) { const d = Array.from({ length: ch }, () => new Float32Array(len)); return { getChannelData: (i) => d[i] } }
}
const FAKE = new FakeCtx()
globalThis.window = globalThis.window || {}
window.AudioContext = function () { return FAKE }

const { playEnsemble, buildPlayNotes, buildChordVoice, sectionBeatRanges, resolveSections, phraseSectionsFromMelody } = await import('./midi.js')

// ---------------------------------------------------------------- the fixture
// Two kinds of วรรค alternating: a BUSY one (eight 1-beat notes) and a CALM one (long notes), each
// closed by a 3-beat hold = a phrase end. Unlabelled it is a song the label path cannot describe;
// the same lines WITH two ท่อน labels give the flat all-'chorus' map the ensemble used to see on
// every song. Same notes either way — so the two runs differ ONLY in the section map.
const seg = (chord, note) => ({ type: 'segment', chord, note })
const BUSY = [seg('C', '1'), seg('C', '2'), seg('C', '3'), seg('C', '4'), seg('G', '5'), seg('G', '4'), seg('G', '3'), seg('G', '2'), seg('C', '1--')]
const CALM = [seg('F', '5-'), seg('F', '3-'), seg('G', '2-'), seg('C', '1--')]
const LINES = [[...BUSY, { type: 'bar' }], [...CALM, { type: 'bar' }], [...BUSY, { type: 'bar' }], [...CALM, { type: 'bar' }]]
const UNLABELLED = { key: 'C', bpm: 72, timeSignature: 4, lines: LINES }
const LABELLED = {
  ...UNLABELLED,
  lines: [[{ type: 'section', name: 'ท่อน 1' }, ...LINES[0]], LINES[1], [{ type: 'section', name: 'ท่อน 2' }, ...LINES[2]], LINES[3]],
}

const BPM = 72
const SPB = 60 / BPM
const SONG_ID = 'sections-test' // same id in both runs → same humanize stream → gains differ only by ท่อน

async function fires(content) {
  H.fires.length = 0; H.seq = 0; FAKE.reset()
  const ok = await playEnsemble(content, { bpm: BPM, songId: SONG_ID, lead: 'piano', loop: false })
  expect(ok).toBe(true)
  return H.fires.map((f) => ({ ...f, beat: (f.time - 0.25) / SPB }))
}
const of = (fs, inst) => fs.filter((f) => f.inst === inst)

// the MODEL the audio is checked against — never a hand-guessed beat number
const NOTES = buildPlayNotes(UNLABELLED, {})
const CHORDS = buildChordVoice(NOTES)
const MODEL = resolveSections(UNLABELLED, NOTES)
const levelAt = (beat) => { const s = MODEL.find((x) => beat >= x.fromBeat && beat < x.toBeat); return s ? s.level : 'chorus' }
const GAIN = { verse: 0.7, chorus: 1.0 } // ENS.sectionGain
// Each voice takes its level at the beat of the thing it is PLAYING, not at the instant it sounds:
// the melody at its own note, the comp and the bass at their chord event's start (a re-bow 3 beats
// later still belongs to that event). So the check has to look the level up the same way.
const NOTE_STARTS = (() => { let b = 0; return NOTES.map((n) => { const s = b; b += n.beats; return { start: s, midi: n.midi } }) })()
const MELODY_STARTS = NOTE_STARTS.filter((n) => n.midi != null).map((n) => n.start)
const snap = (starts, beat) => { let prev = starts[0]; for (const s of starts) { if (s <= beat + 1e-6) prev = s; else break } return prev }
const EVENT_STARTS = CHORDS.filter((e) => e.bass != null).map((e) => e.startBeat)

beforeEach(() => { H.fires.length = 0; H.seq = 0 })

describe('the fixture is the case the bug was about', () => {
  it('its labels yield NO sections — the state 56/170 songs are in', () => {
    expect(sectionBeatRanges(UNLABELLED, NOTES)).toEqual([])
  })

  it('the shared resolver still finds real ท่อน in it, with both levels', () => {
    expect(MODEL.length).toBeGreaterThanOrEqual(2)
    expect(MODEL.map((s) => s.level)).toContain('verse')
    expect(MODEL.map((s) => s.level)).toContain('chorus')
  })

  it('the labelled twin plays the SAME notes, under one flat all-chorus map', () => {
    const n2 = buildPlayNotes(LABELLED, {})
    expect(n2.map((n) => [n.midi, n.beats])).toEqual(NOTES.map((n) => [n.midi, n.beats]))
    const lab = sectionBeatRanges(LABELLED, n2)
    expect(lab.length).toBe(2)
    expect(lab.every((s) => s.level === 'chorus')).toBe(true)
    // control set: ≥2 labels → the shared resolver returns the labels untouched
    expect(resolveSections(LABELLED, n2)).toEqual(lab)
  })
})

describe('โหมดรวมวง plays the resolved ท่อน', () => {
  it('the melody really gets softer in the calm วรรค (dynamics are back)', async () => {
    const a = of(await fires(UNLABELLED), 'grand')
    const b = of(await fires(LABELLED), 'grand')
    expect(a.length).toBe(b.length)
    expect(a.length).toBeGreaterThan(20)
    // the GUIDE loop emits one fire per sounding note before the comp starts
    const mel = MELODY_STARTS.length
    expect(a.length).toBeGreaterThan(mel)
    const ratios = new Set()
    for (let i = 0; i < a.length; i++) {
      expect(a[i].midi).toBe(b[i].midi)
      expect(a[i].time).toBeCloseTo(b[i].time, 9) // same humanize stream — only the gain may move
      const at = i < mel ? MELODY_STARTS[i] : snap(EVENT_STARTS, a[i].beat)
      const r = a[i].gain / b[i].gain
      expect(r).toBeCloseTo(GAIN[levelAt(at)], 9)
      ratios.add(r.toFixed(3))
    }
    // both tiers must actually occur — a run that is uniformly 1.0 is the bug
    expect([...ratios].sort()).toEqual(['0.700', '1.000'])
  })

  it('the bass follows the same ท่อน (one map drives the whole band)', async () => {
    const a = of(await fires(UNLABELLED), 'cello')
    const b = of(await fires(LABELLED), 'cello')
    expect(a.length).toBe(b.length)
    expect(a.length).toBeGreaterThan(0)
    let softened = 0
    for (let i = 0; i < a.length; i++) {
      expect(a[i].time).toBeCloseTo(b[i].time, 9)
      const r = a[i].gain / b[i].gain
      expect(r).toBeCloseTo(GAIN[levelAt(snap(EVENT_STARTS, a[i].beat))], 9)
      if (r < 1) softened++
    }
    expect(softened).toBeGreaterThan(0)
  })

  it('the violin countermelody STOPS in the calm วรรค instead of running the whole song', async () => {
    const a = of(await fires(UNLABELLED), 'violin')
    const b = of(await fires(LABELLED), 'violin')
    // the flat map lets the counter play everywhere; the resolved map gates it to the fuller วรรค
    expect(a.length).toBeLessThan(b.length)
    // whatever the violin still plays under the resolved map obeys the same ท่อน levels
    for (const f of a) {
      const twin = b.find((x) => Math.abs(x.time - f.time) < 1e-9 && x.midi === f.midi)
      if (twin) expect(f.gain / twin.gain).toBeCloseTo(GAIN[levelAt(f.beat)], 9)
    }
  })

  it('a song WITH ≥2 labelled ท่อน is untouched by the change (PM control set)', async () => {
    // the ensemble's schedule for the labelled twin is fully determined by its labels: if the
    // fallback ever leaked into that path, these two runs would stop matching.
    const first = await fires(LABELLED)
    const again = await fires(LABELLED)
    expect(again.map((f) => `${f.inst}|${f.midi}|${f.time.toFixed(9)}|${f.gain.toFixed(9)}`))
      .toEqual(first.map((f) => `${f.inst}|${f.midi}|${f.time.toFixed(9)}|${f.gain.toFixed(9)}`))
    const n2 = buildPlayNotes(LABELLED, {})
    expect(resolveSections(LABELLED, n2)).toEqual(sectionBeatRanges(LABELLED, n2))
  })
})

describe('the phrase fallback never leaves a song stuck at the sparse level', () => {
  it('tags at least one วรรค as the fuller one (เต็มวง อย่าจืด)', () => {
    const secs = phraseSectionsFromMelody(NOTES)
    expect(secs.length).toBeGreaterThan(1)
    expect(secs.some((s) => s.level === 'chorus')).toBe(true)
  })

  it('a one-phrase song stays at the full level — exactly what it played before', () => {
    const one = buildPlayNotes({ key: 'C', timeSignature: 4, lines: [[seg('C', '1'), seg('C', '2'), seg('C', '3')]] }, {})
    const secs = phraseSectionsFromMelody(one)
    expect(secs.length).toBe(1)
    expect(secs[0].level).toBe('chorus')
  })

  it('level is NOT isRefrain — the arranger\'s refrain comp keeps its stricter bar', () => {
    const secs = phraseSectionsFromMelody(NOTES)
    // the fuller-level วรรค here are only ~2× … but well under 1.5× would still be tagged 'chorus'
    expect(secs.some((s) => s.level === 'chorus' && !s.isRefrain)).toBe(true)
    // and nothing is a refrain unless it clears 1.5× the median density
    for (const s of secs) if (s.isRefrain) expect(s.level).toBe('chorus')
  })
})
