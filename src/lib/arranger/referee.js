// golden-piano — the REFEREE layer (§1 วาทยกร + §2 ยาม). Two FINAL, pure passes that keep the whole
// arrangement disciplined once the individual embellishments / fills / dynamics are turned up at the
// SAME time. Each of those rules was tuned in isolation, so with everything on they collide (an
// embellishment landing right on a melody attack) or drown the tune (a sparkle pinned to
// MEL_BASE×0.7 ≈ 0.245 sits only ~21% under a 0.31 melody, and nothing re-checked it against the
// melody's ACTUAL, post-dynamics loudness). These two passes are the missing "conductor who hears
// every voice at once":
//
//   1. CONDUCTOR (no-clash) — no embellishment/fill may sound ON TOP OF a melody note. A ลูกเล่น
//      plays only in a genuine melodic GAP (the tune is holding a long note, or resting). A busy,
//      fast tune therefore silences the ลูกเล่น automatically ("คลีนทำนองมาก่อน").
//   2. GUARD (balance floor) — the RIGHT HAND ALWAYS LEADS. Every non-melody voice is pinned
//      ≤ the melody actually sounding over it × 0.8 (≥20% under, absolute), and any voice the
//      multiplied dynamics chain pushed toward inaudible is lifted back to a soft floor.
//
// Both are PURE (no AudioContext) and live in arrange(), so live playback and the MP3 export can
// never disagree, and both are headless-testable. INTRINSIC to the arranger (P'Aim 15 ก.ค.: เปิดตลอด,
// no user toggle) — they're discipline rules, not tastes, and they're what let the "เปิดหมด" default
// (every ลูกเล่น on) stay clean instead of turning to mud.

import { clampGainToLayer, FIRED_GAINS } from '../sampler.js'

// beats of clearance a ลูกเล่น needs on EACH side of its onset, away from any melody ATTACK. Inside
// this it is "on top of" the tune (a clash); outside it, it sits in a real melodic gap. 0.4 beat ≈
// just under an eighth-note either side at common tempi — tight enough to allow a tail answer, wide
// enough that a running melody (attacks every ~0.5 beat) leaves no room.
export const REFEREE_GAP = 0.4
// PRE-ECHO window (beats). The conductor used to judge a ลูกเล่น by TIME ALONE — "far enough from a
// melody attack" = safe. But the gap right BEFORE an attack is the most dangerous place there is: an
// ornament that lands there PLAYING THE PITCH THE TUNE IS ABOUT TO SING is not heard as decoration,
// it is heard as an extra melody note ("3 ตัวกลายเป็น 4 ตัว" — เพลง 33, คอร์ด E → sparkle B4 one beat
// before the tune's B4 B4 B4). Nothing caught it: the pitch is never drawn on the sheet and never in
// the data — it exists only while playing. So the conductor now listens to PITCH as well as time.
// 2 beats ≈ 1.4–1.7 s at worship tempi (70–90 bpm) — the span over which the ear still binds an
// early sounding of a pitch to the accented arrival of that same pitch (an anacrusis / pickup is
// heard as belonging to the beat it leads into). Past that the two read as separate events, so a
// wider window would silence honest ornaments for no perceptual gain.
export const PREECHO_LOOKAHEAD = 2
// how far apart two pitches may be and still fuse into "the same note arriving early", in octaves.
// 1 = unison or one octave (chroma identity is what the ear latches onto; sparkle is by construction
// an octave-up doubling, which is exactly how the เพลง 33 case slipped through a unison-only check).
// Two octaves apart the registers separate and it reads as a genuine shimmer, so it is left alone.
export const PREECHO_OCTAVES = 1
// only an ornament LOUD enough to be mistaken for the tune can pre-echo it. A garnish sitting far
// under the melody (gapFill ≈ 0.041, chromaticApproach ≈ 0.039, octaveSwell ≈ 0.033 — all ~8× under
// the 0.31 melody) is heard as texture and may keep echoing the coming pitch; it is sparkle, pinned
// at MEL_BASE×0.7 ≈ 0.245 (only ~21% under the tune), that reads as a note. 0.12 ≈ 8 dB under the
// melody = the audibility line the diagnosis measured with, so the detector and the fix agree.
export const PREECHO_MIN_GAIN = 0.12
// The SAME line expressed as a FRACTION of the melody (0.12 / 0.31 ≈ 0.387). The solo path can use
// the absolute number because every gain there is on one scale; the ensemble (playEnsemble) mixes
// each role through its own bus, so an absolute 0.12 would mean a different loudness per voice.
// Both callers must police the same PERCEPTUAL line, so the ratio is the portable form of it.
export const PREECHO_MIN_GAIN_RATIO = PREECHO_MIN_GAIN / FIRED_GAINS.melody
// the right hand leads by ≥20%: every non-melody voice ≤ concurrent melody × LEAD. Absolute.
export const MELODY_LEAD = 0.8
// audible floor — a voice shaded down by many multiplied factors (accent × contour × section ×
// humanize × easeUnderHold) must not vanish under the tune. Above the sampler layer floor (0.03)
// so it maps to a soft-but-present velocity, never silence.
export const AUDIBLE_FLOOR = 0.045
// legato overlap (beats): how far each LEFT-HAND (bass) note is stretched PAST the next bass onset so
// the line connects with no "ฟันหลอ" (a silent seam). 0.2 beat safely beats the scheduler's fixed
// ~0.05s release-early across every worship tempo (0.2 beat > 0.05s for bpm < 240), yet is far less
// blur than a real sustain pedal — so held/pedal roots and walking steps join smoothly.
export const BASS_LEGATO_OVERLAP = 0.2

const melodyOnsets = (events) =>
  events.filter((e) => e.role === 'melody').map((e) => e.startBeat).sort((a, b) => a - b)

export const melodyAttacks = (events) =>
  events.filter((e) => e.role === 'melody' && e.midi != null)
    .map((e) => ({ beat: e.startBeat, midi: e.midi }))
    .sort((a, b) => a.beat - b.beat)

// THE PITCH RULE — the one shared piece of discipline (PM 24 ก.ค.). "Does this ornament sing a pitch
// the tune is about to sing?" — same chroma, within `octaves` octaves, arriving inside the look-ahead
// window, and loud enough to be mistaken for the tune rather than heard as texture.
//
// It lives alone, pure, and BOTH playback paths call THIS function — the solo/arrange() conductor
// below, and playEnsemble (โหมดรวมวง), which has its own hand-rolled scheduler and never runs
// arrange(). Copying the rule into the ensemble would have made two rules that drift; the ensemble
// deliberately does NOT take the conductor's other (TIME) rule, because measurement showed that rule
// would delete 43–58% of the ensemble's ornaments and 100% of its idiomatic graces — a grace sits
// 50 ms before its own note ON PURPOSE (an acciaccatura), so a "must be in a melodic gap" test kills
// every one. See docs/reports/ensemble-preecho.md.
//
//   ev      : { midi, startBeat, gain } — gain on whatever scale `minGain` is expressed in
//   attacks : melodyAttacks(...) — MUST be sorted by beat (we stop at the first one past the window)
export function preEchoesMelody(ev, attacks, cfg = {}) {
  const look = cfg.look ?? PREECHO_LOOKAHEAD
  const octaves = cfg.octaves ?? PREECHO_OCTAVES
  const minGain = cfg.minGain ?? PREECHO_MIN_GAIN
  if (ev.midi == null || look <= 0 || ev.gain < minGain) return false
  for (const a of attacks) {
    if (a.beat <= ev.startBeat + 1e-9) continue
    if (a.beat - ev.startBeat > look + 1e-9) break
    const d = Math.abs(a.midi - ev.midi)
    if (d % 12 === 0 && d <= octaves * 12) return true
  }
  return false
}

// §1 CONDUCTOR. Embellishments (sparkle / gapFill / chromaticApproach) and ลูกรับส่ง (answerFills)
// are ALL role 'emb'. Keep one only when BOTH tests pass:
//   (a) TIME — its onset sits in a melodic gap, ≥ `gap` beats from the melody attack immediately
//       before AND after it (nothing plays on top of the tune);
//   (b) PITCH — it does not PRE-ECHO the tune: it may not sound the pitch (unison or octave) of a
//       melody attack arriving within the next `preEcho` beats. Test (a) alone declared the gap
//       before an attack safe, which is exactly where a same-pitch ornament turns into a phantom
//       extra melody note.
// melody / comp / bass are never touched here (the tune and its foundation always play); only the
// optional ลูกเล่น are policed. Pure + returns a NEW array. No melody at all (chords-only) → nothing
// to protect, pass through unchanged.
export function refereeNoClash(events, cfg = {}) {
  const gap = cfg.refereeGap ?? REFEREE_GAP
  const look = cfg.refereePreEcho ?? PREECHO_LOOKAHEAD
  const octaves = cfg.refereePreEchoOctaves ?? PREECHO_OCTAVES
  const minGain = cfg.refereePreEchoMinGain ?? PREECHO_MIN_GAIN
  const onsets = melodyOnsets(events)
  if (!onsets.length) return events
  const attacks = melodyAttacks(events)
  // (b) PITCH — the shared rule, the same function playEnsemble calls (§ preEchoesMelody above).
  const preEchoes = (e) => preEchoesMelody(e, attacks, { look, octaves, minGain })
  const clearOfMelody = (b) => {
    let prev = -Infinity
    let next = Infinity
    for (const o of onsets) {
      if (o <= b + 1e-9) prev = o // nearest attack at/before b (a held note started here)
      else { next = o; break } // first attack after b (the next note the tune will hit)
    }
    return b - prev >= gap - 1e-9 && next - b >= gap - 1e-9
  }
  return events.filter((e) => e.role !== 'emb' || (clearOfMelody(e.startBeat) && !preEchoes(e)))
}

// §2 GUARD (balance floor). Run LAST, after every gain is final (post-clampAll). For each non-melody
// event, pin it under the melody that is actually sounding at its onset (right-hand-leads, ≥20%),
// then lift a voice the dynamics chain drove toward inaudible back up to the soft floor — but never
// past the melody-lead ceiling, so the ≥20% lead is absolute. Melody events are never touched.
// Mutates gains in place (mirrors clampAll's contract) and returns the array.
export function balanceFloor(events, cfg = {}) {
  const lead = cfg.melodyLead ?? MELODY_LEAD
  const floor = cfg.audibleFloor ?? AUDIBLE_FLOOR
  const mel = events.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  if (!mel.length) return events
  // prevailing melody gain at beat b: the melody note ringing over b, else the most recent one (so
  // during a rest the balance still tracks the line that just sang), else the first.
  const melGainAt = (b) => {
    const cover = mel.find((m) => b >= m.startBeat - 1e-9 && b < m.startBeat + m.beats)
    if (cover) return cover.gain
    let prev = null
    for (const m of mel) { if (m.startBeat <= b + 1e-9) prev = m; else break }
    return (prev || mel[0]).gain
  }
  for (const e of events) {
    if (e.role === 'melody') continue
    const ceil = melGainAt(e.startBeat) * lead
    let g = Math.min(e.gain, ceil) // right hand leads: never above 80% of the tune
    g = Math.max(g, Math.min(floor, ceil)) // lift toward the floor, but the lead ceiling still wins
    e.gain = clampGainToLayer(g)
  }
  return events
}

// §3 LEFT-HAND CEILING (พี่เปา 30 ก.ค. · rule ②). "มือซ้ายไม่ให้เกิน middle C ขึ้นมา" — he confirmed
// that the "C3" in the first round meant MIDDLE C, MIDI 60 — plus the rule from the first round: the
// left hand may never sound HIGHER than the tune it is accompanying, so the melody always floats on
// top and the ear can always tell which line is the tune.
//
// WHY A POST-PASS AND NOT A NARROWER VOICE-LEADING WINDOW: the second half of the rule needs to know
// what the MELODY is doing, and buildChordVoice/voicing() never see the melody — they only see chord
// symbols. Squeezing midi.js's UP_LO..UP_HI window down to 48..60 instead would leave most pitch
// classes exactly ONE legal octave, which freezes the voicing into one shape per chord — the "มือซ้าย
// แบนระดับเดียว" that raising the chords was meant to cure. So the ceiling is enforced here, where both
// hands are visible, by dropping an offending voice a whole octave (its pitch CLASS never changes, so
// the chord the sheet prints is still the chord that sounds — golden rule §1a).
//
// ⛔ NOT IMPLEMENTED ON PURPOSE: a limit on how WIDE the left-hand chord may be. G guessed the garbled
// line "เสียงต้องไม่เกินอ๊อกเตะ" meant a 1-octave voicing span; พี่เปา corrected that himself — "ข้อ 4
// จริงๆ ก็คือความหมายเดียวกันกับข้อ 2 ไม่ได้จำกัดว่าให้เล่นความกว้างอยู่แค่ 1 ออคเต็ป ไม่ใช่นะ".
export const LH_CEILING = 60 // middle C
// how far down a voice may be pushed chasing the ceiling. Below C2 a stacked chord turns to mud, so a
// voice that cannot be made legal without going under this is left where it is (and stays counted as a
// violation) rather than being buried.
export const LH_FLOOR = 36
// roles that ARE the left hand: the comp and the bass. 'emb' (ประกาย / ลูกเล่น) is a deliberate high
// shimmer policed by the conductor's pre-echo rule above, and พี่เปา's rule names คอร์ด and เบส.
const isLeftHand = (e) => e.role === 'inner' || e.role === 'bass'

// The melody pitch the left hand has to stay under at beat `b`: the highest tune note actually RINGING
// there, else the most recent one (during a rest the tune we just heard is still the reference).
function melodyCeilingFn(events) {
  const mel = events.filter((e) => e.role === 'melody' && e.midi != null).sort((a, b) => a.startBeat - b.startBeat)
  if (!mel.length) return () => null
  return (b) => {
    let hi = null
    let prev = null
    for (const m of mel) {
      if (m.startBeat > b + 1e-9) break
      prev = m
      if (b < m.startBeat + m.beats - 1e-9) hi = hi == null ? m.midi : Math.max(hi, m.midi)
    }
    return hi != null ? hi : (prev ? prev.midi : null)
  }
}

export function leftHandCeiling(events, cfg = {}) {
  const ceil = cfg.leftHandCeiling ?? LH_CEILING
  const floor = cfg.leftHandFloor ?? LH_FLOOR
  const melAt = melodyCeilingFn(events)
  for (const e of events) {
    if (!isLeftHand(e) || e.midi == null) continue
    const mel = melAt(e.startBeat)
    // strictly BELOW the tune (equal pitch is rule ③'s business, and is handled there)
    const limit = mel == null ? ceil : Math.min(ceil, mel - 1)
    while (e.midi > limit && e.midi - 12 >= floor) e.midi -= 12
  }
  return events
}

// §4 NO UNISON WITH THE TUNE (พี่เปา 30 ก.ค. · rule ③). "ไม่ให้เล่นซ้ำ โดยเฉพาะโน้ตตัวสุดท้ายของมือซ้าย
// ... มาชนกับมือขวาในจังหวะที่ถูกทิ้ง หรือกดทำให้สับสน เพราะเสียงมันเป็นเสียงเดียวกัน".
//
// The test is NOT "struck at the same moment". It is: at the instant the left hand plays, is the right
// hand still RINGING that very pitch? A tune note left hanging over a bar is the case he singles out —
// the left hand walks into it and the two fuse into one confused sound. So we check every melody note
// SOUNDING at the left-hand onset, not just the ones that start there.
//
// The escape is his own: 'CG ... มือซ้ายเล่น G แล้วก็ไปตรงกับ G มือขวา อันเนี้ยไม่ได้ ต้องหลบกัน' — the
// left hand moves to a DIFFERENT tone OF THE SAME CHORD (C or E under a held G), so the harmony is
// unchanged and only the doubling disappears. Preference order:
//   1. another chord tone, nearest to where the voice already was (smallest possible move)
//   2. failing that, the same tone an octave away (no longer the same pitch, still legal)
//   3. failing that, leave it — never drop the note, which would punch a hole in the comp.
// The BASS may only take option 2: moving it to a different chord tone would change the foundation the
// whole bar is built on, which is a harmony decision, not a collision fix.
export function leftHandNoUnison(events, voicedChords = [], cfg = {}) {
  const ceil = cfg.leftHandCeiling ?? LH_CEILING
  const floor = cfg.leftHandFloor ?? LH_FLOOR
  const mel = events.filter((e) => e.role === 'melody' && e.midi != null).sort((a, b) => a.startBeat - b.startBeat)
  if (!mel.length) return events
  // every melody pitch RINGING at beat b (a note still sounding counts, which is พี่เปา's whole point)
  const ringing = (b) => {
    const out = []
    for (const m of mel) {
      if (m.startBeat > b + 1e-9) break
      if (b < m.startBeat + m.beats - 1e-9) out.push(m.midi)
    }
    return out
  }
  const chordAt = (b) => voicedChords.find((c) => b >= c.startBeat - 1e-9 && b < c.startBeat + c.beats - 1e-9)
  const taken = (p, ring) => ring.some((m) => m === p)

  for (const e of events) {
    if (!isLeftHand(e) || e.midi == null) continue
    const ring = ringing(e.startBeat)
    if (!taken(e.midi, ring)) continue
    const melHi = ring.length ? Math.max(...ring) : null
    const limit = melHi == null ? ceil : Math.min(ceil, melHi - 1)
    const legal = (p) => p >= floor && p <= limit && !taken(p, ring)

    let moved = null
    if (e.role === 'inner') {
      const chord = chordAt(e.startBeat)
      const classes = new Set()
      if (chord) {
        for (const u of chord.up || []) classes.add(((u % 12) + 12) % 12)
        if (chord.bass != null) classes.add(((chord.bass % 12) + 12) % 12)
      }
      classes.delete(((e.midi % 12) + 12) % 12) // option 1 = a DIFFERENT tone of the same chord
      let best = null
      for (const pc of classes) {
        for (let p = floor + (((pc - floor) % 12) + 12) % 12; p <= limit; p += 12) {
          if (!legal(p)) continue
          if (best == null || Math.abs(p - e.midi) < Math.abs(best - e.midi)) best = p
        }
      }
      moved = best
    }
    if (moved == null) { // option 2 — the same tone an octave away (the only move the bass may make)
      for (const p of [e.midi - 12, e.midi + 12]) if (legal(p)) { moved = p; break }
    }
    if (moved != null) e.midi = moved // option 3 = leave it; never delete a note
  }
  return events
}

// §1 LEGATO — close the vacuum between consecutive LEFT-HAND (bass) notes (G's "ล็อก Note-Off · ปิด
// ช่องว่างสูญญากาศ"). A held/pedal or walking bass should CONNECT, but every note is released a hair
// early by the scheduler (and humanize used to jitter its onset), leaving a silent seam = "ฟันหลอ".
// Fix in pure beat-space: stretch each bass note's LENGTH to reach the next bass onset plus a small
// overlap, so it rings into the next note no matter the tempo. Pitches and ONSETS never move (golden
// rule §1a) — only how long the left hand holds. Mutates beats in place; returns the array.
export function legatoBass(events, cfg = {}) {
  const overlap = cfg.bassLegatoOverlap ?? BASS_LEGATO_OVERLAP
  const bass = events.filter((e) => e.role === 'bass').sort((a, b) => a.startBeat - b.startBeat)
  for (let i = 0; i < bass.length - 1; i++) {
    const span = bass[i + 1].startBeat - bass[i].startBeat // grid distance to the next left-hand note
    if (span > 0) bass[i].beats = Math.max(bass[i].beats, span + overlap)
  }
  return events // the final bass note keeps its own length (nothing after it to connect to)
}
