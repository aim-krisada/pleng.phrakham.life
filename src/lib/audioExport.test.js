// @vitest-environment node
// B072 — MP3 export: cover the pure, headless-testable pieces. The offline render
// (OfflineAudioContext) needs a real browser and is verified live, not here. Runs in
// the node env so Blob.arrayBuffer() is available (jsdom's Blob lacks it).
import { describe, it, expect } from 'vitest'
import {
  notesDurationSec,
  floatToInt16,
  encodePcmToMp3,
  playableContent,
  mp3Filename,
} from './audioExport.js'
import { buildPlayNotes } from './midi.js'

describe('notesDurationSec', () => {
  it('length ≈ Σ beats × (60/bpm)', () => {
    const notes = [{ beats: 1 }, { beats: 2 }, { beats: 0.5 }] // 3.5 beats
    expect(notesDurationSec(notes, 120)).toBeCloseTo(3.5 * 0.5, 6) // 1.75s at 120bpm
    expect(notesDurationSec(notes, 60)).toBeCloseTo(3.5, 6)
  })
  it('empty song → 0s', () => {
    expect(notesDurationSec([], 92)).toBe(0)
  })
})

describe('floatToInt16', () => {
  it('maps the [-1,1] range to full Int16 and clamps beyond it', () => {
    const out = floatToInt16(new Float32Array([0, 1, -1, 2, -2]))
    expect(out).toBeInstanceOf(Int16Array)
    expect(out[0]).toBe(0)
    expect(out[1]).toBe(32767) // +1 → 0x7fff
    expect(out[2]).toBe(-32768) // -1 → -0x8000
    expect(out[3]).toBe(32767) // clamp above +1
    expect(out[4]).toBe(-32768) // clamp below -1
  })
})

describe('encodePcmToMp3', () => {
  it('produces an audio/mpeg Blob that starts with an MP3 frame sync', async () => {
    // 1s of a 440Hz-ish tone → non-trivial PCM
    const sr = 44100
    const pcm = new Int16Array(sr)
    for (let i = 0; i < sr; i++) pcm[i] = Math.round(Math.sin((i / sr) * 440 * 2 * Math.PI) * 12000)
    const blob = encodePcmToMp3(pcm, { sampleRate: sr, kbps: 128 })
    expect(blob.type).toBe('audio/mpeg')
    expect(blob.size).toBeGreaterThan(1000) // ~16KB for 1s @128kbps
    const bytes = new Uint8Array(await blob.arrayBuffer())
    // MP3 frame sync: 11 set bits → 0xFF then top 3 bits of next byte set (0xE0 mask)
    expect(bytes[0]).toBe(0xff)
    expect(bytes[1] & 0xe0).toBe(0xe0)
  })
})

describe('playableContent', () => {
  it('flattens to v1 lines while keeping key/bpm, and buildPlayNotes yields pitched notes', () => {
    const content = {
      key: 'C',
      bpm: 100,
      lines: [[{ type: 'segment', note: '1 2 3', lyric: 'a b c' }]],
    }
    const p = playableContent(content)
    expect(p.key).toBe('C')
    expect(p.bpm).toBe(100)
    expect(Array.isArray(p.lines)).toBe(true)
    const notes = buildPlayNotes(p)
    const pitched = notes.filter((n) => n.midi != null)
    expect(pitched.length).toBeGreaterThan(0)
    expect(pitched[0].midi).toBe(60) // degree 1 in C = middle C
  })
})

describe('mp3Filename', () => {
  it('is the shared basename + .mp3', () => {
    expect(mp3Filename({ title_th: 'ทดสอบ' })).toBe('เพลง.พระคำ.ชีวิต - ทดสอบ.mp3')
  })
})
