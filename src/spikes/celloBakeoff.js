// SPIKE — cello bake-off (brief docs/pm/brief-cello-bakeoff.md). NOT shipped, NOT imported by the
// app. Renders the SAME phrase, with the SAME golden piano (arrange() + splendid-grand, exactly as
// deployed in round 27), three times — changing ONLY which cello sample library plays the melody.
// The whole point is a FAIR test: P'Aim's ear decides, so every variable except the cello audio is
// held identical (§ตัวแปรที่ต้องคุม in the brief).
//
// How fairness is enforced here:
//   1. `arrange()` is called ONCE per render with the SAME cfg + the SAME `songId` seed, so the
//      arranger's RNG (humanize/rubato/embellish) produces a byte-identical PerfEvent[] every time.
//      The piano therefore plays the identical performance in all three clips.
//   2. The piano fires the identical event set in every clip; only the melody role is re-voiced onto
//      a different cello sampler.
//   3. Each cello library is level-matched (makeup dB, measured) and tuning-corrected (cents,
//      measured) so the comparison is about TIMBRE, not loudness or intonation. See
//      tools/prepare-cello-bakeoff.mjs + docs/reports/cello-bakeoff.md.
//
// NOT done here on purpose (brief §กติกา 2): no invented vibrato / swell / crossfade / legato
// scripting. Raw sample + the existing arranger. Two earlier rounds died by blind beauty-tuning.

import { buildPlayNotes, buildChordVoice, resolveSections, KEY_MIDI, REVERB, makeReverbBus } from '../lib/midi.js'
import { arrange } from '../lib/arranger/index.js'
import { moduleForInstrument } from '../lib/arranger/instruments/index.js'
import { presetCfg } from '../lib/arranger/presets.js'
import { loadInstrument, gainToVelocityFull } from '../lib/sampler.js'
import { playableContent, floatToInt16 } from '../lib/audioExport.js'

// The three candidates + the piano-only reference. `dir` is the mirror built by
// tools/prepare-cello-bakeoff.mjs (gitignored — see the report for licence reasons).
export const VARIANTS = [
  { id: 'karoryfer', label: 'A · Karoryfer x bigcat', licence: 'CC0',
    note: 'CC0 · ไม่มีสั่นนิ้ว (no vibrato) · = ไลบรารีเดียวกับที่อยู่ในแอพตอนนี้' },
  { id: 'sso', label: 'B · Sonatina (SSO) solo cello', licence: 'CC Sampling Plus 1.0',
    note: 'มีสั่นนิ้วในตัว · สเตอริโอ · วนลูปได้ (โน้ตยาวไม่ขาด) · ⚠️ ลิขสิทธิ์ยังไม่เคลียร์' },
  { id: 'iowa', label: 'C · Iowa MIS (ของเปรียบเทียบ)', licence: 'Public Domain',
    note: 'ตัวที่เคยโดนตีว่า "หวูดเรือ" — หลักเทียบ' },
]
export const PIANO_ONLY = { id: 'none', label: 'D · เปียโนทองอย่างเดียว (ของเดิม รอบ 27)', licence: '—',
  note: 'ไม่มีเชลโล = เสียงที่ deploy อยู่จริงตอนนี้ · ไว้เทียบว่าเติมเชลโลแล้วดีขึ้นหรือแย่ลง' }

// ── STEP 1 of the "แสบแก้วหู" brief (docs/pm/brief-cello-soften.md) ────────────────────────────
// P'Aim picked Karoryfer but it is harsh. We only ever loaded `*_mf_d.wav` = 1 of the 8 takes per
// pitch, so every note is bowed at the same medium-hard weight. The p/mp takes are a real cellist
// bowing lightly — VERIFIED to be a genuinely darker tone rather than a quieter mf: at MATCHED
// loudness, p sits 167 Hz lower in centroid and has 5.7 dB less energy above 2 kHz than mf
// (monotonic p<mp<mf<f across all 17 pitches). So turning mf down could not have produced this.
// ── MARCATO (P'Aim's design, 17 ก.ค.) ────────────────────────────────────────────────────────
// P'Aim: "mp mf สั้น ๆ มากๆ แล้วลากด้วย p · การแสบน่าจะเกิดตอนช่วงแรกของการเริ่มสีขึ้นหรือลง".
// So: a SHORT hard head on the beat, and a soft `p` carrying the body. It is also exactly what the
// people who recorded this cello built — readme: "staccato attacks layered on top of sustained
// notes"; `vc_arco_marcato_map.sfz` = ampeg_hold 0.200 + sustain 0 + an `amplitude_oncc110`
// "Marcato Strength" knob. Their marcato splits head-vs-body BY TIME, which is not the
// crossfade-two-dynamics-of-one-note thing we're avoiding (that one really does sound like 2 cellos).
export const MARCATO = [
  { id: 'marcato-mp', label: 'p ลากยาว + หัวโน้ต mp ⭐ P\'Aim เคาะ', licence: 'CC0', head: 'staccato-mp',
    note: 'ค่าที่ P\'Aim หมุนเอง 17 ก.ค. — หัว mp 5% · เลื่อนตัวโน้ต 10ms ("mp นุ่มกว่าหน่อย")' },
  { id: 'marcato-mf', label: 'p ลากยาว + หัวโน้ต mf', licence: 'CC0', head: 'staccato-mf',
    note: 'หัวแรงกว่า (mf) — P\'Aim: "mp กับ mf พอได้ทั้งคู่" แต่เลือก mp' },
  { id: 'karoryfer-p', label: 'p ล้วน (ไม่มีหัวโน้ต)', licence: 'CC0', head: null,
    note: 'ตัวเทียบ = ก่อนใส่หัวโน้ต ("นุ่มสุด ไม่เหมือนออแกน แต่บางช่วงเหมือนเร่ง")' },
]

// ⭐ ค่าที่ P'AIM หมุนเองแล้วพอใจ (17 ก.ค.) — เชลโลผ่านหูเขาเป็นครั้งแรก หลังพักมา 2 รอบ.
// LOCKED as the spike's defaults so every later experiment can fall back to this exact point. The
// knobs still turn; only the starting value is fixed. NOT in the app yet (cello stays disabled).
//
// What these numbers themselves proved:
//   headStrength 5%  — at 100% the ear hears head and body as TWO events (P'Aim's "สะดุด"); at 5%
//                      they fuse into one note. The head is a HINT, not a hit.
//   bodyShift 10ms   — was 200ms (p's measured bloom). P'Aim's own hand took it 20x down, which
//                      CONFIRMS PM's hypothesis: once a sharp head marks the beat, the ear stops
//                      needing the slow body pulled forward. Consistent with the measurement that
//                      the head lands 145-180ms ahead of the body — there IS something to latch onto.
export const PAIM_MARCATO = {
  variantId: 'marcato-mp',   // body p + head mp — "mp นุ่มกว่าหน่อย"
  headStrength: 0.05,
  bodyShiftMs: 10,
}

// ── VIBRATO ──────────────────────────────────────────────────────────────────────────────────
// The cello's own sfz HAS a vibrato, switched off, with the recordist's reasoning in comments next
// to every value — i.e. the "how to use this" note P'Aim was after. We can't run their sfz LFO on
// Web Audio, but we can take their NUMBERS and their reasons:
//   lfo01_freq=2                        "ช้ากว่านี้ฟังแย่มาก"        -> 2 Hz floor
//   lfo01_freq_oncc112=8, set_cc112=32  "เร็วประมาณนี้คือสุดที่เชลโลทำได้" -> 2 + 8*(32/127) = 4.0 Hz
//   lfo01_pitch_oncc111=22              no set_cc111 => depth 0     -> OFF by default; 22 cents at full
//   lfo01_delay_oncc115=0.5, cc115=45   -> 0.5*(45/127) = 177 ms still before it starts to shake
//   lfo01_fade_oncc116=0.5, cc116=45    -> 177 ms to fade the depth in (never shakes at full instantly)
// Depth starts at 0 exactly as they shipped it ("ready if you want it") and is P'Aim's knob — the
// same pattern that worked for the last two knobs.
export const VIBRATO = {
  freqHz: 2 + 8 * (32 / 127),   // 4.02 Hz — their base + their default speed knob
  maxDepthCents: 22,            // their lfo01_pitch_oncc111
  delaySec: 0.5 * (45 / 127),   // 0.177 s
  fadeSec: 0.5 * (45 / 127),    // 0.177 s
}

// Attach an LFO to every voice created while `fn` runs.
//
// smplr computes `source.detune.value` once and never hands the node back (start() returns only a
// stop fn), so there is no supported way to modulate a sounding voice. Instead we hook
// createBufferSource for the duration of the scheduling calls, collect the voices, and drive each
// one's `detune` AudioParam from one shared LFO. Contained to the spike; no smplr fork, no patching
// of anything the app ships.
//
// Per voice: LFO -> depth gain -> source.detune, with the depth gain automated 0 -> depth so each
// note sits still for `delaySec` then eases its vibrato in over `fadeSec` (their design).
function withVibrato(ctx, depthCents, onsets, fn) {
  if (!(depthCents > 0)) return fn()
  const orig = ctx.createBufferSource.bind(ctx)
  const voices = []
  ctx.createBufferSource = () => { const s = orig(); voices.push(s); return s }
  try { return fn() } finally {
    ctx.createBufferSource = orig
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = VIBRATO.freqHz
    lfo.start(0)
    voices.forEach((s, i) => {
      if (!s.detune) return                       // Safari fallback path uses playbackRate
      const g = ctx.createGain()
      const t0 = onsets[i] ?? 0
      g.gain.setValueAtTime(0, 0)
      g.gain.setValueAtTime(0, t0 + VIBRATO.delaySec)
      g.gain.linearRampToValueAtTime(depthCents, t0 + VIBRATO.delaySec + VIBRATO.fadeSec)
      lfo.connect(g)
      g.connect(s.detune)                          // adds to the static detune smplr already set
    })
  }
}

export const DYN_LAYERS = [
  { id: 'karoryfer-p', label: 'p · สีเบา (นุ่มสุด)', licence: 'CC0',
    note: 'ทึบกว่า mf 5.7 dB ในย่านแสบ (>2kHz) · แต่คันชักบวมช้า 200ms · ต้องดันเสียง +13dB' },
  { id: 'karoryfer-mp', label: 'mp · สีเบากลาง', licence: 'CC0',
    note: 'ทึบกว่า mf 0.5 dB · บวม 35ms · ดัน +6.8dB — ตรงกลางระหว่าง p กับ mf' },
  { id: 'karoryfer-mf', label: 'mf · ของเดิมที่ P\'Aim ว่าแสบ', licence: 'CC0',
    note: 'ชั้นเดียวที่แอพเคยโหลด · บวม 20ms · ดัน +3.2dB — ตัวเทียบ' },
]

const SPIKE_BASE = '/samples/_spike'

// Build a smplr Sampler for one cello variant from the spike mirror. Mirrors sampler.js's
// `kind: 'sampler'` path (incl. the big-lookahead scheduler that offline rendering needs —
// without it every note past ~200ms is silent: memory pleng-smplr-offline-render), but kept
// LOCAL to the spike so no shipped file is touched.
// `correctTuning:false` strips the per-region detune so P'Aim can hear each library RAW, exactly as
// its files sit on disk. Default true: each sample's MEASURED cents error is cancelled so the three
// are compared on timbre, not intonation (Iowa is up to ~38 cents sharp — a third of a semitone).
async function loadCello(variantId, context, makeupGain, { correctTuning = true } = {}) {
  const { Sampler, Scheduler } = await import('smplr')
  const preset = await (await fetch(`${SPIKE_BASE}/${variantId}/preset.json`)).json()
  const attackMs = preset.plengMeta?.attackMs ?? 0    // measured by tools/prepare-cello-bakeoff.py
  preset.samples = preset.samples || {}
  preset.samples.baseUrl = `${SPIKE_BASE}/${variantId}`
  if (!correctTuning) {
    for (const g of preset.groups || []) for (const r of g.regions || []) r.detune = 0
  }
  const makeup = context.createGain()
  makeup.gain.value = makeupGain
  makeup.connect(context.destination)
  const isOffline = typeof context.startRendering === 'function'
  const opts = { preset, destination: makeup }
  if (isOffline && Scheduler) opts.scheduler = Scheduler(context, { lookaheadMs: 1e7 })
  const inst = new Sampler(context, opts)
  await inst.load
  return { inst, output: makeup, attackMs }
}

// 'both' = melody + chords. NOTE the exact string matters: voiceFlags() in midi.js only turns the
// chord voice on for the literal 'both' (anything else = melody only), so a plausible-looking
// 'melody+chords' silently renders a SOLO cello with no piano under it. Cost me a round.
const VOICES = 'both'

// Pick the line range that gives a ~targetSec excerpt, cut on a LINE boundary so the phrase does not
// stop mid-word. Returns {fromLi, toLi} for buildPlayNotes.
export function excerptRange(content, { bpm, targetSec = 20 }) {
  const playable = playableContent(content)
  const useBpm = Number(bpm) || playable.bpm || 92
  const spb = 60 / useBpm
  const all = buildPlayNotes(playable)
  const lastLi = all.reduce((m, n) => Math.max(m, n.li ?? 0), 0)
  let best = 0
  for (let to = 0; to <= lastLi; to++) {
    const sec = all.filter((n) => (n.li ?? 0) <= to).reduce((s, n) => s + n.beats, 0) * spb
    if (sec <= targetSec) best = to
    else break
  }
  return { fromLi: 0, toLi: best }
}

// The arrangement is computed from the sheet exactly as the shipped "เปียโนบรรเลง" preset does.
// `songId` is passed through as the RNG seed → identical performance across variants.
export function buildPerformance(content, { bpm, range, songId }) {
  const playable = playableContent(content)
  const useBpm = Number(bpm) || playable.bpm || 92
  const notes = buildPlayNotes(playable, { range })
  const cfg = presetCfg('piano-arrangement')          // the golden piano, unchanged
  const chordEvents = buildChordVoice(notes)
  const sections = resolveSections(playable, notes)
  const module = moduleForInstrument('grand')
  const perf = arrange(notes, chordEvents, { arranger: true, voices: VOICES, chordGain: cfg.chordGain, ...cfg, module },
    { songId, pass: 0, timeSignature: playable.timeSignature, keyRoot: KEY_MIDI[playable.key] ?? 60, sections })
  return { perf, cfg, bpm: useBpm, notes }
}

// Render ONE clip. variantId 'none' = piano plays everything (the deployed reference). Otherwise the
// cello takes the melody role and the piano keeps every other role (= "เปียโนคลอ" per the brief).
//
// `pianoKeepsMelody` is exposed because "should the piano double the tune in unison under the cello?"
// is a TASTE question, not a technical one — it is listed in the report as an ear-decision for
// P'Aim rather than settled here. Default false = the brief's "เชลโลร้องนำ · เปียโนคลอ".
export async function renderClip(content, { variantId, bpm, range, songId, transpose = 0,
  sampleRate = 44100, celloMakeup = CELLO_MAKEUP, correctTuning = true, pianoKeepsMelody = false,
  pianoRoles = null, celloMuted = false, negativeDelay = true,
  // marcato (P'Aim's design): `headId` = a staccato set layered on the beat over the sustained body.
  // headStrength / bodyShiftMs are the two KNOBS P'Aim turns — "how hard is right" and "does the
  // body still need shifting once a sharp head marks the beat" are both ear questions, so neither is
  // a number I pick. bodyShiftMs=null keeps the measured negative delay.
  headId = null, headStrength = 1, headHoldMs = 200, bodyShiftMs = null,
  // vibrato depth in cents (0 = off, exactly as the library ships it). P'Aim's knob — see VIBRATO.
  vibratoCents = 0 } = {}) {
  const { perf, cfg, bpm: useBpm } = buildPerformance(content, { bpm, range, songId })
  const spb = 60 / useBpm

  let endBeat = 0
  for (const e of perf) endBeat = Math.max(endBeat, e.startBeat + e.beats + (e.timeShift || 0) / spb)
  const frames = Math.max(1, Math.ceil((endBeat * spb + 1.2) * sampleRate)) // tail for release + reverb
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const ctx = new OfflineCtx(2, frames, sampleRate)   // stereo — SSO cello is a stereo recording

  const reverbCfg = REVERB[cfg.reverb]
  const fx = reverbCfg ? makeReverbBus(ctx, ctx.destination, reverbCfg) : null
  const busIn = fx ? fx.input : ctx.destination

  const onset = (e) => Math.max(0, e.startBeat * spb + (e.timeShift || 0))
  const perNoteDur = (e) => {
    const raw = e.beats * spb
    return e.role === 'melody' ? Math.max(0.08, raw - 0.07) : Math.max(0.1, raw - 0.05)
  }

  const useCello = variantId && variantId !== 'none'
  const isMelody = (e) => e.role === 'melody'
  // pianoRoles: 'all' (D = the deployed sound) | 'accomp' (คลอ, under the cello) | 'melody' | 'none'.
  // 'melody'/'none' exist only for the calibration passes below, not as user-facing modes.
  const roles = pianoRoles || ((!useCello || pianoKeepsMelody) ? 'all' : 'accomp')
  if (roles !== 'none') {
    const piano = await loadInstrument('grand', ctx)     // the SAME loader the app ships
    piano.setDestination(busIn)
    const pianoEvents = roles === 'all' ? perf
      : roles === 'melody' ? perf.filter(isMelody)
      : perf.filter((e) => !isMelody(e))
    for (const e of pianoEvents) piano.fire(e.midi + transpose, onset(e), perNoteDur(e), e.gain)
  }

  let celloReport = null
  if (useCello && !celloMuted) {
    const bodyId = MARCATO.find((m) => m.id === variantId)?.head ? 'karoryfer-p' : variantId
    const { inst, output, attackMs } = await loadCello(bodyId, ctx, celloMakeup, { correctTuning })
    output.disconnect()
    output.connect(busIn)                              // same reverb room as the piano
    // NEGATIVE DELAY (PM 16 ก.ค. · docs/pm/audio-round2-techniques.md): a bowed note ramps up, so
    // firing it ON the beat lands it LATE against the piano's instant attack (measured: piano
    // reaches half level in 0 ms; these cellos in 40/55/250 ms). Fire it early by its own measured
    // attack so the note is HEARD on the beat. Deterministic (no randomness → the MP3 matches live),
    // and derived per library from that library's audio, so it removes a timing defect rather than
    // flattering any candidate.
    // bodyShiftMs (P'Aim's knob) overrides the measured delay. PM's hypothesis to test: once a sharp
    // head marks the beat, the ear may stop needing the body shifted at all — so this must be
    // turnable, not fixed.
    const shiftMs = bodyShiftMs != null ? bodyShiftMs : (negativeDelay ? (attackMs || 0) : 0)
    const shift = shiftMs / 1000
    const mel = perf.filter(isMelody)
    const outOfRange = []
    // vibrato rides the BODY only: it is what sustains. The head is 55 ms of staccato at 5% —
    // nothing to shake, and inaudible anyway.
    const bodyOnsets = mel.map((e) => Math.max(0, onset(e) - shift))
    withVibrato(ctx, vibratoCents, bodyOnsets, () => {
      for (const e of mel) {
        const midi = e.midi + transpose
        // honest-to-the-sheet (brief §4 · memory feedback-audio-honest-to-sheet): play the written
        // pitch. Do NOT octave-shift to flatter the sample — if it falls outside the cello's real
        // range we REPORT it instead of silently moving it.
        if (midi < CELLO_LO || midi > CELLO_HI) outOfRange.push(midi)
        // velocity from the arranger's own gain via the SAME map sampler.js uses for its CC0 cello,
        // so the cello's dynamics track the arrangement exactly like the shipped path would.
        inst.start({ note: midi, time: Math.max(0, onset(e) - shift),
          duration: Math.max(0.12, perNoteDur(e)), velocity: gainToVelocityFull(e.gain) })
      }
    })

    // the marcato head: a short staccato ON the beat, under P'Aim's strength knob. Fired at the
    // written onset with NO negative delay — the head is what marks the beat, and it is fast anyway
    // (measured 20-55 ms vs the body's 200 ms). NOT a crossfade: head and body are separated in TIME
    // (the library's own approach), not two dynamics of one note bleeding into each other.
    let headReport = null
    if (headId && headStrength > 0) {
      const head = await loadCello(headId, ctx, celloMakeup * headStrength, { correctTuning })
      head.output.disconnect()
      head.output.connect(busIn)
      const hold = Math.min(headHoldMs / 1000, 0.2)   // library's ampeg_hold=0.200
      for (const e of mel) {
        head.inst.start({ note: e.midi + transpose, time: onset(e),
          duration: Math.max(0.05, Math.min(hold, perNoteDur(e))),
          velocity: gainToVelocityFull(e.gain) })
      }
      headReport = { headId, attackMs: head.attackMs, strength: headStrength, holdMs: headHoldMs }
    }

    celloReport = { melodyNotes: mel.length, attackMs, shiftMs: Math.round(shiftMs), bodyId,
      head: headReport, vibratoCents,
      outOfRange: [...new Set(outOfRange)].sort((a, b) => a - b) }
  }

  const buffer = await ctx.startRendering()
  return { buffer, perf, bpm: useBpm, celloReport }
}

// Real cello range: open C string (C2 = MIDI 36) up to a comfortable high register (~A5 = 81).
// Used only to REPORT notes the sheet asks for that a real cello could not play.
export const CELLO_LO = 36
export const CELLO_HI = 81

// Default cello makeup = the value sampler.js already ships for its cello (REGISTRY.cello.makeup),
// so the cello-vs-piano balance starts where the app's own cello path would put it rather than at a
// number I invented. The three libraries are already level-matched to each other inside the .ogg
// files (tools/prepare-cello-bakeoff.py bakes a per-library makeup), so this one knob moves all
// three identically — the comparison stays fair at any setting. The page exposes it as a slider:
// cello-vs-piano balance is a TASTE call and taste is P'Aim's ear, not mine.
export const CELLO_MAKEUP = 1.3

// AudioBuffer → STEREO MP3 blob. The brief asks for MP3s so P'Aim can listen on his phone/earbuds.
// audioExport.encodePcmToMp3 is mono-only (Mp3Encoder(1, …)) and SSO's stereo image is part of what
// is being judged, so the spike encodes 2 channels itself rather than downmixing the candidate.
export async function bufferToMp3(buffer, { kbps = 192 } = {}) {
  const lamejs = (await import('@breezystack/lamejs')).default
  const nCh = Math.min(2, buffer.numberOfChannels)
  const enc = new lamejs.Mp3Encoder(nCh, buffer.sampleRate, kbps)
  const L = floatToInt16(buffer.getChannelData(0))
  const R = nCh > 1 ? floatToInt16(buffer.getChannelData(1)) : null
  const chunks = []
  const block = 1152
  for (let i = 0; i < L.length; i += block) {
    const b = R ? enc.encodeBuffer(L.subarray(i, i + block), R.subarray(i, i + block))
      : enc.encodeBuffer(L.subarray(i, i + block))
    if (b.length > 0) chunks.push(new Uint8Array(b))
  }
  const end = enc.flush()
  if (end.length > 0) chunks.push(new Uint8Array(end))
  return new Blob(chunks, { type: 'audio/mpeg' })
}

// AudioBuffer → WAV blob (for <audio> + download). Kept local to the spike.
export function bufferToWav(buffer) {
  const nCh = buffer.numberOfChannels, len = buffer.length
  const chans = []
  for (let c = 0; c < nCh; c++) chans.push(buffer.getChannelData(c))
  const bytes = 44 + len * nCh * 2
  const ab = new ArrayBuffer(bytes)
  const view = new DataView(ab)
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); view.setUint32(4, bytes - 8, true); str(8, 'WAVE')
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, nCh, true); view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * nCh * 2, true); view.setUint16(32, nCh * 2, true)
  view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, len * nCh * 2, true)
  let o = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < nCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]))
      view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2
    }
  }
  return new Blob([ab], { type: 'audio/wav' })
}

// LEVEL-MATCH THE THREE CELLOS *IN THE REGISTER THIS PHRASE ACTUALLY USES*.
//
// tools/prepare-cello-bakeoff.py already matched each library's MEAN RMS across all its samples, but
// that is not enough: Karoryfer's top octave is ~12 dB quieter than its bottom (a real property of
// the recording), while SSO's spread is much tighter. So on a melody that lives around MIDI 60–76 the
// mean-matched files still came out ~6.5 dB apart (measured: A peak -16.4 dB vs B -9.8 dB). Louder
// is heard as better, which would have handed the bake-off to B for a reason that has nothing to do
// with its timbre.
//
// So: render each cello ALONE over the real phrase, measure its actual RMS, and derive a per-variant
// gain that puts all three at the same loudness. Now the only thing left different is the timbre —
// which is exactly the thing P'Aim is being asked to judge.
//
// The same pass also fixes the DEFAULT cello level. "How loud should the cello be against the piano"
// is taste, and taste is P'Aim's (the slider is his). But a default still has to be *some* number,
// and picking one by feel is exactly the blind guessing that killed the last two rounds. So the
// default is anchored to something measurable instead: the cello is set to the level the PIANO'S OWN
// MELODY had in the deployed sound (clip D). Rationale — the cello is taking over the lead line, so
// it should arrive with the presence the lead line already had. Measured, not felt.
//
// Returns { gains:{variantId:mult}, rms:{variantId:rms}, leadMakeup, pianoMelodyRms }.
export async function calibrateLevels(content, { bpm, range, songId, correctTuning = true,
  variants = VARIANTS } = {}) {
  const base = { bpm, range, songId, correctTuning }
  const rms = {}
  for (const v of variants) {
    const { buffer } = await renderClip(content, {
      ...base, variantId: v.id, pianoRoles: 'none', celloMakeup: 1,
    })
    rms[v.id] = measure(buffer).rms
  }
  const vals = Object.values(rms).filter((r) => r > 0).sort((a, b) => a - b)
  if (!vals.length) return { gains: Object.fromEntries(variants.map((v) => [v.id, 1])), rms, leadMakeup: 1 }
  const target = vals[Math.floor(vals.length / 2)]   // median → nobody pushed to an extreme
  const gains = {}
  for (const v of variants) gains[v.id] = rms[v.id] > 0 ? target / rms[v.id] : 1

  // what the piano's melody alone measured — the level the lead voice used to arrive at
  const { buffer: melBuf } = await renderClip(content, {
    ...base, variantId: 'none', pianoRoles: 'melody',
  })
  const pianoMelodyRms = measure(melBuf).rms
  // at makeup=1 the median cello measures `target`; scale it onto the piano-melody level
  const leadMakeup = target > 0 ? pianoMelodyRms / target : CELLO_MAKEUP
  return { gains, rms, target, pianoMelodyRms, leadMakeup }
}

// Scale a rendered buffer to a common integrated RMS so the four clips play back at the SAME
// loudness — standard practice for an A/B listening test, because "louder" is reliably mistaken for
// "better". This is a single gain on the finished mix: it moves A/B/C/D onto one playback level
// without touching the arrangement or the cello-vs-piano balance inside the clip (that ratio is set
// before this, and is P'Aim's slider). Backs off if the target would clip.
export function normalizeBuffer(buffer, targetRmsDb = -24) {
  const m = measure(buffer)
  if (!(m.rms > 0)) return buffer
  let g = Math.pow(10, targetRmsDb / 20) / m.rms
  if (m.peak * g > 0.99) g = 0.99 / m.peak      // never clip
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c)
    for (let i = 0; i < d.length; i++) d[i] *= g
  }
  return buffer
}

// Peak / RMS of a rendered buffer — proves "there IS sound, and it doesn't clip". It does NOT
// prove "เพราะ" (memory pleng-aesthetic-audio-needs-ear): that is P'Aim's ear, not a number.
export function measure(buffer) {
  let peak = 0, sum = 0, n = 0
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c)
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; n++ }
  }
  const rms = Math.sqrt(sum / (n || 1))
  return { peak, rms, peakDb: 20 * Math.log10(peak || 1e-9), rmsDb: 20 * Math.log10(rms || 1e-9),
    clipped: peak >= 0.999, seconds: buffer.duration }
}
