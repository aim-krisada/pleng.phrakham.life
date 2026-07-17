// VERIFY harness for step 5.2 (vibrato) + 5.3 (dynamic range knob). Measurement only — it renders
// clips and reports numbers. It NEVER claims "เพราะขึ้น": the only things a measurement can settle
// here are "มีเสียง / ไม่คลิป / ตรงจูน / ดังเท่ากัน" (memory pleng-aesthetic-audio-needs-ear).
//
// Every check below is written as THEORY-FIRST: a predicted number, then the measurement, then a
// verdict. "เสียงเปลี่ยน" is not evidence that it changed CORRECTLY.
import { renderClip, measure } from './celloBakeoff.js'
import { supabase } from '../supabase.js'
import { excerptRange } from './celloBakeoff.js'

const dbOf = (x) => 20 * Math.log10(x || 1e-9)
export const dbDiff = (a, b) => dbOf(a) - dbOf(b)

// RMS of a buffer AFTER a filter — "how much energy lives in this band". Used for the >2 kHz band
// because that is the band the previous round measured "แสบ" in (p sits 5.7 dB under mf there), so
// keeping the same band keeps this round's numbers comparable to that one's.
export async function bandRms(buffer, { type = 'highpass', freq = 2000 } = {}) {
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const ctx = new OfflineCtx(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = 0.707
  src.connect(f); f.connect(ctx.destination)
  src.start(0)
  return measure(await ctx.startRendering()).rms
}

// Short-term loudness envelope: RMS over `winSec` hops — the shape of the clip's loud/soft line.
// This is how 5.3's "ความกว้างดัง-ค่อย" is measured against the reference track's 13.4/15.1 dB.
export function envelopeDb(buffer, winSec = 0.4) {
  const sr = buffer.sampleRate
  const win = Math.max(1, Math.round(winSec * sr))
  const ch = []
  for (let c = 0; c < buffer.numberOfChannels; c++) ch.push(buffer.getChannelData(c))
  const out = []
  for (let i = 0; i + win <= buffer.length; i += win) {
    let sum = 0, n = 0
    for (const d of ch) for (let j = i; j < i + win; j++) { sum += d[j] * d[j]; n++ }
    out.push({ t: i / sr, db: dbOf(Math.sqrt(sum / (n || 1))) })
  }
  return out
}

// The loud-soft SPREAD of a clip, quoted the same way the reference-track analysis quoted it: the
// span between the quiet and loud ends of the short-term loudness line. Percentiles (not min/max) so
// one stray frame of near-silence can't invent a 40 dB "range".
export function spreadDb(buffer, { winSec = 0.4, lo = 10, hi = 90 } = {}) {
  const env = envelopeDb(buffer, winSec).map((e) => e.db).filter((d) => d > -80).sort((a, b) => a - b)
  if (env.length < 3) return { spread: 0, loDb: 0, hiDb: 0, frames: env.length }
  const at = (p) => env[Math.min(env.length - 1, Math.max(0, Math.round((p / 100) * (env.length - 1))))]
  const loDb = at(lo), hiDb = at(hi)
  return { spread: hiDb - loDb, loDb, hiDb, frames: env.length }
}

// Sample-by-sample difference between two buffers — proves "this knob at its default is BIT-IDENTICAL
// to the sound P'Aim already approved", which is the whole point of "ปุ่มใหม่เริ่มที่ค่าปัจจุบัน".
// A knob that silently shifts the default is the failure this catches.
export function maxAbsDiff(a, b) {
  const n = Math.min(a.length, b.length)
  let max = 0
  for (let c = 0; c < Math.min(a.numberOfChannels, b.numberOfChannels); c++) {
    const x = a.getChannelData(c), y = b.getChannelData(c)
    for (let i = 0; i < n; i++) { const d = Math.abs(x[i] - y[i]); if (d > max) max = d }
  }
  return { maxDiff: max, lenA: a.length, lenB: b.length, sameLength: a.length === b.length }
}

export async function loadSong(no = 1) {
  const { data, error } = await supabase.from('songs').select('*').eq('number', no).limit(1).single()
  if (error) throw new Error('โหลดเพลงไม่ได้: ' + error.message)
  return data
}

export function songCtx(song) {
  const bpm = song.content?.bpm
  return { bpm, range: excerptRange(song.content, { bpm, targetSec: 20 }), songId: song.id }
}
