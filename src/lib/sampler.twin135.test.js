// ใบ v3/pleng#135 — a real instrument has ONE output, so to give the chords their own volume the piano
// plays them on a TWIN that shares the loaded samples. smplr is replaced by a fake that records every
// instance, its sample loader and every note it starts.
import { describe, it, expect, vi } from 'vitest'

const made = []
vi.mock('smplr', () => {
  class Fake {
    constructor(context, opts) { this.opts = opts; this.started = []; this.stopped = 0; this.load = Promise.resolve(); made.push(this) }
    start(ev) { this.started.push(ev); return () => {} }
    stop() { this.stopped++ }
  }
  return {
    SplendidGrandPiano: Fake,
    Soundfont: Fake,
    Sampler: Fake,
    CacheStorage: undefined,
    Scheduler: () => ({}),
    SampleLoader: () => ({ shared: true }),
  }
})

import { loadInstrument } from './sampler.js'

const node = () => { const n = { outs: [], connect(d) { n.outs.push(d); return d }, disconnect() { n.outs = [] } }; return n }
const fakeCtx = () => ({
  destination: node(),
  createGain: () => Object.assign(node(), { gain: { value: 1 } }),
  createBiquadFilter: () => Object.assign(node(), { type: '', frequency: { value: 0 } }),
})

describe('ใบ#135 — the piano plays its chords on a twin', () => {
  it('the twin shares the main instrument\'s sample loader (no second download)', async () => {
    made.length = 0
    await loadInstrument('grand', fakeCtx())
    expect(made).toHaveLength(2)
    expect(made[1].opts.loader).toBe(made[0].opts.loader)
    expect(made[0].opts.loader).toEqual({ shared: true })
  })
  it('chord notes go to the twin, melody notes to the main one, each out of its own output', async () => {
    made.length = 0
    const w = await loadInstrument('grand', fakeCtx())
    const [main, twin] = made
    const mel = node()
    const chd = node()
    w.setDestinations(mel, chd)
    w.fire(60, 0, 1, 0.3, 'melody')
    w.fire(48, 0, 1, 0.1, 'chord')
    w.fire(62, 1, 1, 0.3) // a caller that does not say (ensemble · MP3) → the main instrument
    expect(main.started.map((e) => e.note)).toEqual([60, 62])
    expect(twin.started.map((e) => e.note)).toEqual([48])
    // main's makeup output → the melody node; the twin's → the chord node
    expect(main.opts.destination.outs).toContain(mel)
    expect(twin.opts.destination.outs).toContain(chd)
    w.releaseAll()
    expect(main.stopped).toBe(1)
    expect(twin.stopped).toBe(1)
  })
  it('setDestination (one node, as the ensemble uses it) sends both to that node', async () => {
    made.length = 0
    const w = await loadInstrument('grand', fakeCtx())
    const bus = node()
    w.setDestination(bus)
    expect(made[0].opts.destination.outs).toContain(bus)
    expect(made[1].opts.destination.outs).toContain(bus)
  })
  it('the MP3 export (an offline context) gets no twin — one output, as before', async () => {
    made.length = 0
    const offline = Object.assign(fakeCtx(), { startRendering() {} })
    await loadInstrument('grand', offline)
    expect(made).toHaveLength(1)
  })
})
