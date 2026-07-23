// READ-ONLY diagnostic — does the ENSEMBLE mode (playEnsemble) have the same "phantom melody note"
// (pre-echo) symptom that refereeNoClash() just fixed on the solo/arrange() path?
//
// playEnsemble does NOT call arrange(), so it never sees the conductor. It is a hand-rolled
// scheduler with its own decoration voices. To measure it (not guess), we run the REAL function
// with a fake AudioContext + fake instruments and capture every .fire() it schedules, then apply
// the SAME pre-echo criterion the 23-Jul diagnosis used.
//
//   run: npx vitest run tools/diag-ensemble-preecho.test.mjs
//   needs a songs snapshot: node tools/diag-rhythm-fetch.mjs <songs.json>
//        then: PLENG_SONGS=<songs.json> npx vitest run tools/diag-ensemble-preecho.test.mjs
//
// Skips itself when the snapshot is absent, so it is inert inside `npm test`.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import fs from 'node:fs'

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
// currentTime: read #1 (t0 = currentTime + 0.25) returns 0 → t0 = 0.25 exactly, so beat =
// (time - 0.25) / spb. Every later read returns a huge number so `totalMs` goes negative and the
// real-time wait loop exits instantly instead of sleeping for the length of the song.
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

const { playEnsemble, buildPlayNotes, buildChordVoice, sectionBeatRanges } = await import('../src/lib/midi.js')
const { refereeNoClash } = await import('../src/lib/arranger/referee.js')
const { resolveContent } = await import('../src/lib/songModel.js')

// SongViewer.vue:139 hands playEnsemble the RESOLVED content ({...content, lines}) — a raw v2 song
// ({stanzas}) yields 0 notes. Resolve exactly as the viewer does, or the scan measures nothing.
const resolve = (content) => ({ ...content, lines: resolveContent(content) })

// ---------------------------------------------------------------- role → mix bus (playEnsemble §6b.2)
// A raw fire gain is NOT comparable across instruments: each role goes to a bus with its own level.
// Effective loudness ≈ fire gain × dry bus gain. (Reverb sends add a little on top — ignored; they
// only make the strings slightly LOUDER than modelled, so this under-counts rather than over-counts.)
// DRY = the direct bus level only. WET = dry + both reverb sends summed at the master
// (roleBus: send level = dry × sendAmount, then × nearG 0.24 / farG 0.30). The strings are sent
// far more reverb than the piano, so WET is the CONSERVATIVE model — it makes the violin as loud
// relative to the lead as the mix can possibly justify. The conclusion has to survive both.
const wet = (dry, n, f) => dry + dry * n * 0.24 + dry * f * 0.30
const BUS_MODELS = {
  dry: { grand: 1.0, cello: 0.16, violin: 0.62, nylon: 0.9 },
  wet: { grand: wet(1.0, 0.13, 0), cello: wet(0.16, 0.05, 0.34), violin: wet(0.62, 0.12, 0.4), nylon: wet(0.9, 0.14, 0.05) },
}
let BUS = BUS_MODELS.dry

// The 23-Jul diagnosis called an ornament "loud enough to be mistaken for the tune" at gain 0.12
// against a 0.31 melody = 38.7% of the melody. On the ensemble path the melody is 0.52 × bus 1.0,
// so the same PERCEPTUAL line has to be expressed as a ratio, not an absolute number.
const AUDIBLE_REL = 0.12 / 0.31
const LOOK = 2      // beats — PREECHO_LOOKAHEAD
const OCTAVES = 1   // PREECHO_OCTAVES

// playEnsemble's GUIDE loop runs FIRST and emits exactly one fire per sounding note, in song order
// (optionally preceded by an idiomatic grace on guitar/violin lead). So: walk the lead instrument's
// fires in scheduling order and greedily match them against the SSOT attack list. The match consumes
// the melody; unmatched fires before the last match are the graces; everything after is the comp
// (piano lead) or the violin's fills (violin lead). Deterministic, and the caller asserts that
// exactly `expected.length` notes matched — a mis-split cannot pass silently.
function splitGuide(leadFires, expected) {
  const melody = [], grace = []
  let ei = 0, cut = 0
  for (let i = 0; i < leadFires.length && ei < expected.length; i++) {
    const f = leadFires[i], e = expected[ei]
    if (f.midi === e.midi && Math.abs(f.beat - e.beat) < 0.08) { melody.push({ ...f, beats: e.beats }); ei++; cut = i + 1 }
    else grace.push(f)
  }
  return { melody, grace, rest: leadFires.slice(cut) }
}

// pre-echo points, using the DIAGNOSIS's criterion (independent of the fix's own constants):
// an audible decoration sitting in a melodic GAP, within `look` beats before a melody attack of
// the same pitch class (unison or octave).
function preEchoes(decor, mel, { look = LOOK, octaves = OCTAVES, minRel = AUDIBLE_REL, skipCovered = true } = {}) {
  const out = []
  const melAt = (b) => {
    const cover = mel.find((m) => b >= m.beat - 1e-9 && b < m.beat + m.beats - 1e-9)
    if (cover) return cover
    let prev = null
    for (const m of mel) { if (m.beat <= b + 1e-9) prev = m; else break }
    return prev || mel[0]
  }
  for (const d of decor) {
    const ref = melAt(d.beat)
    if (!ref) continue
    const rel = d.eff / ref.eff
    if (rel < minRel) continue
    const covered = mel.some((m) => d.beat >= m.beat - 1e-9 && d.beat < m.beat + m.beats - 1e-9)
    if (covered && skipCovered) continue
    d.rel = rel; d.covered = covered
    for (const m of mel) {
      if (m.beat <= d.beat + 1e-9) continue
      if (m.beat - d.beat > look + 1e-9) break
      const dd = Math.abs(m.midi - d.midi)
      if (dd % 12 === 0 && dd <= octaves * 12) { out.push({ ...d, lead: +(m.beat - d.beat).toFixed(3), semis: dd }); break }
    }
  }
  return out
}

// Run the real playEnsemble on one song and return classified, beat-space events.
async function ensembleOf(raw, songId, { bpm = 72, lead = 'piano' } = {}) {
  const content = resolve(raw)
  H.fires.length = 0; H.seq = 0; FAKE.reset()
  const ok = await playEnsemble(content, { bpm, lead, songId, loop: false })
  if (!ok || !H.fires.length) return null
  const spb = 60 / bpm
  const t0 = 0.25
  const beatOf = (t) => (t - t0) / spb
  const all = H.fires.map((f) => ({ ...f, beat: beatOf(f.time), eff: f.gain * (BUS[f.inst] ?? 1) }))

  // expected melody attacks straight from the SSOT (buildPlayNotes) = what the GUIDE loop plays.
  const notes = buildPlayNotes(content, {})
  const expected = []
  { let b = 0; for (const n of notes) { if (n.midi != null) expected.push({ beat: b, midi: n.midi, beats: n.beats }); b += n.beats } }

  const leadInst = lead === 'guitar' ? 'nylon' : lead === 'violin' ? 'violin' : 'grand'
  const bySeq = (a, b) => a.seq - b.seq
  const { melody, grace, rest } = splitGuide(all.filter((f) => f.inst === leadInst).sort(bySeq), expected)
  const mel = melody.map((f) => ({ beat: f.beat, midi: f.midi, beats: f.beats, eff: f.eff })).sort((a, b) => a.beat - b.beat)

  // The lead instrument wears several hats, so classify by ROLE, not by instrument name:
  //   violin ลูกเล่น = the violin's fires that aren't the guide (when violin leads, that's `rest`)
  //   arp            = the grand's comp fires that aren't the guide (when piano leads, `rest`)
  const nonLead = all.filter((f) => f.inst !== leadInst)
  const violin = (lead === 'violin' ? rest : nonLead.filter((f) => f.inst === 'violin')).map((f) => ({ ...f, kind: 'violin' }))
  const arp = (lead === 'piano' ? rest : nonLead.filter((f) => f.inst === 'grand')).map((f) => ({ ...f, kind: 'arp' }))
  const bass = nonLead.filter((f) => f.inst === 'cello').map((f) => ({ ...f, kind: 'bass' }))
  const comp = [...arp, ...bass]
  return {
    mel, expected,
    melOk: melody.length === expected.length,
    // TIER 1 "ornament" = the ensemble's analogue of role 'emb' (what refereeNoClash polices):
    // the idiomatic grace on the lead + the violin's fills/countermelody.
    ornament: [...grace.map((f) => ({ ...f, kind: 'grace' })), ...violin].sort((a, b) => a.beat - b.beat),
    // TIER 2 "comp/bass" = the analogue of role 'inner'/'bass' — NOT policed on the solo path either.
    comp: comp.sort((a, b) => a.beat - b.beat),
    // safety net: every captured fire must land in exactly one bucket
    stray: all.length - (melody.length + grace.length + violin.length + comp.length),
    sections: sectionBeatRanges(content, notes).length,
  }
}

// ---------------------------------------------------------------- the scan
const SNAP = process.env.PLENG_SONGS || ''
const have = SNAP && fs.existsSync(SNAP)

describe.skipIf(!have)('ENSEMBLE pre-echo scan', () => {
  let songs
  beforeAll(() => { songs = JSON.parse(fs.readFileSync(SNAP, 'utf8')) })

  it('scans the library', async () => {
    const leads = (process.env.PLENG_LEADS || 'piano').split(',')
    const bpms = (process.env.PLENG_BPMS || '72').split(',').map(Number)
    const models = (process.env.PLENG_BUS || 'dry,wet').split(',')
    for (const model of models) for (const lead of leads) for (const bpm of bpms) {
      BUS = BUS_MODELS[model]
      const runs = []
      let skipped = 0, noSections = 0, melOk = 0
      const rels = { violin: [], grace: [], arp: [], bass: [] }
      for (const s of songs) {
        const c = s.content
        if (!c || !(c.stanzas || c.lines)) { skipped++; continue }
        let r = null
        try { r = await ensembleOf(c, s.id, { bpm, lead }) } catch { skipped++; continue }
        if (!r || !r.mel.length) { skipped++; continue }
        if (!r.sections) noSections++
        // CONTROL: the melody-block split must recover exactly the SSOT attack list.
        if (r.melOk) melOk++
        // loudness distribution — is a decoration even in the range where it could be mistaken
        // for the tune? (this is what decides whether a 0-count is real or a threshold artifact)
        const melAt = (b) => { let p = r.mel[0]; for (const m of r.mel) { if (m.beat <= b + 1e-9) p = m; else break } return p }
        for (const d of [...r.ornament, ...r.comp]) { const ref = melAt(d.beat); if (ref) rels[d.kind]?.push(d.eff / ref.eff) }
        runs.push({ n: s.number, title: s.title_th, r })
      }
      console.log(`\n${'='.repeat(78)}\nbus=${model} lead=${lead} bpm=${bpm} · ${runs.length} songs (${skipped} skipped)`)
      console.log(`CONTROL melody-split == SSOT attacks : ${melOk}/${runs.length}`)
      console.log(`CONTROL stray (unclassified) events   : ${runs.reduce((s, x) => s + x.r.stray, 0)}`)
      console.log(`songs where sectionBeatRanges()==[]  : ${noSections} (whole song treated as chorus)`)
      for (const k of Object.keys(rels)) console.log(`  loudness vs melody · ${k.padEnd(7)} n=${String(rels[k].length).padStart(6)}  ${stats(rels[k])}`)

      // SENSITIVITY MATRIX — a 0 must survive dropping BOTH filters, or it is an artifact.
      console.log(`\n  pre-echo points (170 songs) — rows: loudness floor · cols: "inside a ringing melody note"`)
      console.log(`  ${'minRel'.padEnd(10)} ${'ORN skip-covered'.padStart(18)} ${'ORN count-covered'.padStart(18)} ${'COMP skip'.padStart(12)} ${'COMP count'.padStart(12)}`)
      for (const minRel of [AUDIBLE_REL, 0.25, 0.10, 0]) {
        const c = (key, skipCovered) => runs.reduce((s, x) => s + preEchoes(x.r[key], x.r.mel, { minRel, skipCovered }).length, 0)
        const lbl = minRel === AUDIBLE_REL ? `${minRel.toFixed(3)}*` : minRel.toFixed(3)
        console.log(`  ${lbl.padEnd(10)} ${String(c('ornament', true)).padStart(18)} ${String(c('ornament', false)).padStart(18)} ${String(c('comp', true)).padStart(12)} ${String(c('comp', false)).padStart(12)}`)
      }
      console.log(`  (* = the 23-Jul diagnosis's audibility line, 0.12/0.31 of the melody)`)

      // detail at the CALIBRATED threshold — the exact criterion the 23-Jul diagnosis used.
      for (const skipCovered of [true, false]) {
        const hits = runs.map((x) => ({ ...x, p: preEchoes(x.r.ornament, x.r.mel, { skipCovered }) })).filter((x) => x.p.length)
        console.log(`\n  AT THE CALIBRATED LINE (rel ≥ ${AUDIBLE_REL.toFixed(3)}, ${skipCovered ? 'skip' : 'count'}-covered): ` +
          `${hits.reduce((s, x) => s + x.p.length, 0)} points / ${hits.length} songs`)
        for (const h of hits.slice(0, 8)) {
          console.log(`   #${h.n} ${h.title}: ` + h.p.slice(0, 3).map((p) =>
            `${p.kind}@b${p.beat.toFixed(2)} midi${p.midi} lead${p.lead}b ±${p.semis} rel${p.rel.toFixed(2)}${p.covered ? ' (covered)' : ''}`).join(' | '))
        }
      }

      // worst offenders under the LOOSEST reading (no loudness floor, covered counted)
      const worst = runs.map((x) => ({ ...x, p: preEchoes(x.r.ornament, x.r.mel, { minRel: 0, skipCovered: false }) }))
        .filter((x) => x.p.length).sort((a, b) => b.p.length - a.p.length)
      console.log(`\n  loosest reading: ${worst.length} songs carry an ornament that sounds a coming melody pitch`)
      for (const w of worst.slice(0, 10)) {
        console.log(`   #${w.n} ${w.title}: ${w.p.length} — ` +
          w.p.slice(0, 3).map((p) => `${p.kind}@b${p.beat.toFixed(2)} midi${p.midi} lead${p.lead}b ±${p.semis} rel${p.rel.toFixed(2)}${p.covered ? ' (covered)' : ''}`).join(' | '))
      }
    }
    expect(true).toBe(true)
  }, 900000)
})

// ---------------------------------------------------------------- what would the FIX do here?
// Feed the ensemble's own events to the REAL refereeNoClash() (not a re-implementation), shaped as
// PerfEvent and renormalised so the melody sits at the arranger's 0.31 — otherwise the referee's
// absolute PREECHO_MIN_GAIN 0.12 would mean something different on this path. Counts the two tests
// separately, because they have very different collateral.
describe.skipIf(!have)('what refereeNoClash would remove from the ensemble', () => {
  let songs
  beforeAll(() => { songs = JSON.parse(fs.readFileSync(SNAP, 'utf8')) })

  it('measures the collateral', async () => {
    for (const lead of (process.env.PLENG_LEADS || 'piano').split(',')) {
      let orn = 0, cutBoth = 0, cutTimeOnly = 0, cutPitchOnly = 0, graceTot = 0, graceCut = 0
      for (const s of songs) {
        const c = s.content
        if (!c || !(c.stanzas || c.lines)) continue
        let r = null
        try { r = await ensembleOf(c, s.id, { bpm: 72, lead }) } catch { continue }
        if (!r || !r.mel.length) continue
        const melEff = r.mel.reduce((a, m) => a + m.eff, 0) / r.mel.length
        const k = 0.31 / melEff // renormalise this path's loudness onto the arranger's scale
        const evs = [
          ...r.mel.map((m) => ({ role: 'melody', midi: m.midi, startBeat: m.beat, beats: m.beats, gain: m.eff * k })),
          ...r.ornament.map((o) => ({ role: 'emb', kind: o.kind, midi: o.midi, startBeat: o.beat, beats: 0.5, gain: o.eff * k })),
        ].sort((a, b) => a.startBeat - b.startBeat)
        const embOf = (a) => a.filter((e) => e.role === 'emb')
        const n0 = embOf(evs).length
        const both = embOf(refereeNoClash(evs))
        const timeOnly = embOf(refereeNoClash(evs, { refereePreEcho: 0 }))          // §1a TIME test alone
        const pitchOnly = embOf(refereeNoClash(evs, { refereeGap: 0 }))              // §1b PITCH test alone
        orn += n0; cutBoth += n0 - both.length
        cutTimeOnly += n0 - timeOnly.length; cutPitchOnly += n0 - pitchOnly.length
        graceTot += embOf(evs).filter((e) => e.kind === 'grace').length
        graceCut += embOf(evs).filter((e) => e.kind === 'grace').length - both.filter((e) => e.kind === 'grace').length
      }
      const pc = (x) => `${x} (${(100 * x / orn).toFixed(1)}%)`
      console.log(`\n${'='.repeat(78)}\nrefereeNoClash applied verbatim to ENSEMBLE ornaments · lead=${lead}`)
      console.log(`  ornament events            : ${orn}`)
      console.log(`  removed by BOTH tests      : ${pc(cutBoth)}`)
      console.log(`  removed by the TIME test   : ${pc(cutTimeOnly)}   ← the "must sit in a melodic gap" rule`)
      console.log(`  removed by the PITCH test  : ${pc(cutPitchOnly)}   ← the actual pre-echo fix`)
      if (graceTot) console.log(`  idiomatic graces           : ${graceCut}/${graceTot} removed (${(100 * graceCut / graceTot).toFixed(1)}%)`)
    }
    expect(true).toBe(true)
  }, 900000)
})

// ---------------------------------------------------------------- CONTROL: the SOLO path
// The same detector, run over arrange()'s output, must reproduce the 23-Jul scan's known numbers
// (conductor pitch-test OFF = 1 point in the library · ON = 0). If it does, a 0 on the ensemble
// path means "no symptom"; if it did not, a 0 would only mean "the detector is broken".
describe.skipIf(!have)('CONTROL — solo path (arrange) with the same detector', () => {
  let songs, perfOf, presetCfg
  beforeAll(async () => {
    songs = JSON.parse(fs.readFileSync(SNAP, 'utf8'))
    ;({ perfOf } = await import('./diag-chord-playback.mjs'))
    ;({ presetCfg } = await import('../src/lib/arranger/presets.js'))
  })

  it('reproduces before=1 / after=0', () => {
    const base = presetCfg('piano-arrangement')
    const run = (cfg) => {
      let pts = 0, hits = [], rels = []
      for (const s of songs) {
        const c = s.content
        if (!c || !(c.stanzas || c.lines)) continue
        let p
        try { p = perfOf(c, s.id, { ...base, ...cfg }).perf } catch { continue }
        const mel = p.filter((e) => e.role === 'melody').map((e) => ({ beat: e.startBeat, midi: e.midi, beats: e.beats, eff: e.gain })).sort((a, b) => a.beat - b.beat)
        if (!mel.length) continue
        const emb = p.filter((e) => e.role === 'emb').map((e) => ({ beat: e.startBeat, midi: e.midi, eff: e.gain, kind: 'emb' })).sort((a, b) => a.beat - b.beat)
        const melAt = (b) => { let q = mel[0]; for (const m of mel) { if (m.beat <= b + 1e-9) q = m; else break } return q }
        for (const e of emb) rels.push(e.eff / melAt(e.beat).eff)
        const hit = preEchoes(emb, mel)
        if (hit.length) hits.push(`#${s.number} ${s.title_th} ×${hit.length} (rel ${hit.map((h) => h.rel.toFixed(2)).join(',')})`)
        pts += hit.length
      }
      return { pts, hits, rels }
    }
    const off = run({ refereePreEcho: 0 })
    const on = run({})
    console.log(`\n${'='.repeat(78)}\nCONTROL · solo path, identical detector & thresholds`)
    console.log(`  conductor pitch-test OFF : ${off.pts} pre-echo points   ${off.hits.join(' | ')}`)
    console.log(`  conductor pitch-test ON  : ${on.pts} pre-echo points`)
    console.log(`  solo ornament loudness vs melody : ${stats(off.rels)}`)
    console.log(`  (compare ensemble violin: p50 0.219 · max 0.404 — the ensemble ornament never`)
    console.log(`   reaches the loudness band where sparkle lives)`)
    expect(off.pts).toBeGreaterThan(0)  // the detector DOES fire on a known-bad arrangement
    expect(on.pts).toBe(0)              // and the shipped fix silences it
  }, 900000)
})

function stats(a) {
  if (!a.length) return '—'
  const s = [...a].sort((x, y) => x - y)
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]
  return `min ${s[0].toFixed(3)} · p50 ${q(0.5).toFixed(3)} · p90 ${q(0.9).toFixed(3)} · max ${s[s.length - 1].toFixed(3)}`
}

export { ensembleOf, preEchoes, refereeNoClash, AUDIBLE_REL, BUS }
