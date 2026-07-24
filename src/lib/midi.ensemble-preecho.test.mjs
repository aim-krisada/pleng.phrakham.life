// Regression guard for the ENSEMBLE pre-echo rule (PM 24 ก.ค.).
//
// The bug class: an ornament that sings the pitch the tune is ABOUT to sing is heard as an extra
// melody note, not as decoration. Fixed on the solo path 23 ก.ค.; playEnsemble never runs arrange()
// so it never got the rule. It now calls the SAME function (referee.js § preEchoesMelody).
//
// What must stay true, forever:
//   1. ONE rule, not two — the ensemble must call the referee's function, not a copy.
//   2. เปียโนนำ (the default) must not lose a single sound: it has no grace, and the rule only
//      polices graces. This is PM's control set.
//   3. กีตาร์นำ loses the pre-echoing grace — and ONLY that grace: tune, comp and bass untouched,
//      and the humanize stream must not shift (a vetoed grace must not re-roll the rest of the song).
//   4. ไวโอลินนำ is unchanged by default (145 measured points are a number, not an ear — held for
//      P'Aim's A/B), but `preEcho:'all'` does police it, so the A/B render is real.
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

const { playEnsemble, PREECHO_ENSEMBLE_LEADS } = await import('./midi.js')
const referee = await import('./arranger/referee.js')

// A song built to trigger the bug: a long note (so the guitar grace is eligible, n.beats >= 1)
// whose grace pitch (midi-2) is the SAME PITCH the tune attacks a beat later.
//   E4(64) held 2 beats → D4(62) → ... the grace under E4 sounds 62, and 62 arrives next. Phantom.
// Repeated so the guitar's 18%-chance grace fires several times over the song.
const BAR = [
  { type: 'segment', chord: 'C', note: '3-' }, // E4 held 2 beats — grace pitch D4 …
  { type: 'segment', chord: 'G', note: '2-' }, // … and D4 is exactly what arrives next
  { type: 'bar' },
  { type: 'segment', chord: 'C', note: '1-' },
  { type: 'segment', chord: 'C', note: '5-' },
  { type: 'bar' },
]
const SONG = { key: 'C', bpm: 72, timeSignature: 4, lines: [Array.from({ length: 12 }, () => BAR).flat()] }

async function fires(opts) {
  H.fires.length = 0; H.seq = 0; FAKE.reset()
  await playEnsemble(SONG, { bpm: 72, songId: 'test-song', ...opts })
  return H.fires.map((f) => ({ ...f, beat: (f.time - 0.25) / (60 / 72) }))
}
const of = (fs, inst) => fs.filter((f) => f.inst === inst)
const key = (fs) => fs.map((f) => `${f.inst}:${f.midi}@${f.time.toFixed(6)}:${f.gain.toFixed(6)}`).join('|')

beforeEach(() => { H.fires.length = 0; H.seq = 0 })

describe('the ensemble uses the referee\'s rule, not a copy of it', () => {
  it('exports one shared pitch predicate', () => {
    expect(typeof referee.preEchoesMelody).toBe('function')
    expect(referee.PREECHO_MIN_GAIN_RATIO).toBeCloseTo(referee.PREECHO_MIN_GAIN / 0.31, 6)
  })

  it('the predicate flags a pitch the tune is about to sing, and spares one it is not', () => {
    const attacks = [{ beat: 2, midi: 62 }]
    const at = (midi, gain) => referee.preEchoesMelody({ midi, startBeat: 1, gain }, attacks, { minGain: 0.387 })
    expect(at(62, 0.75)).toBe(true)   // unison, loud → phantom
    expect(at(50, 0.75)).toBe(true)   // an octave down, still fuses
    expect(at(63, 0.75)).toBe(false)  // a semitone off → a real ornament
    expect(at(62, 0.10)).toBe(false)  // same pitch but far under the tune → texture, leave it
    expect(at(38, 0.75)).toBe(false)  // two octaves → registers separate
  })
})

describe('CONTROL — เปียโนนำ (the default) must not move a single sound', () => {
  it('is byte-identical with the rule on and off', async () => {
    const on = await fires({ lead: 'piano' })
    const off = await fires({ lead: 'piano', preEcho: 'off' })
    expect(on.length).toBeGreaterThan(0)
    expect(key(on)).toBe(key(off))
  })

  it('never polices the piano lead at all', () => {
    expect(PREECHO_ENSEMBLE_LEADS.has('piano')).toBe(false)
  })
})

describe('กีตาร์นำ — the pre-echoing grace goes, and nothing else', () => {
  // A grace and a tune note can share a PITCH (the grace is midi-2, which is often another note of
  // the tune), so they are told apart by LENGTH: the guitar's tune note rings ≥0.6 s, its grace is
  // a 0.12 s acciaccatura.
  const tuneOf = (fs) => of(fs, 'nylon').filter((f) => f.dur > 0.5)
  const graceOf = (fs) => of(fs, 'nylon').filter((f) => f.dur <= 0.5)

  it('drops at least one grace vs the pre-fix behaviour', async () => {
    const before = await fires({ lead: 'guitar', preEcho: 'off' })
    const after = await fires({ lead: 'guitar' })
    expect(graceOf(before).length).toBeGreaterThan(0)
    expect(graceOf(after).length).toBeLessThan(graceOf(before).length)
  })

  it('leaves the TUNE, the comp and the bass untouched (only the ornament disappears)', async () => {
    const before = await fires({ lead: 'guitar', preEcho: 'off' })
    const after = await fires({ lead: 'guitar' })
    expect(key(tuneOf(after))).toBe(key(tuneOf(before)))
    expect(key(of(after, 'grand'))).toBe(key(of(before, 'grand')))   // comp
    expect(key(of(after, 'cello'))).toBe(key(of(before, 'cello')))   // bass
    expect(key(of(after, 'violin'))).toBe(key(of(before, 'violin'))) // ลูกเล่นไวโอลิน
  })

  it('no surviving grace pre-echoes the tune', async () => {
    const after = await fires({ lead: 'guitar' })
    const attacks = tuneOf(after).map((f) => ({ beat: f.beat, midi: f.midi })).sort((a, b) => a.beat - b.beat)
    const graces = graceOf(after)
    expect(attacks.length).toBeGreaterThan(0)
    for (const g of graces) {
      expect(referee.preEchoesMelody({ midi: g.midi, startBeat: g.beat, gain: 0.42 / 0.56 }, attacks,
        { minGain: referee.PREECHO_MIN_GAIN_RATIO })).toBe(false)
    }
  })
})

describe('ไวโอลินนำ — held for the ear test', () => {
  it('is unchanged by default', async () => {
    const on = await fires({ lead: 'violin' })
    const off = await fires({ lead: 'violin', preEcho: 'off' })
    expect(key(on)).toBe(key(off))
  })

  it('but preEcho:"all" really does police it, so the A/B render is not a placebo', async () => {
    const all = await fires({ lead: 'violin', preEcho: 'all' })
    const off = await fires({ lead: 'violin', preEcho: 'off' })
    expect(of(all, 'violin').length).toBeLessThan(of(off, 'violin').length)
  })
})
