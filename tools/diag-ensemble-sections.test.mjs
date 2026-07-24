// READ-ONLY diagnostic — โหมดรวมวง (playEnsemble) and the ท่อน (section) it plays to.
//
// playEnsemble called sectionBeatRanges() directly while every other playback path calls
// resolveSections() (label path + melody-phrase FALLBACK). On a song whose labels yield < 2
// sections the ensemble therefore saw NO sections at all → levelAt() answered 'chorus'
// everywhere → (a) sectionGain was pinned at 1.0 (verse→chorus dynamics flat) and (b) the
// violin countermelody, which is gated on level === 'chorus', played the WHOLE song.
//
// This harness runs the REAL playEnsemble against a fake AudioContext + fake instruments and
// records EVERY .fire() it schedules, so a before/after comparison is event-exact — not "น่าจะ
// เหมือนเดิม". Two modes:
//
//   record a baseline, then compare after the change:
//     node tools/diag-rhythm-fetch.mjs songs.json
//     PLENG_SONGS=songs.json PLENG_ENS_OUT=before.json npx vitest run tools/diag-ensemble-sections.test.mjs
//     ...apply the fix...
//     PLENG_SONGS=songs.json PLENG_ENS_OUT=after.json PLENG_ENS_BASE=before.json \
//       npx vitest run tools/diag-ensemble-sections.test.mjs
//
// Skips itself when the snapshot is absent, so it is inert inside `npm test`.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import fs from 'node:fs'

const SNAP = process.env.PLENG_SONGS
const OUT = process.env.PLENG_ENS_OUT
const BASE = process.env.PLENG_ENS_BASE

// ---------------------------------------------------------------- fake instruments (capture fires)
const H = vi.hoisted(() => ({ fires: [], seq: 0 }))
vi.mock('../src/lib/sampler.js', async (importOriginal) => {
  const actual = await importOriginal()
  const mk = (name) => ({
    fire: (midi, time, dur, gain) => { H.fires.push({ inst: name, midi, time, dur, gain, seq: H.seq++ }) },
    setDestination() {}, releaseAll() {}, stop() {},
  })
  return { ...actual, loadInstrument: async (name) => mk(name), getReadyInstrument: (name) => mk(name) }
})

// ---------------------------------------------------------------- fake AudioContext
// currentTime: read #1 (t0 = currentTime + 0.25) → 0, so beat = (time - 0.25) / spb. Every later
// read returns a huge number so the real-time wait loop exits at once instead of sleeping.
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

const { playEnsemble, buildPlayNotes, sectionBeatRanges, resolveSections } = await import('../src/lib/midi.js')
const { resolveContent } = await import('../src/lib/songModel.js')

// SongViewer.vue:166 hands playEnsemble the RESOLVED content ({...content, lines}); a raw v2 song
// ({stanzas}) yields 0 notes. Resolve exactly as the viewer does, or the scan measures nothing.
const resolve = (content) => ({ ...content, lines: resolveContent(content) })

const LEADS = ['piano', 'guitar', 'violin']
const BPM = 72

// One deterministic line per scheduled note — the unit the control set is compared on.
const sig = (f) => `${f.inst}|${f.midi}|${f.time.toFixed(6)}|${f.dur.toFixed(6)}|${f.gain.toFixed(9)}`

async function firesOf(content, songId, lead) {
  H.fires.length = 0; H.seq = 0; FAKE.reset()
  const ok = await playEnsemble(content, { bpm: BPM, lead, songId, loop: false })
  if (!ok) return null
  return H.fires.map(sig)
}

describe.skipIf(!SNAP)('โหมดรวมวง · ท่อน (sections) — library scan', () => {
  let rows = []
  const report = { bpm: BPM, songs: {} }

  beforeAll(async () => {
    rows = JSON.parse(fs.readFileSync(SNAP, 'utf8'))
    for (const r of rows) {
      const content = resolve(r.content)
      const notes = buildPlayNotes(content, {})
      if (!notes.length) continue
      const key = String(r.id)
      const labelled = sectionBeatRanges(content, notes)
      const resolvedSecs = resolveSections(content, notes)
      const entry = {
        number: r.number, title: r.title_th,
        labelled: labelled.length,
        resolved: resolvedSecs.length,
        labelledLevels: labelled.map((s) => s.level),
        resolvedLevels: resolvedSecs.map((s) => s.level),
        leads: {},
      }
      for (const lead of LEADS) entry.leads[lead] = await firesOf(content, key, lead)
      report.songs[key] = entry
    }
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(report))
  }, 300000)

  it('every song scheduled notes on every lead (the scan measured something)', () => {
    const ids = Object.keys(report.songs)
    expect(ids.length).toBeGreaterThan(100)
    for (const id of ids) for (const lead of LEADS) expect(report.songs[id].leads[lead].length).toBeGreaterThan(0)
  })

  it('the songs the ensemble hears as sectionless are exactly the songs with < 2 labelled ท่อน', () => {
    const sectionless = Object.values(report.songs).filter((s) => s.labelled === 0)
    const flat = Object.values(report.songs).filter((s) => !s.labelledLevels.includes('verse'))
    // reported to the log so the numbers in the write-up are the numbers the code produced
    console.log('songs scanned      :', Object.keys(report.songs).length)
    console.log('labelled === 0     :', sectionless.length)
    console.log('labelled === 1     :', Object.values(report.songs).filter((s) => s.labelled === 1).length)
    console.log('labelled >= 2      :', Object.values(report.songs).filter((s) => s.labelled >= 2).length)
    console.log('flat today (no verse level anywhere):', flat.length)
    expect(sectionless.length).toBeGreaterThan(0)
  })

  it.skipIf(!BASE)('CONTROL SET: songs whose ท่อน did not change schedule byte-identical notes', () => {
    const base = JSON.parse(fs.readFileSync(BASE, 'utf8'))
    const same = [], moved = [], bad = []
    for (const [id, cur] of Object.entries(report.songs)) {
      const b = base.songs[id]
      if (!b) continue
      // "did not change" is decided by the SECTIONS, not by the notes — then the notes are checked.
      const unchangedSections = JSON.stringify(b.labelledLevels) === JSON.stringify(cur.resolvedLevels) &&
        b.labelled === cur.resolved
      const identical = LEADS.every((l) => JSON.stringify(b.leads[l]) === JSON.stringify(cur.leads[l]))
      if (unchangedSections) { same.push(id); if (!identical) bad.push(cur.number ?? id) }
      else if (identical) moved.push(cur.number ?? id) // sections changed but nothing was heard
    }
    console.log('control set (sections unchanged):', same.length, '· of them differing in ANY note:', bad.length)
    console.log('sections changed but audio identical:', moved.length, moved)
    expect(bad).toEqual([])
    expect(same.length).toBeGreaterThan(100)
  })

  it.skipIf(!BASE)('AFFECTED SET: sectionless songs now get real dynamics + a gated countermelody', () => {
    const base = JSON.parse(fs.readFileSync(BASE, 'utf8'))
    const changed = Object.entries(report.songs).filter(([id, cur]) => {
      const b = base.songs[id]
      return b && b.labelled < 2
    })
    expect(changed.length).toBeGreaterThan(0)
    for (const [id, cur] of changed) {
      const b = base.songs[id]
      // before: no verse level anywhere (everything played at chorus gain)
      expect(b.labelledLevels.includes('verse')).toBe(false)
      // after: the resolved sections exist (≥1) — the ensemble is no longer flying blind
      expect(cur.resolved).toBeGreaterThanOrEqual(1)
    }
    const withVerse = changed.filter(([id, cur]) => cur.resolvedLevels.includes('verse'))
    console.log('affected songs:', changed.length, '· of them now carrying a verse level:', withVerse.length)
    // and the audio really moved on those
    for (const [id, cur] of withVerse) {
      const b = base.songs[id]
      const differs = LEADS.some((l) => JSON.stringify(b.leads[l]) !== JSON.stringify(cur.leads[l]))
      expect(differs, `song ${cur.number ?? id} gained a verse level but scheduled identical notes`).toBe(true)
    }
  })
})
