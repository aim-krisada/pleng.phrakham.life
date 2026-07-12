// B072 — download the melody as an MP3, entirely in the browser (no server, works
// offline). Pipeline: songToNotes → render offline with the SAME synth as the "ฟัง"
// button (midi.js scheduleNote) → PCM → MP3 (lamejs) → Blob.
// Split so the pieces are testable headless: notesDurationSec / floatToInt16 /
// encodePcmToMp3 are pure; only renderSongToBuffer needs a browser (OfflineAudioContext).
import lamejs from '@breezystack/lamejs'
import { buildPlayNotes, scheduleNote, buildChordVoice, voiceFlags, makeChordBus } from './midi.js'
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
// Defaults mirror a plain "ฟัง": the song's own bpm (or 92) and its native key
// (transpose 0). Same per-note timing + synth as playSong, so it sounds identical.
export async function renderSongToBuffer(content, { bpm, transpose = 0, sampleRate = 44100, voices = 'melody', chordGain = 0.055 } = {}) {
  const playable = playableContent(content)
  const useBpm = Number(bpm) || playable.bpm || 92
  const notes = buildPlayNotes(playable)
  const spb = 60 / useBpm
  // tail so the last note's release (soundDur + 0.01) isn't clipped at buffer end
  const seconds = notesDurationSec(notes, useBpm) + 0.25
  const frames = Math.max(1, Math.ceil(seconds * sampleRate))
  const OfflineCtx = typeof window !== 'undefined'
    ? window.OfflineAudioContext || window.webkitOfflineAudioContext
    : null
  if (!OfflineCtx) throw new Error('เบราว์เซอร์นี้ไม่รองรับการสร้างไฟล์เสียง (OfflineAudioContext)')
  const ctx = new OfflineCtx(1, frames, sampleRate)
  // B104: honour the same 3 sound modes as "ฟัง" (melody / chords / both) so a downloaded
  // MP3 matches whatever the play button plays — same scheduleNote + buildChordVoice.
  const { melody: wantMelody, chords: wantChords } = voiceFlags(voices)
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
    // Same voice-leading + chord bus + gain balance as playSong (B107), so the MP3 sounds
    // exactly like "ฟัง": pad sits under the melody, bass a touch louder, envelope decays.
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
export async function songToMp3Blob(content, { bpm, transpose = 0, sampleRate = 44100, kbps = 128, voices = 'melody', onProgress } = {}) {
  onProgress?.({ stage: 'render', fraction: 0 })
  const buffer = await renderSongToBuffer(content, { bpm, transpose, sampleRate, voices })
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
