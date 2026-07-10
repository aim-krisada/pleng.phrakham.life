// Melody playback with the Web Audio API — no external library.
// Converts notation tokens (movable do) + key + BPM into scheduled oscillator notes.

import { parseNotes, groupNotes, DOT_FACTOR } from './notation.js'

const KEY_MIDI = { C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71 }
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11] // semitone offsets for degrees 1-7

// Semitone offset to transpose a melody from one key to another. Matches how
// songToNotes roots pitches at KEY_MIDI, so it picks the nearest register
// (E -> C goes down 4, not up 8). Used for live key changes during playback.
export function keyTranspose(fromKey, toKey) {
  return (KEY_MIDI[toKey] ?? 60) - (KEY_MIDI[fromKey] ?? 60)
}

// Standard Italian tempo markings with representative BPM values (ps3-viewer US V1).
export const TEMPO_MARKS = [
  { value: 40, label: 'Grave ♩=40 (ช้าหนักแน่น)' },
  { value: 50, label: 'Largo ♩=50 (ช้ามาก)' },
  { value: 60, label: 'Larghetto ♩=60 (ค่อนข้างช้า)' },
  { value: 70, label: 'Adagio ♩=70 (ช้า สง่างาม)' },
  { value: 92, label: 'Andante ♩=92 (เดินสบาย)' },
  { value: 110, label: 'Moderato ♩=110 (ปานกลาง)' },
  { value: 130, label: 'Allegro ♩=130 (เร็ว สดใส)' },
  { value: 150, label: 'Vivace ♩=150 (เร็ว มีชีวิตชีวา)' },
  { value: 180, label: 'Presto ♩=180 (เร็วมาก)' },
]

let ctx = null
let stopFlag = { stopped: false }
// Oscillators scheduled for the current playback, each with its start time, plus
// the transpose (semitones) currently applied. Lets setTranspose() re-tune every
// note that hasn't sounded yet when the user changes key mid-playback.
let liveOscs = []
let liveTranspose = 0

function tokenBeats(t, tripletFactor) {
  let d = 1 / 2 ** t.underlines
  d *= DOT_FACTOR[t.dots] ?? 1 // . ×1.5 · .. ×1.75
  if (t.fermata) d *= 1.75 // fermata: hold longer (playback only; bar counting ignores it)
  return d * tripletFactor
}

// Walk bars honouring repeat marks: play to a repeat-end ':‖', jump back to the last
// repeat-start '‖:' (or the song start), and play again — twice by default. With voltas,
// the 1st ending (volta 1) is played only on the 1st pass; on the 2nd pass its bars are
// skipped and the 2nd ending (volta 2) is played instead. Returns the bars in play order.
function expandRepeats(bars) {
  const out = []
  let i = 0
  let repStart = -1
  let pass = 1
  let guard = 0
  while (i < bars.length && guard++ < 100000) {
    const bar = bars[i]
    if (bar.repeatStart && i !== repStart) {
      repStart = i // entering a new repeated section from the front
      pass = 1
    }
    if (bar.volta && bar.volta !== pass) {
      i++ // this ending belongs to a different pass — skip it
      continue
    }
    out.push(bar)
    if (bar.repeatEnd && pass < 2) {
      pass++
      i = repStart >= 0 ? repStart : 0
      continue
    }
    i++
  }
  return out
}

// Flatten a song's content into [{ midi, beats, li, bi, si, syk }] (midi null = rest).
// li/bi = line and bar indices; si = segment index within the line (counts every
// segment item, matching SongSheet). syk = the syllable-slot index WITHIN the segment
// of the attack that sounds this note (undefined for rests / held-continuation notes)
// — this is what drives per-syllable follow-along highlight (B006). A slot counts every
// note box except brackets, so it lines up 1:1 with SongSheet's per-syllable spans and
// each NoteRow digit (a held '-' or a melisma keeps its slot but takes no new word).
// Repeat/volta marks are expanded so playback actually loops.
export function songToNotes(content) {
  const root = KEY_MIDI[content.key] ?? 60
  // 1. group each line's notes into bars, tagging repeat/volta flags per bar
  const bars = []
  ;(content.lines || []).forEach((line, li) => {
    let bi = 0
    let si = -1
    let bar = { notes: [], repeatStart: false, repeatEnd: false, volta: 0 }
    const flushBar = () => bars.push(bar)
    for (const item of line) {
      if (item.type === 'repeat-start') { bar.repeatStart = true; continue }
      if (item.type === 'repeat-end') { bar.repeatEnd = true; continue }
      if (item.type === 'volta') { bar.volta = item.num || 0; continue }
      if (item.type === 'bar') {
        flushBar()
        bi++
        bar = { notes: [], repeatStart: false, repeatEnd: false, volta: 0 }
        continue
      }
      if (item.type !== 'segment') continue
      si++
      if (!item.note) continue
      const bn = bar.notes
      // syllable-slot index within this segment: every note box (a note, a rest, or a
      // '-' extension) advances it; brackets don't. This matches syllableSlots() so the
      // slot a played attack carries points at the same per-syllable span in SongSheet.
      let slot = -1
      for (const g of groupNotes(parseNotes(item.note))) {
        const f = g.group === 'triplet' ? 2 / 3 : 1
        let prevMidi = null // last pitched note in THIS group (for slur-over-same-pitch)
        for (const t of g.tokens) {
          if (t.type === 'note') {
            slot++
            if (t.pitch === '0') {
              bn.push({ midi: null, beats: tokenBeats(t, f), li, bi, si }) // rest: no syllable
              prevMidi = null
            } else {
              let midi = root + MAJOR_SCALE[Number(t.pitch) - 1] + (t.high - t.low) * 12
              if (t.accidental === '#') midi += 1
              if (t.accidental === 'b') midi -= 1
              // natural (n) = no shift — the digit's diatonic pitch
              const last = bn[bn.length - 1]
              // A slur arc over two notes of the SAME pitch is a tie: hold the note,
              // do NOT re-attack the later one, but keep counting its beats. A slur
              // over DIFFERENT pitches (เอื้อน) still plays every note. (bug 015)
              // Explicit ~ ties are merged after flatten (mergeTies) so they work
              // ACROSS bar lines too, not just within one bar.
              const slurTie = g.group === 'slur' && prevMidi === midi && last && last.midi === midi
              if (slurTie) {
                last.beats += tokenBeats(t, f) // melisma: this slot holds no new word
              } else {
                // an attack: carry its slot so the highlight lands on this syllable
                bn.push({ midi, beats: tokenBeats(t, f), tieOpen: !!t.tieStart, tieEnd: !!t.tieEnd, li, bi, si, syk: slot })
              }
              prevMidi = midi
            }
          } else if (t.type === 'ext') {
            slot++ // a '-' box holds the previous syllable — its own (blank) slot
            if (bn.length) bn[bn.length - 1].beats += 1 * f
          }
        }
      }
    }
    flushBar()
  })
  // 2. expand repeats into play order, 3. flatten to a note list, 4. merge ties
  const notes = []
  for (const bar of expandRepeats(bars)) for (const n of bar.notes) notes.push(n)
  return mergeTies(notes)
}

// Merge explicit ties (~) in final play order: a note flagged tieEnd whose pitch
// matches the immediately-preceding note left open (tieOpen) is a HELD continuation —
// fold its beats into that note and drop it, so the pitch rings on instead of being
// re-attacked. Works across bar lines and repeats (fixes tie replaying its own note).
function mergeTies(notes) {
  const out = []
  for (const n of notes) {
    const prev = out[out.length - 1]
    if (n.tieEnd && prev && prev.midi != null && prev.midi === n.midi && prev.tieOpen) {
      prev.beats += n.beats
      prev.tieOpen = n.tieOpen // let a chain of ties keep extending
    } else {
      out.push(n)
    }
  }
  return out
}

export function stopPlayback() {
  stopFlag.stopped = true
  liveOscs = []
}

// Schedule ONE melody note (triangle oscillator + attack/hold/release gain envelope)
// on any Web Audio context — realtime (playSong) OR OfflineAudioContext (MP3 export).
// Extracted so the downloaded file uses the exact same synth as the "ฟัง" button and
// therefore sounds identical; changing this changes both at once (that's the point).
//   context     : AudioContext | OfflineAudioContext
//   destination : node to connect into (usually context.destination)
//   midi        : MIDI note number (base pitch, before transpose)
//   startT      : context-time (seconds) when the note begins
//   soundDur    : audible length in seconds (already trimmed by the caller)
//   detuneCents : live transpose, 100 cents = 1 semitone (rides on detune so a
//                 realtime key change re-tunes without rescheduling)
// Returns the oscillator so the realtime caller can track it (stop / re-tune).
export function scheduleNote(context, destination, midi, startT, soundDur, detuneCents = 0) {
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = 'triangle'
  osc.frequency.value = 440 * 2 ** ((midi - 69) / 12)
  osc.detune.value = detuneCents
  gain.gain.setValueAtTime(0, startT)
  gain.gain.linearRampToValueAtTime(0.35, startT + 0.015)
  gain.gain.setValueAtTime(0.35, startT + Math.max(0.015, soundDur - 0.05))
  gain.gain.linearRampToValueAtTime(0, startT + soundDur)
  osc.connect(gain).connect(destination)
  osc.start(startT)
  osc.stop(startT + soundDur + 0.01)
  return osc
}

// Group section occurrences by label → the "selection tags" (B043 §1). The timeline
// has every occurrence (รับ twice); a tag is one entry per distinct label, carrying all
// its ranges. Selecting the tag "รับ" lights every range that shares that label.
//   sections : [{ name, fromLi, toLi }, …]  (one per occurrence, in song order)
//   → [{ name, ranges:[{fromLi,toLi}, …] }]  (grouped, first-seen order)
export function sectionTags(sections) {
  const by = new Map()
  for (const s of sections || []) {
    if (!by.has(s.name)) by.set(s.name, { name: s.name, ranges: [] })
    by.get(s.name).ranges.push({ fromLi: s.fromLi, toLi: s.toLi })
  }
  return [...by.values()]
}

// Build the play order from the section occurrences + the set of selected labels
// (B043 §3b · decision D = song order + seam collapse). Returns undefined when nothing
// is selected → the caller plays the whole song (behaviour identical to no order at all).
//   - keep every occurrence whose label is selected, in song order
//   - collapse a run of the SAME label back-to-back into one range
//   - collapse the loop seam: if the first and last kept ranges share a label, drop the
//     first so a loop reads {ร้อง2 → รับ} not {รับ → ร้อง2 → รับ}
export function effectiveOrder(sections, selectedNames) {
  if (!selectedNames || !selectedNames.size) return undefined
  const picked = (sections || []).filter((s) => selectedNames.has(s.name))
  const collapsed = picked.filter((s, i) => i === 0 || s.name !== picked[i - 1].name)
  if (collapsed.length > 1 && collapsed[0].name === collapsed[collapsed.length - 1].name) collapsed.shift()
  return collapsed.map((s) => ({ name: s.name, fromLi: s.fromLi, toLi: s.toLi }))
}

// The exact note list a play will use — the SSOT the viewer shares with playSong so the
// progress dot, markers, scrub and ⏮/⏭ all measure against the same sequence.
//   order : [{fromLi,toLi}, …] — concatenate each range's notes in order (B043 selection)
//   range : {fromLi,toLi}      — a single section (legacy play-by-section)
//   neither → the whole song
export function buildPlayNotes(content, { order, range } = {}) {
  const all = songToNotes(content)
  if (order && order.length) return order.flatMap((r) => all.filter((n) => n.li >= r.fromLi && n.li <= r.toLi))
  if (range) return all.filter((n) => n.li >= range.fromLi && n.li <= range.toLi)
  return all
}

// Change the transpose live — e.g. when the user picks a new key while the melody
// is playing. Notes already sounding finish in the old key; every note not yet
// started is re-tuned to the new key exactly at its onset, so the switch is
// seamless. Semitones are applied via each oscillator's detune (100 cents = 1
// semitone), leaving the base pitch (original key) untouched.
export function setTranspose(semitones) {
  liveTranspose = semitones
  if (!ctx) return
  const cents = semitones * 100
  const now = ctx.currentTime
  for (const o of liveOscs) {
    if (o.startTime > now) {
      try {
        o.osc.detune.cancelScheduledValues(o.startTime)
        o.osc.detune.setValueAtTime(cents, o.startTime)
      } catch { /* osc already finished */ }
    }
  }
}

// Play the melody; resolves when done or stopped. Returns false when the device
// blocks audio (e.g. iOS with the silent switch on / autoplay policy).
export async function playSong(content, { bpm = 80, loop = false, onProgress, onNote, range, order, transpose = 0, startIndex = 0 } = {}) {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
  // iOS unlock: play a 1-sample silent buffer synchronously inside the user gesture
  try {
    const b = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = b
    src.connect(ctx.destination)
    src.start(0)
  } catch { /* not fatal */ }
  await ctx.resume()
  if (ctx.state !== 'running') return false
  stopFlag = { stopped: false }
  const myFlag = stopFlag
  liveTranspose = transpose // starting key offset; setTranspose() updates it live
  // `order` (B043 selection = many ranges) OR `range` (one section) OR the whole song —
  // buildPlayNotes is the SSOT the viewer also uses for the dot/markers/scrub/⏮⏭.
  let notes = buildPlayNotes(content, { order, range })
  // resume (US-A01 "เล่นต่อ"): skip the notes already played so a pause/play continues
  // from where you stopped instead of restarting. index is into this (range-filtered) list.
  if (startIndex > 0) notes = notes.slice(startIndex)
  if (!notes.length) return true
  const spb = 60 / bpm // seconds per beat

  do {
    let t = ctx.currentTime + 0.08
    const endTimes = []
    liveOscs = [] // reset per pass so a mid-play key change re-tunes this pass's notes
    for (const n of notes) {
      const dur = n.beats * spb
      if (n.midi != null) {
        // stop slightly early so repeated same-pitch notes articulate clearly
        const soundDur = Math.max(0.08, dur - 0.07)
        // Same synth as the MP3 export (scheduleNote). Base pitch is the ORIGINAL
        // key; transpose rides on detune so it can be changed live (100 cents = 1
        // semitone) without rescheduling.
        const osc = scheduleNote(ctx, ctx.destination, n.midi, t, soundDur, liveTranspose * 100)
        endTimes.push(osc)
        liveOscs.push({ osc, startTime: t })
      }
      t += dur
    }
    // wait until the scheduled end, checking the stop flag and reporting the
    // note currently sounding (for follow-along highlight)
    const totalMs = (t - ctx.currentTime) * 1000
    const start = Date.now()
    let noteIdx = -1
    let cumMs = 0
    const noteEndsMs = notes.map((n) => (cumMs += n.beats * spb * 1000))
    while (Date.now() - start < totalMs) {
      if (myFlag.stopped) {
        endTimes.forEach((o) => { try { o.stop() } catch {} })
        return true
      }
      const elapsed = Date.now() - start - 80
      let idx = noteIdx < 0 ? 0 : noteIdx
      while (idx < notes.length - 1 && elapsed >= noteEndsMs[idx]) idx++
      if (idx !== noteIdx) {
        noteIdx = idx
        // second arg = absolute index in the range-filtered list, so the viewer can
        // remember where a pause happened and resume via startIndex.
        onNote?.(notes[idx], startIndex + idx)
      }
      onProgress?.(Date.now() - start, totalMs)
      await new Promise((r) => setTimeout(r, 100))
    }
  } while (loop && !myFlag.stopped)
  return true
}
