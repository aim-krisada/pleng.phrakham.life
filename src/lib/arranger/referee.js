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

import { clampGainToLayer } from '../sampler.js'

// beats of clearance a ลูกเล่น needs on EACH side of its onset, away from any melody ATTACK. Inside
// this it is "on top of" the tune (a clash); outside it, it sits in a real melodic gap. 0.4 beat ≈
// just under an eighth-note either side at common tempi — tight enough to allow a tail answer, wide
// enough that a running melody (attacks every ~0.5 beat) leaves no room.
export const REFEREE_GAP = 0.4
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

// §1 CONDUCTOR. Embellishments (sparkle / gapFill / chromaticApproach) and ลูกรับส่ง (answerFills)
// are ALL role 'emb'. Keep one only when its onset sits in a melodic gap — at least `gap` beats from
// the melody attack immediately before AND after it. melody / comp / bass are never touched here
// (the tune and its foundation always play); only the optional ลูกเล่น are policed. Pure + returns a
// NEW array. No melody at all (chords-only) → nothing to protect, pass through unchanged.
export function refereeNoClash(events, cfg = {}) {
  const gap = cfg.refereeGap ?? REFEREE_GAP
  const onsets = melodyOnsets(events)
  if (!onsets.length) return events
  const clearOfMelody = (b) => {
    let prev = -Infinity
    let next = Infinity
    for (const o of onsets) {
      if (o <= b + 1e-9) prev = o // nearest attack at/before b (a held note started here)
      else { next = o; break } // first attack after b (the next note the tune will hit)
    }
    return b - prev >= gap - 1e-9 && next - b >= gap - 1e-9
  }
  return events.filter((e) => e.role !== 'emb' || clearOfMelody(e.startBeat))
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
