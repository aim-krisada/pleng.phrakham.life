// READ-ONLY control scan for the ensemble-sections fix.
//
// The fix split phraseSectionsFromMelody's `level` tag away from its `isRefrain` tag. `level` has
// exactly ONE reader in the app (playEnsemble's levelAt) — the arranger keys section dynamics by
// section NAME and gates its refrain comp on isRefrain — so the SOLO path (playSong) and the MP3
// export must be untouched by that split. "Must be" is a claim; this measures it.
//
// It runs the REAL playSong over the whole library × every style preset × the solo instruments and
// records every scheduled note, so a before/after diff is event-exact.
//
//   PLENG_SONGS=songs.json PLENG_SOLO_OUT=before.json npx vitest run tools/diag-solo-sections-control.test.mjs
//   ...change...
//   PLENG_SONGS=songs.json PLENG_SOLO_OUT=after.json PLENG_SOLO_BASE=before.json \
//     npx vitest run tools/diag-solo-sections-control.test.mjs
//
// Skips itself when the snapshot is absent, so it is inert inside `npm test`.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import fs from 'node:fs'

const SNAP = process.env.PLENG_SONGS
const OUT = process.env.PLENG_SOLO_OUT
const BASE = process.env.PLENG_SOLO_BASE

const H = vi.hoisted(() => ({ fires: [], seq: 0 }))
vi.mock('../src/lib/sampler.js', async (importOriginal) => {
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
  get currentTime() { return this._reads++ === 0 ? 0 : 1e9 }
  async resume() { this.state = 'running' }
  createGain() { return node({ gain: param(1) }) }
  createConvolver() { return node({ buffer: null }) }
  createStereoPanner() { return node({ pan: param(0) }) }
  createDynamicsCompressor() { return node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }) }
  createBiquadFilter() { return node({ type: 'lowpass', frequency: param(), Q: param() }) }
  createOscillator() { return node({ type: 'sine', frequency: param(), detune: param(), start() {}, stop() {} }) }
  createBufferSource() { return node({ buffer: null, start() {}, stop() {} }) }
  createBuffer(ch, len) { const d = Array.from({ length: ch }, () => new Float32Array(len)); return { length: len, numberOfChannels: ch, getChannelData: (i) => d[i] } }
}
const FAKE = new FakeCtx()
globalThis.window = globalThis.window || {}
window.AudioContext = function () { return FAKE }

const { playSong } = await import('../src/lib/midi.js')
const { resolveContent } = await import('../src/lib/songModel.js')
const { presetCfg } = await import('../src/lib/arranger/presets.js')

const resolve = (content) => ({ ...content, lines: resolveContent(content) })
const sig = (f) => `${f.inst}|${f.midi}|${f.time.toFixed(6)}|${f.dur.toFixed(6)}|${f.gain.toFixed(9)}`

// what SongViewer can actually hand playSong: the two arranger presets + ตรงโน้ต, on the sampled
// solo instruments. (A synth voice takes the scheduleNote branch, which section levels never reach.)
const STYLES = [
  { id: 'arrangement', cfg: () => ({ arranger: true, arrangeCfg: presetCfg('piano-arrangement') }) },
  { id: 'calm', cfg: () => ({ arranger: true, arrangeCfg: presetCfg('piano-calm') }) },
  { id: 'plain', cfg: () => ({ arranger: false, arrangeCfg: {} }) },
]
const INSTRUMENTS = ['grand', 'nylon']

async function firesOf(content, songId, instrument, style) {
  H.fires.length = 0; H.seq = 0; FAKE.reset()
  const ok = await playSong(content, { bpm: 92, instrument, songId, loop: false, voices: 'both', ...style.cfg() })
  if (!ok) return null
  return H.fires.map(sig)
}

describe.skipIf(!SNAP)('SOLO path control — the section-level split must not move a single note', () => {
  const report = { songs: {} }

  beforeAll(async () => {
    const rows = JSON.parse(fs.readFileSync(SNAP, 'utf8'))
    for (const r of rows) {
      const content = resolve(r.content)
      const entry = { number: r.number, title: r.title_th, runs: {} }
      for (const inst of INSTRUMENTS) {
        for (const st of STYLES) entry.runs[`${inst}/${st.id}`] = await firesOf(content, String(r.id), inst, st)
      }
      report.songs[String(r.id)] = entry
    }
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(report))
  }, 600000)

  it('the scan actually scheduled notes', () => {
    const ids = Object.keys(report.songs)
    expect(ids.length).toBeGreaterThan(100)
    let notes = 0
    for (const id of ids) for (const k of Object.keys(report.songs[id].runs)) notes += report.songs[id].runs[k]?.length || 0
    console.log('solo runs:', ids.length * INSTRUMENTS.length * STYLES.length, '· scheduled notes:', notes)
    expect(notes).toBeGreaterThan(100000)
  })

  it.skipIf(!BASE)('every solo run is byte-identical to the baseline', () => {
    const base = JSON.parse(fs.readFileSync(BASE, 'utf8'))
    const diffs = []
    for (const [id, cur] of Object.entries(report.songs)) {
      const b = base.songs[id]
      if (!b) continue
      for (const k of Object.keys(cur.runs)) {
        if (JSON.stringify(b.runs[k]) !== JSON.stringify(cur.runs[k])) diffs.push(`${cur.number ?? cur.title} ${k}`)
      }
    }
    console.log('solo runs differing from baseline:', diffs.length, diffs.slice(0, 20))
    expect(diffs).toEqual([])
  })
})
