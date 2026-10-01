// ใบ v3/pleng#95 — พี่เอมเคาะทาง ก (1 ต.ค. 2569): a ท่อน key moves only the MELODY's digits; chords play
// exactly as typed (พี่เปาพิมพ์คอร์ดเอง ตามคีย์ของท่อนนั้น). But when someone changes the key of the
// WHOLE song while listening, EVERYTHING must move with it — melody, chords and bass alike.
// This drives the real playSong scheduler on a fake AudioContext and reads back what it scheduled.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { playSong, stopPlayback, keyTranspose, KEY_MIDI } from './midi.js'
import { resolveContent } from './songModel.js'

function makeFakeCtx() {
  const started = []
  const param = (v = 0) => ({ value: v, setValueAtTime() { return this }, linearRampToValueAtTime() { return this }, cancelScheduledValues() { return this } })
  const node = (extra = {}) => ({ connect(d) { return d }, disconnect() {}, ...extra })
  return {
    currentTime: 0,
    state: 'running',
    sampleRate: 44100,
    started,
    destination: node(),
    resume: async () => {},
    createBuffer: (ch, len, sr) => ({ length: len, numberOfChannels: ch, sampleRate: sr, getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => node({ buffer: null, start() {}, stop() {} }),
    createGain: () => node({ gain: param(1) }),
    createOscillator() {
      const o = node({ type: '', frequency: param(), detune: param(), stop() {} })
      o.start = (t) => started.push({ t, midi: Math.round(69 + 12 * Math.log2(o.frequency.value / 440)), cents: o.detune.value })
      return o
    },
    createStereoPanner: () => node({ pan: param() }),
    createBiquadFilter: () => node({ type: '', frequency: param(), Q: param() }),
    createDynamicsCompressor: () => node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createConvolver: () => node({ buffer: null }),
  }
}
const ctx = makeFakeCtx()

// ร้อง (C, chord C) then รับ 2 set to A with its chord typed as A — the way พี่เปา types it
const SONG = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [
    { id: 'V', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 5' }]] },
    { id: 'R', lines: [[{ type: 'segment', chord: 'A', note: '1 2 3 5' }]] },
  ],
  arrangement: [
    { stanza: 'V', label: 'ร้อง', syllables: [] },
    { stanza: 'R', label: 'รับ 2', syllables: [], key: 'A' },
  ],
}
const BPM = 60 // 1 beat = 1 s → ท่อนที่ 2 starts 4 s after the first note
const pc = (m) => ((m % 12) + 12) % 12
const NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

async function schedule(transpose) {
  ctx.started.length = 0
  playSong({ ...SONG, lines: resolveContent(SONG) }, { bpm: BPM, transpose, voices: 'both', instrument: 'synth', arranger: false })
  await vi.advanceTimersByTimeAsync(0)
  const t0 = Math.min(...ctx.started.map((s) => s.t))
  const sounded = ctx.started.map((s) => ({ ...s, at: s.t - t0, heard: s.midi + s.cents / 100 }))
  stopPlayback()
  return sounded
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  window.AudioContext = function () { return ctx }
})
afterEach(() => {
  stopPlayback()
  vi.useRealTimers()
})

describe('ใบ#95 ทาง ก — chords stay as typed; a whole-song key change moves everything', () => {
  it('in the written key: รับ 2 melody sounds in A, its chord is the A that was typed', async () => {
    const s = await schedule(0)
    expect(s.every((x) => x.cents === 0)).toBe(true)
    const r2 = s.filter((x) => x.at >= 4 - 1e-6)
    // melody 1 2 3 5 from A = A B C# E — plus the A chord's tones A C# E: all inside A major
    const names = new Set(r2.map((x) => NAME[pc(x.heard)]))
    for (const n of names) expect(['A', 'B', 'C#', 'E']).toContain(n)
    // the chord was NOT moved off the typed A (no F# / D = would be A shifted again)
    expect(names.has('F#')).toBe(false)
  })

  it('whole song to D (+2): every melody, chord and bass voice moves +2 — so รับ 2 is in B, chord B', async () => {
    const t = keyTranspose('C', 'D')
    expect(t).toBe(2)
    const s = await schedule(t)
    expect(s.length).toBeGreaterThan(8) // melody + chord voices + bass were all scheduled
    expect(s.every((x) => x.cents === 200)).toBe(true) // ONE shift on every voice, chords included
    const v = s.filter((x) => x.at < 4 - 1e-6).map((x) => NAME[pc(x.heard)])
    const r2 = s.filter((x) => x.at >= 4 - 1e-6).map((x) => NAME[pc(x.heard)])
    for (const n of v) expect(['D', 'E', 'F#', 'A']).toContain(n) // ร้อง: C → D (melody + D chord)
    for (const n of r2) expect(['B', 'C#', 'D#', 'F#']).toContain(n) // รับ 2: A → B (melody + B chord)
    // the melody's distance between the two ท่อน is unchanged (C vs A = 3 semitones)
    const firstOf = (arr) => arr.reduce((a, b) => (a.at <= b.at ? a : b))
    const vMel = firstOf(s.filter((x) => x.at < 1e-6 && x.midi >= 55))
    const rMel = s.filter((x) => Math.abs(x.at - 4) < 1e-6).sort((a, b) => b.midi - a.midi)[0]
    expect(vMel.heard - rMel.heard).toBe(KEY_MIDI.C - KEY_MIDI.A)
  })
})
