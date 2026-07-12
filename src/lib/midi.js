// Melody playback with the Web Audio API — no external library.
// Converts notation tokens (movable do) + key + BPM into scheduled oscillator notes.

import { parseNotes, groupNotes, DOT_FACTOR } from './notation.js'
import { parseChord, chordToIntervals } from './chords.js'
import { getReadyInstrument, loadInstrument, isSampledInstrument } from './sampler.js'
import { arrange } from './arranger/index.js'

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
// The real-instrument sampler sounding this playback (B107), or null when on the synth. Held
// module-level so stopPlayback()/the in-loop stop can silence its voices (the synth is stopped
// via liveOscs; a sampler owns its own voices).
let activeSampler = null

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
  // Chord symbol currently in force (B104): a lead-sheet chord holds until the next one,
  // so we carry the last non-empty segment.chord forward and stamp every note (rests too)
  // with it. Done HERE, before expandRepeats, so a repeated section replays with its chords
  // intact. Attached now → buildChordVoice can sound "exactly the chords the sheet shows".
  let curChord = ''
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
      if (item.chord) curChord = item.chord // carry-forward: chord holds until the next one
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
              bn.push({ midi: null, beats: tokenBeats(t, f), li, bi, si, chord: curChord }) // rest: no syllable, chord rings on
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
                bn.push({ midi, beats: tokenBeats(t, f), tieOpen: !!t.tieStart, tieEnd: !!t.tieEnd, li, bi, si, syk: slot, chord: curChord })
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
  if (activeSampler) { activeSampler.releaseAll(); activeSampler = null }
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
//   peak        : envelope peak gain — melody = 0.35 (default); the chord pad passes a
//                 smaller value (0.12) so it stays under the melody (B104 §Voicing)
//   attack      : ramp-up seconds — the chord pad uses a longer attack so it "คลอ"
//                 (swells softly) instead of "ตอก" (strikes)
// Returns the oscillator so the realtime caller can track it (stop / re-tune).
export function scheduleNote(context, destination, midi, startT, soundDur, detuneCents = 0, peak = 0.35, attack = 0.015, decayTo = null) {
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = 'triangle'
  osc.frequency.value = 440 * 2 ** ((midi - 69) / 12)
  osc.detune.value = detuneCents
  // Envelope: 0 → peak (attack) → [decay to peak·decayTo] → hold → 0 (release). decayTo
  // (B107 §4a) lets a chord "ยุบ" slightly after the swell so the melody sits on top instead
  // of a flat wall of sound. The release always ramps from the REAL sustain level (never a
  // hard jump to 0) so there's no click — the same anti-pop shape B104 shipped.
  const REL = 0.05
  const relStart = Math.max(startT + attack, startT + soundDur - REL)
  let sustain = peak
  gain.gain.setValueAtTime(0, startT)
  gain.gain.linearRampToValueAtTime(peak, startT + attack)
  if (decayTo != null) {
    sustain = peak * decayTo
    gain.gain.linearRampToValueAtTime(sustain, Math.min(relStart, startT + attack + 0.25))
  }
  gain.gain.setValueAtTime(sustain, relStart)
  gain.gain.linearRampToValueAtTime(0, startT + soundDur)
  osc.connect(gain).connect(destination)
  osc.start(startT)
  osc.stop(startT + soundDur + 0.01)
  return osc
}

// ---------- B104/B107: chord accompaniment (the "left hand") ----------
// Voice-leading window for the upper voices (B107 §4b). Upper chord tones live in C3..G4
// (MIDI 48-67): low enough to sit UNDER a typical melody, high enough to sound like a hand
// rather than mud. The bass root sits below, in its own low register.
const UP_LO = 48
const UP_HI = 67

// Place a pitch-class into the upper window at the octave NEAREST a target pitch — the core
// of voice-leading: the next chord's tones move as little as possible from the last chord's,
// so the pad glides (common tones held, others step) instead of the whole block jumping.
function nearestOctave(pc, target) {
  let best = UP_LO + (((pc - UP_LO) % 12) + 12) % 12
  for (let x = best; x <= UP_HI; x += 12) if (Math.abs(x - target) < Math.abs(best - target)) best = x
  return best
}

// Voice ONE chord symbol with VOICE-LEADING (B107 §2, replaces B104's fixed block triad):
//   - bass  = the root in a low register (E2..D#3), a clear foundation of its own
//   - up[]  = the 3rd/5th(/7th…) — NO doubled root (the bass already owns it, so the pad is
//             thinner and clearer) — each placed at the octave nearest the PREVIOUS chord's
//             upper voices (prevUp). This keeps the accompaniment out of the melody's range
//             and moving smoothly, the two things that made B104's block voicing sound "muddy
//             / too loud / jumping" (proven by ear in the B106 demo).
//   → { bass, up:[…] }  ·  { bass:null, up:[] } for a blank/unparseable chord (→ silence)
// prevUp = the previous chord's up[] (null on the first chord → anchor mid-window).
export function chordVoicing(chordStr, prevUp = null) {
  const p = parseChord(chordStr || '')
  if (!p) return { bass: null, up: [] }
  // upper pitch-classes = the chord tones ABOVE the root (drop interval 0); trim to 3 so a
  // 9th/7th chord stays a light 3-voice pad on top of the bass (≤ 4 notes total).
  const pcs = chordToIntervals(p.suffix).slice(1, 4).map((iv) => (p.rootIndex + iv) % 12)
  const anchor = prevUp && prevUp.length ? prevUp.reduce((a, b) => a + b, 0) / prevUp.length : 58
  const up = pcs.map((pc) => nearestOctave(pc, anchor)).sort((a, b) => a - b)
  const bass = 40 + (((p.rootIndex - 4) % 12) + 12) % 12 // root in E2..D#3 (40-51), its own low register
  return { bass, up }
}

// The one rule for the 3 sound modes (B104), shared by live play and MP3 export so they
// can never disagree: 'melody' = tune only, 'chords' = pad only, 'both' = together.
//   → { melody:boolean, chords:boolean }
export function voiceFlags(voices) {
  return { melody: voices !== 'chords', chords: voices === 'chords' || voices === 'both' }
}

// Collapse a note list (from songToNotes/buildPlayNotes, each carrying its `chord`) into
// chord EVENTS timed to the melody: a run of consecutive notes under the same chord becomes
// one held block. startBeat/beats are cumulative beats over the SAME list playSong walks, so
// a chord changes exactly where its symbol changes on the sheet and stays in sync with the
// melody (and, since it runs on the post-expandRepeats list, repeats replay their chords).
//   → [{ midiSet:[…], startBeat, beats }]  (events with an empty voicing are dropped)
export function buildChordVoice(notes) {
  const events = []
  let beat = 0
  let cur = null // { chord, startBeat, beats } — the chord currently sounding
  for (const n of notes || []) {
    const c = n.chord || ''
    if (c && (!cur || cur.chord !== c)) {
      if (cur) events.push(cur)
      cur = { chord: c, startBeat: beat, beats: 0 } // a new chord starts here
    }
    if (cur) cur.beats += n.beats // extend the held chord across this note (incl. blank-chord notes)
    beat += n.beats
  }
  if (cur) events.push(cur)
  // Voice-lead across events (B107): carry each chord's upper voices into the next so the pad
  // glides. midiSet = [bass, ...up] keeps the scheduler's interface unchanged; bass/up are also
  // exposed so a caller can gain them separately (bass a touch louder = a firmer foundation).
  const out = []
  let prevUp = null
  for (const e of events) {
    const v = chordVoicing(e.chord, prevUp)
    if (v.bass == null) continue // blank/unparseable chord → no block (and don't reset prevUp)
    prevUp = v.up
    out.push({ bass: v.bass, up: v.up, midiSet: [v.bass, ...v.up], startBeat: e.startBeat, beats: e.beats })
  }
  return out
}

// Chord accompaniment bus (B107 §1 — the "chords too loud" fix). All chord voices route
// through ONE gain → low-pass → compressor before the destination, instead of hitting it
// raw: the low-pass rolls off the triangle's harsh upper harmonics ("หึ่ง"), the compressor
// tames peaks when voices align, and the single gain is the master "chord level" knob. Net
// effect: the pad sits ~-9 dB under the melody and stops masking it. Returns the input gain
// node — connect every chord voice into it. Works on realtime AND OfflineAudioContext.
export function makeChordBus(context, destination, level = 1) {
  const g = context.createGain()
  g.gain.value = level
  const lp = context.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1900
  lp.Q.value = 0.7
  const comp = context.createDynamicsCompressor()
  comp.threshold.value = -20
  comp.knee.value = 14
  comp.ratio.value = 3
  comp.attack.value = 0.02
  comp.release.value = 0.18
  g.connect(lp).connect(comp).connect(destination)
  return g
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
export async function playSong(content, { bpm = 80, loop = false, onProgress, onNote, range, order, transpose = 0, startIndex = 0, voices = 'melody', chordGain = 0.055, instrument = 'synth', onInstrumentPending, arranger = true, songId } = {}) {
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
  // B107: choose the sound. A real instrument plays only once its samples are fully loaded
  // (P'Aim: wait-then-play with a progress bar, like the MP3 download — NOT a synth stand-in
  // during the wait). If it's not loaded yet, WAIT for the download here (reporting progress),
  // then play on the real instrument. The synth is used ONLY when the load FAILS, so playback
  // can never hard-fail. The ctx is already resumed (above) inside the user gesture, so
  // scheduling after this await still starts audio on iOS. A pause during the wait sets the
  // stop flag, which we honour right after the load resolves.
  let sampler = null
  if (isSampledInstrument(instrument)) {
    sampler = getReadyInstrument(instrument, ctx)
    if (!sampler) {
      onInstrumentPending?.({ loading: true, progress: 0 })
      try {
        sampler = await loadInstrument(instrument, ctx, { onProgress: (p) => onInstrumentPending?.({ loading: true, progress: p }) })
      } catch { sampler = null } // load failed → fall back to the synth (no hard-fail)
      onInstrumentPending?.({ loading: false, progress: 1 })
      if (myFlag.stopped) return true // user cancelled (pressed pause) during the download
    } else {
      onInstrumentPending?.({ loading: false, progress: 1 })
    }
  }
  activeSampler = sampler // so stopPlayback() can silence the sampler's voices
  // `order` (B043 selection = many ranges) OR `range` (one section) OR the whole song —
  // buildPlayNotes is the SSOT the viewer also uses for the dot/markers/scrub/⏮⏭.
  let notes = buildPlayNotes(content, { order, range })
  // resume (US-A01 "เล่นต่อ"): skip the notes already played so a pause/play continues
  // from where you stopped instead of restarting. index is into this (range-filtered) list.
  if (startIndex > 0) notes = notes.slice(startIndex)
  if (!notes.length) return true
  const spb = 60 / bpm // seconds per beat
  // B104: which voices sound. 'melody' = as before, 'chords' = pad only, 'both' = together.
  // The chord events time against the SAME `notes` list, so the pad lines up with the melody
  // and the follow-along highlight still runs off `notes` even in chords-only mode.
  const { melody: wantMelody, chords: wantChords } = voiceFlags(voices)
  const chordEvents = wantChords ? buildChordVoice(notes) : []
  // B107 §1: one bus (gain → low-pass → compressor) for all SYNTH chord voices so the pad sits
  // under the melody instead of masking it. Not needed for the sampler (recorded piano isn't
  // harsh, and per-note velocity already sets the balance). Built once; reused across passes.
  const chordBus = (wantChords && !sampler) ? makeChordBus(ctx, ctx.destination) : null

  const totalBeats = notes.reduce((s, n) => s + n.beats, 0)
  let pass = 0 // loop pass index → humanize seed, so pass 0/1 differ but repeat (§R2.5)
  do {
    const t0 = ctx.currentTime + 0.08
    const t = t0 + totalBeats * spb // when the last note ends (for the wait loop below)
    const endTimes = []
    liveOscs = [] // reset per pass so a mid-play key change re-tunes this pass's notes
    // B107 P2: the arranger turns the sheet into a flat PerfEvent[] (melody + voiced chord
    // hits, with humanize gain/timeShift when on). One pure function feeds both live play and
    // MP3 export, so they can't drift. arranger:false = "ลูกเล่นปิด" → notes exactly as printed.
    const perf = arrange(notes, chordEvents, { arranger, voices, chordGain }, { songId, pass, timeSignature: content.timeSignature })
    for (const e of perf) {
      const isMel = e.role === 'melody'
      // onset = grid time + humanize shift; sound stops slightly early so repeated notes articulate
      const startT = t0 + e.startBeat * spb + (e.timeShift || 0)
      const rawDur = e.beats * spb
      const soundDur = isMel ? Math.max(0.08, rawDur - 0.07) : Math.max(0.1, rawDur - 0.05)
      if (sampler) {
        // Real instrument: transpose = play a different MIDI note (the sampler pitch-shifts).
        // A live key change reschedules (the viewer restarts) — sampler voices can't detune.
        sampler.fire(e.midi + liveTranspose, startT, soundDur, e.gain)
      } else {
        // Synth: base pitch is the ORIGINAL key; transpose rides on detune so it can be changed
        // live (100 cents = 1 semitone) without rescheduling. Chord voices route through the bus
        // (low-pass + compressor) so the pad sits under the melody; the melody hits the dest raw.
        const dest = isMel ? ctx.destination : chordBus
        const osc = scheduleNote(ctx, dest, e.midi, startT, soundDur, liveTranspose * 100, e.gain, e.attack, e.decayTo)
        endTimes.push(osc)
        liveOscs.push({ osc, startTime: startT })
      }
    }
    pass++
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
        if (sampler) sampler.releaseAll()
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
  if (activeSampler === sampler) activeSampler = null // natural end: drop our handle (voices ring out)
  return true
}
