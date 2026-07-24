// Melody playback with the Web Audio API — no external library.
// Converts notation tokens (movable do) + key + BPM into scheduled oscillator notes.

import { parseNotes, groupNotes, DOT_FACTOR, noteBoxIndices, storedHold, suggestHoldForBar, degreeKey } from './notation.js'
import { parseChord, chordToIntervals } from './chords.js'
import { getReadyInstrument, loadInstrument, isSampledInstrument } from './sampler.js'
import { arrange } from './arranger/index.js'
import { preEchoesMelody, PREECHO_MIN_GAIN_RATIO } from './arranger/referee.js'
import { moduleForInstrument } from './arranger/instruments/index.js'
import { mulberry32, seedFor } from './arranger/rng.js'
import { resolveContent } from './songModel.js'

// Playback root MIDI per key. Every tonic is kept inside ONE comfortable window (G3..F#4 = 55..66)
// so no key plays an octave higher than another (พี่เปา 14 ก.ค.: "คีย์ A สูงเกินไป · ขอโซน A4"). The
// high keys G,G#,A,A#,B used to sit at the TOP of octave 4 (A=69, B=71) → their melodies shot up into
// the A5/B5 zone; dropping them to octave 3 (A=57 → melody peaks around A4) fixes that. C..F# are
// unchanged (they were already comfortable). This is PLAYBACK pitch only — the sheet's numbers/octave
// dots are unaffected. keyTranspose + songToNotes + arrange all read this, so live + MP3 stay in sync.
export const KEY_MIDI = { C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 55, 'G#': 56, Ab: 56, A: 57, 'A#': 58, Bb: 58, B: 59 }
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
// B107 step 9 — a monotonic play token. Every playSong/playEnsemble call takes the next token at
// the top; after any `await` (instrument load) it checks it's STILL the latest — if a newer play
// started meanwhile (the user switched instrument/การบรรเลง while samples were loading), the stale
// pass aborts BEFORE it schedules a single note, so two passes can never both start = no ซ้อน 2 ชั้น.
let playToken = 0
// Oscillators scheduled for the current playback, each with its start time, plus
// the transpose (semitones) currently applied. Lets setTranspose() re-tune every
// note that hasn't sounded yet when the user changes key mid-playback.
let liveOscs = []
let liveTranspose = 0
// The real-instrument sampler sounding this playback (B107), or null when on the synth. Held
// module-level so stopPlayback()/the in-loop stop can silence its voices (the synth is stopped
// via liveOscs; a sampler owns its own voices).
let activeSampler = null
// B107 step 9 — the ensemble (รวมวง) plays SEVERAL real instruments at once (piano + cello +
// violin), each its own wrapper; held here so stopPlayback() can silence every one.
let activeEnsemble = []

// Fermata hold (𝄐). The note is held an EDITABLE, absolute number of extra beats — stored per
// note-box in `seg.holds` (SA design), read by BOTH playback (here) and the editor. A fermata note
// sounds `written + hold` beats: written = its normal length (digit + any '-' boxes), hold = the
// stored value or, when none is stored (old songs / just-added ^), the default HOLD_DEFAULT (a
// constant 2 beats, P'Aim's choice; still per-note editable). This REPLACES the old fixed 1.75
// factor. The hold is added to the note's DURATION only; bar counting (beatCount) is untouched, so
// bars still sum to the time signature (the fix for "the next bar drifts").
function tokenBeats(t, tripletFactor) {
  let d = 1 / 2 ** t.underlines
  d *= DOT_FACTOR[t.dots] ?? 1 // . ×1.5 · .. ×1.75
  return d * tripletFactor // fermata hold is added at the note level (see songToNotes), not here
}

// Precompute the default hold for every fermata note-box that has NO stored hold. Keyed by the
// segment object -> { [boxIdx]: addBeats }. The default is the constant HOLD_DEFAULT (via
// suggestHoldForBar); the walk just locates the fermata boxes.
function buildFermataHolds(lines, timeSignature) {
  const resolve = new Map()
  for (const line of lines || []) {
    let barSegs = []
    const bars = []
    const flush = () => { if (barSegs.length) bars.push(barSegs); barSegs = [] }
    for (const it of line) {
      if (it.type === 'bar' || it.type === 'repeat-start') flush()
      if (it.type === 'segment') barSegs.push(it)
    }
    flush()
    for (const segs of bars) {
      const flatBoxes = []
      const locs = [] // {item, segBoxIdx, flatIdx}
      for (const it of segs) {
        const boxes = (it.note || '').trim() ? it.note.trim().split(/\s+/) : []
        boxes.forEach((str, segBoxIdx) => { locs.push({ item: it, segBoxIdx, flatIdx: flatBoxes.length }); flatBoxes.push(str) })
      }
      for (const loc of locs) {
        if (parseNotes(flatBoxes[loc.flatIdx]).some((t) => t.type === 'note' && t.fermata)) {
          const add = suggestHoldForBar(flatBoxes, loc.flatIdx, timeSignature)
          if (!resolve.has(loc.item)) resolve.set(loc.item, {})
          resolve.get(loc.item)[loc.segBoxIdx] = add
        }
      }
    }
  }
  return resolve
}

// Effective hold (beats to ADD) for the fermata note at box `boxIdx` of segment `seg`: the stored
// value wins; otherwise the precomputed suggestion; 0 as a last resort.
function holdFor(seg, boxIdx, suggested) {
  const stored = storedHold(seg, boxIdx)
  if (stored != null) return stored
  const s = suggested && suggested.get(seg)
  return s && s[boxIdx] != null ? s[boxIdx] : 0
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
  // Suggested holds for any fermata note without a stored value (old songs / freshly-added ^),
  // so playback still holds even before the note is opened in the editor (backward-compat).
  const holdResolve = buildFermataHolds(content.lines, content.timeSignature)
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
    // G20 — an accidental holds for the REST OF ITS BAR (变音记号: 同小节、同音名且同音高).
    // Written once on the first note, every later note of the same degree AND octave in that
    // bar sounds altered too; ♮ cancels it; the next bar starts clean. Until now playback read
    // each token on its own, so the second note sounded a semitone low — while the lint has
    // been telling users this rule exists (notationLint naturalMisuse). Resolved HERE, at
    // pitch-calculation time only: nothing is written back to the song (the standard says the
    // mark is not repeated, so adding it would be editing the user's work).
    //   barAlt : degreeKey → '#' | 'b' in force for the current bar
    //   tieCarry: R5 — a note tied ACROSS a barline keeps the pitch it was tied from, even
    //             though the new bar itself starts clean for every other note.
    let barAlt = new Map()
    let tieCarry = null
    const flushBar = () => { bars.push(bar); barAlt = new Map() }
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
      if (!item.note) {
        // เนื้อล้วน (lyric-only · no notation): emit a SILENT slot so the karaoke follow-along still
        // ADVANCES through the words (P'Aim 14 ก.ค. "ตัว karaoke ไม่วิ่ง"). No pitch → no sound; its
        // length ≈ the line's word-count so the highlight paces readably, and li/si drive the per-line
        // highlight (onNote timeline walks every slot, midi-null included). Note-ful segments never hit
        // this branch, so normal songs are unchanged.
        // words live in `lyric` (v1) or the `syllables` array (v2); take whichever is present.
        const syls = Array.isArray(item.syllables) ? item.syllables : []
        const words = String(item.lyric || '').trim() || syls.join(' ').trim()
        if (words) {
          // pace ≈ syllable count when known (≈1 beat/syllable), else estimate from text length.
          const units = syls.length || Math.round((words.match(/[฀-๿a-zA-Z0-9]/g) || []).length / 3)
          bar.notes.push({ midi: null, beats: Math.max(2, Math.min(24, units || 2)), li, bi, si, chord: curChord })
        }
        continue
      }
      const bn = bar.notes
      // syllable-slot index within this segment: every note box (a note, a rest, or a
      // '-' extension) advances it; brackets don't. This matches syllableSlots() so the
      // slot a played attack carries points at the same per-syllable span in SongSheet.
      let slot = -1
      // map each NOTE token back to its whitespace-box index so a fermata note reads the
      // hold the editor stored under that box (holds keys = box indices).
      const boxIdxByNote = noteBoxIndices(item.note)
      let noteOrd = -1
      for (const g of groupNotes(parseNotes(item.note))) {
        const f = g.group === 'triplet' ? 2 / 3 : 1
        let prevMidi = null // last pitched note in THIS group (for slur-over-same-pitch)
        for (const t of g.tokens) {
          if (t.type === 'note') {
            slot++
            noteOrd++
            // fermata hold (absolute beats), added ONCE to this note's duration (not per box)
            const hold = t.fermata ? holdFor(item, boxIdxByNote[noteOrd], holdResolve) : 0
            if (t.pitch === '0') {
              bn.push({ midi: null, beats: tokenBeats(t, f) + hold, fermata: !!t.fermata, li, bi, si, chord: curChord }) // rest: no syllable, chord rings on
              prevMidi = null
            } else {
              let midi = root + MAJOR_SCALE[Number(t.pitch) - 1] + (t.high - t.low) * 12
              // resolve the accidental IN FORCE for this note (G20 · R1-R5). degreeKey is the
              // lint's own "same note" test (pitch + octave), shared so the two cannot disagree.
              const dkey = degreeKey(t)
              let acc = t.accidental
              if (acc === '#' || acc === 'b') barAlt.set(dkey, acc) // written here → holds on
              else if (acc === 'n') barAlt.delete(dkey) // ♮ cancels for the rest of the bar
              else acc = barAlt.get(dkey) || (t.tieEnd && tieCarry && tieCarry.key === dkey ? tieCarry.acc : '')
              if (acc === '#') midi += 1
              else if (acc === 'b') midi -= 1
              // natural (n) = no shift — the digit's diatonic pitch
              // carry an alteration only over a tie (R5); any other note in the next bar starts clean
              tieCarry = t.tieStart && (acc === '#' || acc === 'b') ? { key: dkey, acc } : null
              const last = bn[bn.length - 1]
              // A slur arc over two notes of the SAME pitch is a tie: hold the note,
              // do NOT re-attack the later one, but keep counting its beats. A slur
              // over DIFFERENT pitches (เอื้อน) still plays every note. (bug 015)
              // Explicit ~ ties are merged after flatten (mergeTies) so they work
              // ACROSS bar lines too, not just within one bar.
              const slurTie = g.group === 'slur' && prevMidi === midi && last && last.midi === midi
              if (slurTie) {
                last.beats += tokenBeats(t, f) + hold // melisma: this slot holds no new word
              } else {
                // an attack: carry its slot so the highlight lands on this syllable
                bn.push({ midi, beats: tokenBeats(t, f) + hold, fermata: !!t.fermata, tieOpen: !!t.tieStart, tieEnd: !!t.tieEnd, li, bi, si, syk: slot, chord: curChord })
              }
              prevMidi = midi
            }
          } else if (t.type === 'ext') {
            slot++ // a '-' box holds the previous syllable — its own (blank) slot
            // A '-' is part of the SAME note, so it just adds its written beat. The fermata's
            // hold was already added ONCE at the note (an absolute number of beats), so it must
            // NOT be re-applied per extension box — that is what the old ×1.75-per-box rule did,
            // and it is why a held note landed on 1.75 / 2.625 / 3.5 beats and pushed everything
            // after it off the beat grid.
            const last = bn[bn.length - 1]
            if (last) last.beats += 1 * f
          }
        }
      }
    }
    flushBar()
  })
  // 2. expand repeats into play order, 3. flatten to a note list, 4. merge ties
  // G20 · R6/R7 — accidentals were resolved above, per bar, BEFORE this expansion, so every
  // repeat round and every unrolled copy of a bar carries that bar's own resolution and none
  // of its neighbours': a repeated bar "starts counting again" each time through.
  // ⚠️ SA notes R6/R7 are an INFERENCE from R3 (the scope is the bar, not the play order) —
  // the sources do not state them outright. If that reading turns out to be wrong, this is the
  // line to revisit: resolution would have to move after expandRepeats instead.
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
  if (activeEnsemble.length) { activeEnsemble.forEach((w) => { try { w?.releaseAll() } catch { /* already stopped */ } }); activeEnsemble = [] }
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
  // bass = the chord ROOT in its low register E2..D#3 (40-51). Slash chord ("G/B") also exposes
  // `slashBass` (the printed bass note, e.g. B): P'Aim 14 ก.ค. wants the ROOT struck FIRST when the
  // chord changes, THEN the bass moves to the slash note — so the bass mode plays root → slashBass,
  // not the slash note the whole time. Only the printed bass note is used → safe (what the sheet says).
  const lowReg = (pc) => 40 + (((pc - 4) % 12) + 12) % 12
  const bass = lowReg(p.rootIndex)
  const slashBass = p.bassIndex >= 0 && p.bassIndex !== p.rootIndex ? lowReg(p.bassIndex) : null
  return { bass, up, slashBass }
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
    // carry the chord SYMBOL too (root/quality) so the arranger's harmony-aware passes (sus resolve,
    // richer fills) can reason about it — the voiced pitches alone don't say "this is a plain triad".
    out.push({ chord: e.chord, bass: v.bass, up: v.up, slashBass: v.slashBass, midiSet: [v.bass, ...v.up], startBeat: e.startBeat, beats: e.beats })
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

// ---------- B107 P2 · LAYER 4: reverb (church space) ----------
// Reverb presets — the "how much room" knob P'Aim tunes by ear (§11.3). seconds = tail length,
// decay = how fast it fades, wet = how much reverb vs dry. Worship wants "in the room", not blur.
export const REVERB = {
  none: null,
  room: { seconds: 1.1, decay: 3.2, wet: 0.18 },
  church: { seconds: 2.4, decay: 2.2, wet: 0.28 },
  hall: { seconds: 3.2, decay: 1.8, wet: 0.34 },
}

// Build a stereo impulse response by SYNTHESIS (decaying noise) — no IR file to fetch, works
// identically on realtime and OfflineAudioContext. Seeded (mulberry32) so the MP3 export (P3)
// renders the exact same tail as live. Two lightly-decorrelated channels give a natural stereo
// bloom. duration/decay set the space size.
function synthIR(context, seconds, decay) {
  const rng = mulberry32(0x1e7 ^ Math.round(seconds * 1000))
  const len = Math.max(1, Math.floor(context.sampleRate * seconds))
  const buf = context.createBuffer(2, len, context.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (rng() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

// A wet/dry reverb bus: everything connected to `.input` reaches `destination` both dry and
// through a convolver (the wet tail). Returns { input } — route melody/chords/sampler into it.
// Works on realtime AND OfflineAudioContext (MP3), so live and download share the same space.
export function makeReverbBus(context, destination, { seconds, decay, wet }) {
  const input = context.createGain()
  const dry = context.createGain()
  const wetGain = context.createGain()
  wetGain.gain.value = wet
  dry.gain.value = 1 - wet * 0.5 // keep the direct sound present; wet only adds tail
  const conv = context.createConvolver()
  conv.buffer = synthIR(context, seconds, decay)
  input.connect(dry).connect(destination)
  input.connect(conv).connect(wetGain).connect(destination)
  return { input }
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
export async function playSong(content, { bpm = 80, loop = false, onProgress, onNote, range, order, transpose = 0, startIndex = 0, voices = 'melody', chordGain = 0.055, instrument = 'synth', onInstrumentPending, arranger = true, songId, arrangeCfg = {} } = {}) {
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
  const myToken = ++playToken // newer switch during our load → we're stale, abort before scheduling
  liveTranspose = transpose // starting key offset; setTranspose() updates it live
  // B107: choose the sound. A real instrument plays only once its samples are fully loaded
  // (P'Aim: wait-then-play with a progress bar, like the MP3 download — NOT a synth stand-in
  // during the wait). If it's not loaded yet, WAIT for the download here (reporting progress),
  // then play on the real instrument. The synth is used ONLY when the load FAILS, so playback
  // can never hard-fail. The ctx is already resumed (above) inside the user gesture, so
  // scheduling after this await still starts audio on iOS. A pause during the wait sets the
  // stop flag, which we honour right after the load resolves.
  // Play notes up front so a SILENT sheet can skip the heavy sampler load. A lyric-only song
  // (เนื้อล้วน) has no pitched notes → nothing to sound; fetching a ~12MB instrument just to play
  // silence wastes bandwidth and can stall on a slow decode, yet the karaoke follow-along still needs
  // to run. So we load an instrument ONLY when there's something to play; the highlight timeline
  // (below) walks these notes regardless. (buildPlayNotes = the SSOT the viewer's dot/scrub also use.)
  const fullNotes = buildPlayNotes(content, { order, range })
  if (!fullNotes.length) return true
  const hasPitched = fullNotes.some((n) => n.midi != null)
  let sampler = null
  if (isSampledInstrument(instrument) && hasPitched) {
    sampler = getReadyInstrument(instrument, ctx)
    if (!sampler) {
      onInstrumentPending?.({ loading: true, progress: 0 })
      try {
        sampler = await loadInstrument(instrument, ctx, { onProgress: (p) => onInstrumentPending?.({ loading: true, progress: p }) })
      } catch { sampler = null } // load failed → fall back to the synth (no hard-fail)
      onInstrumentPending?.({ loading: false, progress: 1 })
      // cancelled (พัก) OR a newer switch started while we loaded → abort before scheduling.
      if (myFlag.stopped || myToken !== playToken) return true
    } else {
      onInstrumentPending?.({ loading: false, progress: 1 })
    }
  }
  if (myToken !== playToken) return true // a newer play superseded us (even with no load wait)
  activeSampler = sampler // so stopPlayback() can silence the sampler's voices
  // fullNotes (computed above) is the FULL ordered LOOP UNIT (the "เลือกท่อน"/order — what วนซ้ำ repeats).
  // resume / seek (US-A01 "เล่นต่อ" · tap a word · scrub the bar): startIndex = where THIS play
  // begins. It offsets ONLY the first pass — so when วนซ้ำ is on, the loop returns to the order's
  // START (the defined ท่อน), never to the seek/resume point (fix: click = seek, not a new loop).
  const seekFrom = startIndex > 0 ? Math.min(startIndex, fullNotes.length - 1) : 0
  const spb = 60 / bpm // seconds per beat
  // B104: which voices sound. 'melody' = as before, 'chords' = pad only, 'both' = together.
  // The chord events time against the SAME per-pass notes, so the pad lines up with the melody
  // and the follow-along highlight still runs off those notes even in chords-only mode.
  const { melody: wantMelody, chords: wantChords } = voiceFlags(voices)
  // B107 P2 §5 LAYER 4 — reverb (church space): one wet/dry bus everything flows into. `busIn`
  // is the reverb input, or context.destination when reverb is off/none. Both the synth and the
  // sampler route through it, so live playback (and later the MP3) share the same room. Built
  // once per play; the sampler is re-pointed at it via setDestination.
  const reverbCfg = REVERB[arrangeCfg.reverb]
  const fx = reverbCfg ? makeReverbBus(ctx, ctx.destination, reverbCfg) : null
  const busIn = fx ? fx.input : ctx.destination
  const wantPan = !!arrangeCfg.pan
  if (sampler) sampler.setDestination(busIn) // route the real instrument through reverb
  // B107 §1: one bus (gain → low-pass → compressor) for all SYNTH chord voices so the pad sits
  // under the melody instead of masking it. Not needed for the sampler (recorded piano isn't
  // harsh, and per-note velocity already sets the balance). Built once; reused across passes.
  const chordBus = (wantChords && !sampler) ? makeChordBus(ctx, busIn) : null

  let pass = 0 // loop pass index → humanize seed, so pass 0/1 differ but repeat (§R2.5)
  do {
    // pass 0 begins at the seek/resume point; every loop pass after it replays the WHOLE order
    // from note 0 — so วนซ้ำ loops the defined ท่อน, not the click/seek point.
    const from = pass === 0 ? seekFrom : 0
    const notes = from > 0 ? fullNotes.slice(from) : fullNotes
    const chordEvents = wantChords ? buildChordVoice(notes) : []
    const totalBeats = notes.reduce((s, n) => s + n.beats, 0)
    const t0 = ctx.currentTime + 0.08
    const t = t0 + totalBeats * spb // when the last note ends (for the wait loop below)
    const endTimes = []
    liveOscs = [] // reset per pass so a mid-play key change re-tunes this pass's notes
    // B107 P2: the arranger turns the sheet into a flat PerfEvent[] (melody + voiced chord
    // hits, with humanize gain/timeShift when on). One pure function feeds both live play and
    // MP3 export, so they can't drift. arranger:false = "ลูกเล่นปิด" → notes exactly as printed.
    // §4B: pick the idiomatic module from the chosen instrument (keyboard/bowed/plucked) unless a
    // preset already named one. So a solo violin uses bowed voicing+patterns, nylon uses plucked,
    // etc. — the same arranger core, an instrument-shaped surface.
    const module = arrangeCfg.module || moduleForInstrument(instrument)
    // Real ท่อน ranges (beats) so rubato/section/density work on the ACTUAL song (golden-piano §3).
    // resolveSections resolves v2 content when needed AND falls back to melody-shape phrases for the
    // ~400 unlabelled songs — so `sections` is never empty and rubato breathes per phrase, not just
    // at the song's final note.
    const sections = resolveSections(content, notes)
    const perf = arrange(notes, chordEvents, { arranger, voices, chordGain, ...arrangeCfg, module }, { songId, pass, timeSignature: content.timeSignature, keyRoot: KEY_MIDI[content.key] ?? 60, sections })
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
        // live (100 cents = 1 semitone) without rescheduling. Melody hits the reverb bus centre;
        // chord voices route through the low-pass/compressor bus, optionally panned per-voice
        // (higher voices lean a touch right = a wider pad) before the bus (§5 stereo spread).
        let dest = isMel ? busIn : chordBus
        if (!isMel && wantPan && e.role !== 'bass') {
          const pan = ctx.createStereoPanner()
          pan.pan.value = Math.max(-0.4, Math.min(0.4, (e.midi - 58) / 28))
          pan.connect(chordBus)
          dest = pan
        }
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
      if (myFlag.stopped || myToken !== playToken) {
        endTimes.forEach((o) => { try { o.stop() } catch {} })
        // release the sampler ONLY if we're being stopped as the CURRENT pass — a newer pass now
        // owns the shared instrument, so a stale loop must NOT silence it (that would cut the new sound).
        if (sampler && myToken === playToken) sampler.releaseAll()
        return true
      }
      const elapsed = Date.now() - start - 80
      let idx = noteIdx < 0 ? 0 : noteIdx
      while (idx < notes.length - 1 && elapsed >= noteEndsMs[idx]) idx++
      if (idx !== noteIdx) {
        noteIdx = idx
        // second arg = absolute index in the ordered list, so the viewer can remember where a
        // pause/seek happened and resume via startIndex. `from` = this pass's start offset.
        onNote?.(notes[idx], from + idx)
      }
      onProgress?.(Date.now() - start, totalMs)
      await new Promise((r) => setTimeout(r, 100))
    }
  } while (loop && !myFlag.stopped)
  if (activeSampler === sampler) activeSampler = null // natural end: drop our handle (voices ring out)
  return true
}

// B107 step 9 · §6b.2 — the ENSEMBLE (รวมวง) player: THREE real instruments at once (piano +
// cello + violin), the "3 sonic layers" arrangement, near/far reverb depth, verse→chorus density.
// Ported from docs/spikes/ensemble-real-demo.html (P'Aim-approved · เสียงจริงทั้งวง, no GM). Kept
// separate from playSong because it drives MULTIPLE samplers through a per-role mix graph; it shares
// the module ctx / stop flag / note SSOT so stop/resume/transpose behave the same.
//   lead: 'piano' (default · เปียโนนำ) | 'violin' (ไวโอลินนำ) — which instrument sings the melody.
// A live transpose/key/tempo change reschedules (samplers can't detune) — the viewer restarts us.
// Derive the song's real sections as BEAT ranges + a level (§6b.2 · P'Aim: use real sections, not a
// %-of-song guess). Reads the resolved content's {type:'section'} labels (same as the viewer's
// markers), maps each label's line range → beats via the played notes' cumulative beats, and tags a
// label that RECURS (a refrain / รับ) as 'chorus' (fuller) vs 'verse' (sparser). No sections → [],
// and the caller then treats the whole song as 'chorus' (never breaks). Returns [{name,fromBeat,toBeat,level}].
export function sectionBeatRanges(content, notes) {
  const lines = content?.lines || []
  const secs = []
  lines.forEach((line, li) => {
    const s = Array.isArray(line) ? line.find((it) => it.type === 'section') : null
    if (s) secs.push({ name: s.name, fromLi: li, toLi: lines.length - 1 })
  })
  for (let i = 0; i < secs.length - 1; i++) secs[i].toLi = secs[i + 1].fromLi - 1
  if (!secs.length) return []
  const count = {}
  for (const s of secs) count[s.name] = (count[s.name] || 0) + 1
  // A "refrain" (chorus) = a label that RECURS (รับ ร้องหลายรอบ). resolveContent prints most
  // refrains ONCE, so recurrence is often absent — and then we default EVERY section to 'chorus'
  // (the FULLER sound), never leaving the whole song stuck at the sparse verse level (P'Aim: เต็มวง
  // อย่าจืด). Only when a refrain IS detectable do the non-refrain sections drop to 'verse' for the
  // verse→chorus swell. (SA can refine the detection with the arrangement's refrain flag later.)
  const hasRefrain = Object.values(count).some((c) => c > 1)
  const liStartBeat = {}
  let b = 0
  for (const n of notes) { if (liStartBeat[n.li] == null) liStartBeat[n.li] = b; b += n.beats }
  const totalBeats = b
  return secs.map((s) => {
    const fromBeat = liStartBeat[s.fromLi] ?? 0
    let toBeat = totalBeats
    for (let li = s.toLi + 1; li < lines.length; li++) { if (liStartBeat[li] != null) { toBeat = liStartBeat[li]; break } }
    // isRefrain (ท่อนรับ) — primary: the label says so (รับ / *** · B102 repeat symbols); secondary: it
    // recurs. Name-first so a labeled refrain printed ONCE is still caught, and verses never false-fire.
    const isRefrain = /รับ/.test(s.name || '') || /\*\*\*/.test(s.name || '') || count[s.name] > 1
    return { name: s.name, fromBeat, toBeat, level: !hasRefrain || count[s.name] > 1 ? 'chorus' : 'verse', isRefrain }
  })
}

// golden-piano §3b — FALLBACK phrase sections from melody shape, for songs with NO usable ท่อน labels
// (the common case for the ~400 v1-migrated songs, whose single arrangement entry is unlabelled →
// sectionBeatRanges returns []). Without boundaries, rubato can only ritard the very last note of the
// whole song; the music never "breathes" per phrase. We infer วรรค (phrase) boundaries the way a
// reader hears them: a phrase ENDS on a long held melody note (a resting point) or a rest (a breath).
// A boundary is placed AFTER such a note, so rubato stretches the phrase-ending note and breathes into
// the next — exactly its designed behaviour, now on every song. Pure (note math only), so live == MP3.
// Returns [{name,fromBeat,toBeat,level,isRefrain}] with ≥1 section (the whole song when no phrase end
// is found). `holdBeats` = how long a note must ring to count as a phrase end (default 3).
export function phraseSectionsFromMelody(notes, holdBeats = 3) {
  const list = notes || []
  // one pass: each note's start beat + the phrase segments (boundary AFTER a long note / a rest).
  const startBeat = new Array(list.length)
  const secs = []
  let beat = 0
  let segStart = 0
  for (let i = 0; i < list.length; i++) {
    const n = list[i]
    startBeat[i] = beat
    const end = beat + n.beats
    // a long sung note (วรรคจบ) or a real rest (a breath) ends a phrase — but only if notes follow,
    // so we never cut a trailing tail into its own empty section.
    const phraseEnd = (n.midi != null && n.beats >= holdBeats) || (n.midi == null && n.beats >= 1)
    if (phraseEnd && i < list.length - 1) { secs.push({ fromBeat: segStart, toBeat: end }); segStart = end }
    beat = end
  }
  if (segStart < beat - 1e-9) secs.push({ fromBeat: segStart, toBeat: beat })
  if (!secs.length) secs.push({ fromBeat: 0, toBeat: beat })
  // Density-adaptive tag (§3b): a phrase whose sung-notes-per-beat runs clearly above the song's
  // median is the more "active" material (a hook / รับ) → mark isRefrain so a preset with a fuller
  // refrain comp (refrainPattern) opens up there; sparse/held phrases stay calm (verse). Conservative
  // threshold so it fires only on genuinely busier phrases; the melody is never altered (§1a).
  const density = (s) => {
    const span = s.toBeat - s.fromBeat
    if (span <= 0) return 0
    let cnt = 0
    for (let i = 0; i < list.length; i++) {
      if (list[i].midi != null && startBeat[i] >= s.fromBeat - 1e-9 && startBeat[i] < s.toBeat - 1e-9) cnt++
    }
    return cnt / span
  }
  const ds = secs.map(density).filter((d) => d > 0).sort((a, b) => a - b)
  const median = ds.length ? ds[Math.floor(ds.length / 2)] : 0
  return secs.map((s, i) => {
    const active = median > 0 && density(s) >= median * 1.5
    return { name: `วรรค ${i + 1}`, fromBeat: s.fromBeat, toBeat: s.toBeat, level: active ? 'chorus' : 'verse', isRefrain: active }
  })
}

// golden-piano §3 — the ท่อน (section) beat-ranges arrange() should use, ROBUST for any content shape.
// (a) The label path only works on RESOLVED v1-shaped lines; a raw v2 song ({stanzas}/{arrangement},
//     no `lines`) makes sectionBeatRanges return [] — the trap that killed rubato/section on ~400
//     songs. So resolve first when `lines` is absent. (b) When the resolved labels still yield < 2
//     sections (unlabelled songs), fall back to melody-shape phrases so rubato always has real
//     boundaries. Pure → shared by live playback (playSong) and the MP3 export.
export function resolveSections(content, notes) {
  const resolved = Array.isArray(content?.lines) && content.lines.length
    ? content
    : { ...content, lines: resolveContent(content) }
  const labelled = sectionBeatRanges(resolved, notes)
  if (labelled.length >= 2) return labelled
  const phrases = phraseSectionsFromMelody(notes)
  return phrases.length > labelled.length ? phrases : labelled
}

// Which leads the shared PRE-ECHO rule polices in โหมดรวมวง today. GUITAR only, on purpose (PM 24 ก.ค.):
// its hammer-on grace was measured at 0.69–0.86 of the tune's own loudness — the same band as the
// sparkle P'Pao actually HEARD as a phantom note in เพลง 33 (0.80) — so the class is ear-confirmed
// and closing it needs no further evidence. เปียโนนำ (the default) measured ZERO points, so it is
// untouched by construction: the piano lead has no grace at all. ไวโอลินนำ measured 145 points but
// that is a NUMBER, not an ear — silencing them changes the character of a whole mode, so it waits
// for P'Aim's A/B judgement. `preEcho: 'all'` turns the violin on for rendering that A/B; 'off'
// renders the "before" side. Do not flip the default without the ear test.
// Evidence: docs/reports/ensemble-preecho.md
// Dry level of each role's mix bus (§6b.2 roleBus). Needed to compare an ornament's loudness with
// the tune's when the two sit on DIFFERENT buses.
export const ENS_BUS = { grand: 1.0, cello: 0.16, violin: 0.62, nylon: 0.9 }

export const PREECHO_ENSEMBLE_LEADS = new Set(['guitar'])

export async function playEnsemble(content, { bpm = 72, loop = false, onNote, onProgress, order, range, transpose = 0, startIndex = 0, lead = 'piano', onInstrumentPending, songId, preEcho = 'default' } = {}) {
  // 'default' = the ear-confirmed scope only · 'all' = every lead's grace · 'off' = pre-fix behaviour
  const policePreEcho = preEcho === 'all' || (preEcho !== 'off' && PREECHO_ENSEMBLE_LEADS.has(lead))
  const policeViolin = preEcho === 'all'   // ไวโอลินนำ / violin ลูกเล่น — held for the ear test
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
  try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0) } catch { /* not fatal */ }
  await ctx.resume()
  if (ctx.state !== 'running') return false
  stopFlag = { stopped: false }
  const myFlag = stopFlag
  const myToken = ++playToken // newer switch during our (multi-instrument) load → we're stale, abort
  liveTranspose = transpose

  // Load the instruments this LEAD needs (§6b.1 recipe · lead-driven · P'Aim 13 ก.ค.): grand
  // (motion/arp) + cello (bass) always; the MELODY instrument = the chosen lead — เปียโนนำ→grand ·
  // กีตาร์นำ→nylon · ไวโอลินนำ→violin; violin also plays the chorus wash (unless it IS the lead).
  onInstrumentPending?.({ loading: true, progress: 0 })
  let gr = null, ce = null, vi = null, ny = null
  try {
    const loads = [
      loadInstrument('grand', ctx, { onProgress: (p) => onInstrumentPending?.({ loading: true, progress: p }) }),
      loadInstrument('cello', ctx),
      loadInstrument('violin', ctx),
    ]
    if (lead === 'guitar') loads.push(loadInstrument('nylon', ctx))
    const res = await Promise.all(loads)
    gr = res[0]; ce = res[1]; vi = res[2]; ny = res[3] || null
  } catch { /* a load failed → degrade below (skip the missing role), never hard-fail */ }
  onInstrumentPending?.({ loading: false, progress: 1 })
  // cancelled OR a newer switch (เครื่อง/การบรรเลง) started while our samples loaded → abort before
  // scheduling, so the superseded ensemble can never start playing under the new one (no ซ้อน 2 ชั้น).
  if (myFlag.stopped || myToken !== playToken) return true
  if (!gr && !ce && !vi) return false
  activeEnsemble = [gr, ce, vi, ny].filter(Boolean)

  // ---- LAYER-4 mix (§6b.2): dry role buses + near/far reverb depth (piano front · strings back) ----
  const master = ctx.createGain(); master.gain.value = 0.85
  const lim = ctx.createDynamicsCompressor()
  lim.threshold.value = -2; lim.knee.value = 8; lim.ratio.value = 4; lim.attack.value = 0.006; lim.release.value = 0.18
  master.connect(lim); lim.connect(ctx.destination)
  const near = ctx.createConvolver(); near.buffer = synthIR(ctx, 1.1, 3.0)
  const nearG = ctx.createGain(); nearG.gain.value = 0.24; near.connect(nearG); nearG.connect(master)
  const far = ctx.createConvolver(); far.buffer = synthIR(ctx, 3.2, 1.9)
  const farG = ctx.createGain(); farG.gain.value = 0.30; far.connect(farG); farG.connect(master)
  const roleBus = (dry, sendNear, sendFar) => {
    const g = ctx.createGain(); g.gain.value = dry; g.connect(master)
    if (sendNear) { const s = ctx.createGain(); s.gain.value = sendNear; g.connect(s); s.connect(near) }
    if (sendFar) { const s = ctx.createGain(); s.gain.value = sendFar; g.connect(s); s.connect(far) }
    return g
  }
  // balance (§6b.2 target: piano −5.6 / cello −16.8 / violin −26.7 dB · ทำนองนำ · สายอยู่หลัง).
  // The CC strings are ONE-dynamic samples baked loud, so we fire them at a healthy velocity (a
  // clear tone — a low velocity would collapse to silence) and set the level HERE at the bus:
  // piano front + present, cello well under, violin furthest back. Tuned vs the OfflineAudioContext
  // per-role measurement; SA↔P'Aim keep tuning the taste from here.
  // §6b.2 Option 1 balance (measured target · piano −7.3 / violin −16.6 / cello −23.1 dB → violin
  // ~9 dB under the lead · cello ~16 dB under · a bowed answer punches above its number). SA tunes.
  const pianoBus = roleBus(1.0, 0.13, 0)
  const celloBus = roleBus(0.16, 0.05, 0.34)
  const violinBus = roleBus(0.62, 0.12, 0.4)
  const nylonBus = roleBus(0.9, 0.14, 0.05) // guitar lead — front, mostly dry (a fingerpicked lead)
  gr?.setDestination(pianoBus); ce?.setDestination(celloBus); vi?.setDestination(violinBus); ny?.setDestination(nylonBus)
  // the melody (guide) instrument = the chosen lead
  const melInst = lead === 'guitar' ? ny : lead === 'violin' ? vi : gr

  // notes SSOT (shared with the viewer dot/markers). The FULL ordered set = the LOOP UNIT (the
  // "เลือกท่อน"/order SSOT). A seek (tap a word · scrub) arrives as startIndex and offsets ONLY
  // the first pass — so วนซ้ำ returns to the order's START, never the seek point.
  const fullNotes = buildPlayNotes(content, { order, range })
  if (!fullNotes.length) return true
  const seekFrom = startIndex > 0 ? Math.min(startIndex, fullNotes.length - 1) : 0
  const spb = 60 / bpm
  const T = liveTranspose
  const seedBase = seedFor(songId, 0)

  // §6b.2 Option 1 — high-register chord tones (pure · same every pass).
  const tonesInRange = (e, lo, hi) => {
    const pcs = [...new Set([e.bass, ...(e.up || [])].filter((m) => m != null).map((m) => (((m % 12) + 12) % 12)))]
    const out = []
    for (const pc of pcs) for (let m = lo + (((pc - lo) % 12) + 12) % 12; m <= hi; m += 12) out.push(m)
    return [...new Set(out)].sort((a, b) => a - b)
  }

  // ★ tunable ensemble constants (STRUCTURE fixed · SA↔P'Aim จูนค่าด้วยหูตอนฟัง final · §6b.2 Option 1).
  const ENS = {
    sectionGain: { verse: 0.7, chorus: 1.0 }, // section dynamics (verse โปร่ง → chorus เต็ม)
    fill: 0.21, // violin gap-answer gain (a touch present — it fills an empty space)
    counter: 0.14, // violin chorus countermelody gain (ducks more — it overlaps the lead)
  }
  // idiomatic dynamics — metric accent (pure · same every pass).
  const accent = (pb) => { const p = ((pb % 4) + 4) % 4; if (p < 0.01) return 1; if (Math.abs(p - 2) < 0.01) return 0.9; if (Math.abs(p - 1) < 0.01 || Math.abs(p - 3) < 0.01) return 0.8; return 0.72 }

  let pass = 0
  do {
    // pass 0 starts at the seek/resume point; every loop pass after it replays the WHOLE order
    // from note 0 — so วนซ้ำ loops the defined ท่อน, not the seek point. Everything below is
    // rebuilt per pass from THIS pass's notes so pass 0 (sliced) and pass 1+ (full) stay consistent.
    const from = pass === 0 ? seekFrom : 0
    const notes = from > 0 ? fullNotes.slice(from) : fullNotes
    const chordEvents = buildChordVoice(notes)
    const totalBeats = notes.reduce((s, n) => s + n.beats, 0)
    // §6b.2 REAL sections (verse โปร่ง → chorus เต็ม) — a beat→level lookup from the sheet's labels.
    // No sections → whole song = chorus (never breaks).
    const sections = sectionBeatRanges(content, notes)
    const levelAt = (beat) => { const s = sections.find((x) => beat >= x.fromBeat && beat < x.toBeat); return s ? s.level : 'chorus' }
    const secGain = (beat) => ENS.sectionGain[levelAt(beat)]
    // §6b.2 Option 1 — phrase-end GAPS (a long held/rest melody note ≥2.5 beats) where the violin
    // answers, + a beat→chord-event lookup. Rebuilt per pass so the fills line up with these notes.
    const eventAtBeat = (beat) => chordEvents.find((x) => beat >= x.startBeat - 0.01 && beat < x.startBeat + x.beats - 0.01) || chordEvents[chordEvents.length - 1]
    const gaps = []
    { let mb = 0; for (const n of notes) { if (n.midi != null && n.beats >= 2.5) gaps.push({ beat: mb, beats: n.beats, e: eventAtBeat(mb) }); mb += n.beats } }
    const gapBeats = new Set(gaps.map((g) => Math.round(g.beat)))
    // melodic contour (depends on this pass's notes).
    const contour = (i) => { const n = notes[i], pr = notes[i - 1], nx = notes[i + 1]; let c = 1
      if (pr && pr.midi != null && n.midi > pr.midi) c += 0.06
      if (pr && nx && pr.midi != null && nx.midi != null && n.midi > pr.midi && n.midi >= nx.midi) c += 0.06
      if (pr && pr.midi != null && n.midi < pr.midi) c -= 0.04
      if (n.beats >= 3) c -= 0.06
      return c }
    const rng = mulberry32((seedBase ^ (pass * 0x9e37)) >>> 0)
    const rnd = () => rng() * 2 - 1
    const t0 = ctx.currentTime + 0.25
    const tEnd = t0 + totalBeats * spb
    const TJ = 0.012, VJ = 0.06

    // The tune's attacks in beat-space — what the shared PITCH rule checks an ornament against.
    // Built from THIS pass's notes so a seek/loop pass can't compare against the wrong list.
    const attacks = []
    { let ab = 0; for (const n of notes) { if (n.midi != null) attacks.push({ beat: ab, midi: n.midi }); ab += n.beats } }
    // A grace that sings the pitch the tune is about to sing is not heard as decoration, it's heard
    // as an extra melody note ("3 ตัวกลายเป็น 4 ตัว"). Same rule, same function as the solo path's
    // conductor — NOT a copy (referee.js § preEchoesMelody). Its loudness is compared as a RATIO of
    // the melody note it leans on: both go through the same instrument and the same bus, so the
    // ratio IS the perceptual comparison, no mix maths needed. Vetoing a grace never touches the
    // tune, the comp or the bass — only the ornament disappears.
    const graceVetoed = (midi, atBeat, relGain) =>
      policePreEcho && preEchoesMelody({ midi, startBeat: atBeat, gain: relGain }, attacks, { minGain: PREECHO_MIN_GAIN_RATIO })

    // The violin's ลูกเล่น sit on a DIFFERENT bus from the lead, so (unlike a grace) their loudness
    // can only be compared to the tune after the mix. We record what the GUIDE layer actually fired
    // (below) and compare effective levels = fire gain × that role's dry bus level.
    // ⚠ Off by default — this is the ไวโอลินนำ case P'Aim has not judged by ear yet (`preEcho:'all'`).
    const melodyEff = []
    const melBusLevel = lead === 'guitar' ? ENS_BUS.nylon : lead === 'violin' ? ENS_BUS.violin : ENS_BUS.grand
    const melEffAt = (b) => {
      let prev = null
      for (const m of melodyEff) { if (m.beat <= b + 1e-9) prev = m; else break }
      return (prev || melodyEff[0])?.eff || 0
    }
    const violinVetoed = (midi, atBeat, gain) => {
      if (!policeViolin) return false
      const ref = melEffAt(atBeat)
      if (!ref) return false
      return preEchoesMelody({ midi, startBeat: atBeat, gain: (gain * ENS_BUS.violin) / ref }, attacks, { minGain: PREECHO_MIN_GAIN_RATIO })
    }

    // GUIDE layer (ONE melody line) on the LEAD instrument, × section gain (verse quieter → chorus
    // full). piano swells long notes · violin sings long + slide-in · guitar fingerpicks + a
    // hammer-on grace. Only the lead plays the tune; the violin NEVER doubles it.
    let beat = 0
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i]
      if (n.midi != null && melInst) {
        const gd = accent(beat) * contour(i) * (1 + VJ * rnd()) * secGain(beat)
        const t = t0 + beat * spb + TJ * rnd()
        const d = n.beats * spb
        if (lead === 'guitar') {
          // NB the rng() draw happens exactly as before whether or not the grace is vetoed — the
          // humanize stream must not shift, or silencing one ornament would re-roll the whole song.
          const wantGrace = n.beats >= 1 && rng() < 0.18
          if (wantGrace && !graceVetoed(n.midi - 2, beat, 0.42 / 0.56)) melInst.fire(n.midi - 2 + T, t - 0.05, 0.12, 0.42 * gd) // hammer/slide
          melInst.fire(n.midi + T, t, Math.max(0.6, d + 0.4), 0.56 * gd) // plucked, rings
          melodyEff.push({ beat, eff: (0.56 * gd) * melBusLevel })
        } else if (lead === 'violin') {
          const wantGrace = n.beats >= 1 && rng() < 0.2
          if (wantGrace && !graceVetoed(n.midi - 2, beat, 0.28 / 0.42)) melInst.fire(n.midi - 2 + T, t - 0.06, 0.2, 0.28 * gd) // slide-in grace
          melInst.fire(n.midi + T, t, Math.max(0.9, d + 0.6), 0.42 * gd) // violin sings long
          melodyEff.push({ beat, eff: (0.42 * gd) * melBusLevel })
        } else {
          melInst.fire(n.midi + T, t, n.beats >= 3 ? d + 0.5 : Math.max(0.5, d + 0.3), 0.52 * gd)
          melodyEff.push({ beat, eff: (0.52 * gd) * melBusLevel })
        }
      }
      beat += n.beats
    }

    // COMP + BASS — grand arpeggio (front · movement) + cello bass (re-bow ~3 beats · one-shot §6b.1).
    // NO sustained string pad (§6b.2 Option 1). Both × section gain.
    for (const e of chordEvents) {
      if (e.bass == null) continue
      const up = e.up || []
      const bT = t0 + e.startBeat * spb
      const nb = Math.max(1, Math.round(e.beats))
      const sg = secGain(e.startBeat), a = accent(e.startBeat)
      if (ce) { const bg = 0.32 * sg; for (let b = 0; b < nb; b += 3) { const seg = Math.min(3, nb - b); ce.fire(e.bass + T, bT + b * spb, seg * spb + 0.4, bg * a) } }
      if (gr) {
        const ag = 0.13 * sg
        const seq = [up[0], up[1] ?? up[0], up[2] ?? up[0], up[1] ?? up[0]].filter((m) => m != null)
        for (let k = 0; k < nb && seq.length; k++) gr.fire(seq[k % seq.length] + T, bT + k * spb + TJ * rnd(), spb * 1.5, ag * accent(e.startBeat + k))
      }
    }

    // §6b.2 Option 1 — CALL-AND-RESPONSE violin (no pad · P'Aim approved). RESPONSE: the violin
    // answers in each phrase-end gap with a short 3-note turn (high register 71–86, never doubling
    // the tune, entering into the tail so the lead speaks first). COUNTERMELODY: chorus only, a
    // moving line above the tune (74–86, offbeat) on chords that DON'T host a fill. Bowed voices
    // punch above their peak → violin sits ~10–13 dB under the lead (fill 0.21 · counter 0.14).
    if (vi) {
      gaps.forEach((g, gi) => {
        const tones = tonesInRange(g.e, 71, 86)
        if (tones.length < 3) return
        const startBeat = g.beat + Math.max(0.75, g.beats - 2.0)
        const seq = gi % 2 === 0
          ? [{ p: tones[tones.length - 1], d: 0.5 }, { p: tones[tones.length - 2], d: 0.5 }, { p: tones[Math.max(0, tones.length - 3)], d: 1.0 }]
          : [{ p: tones[Math.max(0, tones.length - 3)], d: 0.5 }, { p: tones[Math.max(0, tones.length - 2)], d: 0.5 }, { p: tones[tones.length - 1], d: 1.0 }]
        let b = startBeat
        for (const s of seq) {
          const vg = ENS.fill * secGain(g.beat) * (s.d >= 1 ? 1 : 0.9)
          if (!violinVetoed(s.p, b, vg)) vi.fire(s.p + T, t0 + b * spb, s.d * spb + 0.25, vg)
          b += s.d
        }
      })
      for (const e of chordEvents) {
        if (levelAt(e.startBeat) !== 'chorus') continue
        let hostsFill = false
        for (let bb = e.startBeat; bb < e.startBeat + e.beats; bb++) if (gapBeats.has(Math.round(bb))) hostsFill = true
        if (hostsFill) continue
        const tones = tonesInRange(e, 74, 86)
        if (!tones.length) continue
        const enter = e.startBeat + 1.0, room = e.beats - 1.0
        if (room < 0.6) continue
        const pick = tones[Math.min(tones.length - 1, 1)]
        if (e.beats >= 3 && tones.length >= 2) {
          if (!violinVetoed(pick, enter, ENS.counter)) vi.fire(pick + T, t0 + enter * spb, 1.1 * spb + 0.2, ENS.counter)
          const nxt = tones[Math.min(tones.length - 1, 2)]
          if (!violinVetoed(nxt, enter + 1.3, ENS.counter)) vi.fire(nxt + T, t0 + (enter + 1.3) * spb, Math.min(room - 1.3, 1.4) * spb + 0.3, ENS.counter)
        } else {
          if (!violinVetoed(pick, enter, ENS.counter)) vi.fire(pick + T, t0 + enter * spb, Math.min(room, 1.6) * spb + 0.3, ENS.counter)
        }
      }
    }
    pass++

    // wait loop — same machinery as playSong (stop flag + follow-along onNote)
    const totalMs = (tEnd - ctx.currentTime) * 1000
    const start = Date.now()
    let noteIdx = -1, cumMs = 0
    const noteEndsMs = notes.map((n) => (cumMs += n.beats * spb * 1000))
    while (Date.now() - start < totalMs) {
      if (myFlag.stopped || myToken !== playToken) {
        // release only as the CURRENT pass — a newer pass now owns the shared instruments.
        if (myToken === playToken) activeEnsemble.forEach((w) => { try { w.releaseAll() } catch { /* stopped */ } })
        return true
      }
      const elapsed = Date.now() - start - 80
      let idx = noteIdx < 0 ? 0 : noteIdx
      while (idx < notes.length - 1 && elapsed >= noteEndsMs[idx]) idx++
      if (idx !== noteIdx) { noteIdx = idx; onNote?.(notes[idx], from + idx) }
      onProgress?.(Date.now() - start, totalMs)
      await new Promise((r) => setTimeout(r, 100))
    }
  } while (loop && !myFlag.stopped)
  activeEnsemble = []
  return true
}
