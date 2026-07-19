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
import { rngFor } from '../lib/arranger/rng.js'
import { moduleForInstrument } from '../lib/arranger/instruments/index.js'
import { presetCfg } from '../lib/arranger/presets.js'
import { loadInstrument, gainToVelocityFull, SAMPLE_HOSTS } from '../lib/sampler.js'
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
// ⚠️ CORRECTION to the brief's table (verified by reading the sfz itself, 17 ก.ค.):
//   - the EQ is NOT "at 1800 Hz". `eq1_freq=2500` is the band; 1800 is how far the LFO SWEEPS that
//     band (`lfo01_eq1freq_oncc114=1800`), alongside ±5 dB of its gain (`lfo01_eq1gain_oncc114=5`).
//   - his comment says what it is FOR: "together with the tremolo it can simulate varying bow
//     pressure while playing with heavy vibrato" — bow pressure, not an anti-synthetic filter.
//   - `set_cc114` / `set_cc113` / `set_cc118` / `set_cc119` are ALL ABSENT from his set_cc block
//     (only 103,104,110,112,115,116,117,122 are set). So the EQ, the tremolo, and BOTH of lfo02's
//     destinations ship at ZERO exactly like the vibrato depth does. The numbers below are his
//     CEILINGS ("about as high as it can go and not sound too synthetic"), not his recommendations —
//     so each is exposed as a knob from 0 (= today) to his ceiling, the pattern that has now worked
//     three times (head strength, body shift, vibrato depth).
export const VIBRATO = {
  freqHz: 2 + 8 * (32 / 127),   // 4.02 Hz — lfo01_freq=2 + lfo01_freq_oncc112=8 × set_cc112=32
  maxDepthCents: 22,            // lfo01_pitch_oncc111 ceiling
  delaySec: 0.5 * (45 / 127),   // 0.177 s — lfo01_delay_oncc115 × set_cc115=45
  fadeSec: 0.5 * (45 / 127),    // 0.177 s — lfo01_fade_oncc116 × set_cc116=45
  // lfo02 = "Second LFO to humanize stuff", "This LFO has random phase" (cc135 = ARIA's random
  // generator, i.e. a fresh phase PER NOTE — not a user knob). Our LFO1 today is ONE shared
  // oscillator started at t=0, so every note's vibrato is phase-locked to a global clock: strictly
  // MORE machine-like than his design. Per-note phase is the fix, and it must be seeded (rng.js) or
  // the MP3 stops matching what was heard live.
  lfo2FreqHz: 0.01 + 1 * (32 / 127),  // 0.262 Hz — lfo02_freq + lfo02_freq_oncc117 × set_cc117=32
  lfo2MaxPitchCents: 7,         // lfo2_pitch_oncc118 ceiling — "Slight pitch wobbliness"
  lfo2MaxRateHz: 3,             // lfo2_freq_lfo1_oncc119 ceiling — "for unsteady vibrato"
  // bow pressure = tremolo + EQ, both driven by LFO1 (so his delay/fade applies to them too)
  tremoloMaxDb: 2,              // lfo01_volume_oncc113 — "Not much - more than this sounds silly"
  eqFreqHz: 2500,               // eq1_freq
  eqBwOct: 2,                   // eq1_bw
  eqMaxGainDb: 5,               // lfo01_eq1gain_oncc114 ceiling
  eqMaxSweepHz: 1800,           // lfo01_eq1freq_oncc114 ceiling
}

// biquad Q from an SFZ bandwidth in octaves (eq1_bw=2 → Q ≈ 0.667).
const qFromBw = (oct) => Math.sqrt(Math.pow(2, oct)) / (Math.pow(2, oct) - 1)
// a unit sine with an explicit starting PHASE. OscillatorNode has no phase control, so build the
// one-harmonic wave directly: cos(φ)·cos + sin(φ)·sin = a sine shifted by φ, amplitude always 1
// (cos²+sin²=1), so phase never leaks into loudness.
const phasedSine = (ctx, phase) => ctx.createPeriodicWave(
  new Float32Array([0, Math.cos(phase)]), new Float32Array([0, Math.sin(phase)]),
  { disableNormalization: true })

// AUTO RULE — vibrato by note length (P'Aim 17 ก.ค.: "ทำกฎอัตโนมัติตามแต่ละเพลง แต่ถ้าคนใช้อยากปรับก็
// ปรับได้"). He also said vibrato must NOT sit on every note at a fixed depth ("จะน่ารำคาญ"), and that
// he cannot hand-tune 124 songs — so the rule has to decide by itself, per song, with zero tuning.
//
// The threshold is NOT a number anyone invented: it falls out of the recordist's own envelope. His
// vibrato waits `delaySec` (177 ms) before it starts and takes `fadeSec` (177 ms) more to reach
// depth — so a note shorter than delay+fade = 354 ms physically cannot vibrate anyway. Below that
// the LFO is not attached at all (silence it rather than let it twitch); from there it RAMPS to full
// by 2x that span, because a cellist's vibrato on a middling note doesn't reach full width either.
//
// "Per song" comes free, WITHOUT anyone touching a knob — measured across 5 real songs at one
// setting: #1 50% · #4 80% · #7 63% · #9 100% · #11 100% of notes vibrate. Same as a cellist: you
// cannot vibrate a passing note.
//
// ⚠️ It keys on NOTE LENGTH, not tempo — those are not the same thing and the numbers say so (#4 at
// 145 bpm vibrates MORE than #1 at 102 bpm, because its written notes are longer). Do not describe
// this as "slow song = more vibrato"; a fast song of whole notes gets plenty.
//
// ⚠️ Known gap, for P'Aim's ear not mine: on songs whose notes are ALL long (#9, #11 = 100%) the
// length rule gates nothing, so every note vibrates — which is the "คงที่ทุกโน้ต = น่ารำคาญ" he warned
// about. Length alone cannot catch that; it would need a second idea (e.g. phrase position). Not
// invented here — reported.
export const VIB_MIN_SEC = VIBRATO.delaySec + VIBRATO.fadeSec   // 0.354 s — can't vibrate below this
export const VIB_FULL_SEC = 2 * (VIBRATO.delaySec + VIBRATO.fadeSec) // 0.708 s — full depth from here

// 0..1 — how much of the depth knob this note earns, from its own length.
//
// `minSec` is the USER OVERRIDE half of P'Aim's ask ("ถ้าคนใช้อยากปรับก็ปรับได้"): the rule decides on
// its own by default (VIB_MIN_SEC, from the physics above), but the knob can move the threshold and
// the ramp keeps its 1:2 shape around it. minSec = 0 → every note earns full depth, i.e. exactly the
// "vibrato on every note" P'Aim first heard and called "มิติชัดขึ้นจริง ๆ" — so A/B against that clip
// stays possible instead of being designed away.
export function vibratoLengthFactor(durSec, minSec = VIB_MIN_SEC) {
  const lo = Math.max(0, minSec)
  const hi = 2 * lo
  if (!(lo > 0)) return durSec > 0 ? 1 : 0     // threshold off = the pre-rule sound, every note full
  if (!(durSec > lo)) return 0
  if (durSec >= hi) return 1
  return (durSec - lo) / (hi - lo)
}

// ── PIANO STRING RESONANCE ───────────────────────────────────────────────────────────────────
// Splendid ships a string-resonance map (Data/Res.txt, 57 regions) that we have never loaded — smplr
// has no resonance concept at all (verified: 0 hits in its types and source). The surprise is that
// Res.txt needs NO new audio: every region points at a `PP <note>` sample we ALREADY ship, replayed
// at a different pitch_keycenter, quiet (group_volume=-11) with a slow attack (ampeg_attack=0.1).
// That is how sympathetic ring is faked — undamped strings sounding under the played note.
//
// The sfz gates it on `locc64=65` (sustain pedal held). We model no pedal at all, which is what made
// this look expensive — but measurement settled it: the golden piano already rings continuously
// (85% of notes sound past the next onset, 2.37 voices average, ZERO silence across the clip), so
// "pedal held for the whole piece" is a faithful description of what we actually play, and the
// resonance can simply be always-on. Nothing musical left to invent.
//
// ⚠️ 30 of the 57 regions are usable: fetch-grand-layers.mjs trims the piano to MIDI 40-84, so the
// 27 PP samples at the extremes were never mirrored. The 30 cover played-keys 28-71 — i.e. free
// resonance across the register the arrangement actually lives in, and none above 71.
const RES_PRESET = '/samples/_spike/piano-res/preset.json'

async function loadResonance(context, gain) {
  const { Sampler, Scheduler } = await import('smplr')
  const preset = await (await fetch(RES_PRESET)).json()
  preset.samples = preset.samples || {}
  preset.samples.baseUrl = SAMPLE_HOSTS.grand   // the SAME grand samples the app already serves
  const out = context.createGain()
  out.gain.value = gain
  out.connect(context.destination)
  const isOffline = typeof context.startRendering === 'function'
  const opts = { preset, destination: out }
  if (isOffline && Scheduler) opts.scheduler = Scheduler(context, { lookaheadMs: 1e7 })
  const inst = new Sampler(context, opts)
  await inst.load
  const covered = preset.plengMeta?.coversPlayedKeys ?? [0, 127]
  return { inst, output: out, covered, regions: preset.plengMeta?.regionsUsable ?? 0 }
}

// Attach the recordist's LFO rig to every voice created while `fn` runs.
//
// smplr computes `source.detune.value` once and never hands the node back (start() returns only a
// stop fn), so there is no supported way to modulate a sounding voice. Instead we hook
// createBufferSource for the duration of the scheduling calls, collect the voices, and drive each
// one's params ourselves. Contained to the spike; no smplr fork, no patching of anything the app
// ships.
//
// Per voice, mirroring the sfz's signal flow:
//   lfo1 (per-note phase) ─► fade ─┬─► depth  ─► source.detune          (vibrato · lfo01_pitch)
//                                  ├─► eqGain ─► peaking.gain           (bow pressure · eq1gain)
//                                  ├─► eqFreq ─► peaking.frequency      (bow pressure · eq1freq)
//                                  └─► trem   ─► tremGain.gain          (bow pressure · lfo01_volume)
//   lfo2 (per-note phase, 0.26 Hz) ─┬─► rate  ─► lfo1.frequency         (unsteady · lfo2_freq_lfo1)
//                                   └─► wobble─► source.detune          (unsteady · lfo2_pitch)
// `fade` carries his delay+fade ONCE, so everything lfo1 drives eases in together — which is what
// the sfz does (delay/fade are properties of the LFO, not of each destination). The auto rule's
// length factor scales `fade`'s TARGET, so one note's whole LFO rig — vibrato, EQ and tremolo
// together — comes up by however much that note's own length earns. That is the coherent reading:
// a note too short to vibrate is also too short for the bow to lean into.
//
// `notes` = [{ onset, dur }] in the order the voices are created.
// PARAM ORDER MATTERS: `notes[i]` must be melody note i. smplr creates exactly one BufferSource per
// start() call, in call order — but that is an assumption about someone else's code, so the caller
// asserts voices.length === notes.length rather than trusting it (the "11 ≠ 17" lesson).
function withVibrato(ctx, cfg, notes, rng, fn) {
  const { depthCents = 0, unsteady = 0, bowPressure = 0, minNoteSec = VIB_MIN_SEC } = cfg
  if (!(depthCents > 0)) return { result: fn(), voices: 0, vibratoNotes: 0, plain: 0, pct: 0 }
  // Draw every note's random phases UP FRONT, indexed by note — not lazily inside the
  // length filter. Otherwise moving the "long notes only" threshold would re-roll the phases of
  // every other note too, and P'Aim's A/B of that one knob would be comparing two different
  // performances. Seeded (rng.js) → the MP3 is identical to what was heard live.
  const phases = notes.map(() => [rng() * 2 * Math.PI, rng() * 2 * Math.PI])

  const orig = ctx.createBufferSource.bind(ctx)
  const insertChain = bowPressure > 0        // only touch the audio path when the knob is off zero
  const voices = []
  ctx.createBufferSource = () => {
    const s = orig()
    const rec = { s, eq: null, trem: null }
    voices.push(rec)
    if (insertChain) {
      // Splice a per-voice EQ + tremolo gain in right after the source, by intercepting the FIRST
      // connect() smplr makes: source ─► eq ─► trem ─► (whatever smplr wanted). A peaking filter at
      // 0 dB and a gain at 1.0 are transparent, so a voice whose note is too short to be modulated
      // passes through unchanged.
      const eq = ctx.createBiquadFilter()
      eq.type = 'peaking'
      eq.frequency.value = VIBRATO.eqFreqHz
      eq.Q.value = qFromBw(VIBRATO.eqBwOct)
      eq.gain.value = 0
      const trem = ctx.createGain()
      trem.gain.value = 1
      eq.connect(trem)
      rec.eq = eq; rec.trem = trem
      const origConnect = s.connect.bind(s)
      let wired = false
      s.connect = (dest, ...rest) => {
        if (!wired && dest && typeof dest.connect === 'function') {
          wired = true
          trem.connect(dest, ...rest)
          return origConnect(eq)
        }
        return origConnect(dest, ...rest)
      }
    }
    return s
  }

  let result, vibratoNotes = 0, plain = 0
  try { result = fn() } finally {
    ctx.createBufferSource = orig
    voices.forEach((rec, i) => {
      const n = notes[i]
      const s = rec.s
      if (!n || !s.detune) return                 // Safari fallback path uses playbackRate
      // THE AUTO RULE (P'Aim's "กฎอัตโนมัติ + ปรับได้"): this note earns a share of the depth knob
      // from its OWN length. Too short → nothing is attached at all, rather than a twitch. Automatic
      // across all 124 songs; the threshold is the knob, and 0 gives back the every-note sound.
      const factor = vibratoLengthFactor(n.dur, minNoteSec)
      if (!(factor > 0)) { plain++; return }
      vibratoNotes++
      const t0 = n.onset

      const lfo1 = ctx.createOscillator()
      lfo1.setPeriodicWave(phasedSine(ctx, phases[i][0]))
      lfo1.frequency.value = VIBRATO.freqHz
      lfo1.start(0)

      // `factor` rides on the fade's TARGET, so this note's vibrato AND its bow-pressure EQ/tremolo
      // all come up together by what its length earns — one rule, one place.
      const fade = ctx.createGain()
      fade.gain.setValueAtTime(0, 0)
      fade.gain.setValueAtTime(0, t0 + VIBRATO.delaySec)
      fade.gain.linearRampToValueAtTime(factor, t0 + VIBRATO.delaySec + VIBRATO.fadeSec)
      lfo1.connect(fade)

      const depth = ctx.createGain()
      depth.gain.value = depthCents
      fade.connect(depth)
      depth.connect(s.detune)                     // adds to the static detune smplr already set

      if (unsteady > 0) {
        const lfo2 = ctx.createOscillator()
        lfo2.setPeriodicWave(phasedSine(ctx, phases[i][1]))
        lfo2.frequency.value = VIBRATO.lfo2FreqHz
        lfo2.start(0)
        const rate = ctx.createGain()             // wobbles the vibrato's RATE = "unsteady vibrato"
        rate.gain.value = unsteady * VIBRATO.lfo2MaxRateHz
        lfo2.connect(rate); rate.connect(lfo1.frequency)
        const wobble = ctx.createGain()           // "slight pitch wobbliness" — no fade in the sfz
        wobble.gain.value = unsteady * VIBRATO.lfo2MaxPitchCents
        lfo2.connect(wobble); wobble.connect(s.detune)
      }

      if (bowPressure > 0 && rec.eq) {
        const eqGain = ctx.createGain()
        eqGain.gain.value = bowPressure * VIBRATO.eqMaxGainDb
        fade.connect(eqGain); eqGain.connect(rec.eq.gain)
        const eqFreq = ctx.createGain()
        eqFreq.gain.value = bowPressure * VIBRATO.eqMaxSweepHz
        fade.connect(eqFreq); eqFreq.connect(rec.eq.frequency)
        // tremolo. His ±2 dB is applied as a LINEAR gain wobble around 1.0 (10^(2/20)−1 ≈ 0.26),
        // which is the standard small-signal approximation — a Web Audio GainNode has no dB input.
        const trem = ctx.createGain()
        trem.gain.value = bowPressure * (Math.pow(10, VIBRATO.tremoloMaxDb / 20) - 1)
        fade.connect(trem); trem.connect(rec.trem.gain)
      }
    })
  }
  // `vibrated/plain/pct` is the old lane's reporting contract — it is what shows P'Aim (and the
  // report) how much of THIS song the auto rule actually left shaking, per song, with no tuning.
  return { result, voices: voices.length, vibratoNotes, plain,
    pct: Math.round(100 * vibratoNotes / Math.max(1, vibratoNotes + plain)) }
}

// ── 5.3 · THE LOUD-SOFT ARC ──────────────────────────────────────────────────────────────────
// P'Aim asked to HEAR a wider loud-soft line before deciding anything ("ขอฟังก่อน ปรับดูก่อน").
// ⛔ dynamics.js is NOT touched — this is an overlay computed here, in the spike.
//
// Shape: a raised cosine rising to a climax at 58% of the SONG and easing off after — 58% is the one
// number actually measured from the reference track (docs/reports/reference-track-analysis.md). The
// rest of the shape is NOT measured; it is the simplest smooth curve through that one known point,
// and it is labelled as such rather than dressed up as analysis.
export const ARC_CLIMAX = 0.58
export function arcShape(t) {
  const p = ARC_CLIMAX
  const x = Math.max(0, Math.min(1, t))
  return x <= p
    ? 0.5 - 0.5 * Math.cos(Math.PI * (x / p))
    : 0.5 + 0.5 * Math.cos(Math.PI * ((x - p) / (1 - p)))
}
// dB to apply at song-fraction t: 0 dB at the climax, −spreadDb at the quietest point. Pushing the
// soft parts DOWN (rather than the climax up) keeps the peak where P'Aim already approved it and
// cannot clip.
export const arcDbAt = (t, spreadDb) => -spreadDb * (1 - arcShape(t))

export const DYN_LAYERS = [
  { id: 'karoryfer-p', label: 'p · สีเบา (นุ่มสุด)', licence: 'CC0',
    note: 'ทึบกว่า mf 5.7 dB ในย่านแสบ (>2kHz) · แต่คันชักบวมช้า 200ms · ต้องดันเสียง +13dB' },
  { id: 'karoryfer-mp', label: 'mp · สีเบากลาง', licence: 'CC0',
    note: 'ทึบกว่า mf 0.5 dB · บวม 35ms · ดัน +6.8dB — ตรงกลางระหว่าง p กับ mf' },
  { id: 'karoryfer-mf', label: 'mf · ของเดิมที่ P\'Aim ว่าแสบ', licence: 'CC0',
    note: 'ชั้นเดียวที่แอพเคยโหลด · บวม 20ms · ดัน +3.2dB — ตัวเทียบ' },
]

// ── 5.4 · THE "โน้ตวินาที 14 ดังผิดปกติ" BUG (P'Aim, 17 ก.ค.) ────────────────────────────────
// Steady-state RMS of every `p` sample, measured straight off the .ogg files (window 0.3–1.3 s, i.e.
// past the 200 ms bow bloom so it is the note's real body, not its attack). dB.
//
// The library's own level is NOT flat and NOT a smooth instrument contour — it ZIGZAGS: 10 direction
// flips across 16 adjacent steps, median step 5.3 dB, worst 12.6 dB between two neighbouring files
// (54→57). A real cello does not jump 12.6 dB between adjacent notes; that is take-to-take recording
// variation. prepare-cello-bakeoff.py bakes ONE makeup for the whole library, so the zigzag survives
// intact into playback.
//
// What P'Aim heard: this song's melody rides files 63/66/69, then steps down onto file 60 at 14.1 s —
// and file 60 is the loudest of the four (60:-19.0 · 63:-21.9 · 66:-24.0 · 69:-34.4 = 15.4 dB spread
// inside ONE song). Measured in the clip: notes landing on file 60 sit +5 to +7 dB above the line,
// and the 13.5 s→14.1 s step jumps +5.4 dB more than the arranger asked for. That is the "อยู่ดี ๆ ก็
// ดังขึ้นมาผิดปกติ", at the second he reported it.
const P_FILE_DB = {
  36: -24.8, 39: -20.0, 42: -14.7, 45: -18.5, 48: -14.9, 51: -17.5, 54: -25.8, 57: -13.2, 60: -19.0,
  63: -21.9, 66: -24.0, 69: -34.4, 72: -23.8, 75: -25.9, 78: -23.8, 81: -29.6, 84: -23.6,
}
// Normalise TO the library's own median (-23.6 dB) rather than to a number I picked, so the cello's
// overall loudness lands where it already is and only the zigzag is removed.
const P_FILE_TARGET_DB = -23.6

// Per-region dB correction that flattens the zigzag. `amount` 0..1 = how much of the correction to
// apply (0 = today's sound exactly, for a direct A/B).
//
// ⚠️ smplr's `volume` on a region is DECIBELS — verified empirically, NOT taken from the docs, which
// call it a "0–127 MIDI scale" defaulting to 100. It is not: no field = -32.2 dB, volume:50 = +17.8,
// volume:100 = +67.8 — i.e. it ADDS N dB. Trusting the doc and writing `volume: 100` as "unity"
// would have detonated the output by +100 dB.
export function fileLevelFix(regions, amount = 1) {
  if (!(amount > 0)) return { applied: 0, maxCutDb: 0, maxBoostDb: 0 }
  let maxCut = 0, maxBoost = 0, applied = 0
  for (const r of regions) {
    const lvl = P_FILE_DB[Number(r.sample)]
    if (lvl == null) continue
    const corr = (P_FILE_TARGET_DB - lvl) * amount
    r.volume = (r.volume || 0) + corr
    applied++
    if (corr < maxCut) maxCut = corr
    if (corr > maxBoost) maxBoost = corr
  }
  return { applied, maxCutDb: Math.round(maxCut * 10) / 10, maxBoostDb: Math.round(maxBoost * 10) / 10 }
}

const SPIKE_BASE = '/samples/_spike'

// Build a smplr Sampler for one cello variant from the spike mirror. Mirrors sampler.js's
// `kind: 'sampler'` path (incl. the big-lookahead scheduler that offline rendering needs —
// without it every note past ~200ms is silent: memory pleng-smplr-offline-render), but kept
// LOCAL to the spike so no shipped file is touched.
// `correctTuning:false` strips the per-region detune so P'Aim can hear each library RAW, exactly as
// its files sit on disk. Default true: each sample's MEASURED cents error is cancelled so the three
// are compared on timbre, not intonation (Iowa is up to ~38 cents sharp — a third of a semitone).
async function loadCello(variantId, context, makeupGain, { correctTuning = true, fileLevelAmount = 0 } = {}) {
  const { Sampler, Scheduler } = await import('smplr')
  const preset = await (await fetch(`${SPIKE_BASE}/${variantId}/preset.json`)).json()
  const attackMs = preset.plengMeta?.attackMs ?? 0    // measured by tools/prepare-cello-bakeoff.py
  preset.samples = preset.samples || {}
  preset.samples.baseUrl = `${SPIKE_BASE}/${variantId}`
  if (!correctTuning) {
    for (const g of preset.groups || []) for (const r of g.regions || []) r.detune = 0
  }
  // 5.4 — flatten the library's take-to-take level zigzag (P'Aim's "โน้ตวินาที 14 ดังผิดปกติ").
  // Only the `p` layer is measured, so only the p body is corrected; the 5% head is left alone.
  let levelFix = null
  if (fileLevelAmount > 0 && (variantId === 'karoryfer-p' || variantId === 'karoryfer-p-g')) {
    levelFix = fileLevelFix((preset.groups || []).flatMap((g) => g.regions || []), fileLevelAmount)
  }
  const makeup = context.createGain()
  makeup.gain.value = makeupGain
  makeup.connect(context.destination)
  const isOffline = typeof context.startRendering === 'function'
  const opts = { preset, destination: makeup }
  if (isOffline && Scheduler) opts.scheduler = Scheduler(context, { lookaheadMs: 1e7 })
  const inst = new Sampler(context, opts)
  await inst.load
  return { inst, output: makeup, attackMs, levelFix }
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

// Total beats of the WHOLE song — the arc's x-axis. It must be the song's span, not the excerpt's:
// the arc is an 80-second structure and the listening clip is only its first quarter, so scaling the
// arc to the clip would invent a shape the song does not have.
export function songBeatSpan(content) {
  return buildPlayNotes(playableContent(content)).reduce((s, n) => s + n.beats, 0)
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
// ── CHAMBER reverb (spike-local · G's "distance melts the close-mic bite") ─────────────────────────
// A warm convolution room, built here (not in midi.js, which is deploy code): pre-delay for distance,
// a few early reflections for the "room" cue, and a LOW-PASSED diffuse tail so the space adds body
// without adding brightness. Seeded (rngFor) → deterministic → the MP3 matches live, same as synthIR.
function chamberIR(ctx, { seconds = 1.5, decay = 2.3, predelayMs = 16, lpHz = 3000 } = {}) {
  const rng = rngFor('cello-chamber-ir', 0)
  const sr = ctx.sampleRate
  const pre = Math.floor(sr * predelayMs / 1000)
  const tail = Math.floor(sr * seconds)
  const len = pre + tail
  const buf = ctx.createBuffer(2, len, sr)
  const a = Math.exp(-2 * Math.PI * lpHz / sr)   // one-pole low-pass coefficient (warmth)
  const taps = [[9, 0.5], [14, 0.42], [21, 0.34], [29, 0.26], [39, 0.2]]  // early reflections (ms, gain)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let lp = 0
    for (let i = 0; i < tail; i++) {
      const x = (rng() * 2 - 1) * Math.pow(1 - i / tail, decay)
      lp = (1 - a) * x + a * lp                   // low-pass the diffuse tail → dark/warm room
      d[pre + i] = lp
    }
    for (const [ms, g] of taps) {                 // decorrelate the two channels slightly
      const idx = pre + Math.floor(sr * ms / 1000) + (ch ? 5 : 0)
      if (idx < len) d[idx] += (0.9 + rng() * 0.2) * g * (ch ? -1 : 1) * 0.6
    }
  }
  return buf
}

// wet/dry bus using the chamber IR. A higher wet + a lowered dry = the source sits FURTHER back (the
// distance G asked for), which is what dilutes the close-mic harshness.
function makeChamberBus(ctx, destination, wet) {
  const input = ctx.createGain()
  const dry = ctx.createGain(); dry.gain.value = Math.max(0, 1 - wet * 0.9)
  const wetGain = ctx.createGain(); wetGain.gain.value = wet
  const conv = ctx.createConvolver(); conv.buffer = chamberIR(ctx)
  input.connect(dry).connect(destination)
  input.connect(conv).connect(wetGain).connect(destination)
  return { input }
}

export async function renderClip(content, { variantId, bpm, range, songId, transpose = 0,
  sampleRate = 44100, celloMakeup = CELLO_MAKEUP, correctTuning = true, pianoKeepsMelody = false,
  pianoRoles = null, celloMuted = false, negativeDelay = true,
  // marcato (P'Aim's design): `headId` = a staccato set layered on the beat over the sustained body.
  // headStrength / bodyShiftMs are the two KNOBS P'Aim turns — "how hard is right" and "does the
  // body still need shifting once a sharp head marks the beat" are both ear questions, so neither is
  // a number I pick. bodyShiftMs=null keeps the measured negative delay.
  headId = null, headStrength = 1, headHoldMs = 200, bodyShiftMs = null,
  // vibrato depth in cents (0 = off, exactly as the library ships it). P'Aim's knob — see VIBRATO.
  vibratoCents = 0,
  // 5.2 — each 0 = today's sound, so every one of these A/Bs directly against what P'Aim approved.
  vibUnsteady = 0,      // 0..1 of the recordist's lfo02 ceilings (per-note phase + unsteady rate)
  vibBowPressure = 0,   // 0..1 of his tremolo + EQ ceilings ("varying bow pressure")
  // The auto rule's threshold. Defaults to the rule being ON at the physics value — NOT 0. 0 here
  // means "rule off, every note vibrates", which is a real setting (it is the every-note sound P'Aim
  // first approved) but it must be asked for, not fallen into: leaving this at 0 silently disabled
  // the whole auto rule and every song measured 100% instead of the rule's 50/80/63%.
  vibMinNoteSec = VIB_MIN_SEC,
  vibGainDb = 0,        // trim the cello while vibrato is on — P'Aim's "ต้องลด volume แต่ยังโหยหวน"
  // 5.3 — loud-soft arc. `arcSpreadDb` 0 = today. `arcMode`: 'bus' rides the finished mix (exact dB),
  // 'perf' scales the arranger's gains (musical, but the velocity map compresses it — measured).
  arcSpreadDb = 0, arcMode = 'bus',
  // bow round-robin: alternate the body's down-bow/up-bow takes so the same file stops replaying
  // back-to-back (~31% of notes measured). Off by default = today's sound, so A/B is direct.
  bowRoundRobin = false,
  // piano string resonance (Splendid's own Res map, reusing the PP samples we ship). Off = today.
  // 5.4 — 0..1 of the measured per-file level correction. 0 = today's sound exactly (direct A/B).
  fileLevelAmount = 0,
  // 5.5 — treble taming (P'Aim 18 ก.ค.): a high-shelf cut on the cello that GROWS with pitch. His
  // "ดังเกินตั้งแต่วินาที 8" measured as the clip's BRIGHTEST window, not its loudest — the melody's
  // ascent into the upper register, where Karoryfer is harshest; the warm low notes he did NOT flag.
  // So darken only the high notes, automatically per pitch (no per-song tuning). This value = the cut
  // in dB at the top note; it ramps from 0 below TAME_LO to full at TAME_HI. 0 = today (direct A/B).
  trebleTameDb = 0,
  // cello dynamic smoothing (18 ก.ค. · P'Aim "เสียงโดดๆ หลายจังหวะ"): the arranger's accent/contour
  // dynamics read as musical on the piano but make the cello POP on high/accented notes (measured:
  // one note +7 dB over its neighbours). Compress the CELLO melody's per-note level toward its own
  // median (piano keeps its dynamics untouched). 0 = full arranger dynamics; 1 = flat.
  celloEven = 0,
  // CALL-AND-RESPONSE (18 ก.ค. · P'Aim "ชอบตอนเปียโนกับเชลโลพลัดกันคุยโต้ตอบ"): split the melody into
  // phrases (by rests) and hand alternate phrases to the PIANO instead of the cello — cello sings a
  // phrase, piano answers the next, back and forth. 0 = cello sings every phrase (now); 1 = strict
  // alternation. General (phrase = melody rest, per song), deterministic.
  trading = 0,
  // G (18 ก.ค.): a warm CHAMBER convolution reverb to put 2-3 m of distance between the mic and the
  // instruments and melt the close-mic bite "for free". 0 = the arranger's default reverb; > 0 = wet
  // amount of the chamber (replaces the default space for BOTH piano and cello, same room).
  chamberWet = 0,
  // DEEP SOFTEN (P'Aim 19 ก.ค. · "เชลโลจริงใน YouTube นุ่มกว่ามาก · ของเรายังแหบ · เริ่มจากนุ่มที่สุดก่อน"):
  // a true LOW-PASS on the whole cello. The treble-tame high-shelf can only ATTENUATE the harsh
  // presence band (measured: it never fully reaches >1.5 kHz); a low-pass REMOVES everything above its
  // cutoff, so the pitch-shift "แหบ" formants are gone, not just reduced. This is the "start softest"
  // control: low cutoff = darkest/smoothest (no harsh high tone at all), then open it back up by ear
  // until just before the แหบ returns. 0 = off (no low-pass) = the brightest, today's sound.
  softLowpassHz = 0,
  pianoResonance = false } = {}) {
  const { perf, cfg, bpm: useBpm } = buildPerformance(content, { bpm, range, songId })
  const spb = 60 / useBpm

  let endBeat = 0
  for (const e of perf) endBeat = Math.max(endBeat, e.startBeat + e.beats + (e.timeShift || 0) / spb)
  const frames = Math.max(1, Math.ceil((endBeat * spb + 1.2) * sampleRate)) // tail for release + reverb
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const ctx = new OfflineCtx(2, frames, sampleRate)   // stereo — SSO cello is a stereo recording

  const reverbCfg = REVERB[cfg.reverb]
  // 5.3 · ARC. `bus` rides one gain across the FINISHED mix (piano + cello + reverb tail together),
  // which is the only route that delivers the dB the knob promises: the `perf` route has to go
  // through gainToVelocityFull(), which clamps gain to [0.02, 0.5] and maps it into a narrow
  // velocity band — so a 15 dB request arrives as a fraction of that (measured; see the report).
  // The honest trade-off, stated on the page: a bus ride changes LOUDNESS only, where a real player
  // playing softer also changes TONE. `perf` is kept so both can be measured rather than argued.
  let arcNode = null
  if (arcSpreadDb > 0 && arcMode === 'bus') {
    arcNode = ctx.createGain()
    arcNode.connect(ctx.destination)
  }
  const arcOut = arcNode || ctx.destination
  const fx = chamberWet > 0 ? makeChamberBus(ctx, arcOut, chamberWet)
    : reverbCfg ? makeReverbBus(ctx, arcOut, reverbCfg) : null
  const busIn = fx ? fx.input : arcOut

  const songBeats = arcSpreadDb > 0 ? songBeatSpan(content) : 0
  if (arcSpreadDb > 0 && arcMode === 'perf') {
    for (const e of perf) {
      e.gain *= Math.pow(10, arcDbAt(e.startBeat / (songBeats || 1), arcSpreadDb) / 20)
    }
  }

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
  // CALL-AND-RESPONSE: number the melody phrases (a rest > 0.6 beat starts a new one), then mark the
  // notes of every other phrase as "piano sings this one". At trading=0 the set is empty (cello sings
  // all). Deterministic — phrases come straight from the written melody, same in the MP3 and live.
  const pianoLed = new Set()
  if (trading > 0 && useCello) {
    const melAll = perf.filter(isMelody).slice().sort((a, b) => onset(a) - onset(b))
    // first pass: assign a phrase number to every melody note. A phrase ends at a rest (> 0.5 beat) OR
    // after ~2 bars (8 beats) — worship melodies are often continuous, so a rest alone finds too few.
    const phraseOf = new Map()
    let ph = 0, lastEnd = -Infinity, phStartBeat = null
    for (const e of melAll) {
      const on = onset(e)
      if (phStartBeat === null) phStartBeat = e.startBeat
      const restBreak = lastEnd > -Infinity && on - lastEnd > 0.5 * spb
      const lenBreak = e.startBeat - phStartBeat >= 8
      if (restBreak || lenBreak) { ph++; phStartBeat = e.startBeat }
      phraseOf.set(e, ph)
      lastEnd = on + perNoteDur(e)
    }
    // choose which of the ODD phrases the piano takes — a golden-ratio sequence gives a well-spread
    // fraction ≈ trading (deterministic, no rng). trading=1 → every odd phrase; 0.5 → about half.
    const oddPhrases = [...new Set([...phraseOf.values()].filter((p) => p % 2 === 1))]
    const pick = new Set(oddPhrases.filter((p, i) => ((i * 0.6180339887) % 1) < trading))
    for (const e of melAll) if (pick.has(phraseOf.get(e))) pianoLed.add(e)
  }
  const pianoLeadsNote = (e) => pianoLed.has(e)
  let resReport = null
  if (roles !== 'none') {
    const piano = await loadInstrument('grand', ctx)     // the SAME loader the app ships
    piano.setDestination(busIn)
    const pianoEvents = roles === 'all' ? perf
      : roles === 'melody' ? perf.filter(isMelody)
      // accomp + the melody notes of phrases the piano is answering (call-and-response)
      : perf.filter((e) => !isMelody(e) || pianoLeadsNote(e))
    for (const e of pianoEvents) piano.fire(e.midi + transpose, onset(e), perNoteDur(e), e.gain)

    // string resonance: an EXTRA quiet voice under each piano note, exactly as the sfz layers its Res
    // group on top of the played note. Always-on is faithful here (the piano never stops ringing —
    // see loadResonance). The real preset is untouched; this is a second sampler beside it.
    if (pianoResonance && pianoEvents.length) {
      const res = await loadResonance(ctx, 1)
      res.output.disconnect()
      res.output.connect(busIn)                          // same room as everything else
      let fired = 0, outside = 0
      for (const e of pianoEvents) {
        const midi = e.midi + transpose
        if (midi < res.covered[0] || midi > res.covered[1]) { outside++; continue }
        // resonance rings for the note's length; its own -11 dB + slow attack come from the preset
        res.inst.start({ note: midi, time: onset(e), duration: Math.max(0.3, perNoteDur(e)),
          velocity: gainToVelocityFull(e.gain) })
        fired++
      }
      resReport = { regions: res.regions, covered: res.covered, fired, notesAboveRange: outside }
    }
  }

  let celloReport = null
  if (useCello && !celloMuted) {
    const bodyId = MARCATO.find((m) => m.id === variantId)?.head ? 'karoryfer-p' : variantId
    // P'Aim: "[with vibrato] เสียงดังขึ้นด้วย ต้องลด volume แต่ยังโหยหวนได้". MEASURED first: at depth
    // 22 the cello's RMS moves −0.09 dB and its >2 kHz band −0.05 dB, i.e. vibrato adds no energy at
    // all — so there is no implementation bug to fix, and the loudness he hears is the shaking making
    // the line stand out, not the line getting louder. That is exactly why a trim works without
    // costing the โหยหวน: the wail lives in the SHAKE, and this only touches the LEVEL. How much is
    // an ear question, so it is a knob starting at 0 dB (= today), not a number I picked.
    const vibTrim = vibratoCents > 0 ? Math.pow(10, vibGainDb / 20) : 1
    celloMakeup *= vibTrim
    const { inst, output, attackMs, levelFix } = await loadCello(bodyId, ctx, celloMakeup,
      { correctTuning, fileLevelAmount })
    // TREBLE TAMING (5.5) — ONE high-shelf on the whole cello, its gain scheduled per note by pitch
    // below. Built here so body + up-bow + head all share it and stay one timbre. Only created when
    // asked (trebleTameDb>0) so the untamed clip is byte-identical to before = a clean A/B.
    // shelf at 2.2 kHz — the presence/bite band (the recordist's own EQ sat 1800-2500 Hz).
    // KEYED TO PITCH-SHIFT, not absolute pitch (measured 18 ก.ค. · P'Aim heard "แหบ↔ทุ้ม สลับเป็นตัว ๆ").
    // Karoryfer recorded only 17 pitches (minor thirds); every other note is pitch-shifted from the
    // nearest, and the shift moves the formants: a note shifted UP is ~3 dB brighter/"แหบ", a note that
    // lands ON a recorded pitch is the warm "ทุ้ม" reference (measured: +1 = −2.5 dB, 0 = −5.4 dB,
    // −1 = −4.0 dB above 1.5 kHz). So the harshness is the SHIFT, not the register — and the fix is to
    // cut the treble of up-shifted notes down toward the exact-pitch warmth, evening the timbre out.
    const TREBLE_FREQ = 2200
    const KARO_PITCHES = [36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84]
    const nearestKaro = (m) => KARO_PITCHES.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a, KARO_PITCHES[0])
    // cello chain: outputs → (treble tame) → (compressor) → reverb bus.
    // DYNAMIC SMOOTHING (celloEven · P'Aim "เสียงโดดๆ"): a compressor on the cello sum pulls down the
    // notes that jump out in LEVEL (arranger accents on high/phrase notes read as pops on the more
    // present cello timbre). Catches the peak whatever its cause; the piano keeps its own dynamics.
    let busEntry = busIn
    if (celloEven > 0) {
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -12 - celloEven * 14   // −12 … −26 dB
      comp.ratio.value = 2 + celloEven * 4          // 2 … 6
      comp.knee.value = 6
      comp.attack.value = 0.008
      comp.release.value = 0.18
      const mk = ctx.createGain(); mk.gain.value = Math.pow(10, (celloEven * 4) / 20)  // makeup for the pull-down
      comp.connect(mk).connect(busIn)
      busEntry = comp
    }
    // DEEP SOFTEN low-pass (P'Aim 19 ก.ค.) — sits AFTER tame/compressor so it darkens everything the
    // cello sends to the room (body + head + up-bow). Q=0.5 = a gentle, non-resonant rolloff (no peak
    // at the cutoff). Only built when asked (>0) so softLowpassHz=0 is byte-identical to before.
    if (softLowpassHz > 0) {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = softLowpassHz
      lp.Q.value = 0.5
      lp.connect(busEntry)
      busEntry = lp
    }
    let celloDest = busEntry, tameNode = null
    if (trebleTameDb > 0) {
      tameNode = ctx.createBiquadFilter()
      tameNode.type = 'highshelf'
      tameNode.frequency.value = TREBLE_FREQ
      tameNode.gain.value = 0
      tameNode.connect(busEntry)
      celloDest = tameNode
    }
    output.disconnect()
    output.connect(celloDest)                          // → (treble tame) → (compressor) → reverb room
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
    // cello sings every melody note EXCEPT the phrases the piano answers (call-and-response)
    const mel = perf.filter((e) => isMelody(e) && !pianoLeadsNote(e))
    // schedule the treble taming per note: higher pitch → deeper high-shelf cut, warm low notes → 0.
    // Stepped at each note's (delayed) body onset — the line is monophonic, so a shelf step landing on
    // the attack is inaudible. Deterministic (no rng), so the MP3 matches the live render.
    if (tameNode) {
      // weight by pitch-shift: up-shifted (bright/"แหบ") gets the full cut, down-shifted gets half
      // (it is only ~1.4 dB bright), exact-pitch (the warm "ทุ้ม" target) gets none.
      const tameFor = (m) => {
        const sh = m - nearestKaro(m)
        const w = sh > 0 ? 1 : sh < 0 ? 0.6 : 0
        return w * trebleTameDb
      }
      for (const e of mel) {
        const m = e.midi + transpose
        const sh = m - nearestKaro(m)
        const onT = Math.max(0, onset(e) - shift)
        const base = tameFor(m)
        tameNode.gain.setValueAtTime(-base, onT)
        // a soft `p` bow HELD for a second-plus creeps brighter toward its end (measured: a 2 s note
        // climbs ~4 dB · P'Aim heard it as "แหบ กลับมา ช่วงสั้น ๆ" late in a long note). Ramp a SHIFTED
        // long note's cut to full over its tail so the sustain stays even. Exact-pitch notes (sh=0)
        // are the warm reference and are left alone.
        const durSec = Math.max(0.12, perNoteDur(e))
        if (durSec > 1.0 && sh !== 0) {
          // the tail is the brightest part, so over-cut it (1.5× the knob) — a high-shelf's dB does not
          // fully translate to the >1.5 kHz band, so a nominal "full" ramp only moved it ~0.7 dB.
          // G (18 ก.ค.): hold the base cut for the first 0.3 s so the note's head stays natural, THEN
          // ease the tail down — don't start darkening from the attack.
          tameNode.gain.setValueAtTime(-base, onT + 0.3)
          tameNode.gain.linearRampToValueAtTime(-1.5 * trebleTameDb, onT + durSec)
        }
      }
    }
    const outOfRange = []
    // bow round-robin: load the up-bow take too and alternate. Strictly by note INDEX (i % 2) — not
    // random — so the MP3 is identical to what was heard live. No rng.js needed at all.
    let upBow = null
    if (bowRoundRobin && bodyId === 'karoryfer-p') {
      upBow = await loadCello('karoryfer-p-g', ctx, celloMakeup, { correctTuning })
      upBow.output.disconnect()
      upBow.output.connect(celloDest)
    }

    // vibrato rides the BODY only: it is what sustains. The head is 55 ms of staccato at 5% —
    // nothing to shake, and inaudible anyway.
    // each note carries its OWN length so the auto rule can decide per note (see withVibrato).
    // `dur` must be the length the note is actually FIRED with (the same clamp used below), not the
    // raw beat length — otherwise the rule judges a note by a duration that never reached the ear.
    const bodyNotes = mel.map((e) => ({
      onset: Math.max(0, onset(e) - shift), dur: Math.max(0.12, perNoteDur(e)),
    }))
    // seeded off the SONG (rng.js), never Math.random(): the vibrato's per-note phases must come out
    // the same in the MP3 as they did in the live render, or P'Aim downloads a different performance
    // from the one he approved. `pass: 1` keeps this stream separate from the arranger's own humanize
    // stream (pass 0) so turning vibrato on cannot shift the piano's performance.
    const vibRng = rngFor(songId, 1)
    const vib = withVibrato(ctx, {
      depthCents: vibratoCents, unsteady: vibUnsteady,
      bowPressure: vibBowPressure, minNoteSec: vibMinNoteSec,
    }, bodyNotes, vibRng, () => {
      mel.forEach((e, i) => {
        const midi = e.midi + transpose
        // honest-to-the-sheet (brief §4 · memory feedback-audio-honest-to-sheet): play the written
        // pitch. Do NOT octave-shift to flatter the sample — if it falls outside the cello's real
        // range we REPORT it instead of silently moving it.
        if (midi < CELLO_LO || midi > CELLO_HI) outOfRange.push(midi)
        // velocity from the arranger's own gain via the SAME map sampler.js uses for its CC0 cello,
        // so the cello's dynamics track the arrangement exactly like the shipped path would.
        const voice = (upBow && i % 2 === 1) ? upBow.inst : inst
        voice.start({ note: midi, time: Math.max(0, onset(e) - shift),
          duration: Math.max(0.12, perNoteDur(e)), velocity: gainToVelocityFull(e.gain) })
      })
    })
    // GUARD — withVibrato pairs voice i with melody note i, which assumes smplr makes exactly one
    // BufferSource per start(), in call order. That is an assumption about someone else's library,
    // so it is CHECKED, not trusted: a mismatch would silently put each note's vibrato envelope on
    // the wrong note (audible as nothing in particular = the worst kind of bug). Same guard style
    // that caught the "11 of 17 pitches" staccato bug last round.
    if (vibratoCents > 0 && vib.voices !== mel.length) {
      throw new Error(`vibrato voice mismatch: smplr made ${vib.voices} sources for ${mel.length} `
        + 'melody notes — the per-note LFO mapping would be wrong. Refusing to render.')
    }

    // the marcato head: a short staccato ON the beat, under P'Aim's strength knob. Fired at the
    // written onset with NO negative delay — the head is what marks the beat, and it is fast anyway
    // (measured 20-55 ms vs the body's 200 ms). NOT a crossfade: head and body are separated in TIME
    // (the library's own approach), not two dynamics of one note bleeding into each other.
    let headReport = null
    if (headId && headStrength > 0) {
      const head = await loadCello(headId, ctx, celloMakeup * headStrength, { correctTuning })
      head.output.disconnect()
      head.output.connect(celloDest)
      const hold = Math.min(headHoldMs / 1000, 0.2)   // library's ampeg_hold=0.200
      for (const e of mel) {
        head.inst.start({ note: e.midi + transpose, time: onset(e),
          duration: Math.max(0.05, Math.min(hold, perNoteDur(e))),
          velocity: gainToVelocityFull(e.gain) })
      }
      headReport = { headId, attackMs: head.attackMs, strength: headStrength, holdMs: headHoldMs }
    }

    celloReport = { melodyNotes: mel.length, attackMs, shiftMs: Math.round(shiftMs), bodyId,
      head: headReport, vibratoCents, bowRoundRobin: !!upBow,
      vibUnsteady, vibBowPressure, vibMinNoteSec, vibGainDb, fileLevelAmount, trebleTameDb, levelFix,
      // how many notes the auto rule actually left shaking, per song, with nobody tuning anything —
      // the old lane's number (#1 50% · #4 80% · #7 63% · #9 100% · #11 100%) and the one that tells
      // P'Aim whether the rule is gating anything at all on THIS song
      vib: vibratoCents > 0 ? { vibrated: vib.vibratoNotes, plain: vib.plain, pct: vib.pct } : null,
      outOfRange: [...new Set(outOfRange)].sort((a, b) => a - b) }
  }

  // Ride the arc across the finished mix. setValueCurveAtTime with a dense curve = one deterministic
  // automation, identical in the MP3 and live (no scheduler, no randomness). x is the SONG fraction,
  // so an excerpt correctly gets only the slice of the arc it actually occupies rather than a shape
  // squeezed to fit it.
  if (arcNode) {
    const steps = 512
    const curve = new Float32Array(steps)
    const clipBeats = endBeat || 1
    for (let i = 0; i < steps; i++) {
      const beat = (i / (steps - 1)) * clipBeats
      curve[i] = Math.pow(10, arcDbAt(beat / (songBeats || clipBeats), arcSpreadDb) / 20)
    }
    arcNode.gain.setValueCurveAtTime(curve, 0, Math.max(0.01, frames / sampleRate))
  }

  const buffer = await ctx.startRendering()
  return { buffer, perf, bpm: useBpm, celloReport, resReport,
    arc: arcSpreadDb > 0 ? { spreadDb: arcSpreadDb, mode: arcMode, songBeats, clipBeats: endBeat } : null }
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
