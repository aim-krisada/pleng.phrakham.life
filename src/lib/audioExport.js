// B072 — download the melody as an MP3, entirely in the browser (no server, works
// offline). Pipeline: songToNotes → render offline with the SAME synth as the "ฟัง"
// button (midi.js scheduleNote) → PCM → MP3 (lamejs) → Blob.
// Split so the pieces are testable headless: notesDurationSec / floatToInt16 /
// encodePcmToMp3 are pure; only renderSongToBuffer needs a browser (OfflineAudioContext).
import lamejs from '@breezystack/lamejs'
import { buildPlayNotes, scheduleNote, buildChordVoice, voiceFlags, makeChordBus,
  makeReverbBus, REVERB, resolveSections, KEY_MIDI } from './midi.js'
import { arrange } from './arranger/index.js'
import { moduleForInstrument } from './arranger/instruments/index.js'
import { loadInstrument, isSampledInstrument } from './sampler.js'
import { resolveContent } from './songModel.js'
import { songBasename } from './songName.js'

// The playable v1 shape playSong/SongViewer use: v2 stanzas flattened to lines, other
// content fields (key, bpm) kept. So the MP3 plays exactly what "ฟัง" plays.
export function playableContent(content) {
  return { ...content, lines: resolveContent(content) }
}

// Seconds a note list spans at a given bpm (Σ beats × secondsPerBeat). Also the basis
// for the "length ≈ beats × 60/bpm" DoD check.
export function notesDurationSec(notes, bpm) {
  const spb = 60 / bpm
  let t = 0
  for (const n of notes) t += n.beats * spb
  return t
}

// Pre-flight estimate, computed WITHOUT rendering (just note math) so the UI can tell
// the user up-front "≈ 2m46s · ~2.6 MB" before the slow work starts — de-facto for any
// long export: set an expectation so a wait doesn't read as a hang. seconds is exact
// (same math the render uses); bytes ≈ constant-bitrate size (kbps × seconds ÷ 8).
export function estimateMp3(content, { bpm, kbps = 128 } = {}) {
  const playable = playableContent(content)
  const useBpm = Number(bpm) || playable.bpm || 92
  const seconds = notesDurationSec(buildPlayNotes(playable), useBpm) + 0.25
  const bytes = Math.round(((kbps * 1000) / 8) * seconds)
  return { seconds, bytes }
}

// Render the melody offline into a mono AudioBuffer. Browser only (OfflineAudioContext).
// Defaults mirror a plain "ฟัง": the song's own bpm (or 92) and its native key (transpose 0).
//
// Two modes — same synth (scheduleNote) as playSong's fallback voice, so timing/dynamics match:
//   arranger:true  — route the sheet through arrange() (the SAME pure function live playback uses),
//                    so the download carries the FULL arrangement (referee no-clash + balance, legato
//                    bass, embellishments, humanize, rubato, section dynamics) — MP3 == "ฟัง" in every
//                    musical detail (§1b). Pass the live arrangeCfg + instrument + songId to match
//                    exactly. Timbre is the offline synth (the real Grand in OfflineAudioContext is a
//                    separate P3 spike); everything ELSE — the notes, timing, loudness — is identical.
//   arranger:false — the legacy plain path (melody + block chords), unchanged, for callers that don't
//                    opt in (print/editor default).
export async function renderSongToBuffer(content, { bpm, transpose = 0, sampleRate = 44100, voices = 'melody', chordGain = 0.055, arranger = false, arrangeCfg = {}, instrument = 'synth', songId } = {}) {
  const playable = playableContent(content)
  const useBpm = Number(bpm) || playable.bpm || 92
  const notes = buildPlayNotes(playable)
  const spb = 60 / useBpm
  const { melody: wantMelody, chords: wantChords } = voiceFlags(voices)
  const OfflineCtx = typeof window !== 'undefined'
    ? window.OfflineAudioContext || window.webkitOfflineAudioContext
    : null
  if (!OfflineCtx) throw new Error('เบราว์เซอร์นี้ไม่รองรับการสร้างไฟล์เสียง (OfflineAudioContext)')

  if (arranger) {
    // ---- new engine: same arrange() as live, rendered with the synth voice ----
    const chordEvents = wantChords ? buildChordVoice(notes) : []
    const sections = resolveSections(playable, notes)
    const module = arrangeCfg.module || moduleForInstrument(instrument)
    const perf = arrange(notes, chordEvents, { arranger: true, voices, chordGain, ...arrangeCfg, module },
      { songId, pass: 0, timeSignature: playable.timeSignature, keyRoot: KEY_MIDI[playable.key] ?? 60, sections })
    // buffer length from the ACTUAL performance end (rubato lengthens the last note, legato extends
    // the bass, an embellishment can sit in the final gap) — never clip the tail.
    let endBeat = notes.reduce((s, n) => s + n.beats, 0)
    for (const e of perf) endBeat = Math.max(endBeat, e.startBeat + e.beats + (e.timeShift || 0) / spb)
    const frames = Math.max(1, Math.ceil((endBeat * spb + 0.6) * sampleRate)) // +tail for release + reverb
    const ctx = new OfflineCtx(1, frames, sampleRate)
    // mirror playSong's reverb room (the sampler routes straight through it, like live)
    const reverbCfg = REVERB[arrangeCfg.reverb]
    const fx = reverbCfg ? makeReverbBus(ctx, ctx.destination, reverbCfg) : null
    const busIn = fx ? fx.input : ctx.destination
    const perNoteDur = (e) => {
      const rawDur = e.beats * spb
      return e.role === 'melody' ? Math.max(0.08, rawDur - 0.07) : Math.max(0.1, rawDur - 0.05)
    }
    const onset = (e) => Math.max(0, e.startBeat * spb + (e.timeShift || 0))

    // REAL TIMBRE (P3 · golden-piano) — render with the actual instrument sample (Grand 5-layer),
    // the SAME voice as live "ฟัง", so the download matches in timbre too. sampler.js injects a huge-
    // lookahead scheduler for the offline context so smplr schedules the WHOLE song before render
    // (offline has no scheduler tick → otherwise every note past ~200ms is silent). If the load fails,
    // fall through to the synth voice below so the export never hard-fails.
    let sampler = null
    if (isSampledInstrument(instrument)) {
      try { sampler = await loadInstrument(instrument, ctx) } catch { sampler = null }
    }
    if (sampler) {
      sampler.setDestination(busIn) // whole instrument → reverb room (no chord bus; velocity sets balance)
      for (const e of perf) sampler.fire(e.midi + transpose, onset(e), perNoteDur(e), e.gain)
      return await ctx.startRendering()
    }

    // SYNTH fallback — mirror playSong's synth graph: reverb room + one chord bus (pad under the tune)
    const hasChordVoice = perf.some((e) => e.role !== 'melody')
    const chordBus = (wantChords && hasChordVoice) ? makeChordBus(ctx, busIn) : null
    for (const e of perf) {
      const isMel = e.role === 'melody'
      const dest = isMel ? busIn : (chordBus || busIn)
      scheduleNote(ctx, dest, e.midi, onset(e), perNoteDur(e), transpose * 100, e.gain, e.attack, e.decayTo)
    }
    return await ctx.startRendering()
  }

  // ---- legacy plain path (unchanged) ----
  const seconds = notesDurationSec(notes, useBpm) + 0.25
  const frames = Math.max(1, Math.ceil(seconds * sampleRate))
  const ctx = new OfflineCtx(1, frames, sampleRate)
  let t = 0
  for (const n of notes) {
    const dur = n.beats * spb
    if (wantMelody && n.midi != null) {
      const soundDur = Math.max(0.08, dur - 0.07) // match playSong's early stop
      scheduleNote(ctx, ctx.destination, n.midi, t, soundDur, transpose * 100)
    }
    t += dur
  }
  if (wantChords) {
    const chordBus = makeChordBus(ctx, ctx.destination)
    for (const ev of buildChordVoice(notes)) {
      const startT = ev.startBeat * spb
      const soundDur = Math.max(0.1, ev.beats * spb - 0.05)
      const voiceGains = [{ midi: ev.bass, gain: chordGain * 1.45 }, ...ev.up.map((m) => ({ midi: m, gain: chordGain }))]
      for (const v of voiceGains) {
        scheduleNote(ctx, chordBus, v.midi, startT, soundDur, transpose * 100, v.gain, 0.05, 0.72)
      }
    }
  }
  return await ctx.startRendering()
}

// Float32 [-1,1] PCM → Int16 PCM (what the MP3 encoder consumes).
export function floatToInt16(float32) {
  const out = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

// Int16 mono PCM → MP3 Blob (audio/mpeg) via lamejs. lamejs wants 1152-sample blocks
// (one MP3 frame). Async so it can report progress AND yield the main thread mid-encode
// (setTimeout(0)) — without the yield the tight loop would freeze the page and the
// progress bar would never repaint (the classic "looks hung" long-task trap). onProgress
// gets a 0→1 fraction of frames encoded; yieldEvery tunes how often we pause to repaint.
export async function encodePcmToMp3(int16, { sampleRate = 44100, kbps = 128, onProgress, yieldEvery = 200 } = {}) {
  const enc = new lamejs.Mp3Encoder(1, sampleRate, kbps)
  const chunks = []
  const block = 1152
  const total = Math.max(1, Math.ceil(int16.length / block))
  let frame = 0
  for (let i = 0; i < int16.length; i += block) {
    const buf = enc.encodeBuffer(int16.subarray(i, i + block))
    if (buf.length > 0) chunks.push(new Uint8Array(buf))
    frame++
    if (onProgress && frame % yieldEvery === 0) {
      onProgress(frame / total)
      await new Promise((r) => setTimeout(r)) // let the browser paint the progress bar
    }
  }
  const end = enc.flush()
  if (end.length > 0) chunks.push(new Uint8Array(end))
  onProgress?.(1)
  return new Blob(chunks, { type: 'audio/mpeg' })
}

// Whole pipeline: song content → mono MP3. Browser only. Returns { blob, seconds }.
// onProgress(stageInfo) fires through the two slow stages so the caller can show a
// staged, near-real-time indicator:
//   { stage:'render', fraction:0 } — offline audio render (atomic; no sub-progress)
//   { stage:'encode', fraction:0..1 } — MP3 encode (real sub-progress from lamejs)
//   { stage:'done',   fraction:1 }
export async function songToMp3Blob(content, { bpm, transpose = 0, sampleRate = 44100, kbps = 128, voices = 'melody', arranger = false, arrangeCfg = {}, instrument = 'synth', songId, onProgress } = {}) {
  onProgress?.({ stage: 'render', fraction: 0 })
  const buffer = await renderSongToBuffer(content, { bpm, transpose, sampleRate, voices, arranger, arrangeCfg, instrument, songId })
  onProgress?.({ stage: 'encode', fraction: 0 })
  const int16 = floatToInt16(buffer.getChannelData(0))
  const blob = await encodePcmToMp3(int16, {
    sampleRate,
    kbps,
    onProgress: (f) => onProgress?.({ stage: 'encode', fraction: f }),
  })
  onProgress?.({ stage: 'done', fraction: 1 })
  return { blob, seconds: buffer.duration }
}

// The download filename: same basename as the JSON/PDF ("เพลง.พระคำ.ชีวิต - ชื่อเพลง")
// with a .mp3 extension, so all three downloads for a song share one name.
export function mp3Filename(song) {
  return songBasename(song) + '.mp3'
}
