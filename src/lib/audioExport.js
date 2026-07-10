// B072 — download the melody as an MP3, entirely in the browser (no server, works
// offline). Pipeline: songToNotes → render offline with the SAME synth as the "ฟัง"
// button (midi.js scheduleNote) → PCM → MP3 (lamejs) → Blob.
// Split so the pieces are testable headless: notesDurationSec / floatToInt16 /
// encodePcmToMp3 are pure; only renderSongToBuffer needs a browser (OfflineAudioContext).
import lamejs from '@breezystack/lamejs'
import { buildPlayNotes, scheduleNote } from './midi.js'
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

// Render the melody offline into a mono AudioBuffer. Browser only (OfflineAudioContext).
// Defaults mirror a plain "ฟัง": the song's own bpm (or 92) and its native key
// (transpose 0). Same per-note timing + synth as playSong, so it sounds identical.
export async function renderSongToBuffer(content, { bpm, transpose = 0, sampleRate = 44100 } = {}) {
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
  let t = 0
  for (const n of notes) {
    const dur = n.beats * spb
    if (n.midi != null) {
      const soundDur = Math.max(0.08, dur - 0.07) // match playSong's early stop
      scheduleNote(ctx, ctx.destination, n.midi, t, soundDur, transpose * 100)
    }
    t += dur
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

// Int16 mono PCM → MP3 Blob (audio/mpeg) via lamejs. Pure (no DOM/AudioContext) so it
// is unit-testable headless. lamejs wants 1152-sample blocks (one MP3 frame).
export function encodePcmToMp3(int16, { sampleRate = 44100, kbps = 128 } = {}) {
  const enc = new lamejs.Mp3Encoder(1, sampleRate, kbps)
  const chunks = []
  const block = 1152
  for (let i = 0; i < int16.length; i += block) {
    const buf = enc.encodeBuffer(int16.subarray(i, i + block))
    if (buf.length > 0) chunks.push(new Uint8Array(buf))
  }
  const end = enc.flush()
  if (end.length > 0) chunks.push(new Uint8Array(end))
  return new Blob(chunks, { type: 'audio/mpeg' })
}

// Whole pipeline: song content → mono MP3. Browser only. Returns { blob, seconds }.
export async function songToMp3Blob(content, { bpm, transpose = 0, sampleRate = 44100, kbps = 128 } = {}) {
  const buffer = await renderSongToBuffer(content, { bpm, transpose, sampleRate })
  const int16 = floatToInt16(buffer.getChannelData(0))
  const blob = encodePcmToMp3(int16, { sampleRate, kbps })
  return { blob, seconds: buffer.duration }
}

// The download filename: same basename as the JSON/PDF ("เพลง.พระคำ.ชีวิต - ชื่อเพลง")
// with a .mp3 extension, so all three downloads for a song share one name.
export function mp3Filename(song) {
  return songBasename(song) + '.mp3'
}
