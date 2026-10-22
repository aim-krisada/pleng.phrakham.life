// ใบ v3/pleng#135 — the two volume knobs are really in the sound path, a slider moves the song that is
// playing, and the whole output goes through a limiter. A fake AudioContext records every node and every
// connection, so the test can walk the graph from a scheduled note to the speaker.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { playSong, stopPlayback, getMixLevels } from './midi.js'
import { publishLevels } from './volume.js'

function makeFakeCtx() {
  const gains = []
  const comps = []
  const param = (v = 0) => ({
    value: v,
    targets: [],
    setValueAtTime() { return this },
    linearRampToValueAtTime() { return this },
    cancelScheduledValues() { return this },
    setTargetAtTime(x) { this.targets.push(x); return this },
  })
  const node = (kind, extra = {}) => {
    const n = { kind, outs: [], connect(d) { n.outs.push(d); return d }, disconnect() { n.outs = [] }, ...extra }
    return n
  }
  const destination = node('destination')
  return {
    currentTime: 0, state: 'running', sampleRate: 44100, destination, gains, comps, oscs: [],
    resume: async () => {},
    createBuffer: (ch, len, sr) => ({ length: len, numberOfChannels: ch, sampleRate: sr, getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => node('src', { buffer: null, start() {}, stop() {} }),
    createGain() { const g = node('gain', { gain: param(1) }); gains.push(g); return g },
    createOscillator() { const o = node('osc', { type: '', frequency: param(), detune: param(), start() {}, stop() {} }); this.oscs.push(o); return o },
    createStereoPanner: () => node('pan', { pan: param() }),
    createBiquadFilter: () => node('filter', { type: '', frequency: param(), Q: param() }),
    createDynamicsCompressor() { const c = node('comp', { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }); comps.push(c); return c },
    createConvolver: () => node('conv', { buffer: null }),
    createWaveShaper: () => node('clip', { curve: null, oversample: 'none' }),
  }
}
// every node a node's sound passes through, down to the speaker
function pathFrom(n, seen = new Set()) {
  if (!n || seen.has(n)) return []
  seen.add(n)
  return [n, ...n.outs.flatMap((o) => pathFrom(o, seen))]
}

const content = {
  key: 'C', timeSignature: '4/4',
  lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4', lyric: 'ก ข ค ง' }, { type: 'bar' }, { type: 'segment', chord: 'G', note: '5 - - -', lyric: 'จ' }]],
}
// midi.js creates its AudioContext once and keeps it, so one fake serves the whole file; each test
// starts from empty node lists
const ctx = makeFakeCtx()
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  ctx.gains.length = 0
  ctx.comps.length = 0
  ctx.oscs.length = 0
  window.AudioContext = function () { return ctx }
})
afterEach(() => {
  stopPlayback()
  publishLevels({ melody: 100, chord: 100 })
  vi.useRealTimers()
})

async function start(voices = 'both') {
  playSong(content, { bpm: 120, voices, instrument: 'synth', arranger: false })
  await vi.advanceTimersByTimeAsync(0)
}

describe('ใบ#135 — volume in the sound path', () => {
  it('a melody note reaches the speaker through the melody knob and then the limiter', async () => {
    await start('melody')
    // the ctx is created once per module and reused, so take this play's FIRST melody oscillator
    const path = pathFrom(ctx.oscs[0])
    expect(path.at(-1)).toBe(ctx.destination)
    const lim = ctx.comps.find((c) => c.ratio.value === 20)
    expect(lim, 'an output limiter exists').toBeTruthy()
    expect(path).toContain(lim)
    expect(lim.threshold.value).toBeLessThan(0) // acts only near full scale
    // the soft clipper is the last step before the speaker, and its curve never passes full scale
    const clip = path.at(-2)
    expect(clip.kind).toBe('clip')
    expect(Math.max(...clip.curve.map(Math.abs))).toBeLessThanOrEqual(1)
    expect(clip.curve[Math.round((clip.curve.length - 1) * 0.75)]).toBeCloseTo(0.5, 2) // straight below the knee
  })
  it('moving a slider while the song plays changes the level at once — melody and chords apart', async () => {
    await start('both')
    publishLevels({ melody: 150, chord: 60 })
    expect(getMixLevels()).toEqual({ melody: 1.5, chord: 0.6 })
    const glided = ctx.gains.flatMap((g) => g.gain.targets)
    expect(glided).toContain(1.5)
    expect(glided).toContain(0.6)
  })
  it('a level set before playing is the level the next song starts at', async () => {
    publishLevels({ melody: 50, chord: 200 })
    await start('both')
    const values = ctx.gains.map((g) => g.gain.value)
    expect(values).toContain(0.5)
    expect(values).toContain(2)
  })
  it('the chords go through their own knob, not the melody\'s', async () => {
    publishLevels({ melody: 120, chord: 80 })
    await start('chords')
    const chordKnob = ctx.gains.find((g) => g.gain.value === 0.8)
    // some chord oscillator's path passes through the chord knob, none through the melody knob
    const paths = ctx.oscs.map((o) => pathFrom(o))
    expect(paths.some((p) => p.includes(chordKnob))).toBe(true)
    const melodyKnob = ctx.gains.find((g) => g.gain.value === 1.2)
    expect(paths.some((p) => p.includes(melodyKnob))).toBe(false)
  })
})
