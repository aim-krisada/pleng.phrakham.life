// Melody playback with the Web Audio API — no external library.
// Converts notation tokens (movable do) + key + BPM into scheduled oscillator notes.

import { parseNotes, groupNotes } from './notation.js'

const KEY_MIDI = { C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71 }
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11] // semitone offsets for degrees 1-7

let ctx = null
let stopFlag = { stopped: false }

function tokenBeats(t, tripletFactor) {
  let d = 1 / 2 ** t.underlines
  if (t.dotted) d *= 1.5
  return d * tripletFactor
}

// Flatten a song's content into [{ midi:number|null, beats:number }] (midi null = rest)
export function songToNotes(content) {
  const root = KEY_MIDI[content.key] ?? 60
  const notes = []
  for (const line of content.lines || []) {
    for (const item of line) {
      if (item.type !== 'segment' || !item.note) continue
      for (const g of groupNotes(parseNotes(item.note))) {
        const f = g.group === 'triplet' ? 2 / 3 : 1
        for (const t of g.tokens) {
          if (t.type === 'note') {
            if (t.pitch === '0') {
              notes.push({ midi: null, beats: tokenBeats(t, f) })
            } else {
              let midi = root + MAJOR_SCALE[Number(t.pitch) - 1] + (t.high - t.low) * 12
              if (t.accidental === '#') midi += 1
              if (t.accidental === 'b') midi -= 1
              notes.push({ midi, beats: tokenBeats(t, f) })
            }
          } else if (t.type === 'ext' && notes.length) {
            notes[notes.length - 1].beats += 1 * f
          }
        }
      }
    }
  }
  return notes
}

export function stopPlayback() {
  stopFlag.stopped = true
}

// Play the melody; resolves when done or stopped. onProgress(i, total) is optional.
export async function playSong(content, { bpm = 80, loop = false, onProgress } = {}) {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
  await ctx.resume()
  stopFlag = { stopped: false }
  const myFlag = stopFlag
  const notes = songToNotes(content)
  if (!notes.length) return
  const spb = 60 / bpm // seconds per beat

  do {
    let t = ctx.currentTime + 0.08
    const endTimes = []
    for (const n of notes) {
      const dur = n.beats * spb
      if (n.midi != null) {
        // stop slightly early so repeated same-pitch notes articulate clearly
        const soundDur = Math.max(0.08, dur - 0.07)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.value = 440 * 2 ** ((n.midi - 69) / 12)
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.35, t + 0.015)
        gain.gain.setValueAtTime(0.35, t + Math.max(0.015, soundDur - 0.05))
        gain.gain.linearRampToValueAtTime(0, t + soundDur)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + soundDur + 0.01)
        endTimes.push(osc)
      }
      t += dur
    }
    // wait until the scheduled end (checking the stop flag)
    const totalMs = (t - ctx.currentTime) * 1000
    const start = Date.now()
    while (Date.now() - start < totalMs) {
      if (myFlag.stopped) {
        endTimes.forEach((o) => { try { o.stop() } catch {} })
        return
      }
      onProgress?.(Date.now() - start, totalMs)
      await new Promise((r) => setTimeout(r, 100))
    }
  } while (loop && !myFlag.stopped)
}
