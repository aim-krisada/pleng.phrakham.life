// B107 P2 · LAYER 2 — Dynamics / Expression (§3). Each rule is ONE export that takes a
// PerfEvent[] and returns it with `gain` and/or `timeShift` adjusted, so rules compose and
// can be switched on/off individually per cfg. This is the layer that removes the "แข็ง
// เหมือนหุ่นยนต์" feel. Step 1 ships the two humanize rules (the consultant's #1 "ฐาน",
// biggest effect for least work); accent/contour/section/rubato land in step 4.
//
// All randomness comes from the seeded rng passed in (rng.js) — never Math.random() — so a
// performance is reproducible (MP3 == live) and two loop passes differ but repeat.

import { clampGainToLayer } from '../sampler.js'
import { stressAt } from './meter.js'

// R2.4 — Humanize velocity: nudge each attack's gain by ±`amount` (P'Aim locked ±6%).
// GUARD (velocity-in-layer, §7b · P1 lesson): after the nudge, clamp gain into the sampler's
// usable window so gainToVelocity() stays inside the loaded layer — never a silent note.
export function humanizeVel(events, rng, amount = 0.06) {
  for (const e of events) {
    const jitter = 1 + (rng() * 2 - 1) * amount // [1-amount, 1+amount)
    e.gain = clampGainToLayer(e.gain * jitter)
  }
  return events
}

// How much smaller the chord-stack timing spread is vs the melody's. The bass+inner voices of
// ONE chord get only a hair of spread — enough that they're "not machine-perfectly together"
// like a real hand, but small enough they still read as a single chord (not an arpeggio).
const CHORD_TIME_RATIO = 0.35

// R2.5 — Humanize micro-timing: give each attack a small onset shift (seconds) so onsets stop
// landing dead on the grid — the single biggest "หายหุ่นยนต์" cue. `sigma` = melody spread in
// seconds (P'Aim locked ±12ms → 0.012); chord voices use sigma·CHORD_TIME_RATIO so the AC
// "chord spread < melody spread" holds. timeShift is ADDITIVE so later rules (rubato) can push
// on top. Seeded → deterministic per (song, pass).
export function humanizeTime(events, rng, sigma = 0.012) {
  for (const e of events) {
    // §1 (golden-piano) — the BASS is the anchor: keep it dead on the grid so a held/legato left hand
    // never gets a jittered onset that opens a seam ("ฟันหลอ"). Only melody + inner voices breathe.
    if (e.role === 'bass') { e.timeShift = e.timeShift || 0; continue }
    const s = e.role === 'melody' ? sigma : sigma * CHORD_TIME_RATIO
    const jitter = (rng() * 2 - 1) * s
    e.timeShift = (e.timeShift || 0) + jitter
    // Remember how much of this onset is RANDOM, so lockDownbeats can take back exactly that much
    // at beat 1 without disturbing an offset some other layer put there on purpose.
    e.humanizeShift = (e.humanizeShift || 0) + jitter
  }
  return events
}

// R2.10 — DOWNBEAT LOCK (พี่เปา 30 ก.ค. · rule ①). "เห็นด้วยว่าคนลงจังหวะเดียวกัน … เพื่อให้ไม่รู้สึกว่า
// เล่นแล้วมันกระตุก หรือเพลงมันเหลื่อมในจังหวะแรก". At beat 1 of a bar the tune, the chord and the bass
// must strike at the SAME instant; the ear hears any spread there as แฉลบ / เหลื่อม / กระตุก, not as a
// human touch. humanizeTime gives melody ±12 ms and chord ±4.2 ms INDEPENDENTLY, so the two hands are
// pulled apart at exactly the moment they should be tightest (measured: 97.1% of downbeats, worst 75 ms).
//
// TWO THINGS THIS DELIBERATELY DOES NOT DO:
//   · it never touches `gain` — พี่เปา in the same breath: "แต่น้ำหนักต้องไม่เท่ากันนะ". Only the CLOCK
//     is unified; humanizeVel, metricAccent and the melody-lead balance all still shape each hand's
//     weight separately, so the downbeat is together but not flat.
//   · it only locks beat 1. Beats 2/3/4 and the subdivisions keep their natural spread (พี่เปา: "ส่วน
//     จังหวะย่อยกลางห้อง … ปล่อยให้มีความเหลื่อมธรรมชาติตามปกติ").
//
// WHAT IT REMOVES is exactly the RANDOM part of the onset (`humanizeShift`) and nothing else. It does
// not flatten the downbeat to zero, because not every offset there is noise:
//   · the rubato BREATH — a phrase that starts a hair late is musical. rubato() now gives that one
//     shift to every voice struck at that instant, so the whole texture arrives late TOGETHER; that is
//     also the direct answer to พี่เปา's line-join note (a new ท่อน/บรรทัด breathes with both hands).
//   · an instrument's own idiom — a guitar DOWN-STRUM rakes its strings low→high with a deliberate
//     per-string offset. That is ONE hand's signature, not two hands drifting apart, and flattening it
//     would turn a strum into a block chord. พี่เปา's rule is about the piano's two hands.
export function lockDownbeats(events, barBeats = 4, barOffset = 0) {
  if (!(barBeats > 0)) return events
  for (const e of events) {
    const x = (e.startBeat - barOffset) / barBeats
    if (Math.abs(x - Math.round(x)) > 1e-4) continue // not beat 1 of a bar
    if (!e.humanizeShift) continue
    e.timeShift = (e.timeShift || 0) - e.humanizeShift
    e.humanizeShift = 0
  }
  return events
}

const isOffBeat = (b) => Math.abs(b - Math.round(b)) > 0.05

// R2.9 — Ease the left hand under a HELD melody note (P'Aim 14 ก.ค.: "ถ้ามันควรเงียบ → ผ่อนเบา").
// While the tune sustains one note for a while (e.g. `2 – – –`), the comp shouldn't keep walking on
// every beat ("ตึ่งตึง นานไปจนน่ารำคาญ") — it should thin out so the held note can ring. Once the
// melody has been holding ≥ holdBeats, thin the comp's inner hits. Bass and melody are untouched (the
// foundation + tune stay); the moment the melody moves again, full comp resumes. Returns a NEW
// filtered array. Comp is already at the layer's soft floor, so "ผ่อนเบา" here means playing FEWER
// notes (real space), not just quieter.
//
// HOLLOW-GAP FIX (round 2 · live round-23: "ท่อนเงียบ ~2 บีต / โหวง"): keeping ONLY the bar downbeat
// meant a note held across a whole bar (e.g. `2 – – –` in 4/4) had its comp re-struck once at beat 1
// then NOTHING for beats 2–4 — the held note + pedal bass just decayed into a ~2-beat hole. The fix
// is a gentle HALF-NOTE PULSE: keep the bar downbeat AND the mid-bar beat, so a long held note still
// has a soft pulse under it (fills the hole) while staying far calmer than full per-beat comp. `pulse`
// (default on) is round 2's knob — set false to fall back to the old downbeat-only "ผ่อนสุด" feel.
// `meter` (optional) = meterOf(timeSignature). The mid-bar pulse must land on the meter's real
// secondary stress, not at Math.floor(beatsPerBar / 2) — see metricAccent below for why that was
// wrong everywhere except 4/4. A meter with no secondary stress (3/4, 6/8 …) keeps only the
// downbeat pulse, which is what a waltz or a 6/8 lilt actually does.
export function easeUnderHold(events, beatsPerBar = 4, holdBeats = 2, pulse = true, meter = null, barOffset = 0) {
  const onsets = events.filter((e) => e.role === 'melody').map((e) => e.startBeat).sort((a, b) => a - b)
  if (!onsets.length) return events
  const m = meter || { barBeats: beatsPerBar, pulseBeats: 1, mediumAt: beatsPerBar >= 4 && beatsPerBar % 2 === 0 ? beatsPerBar / 2 : null }
  const mid = m.mediumAt // the meter's own secondary stress, or null when it has none
  const beatsHeld = (b) => {
    let last = -Infinity
    for (const o of onsets) { if (o <= b + 1e-6) last = o; else break }
    return b - last
  }
  return events.filter((e) => {
    if (e.role !== 'inner') return true // bass / melody / embellishment untouched
    if (beatsHeld(e.startBeat) < holdBeats) return true // melody moving / just moved → full comp
    // Quantise onto the METER's pulse grid before comparing, which is what the old
    // `Math.round(startBeat)` did for x/4 meters — an event sitting just off the pulse still
    // counts as that pulse. Generalising it to pulseBeats keeps 4/4 and 3/4 bit-identical while
    // making it correct for a compound meter, whose pulses are 1.5 quarter-notes apart and would
    // never survive whole-number rounding.
    const pb = m.pulseBeats || 1
    const b = Math.round((e.startBeat - barOffset) / pb) * pb
    const inBar = ((b % m.barBeats) + m.barBeats) % m.barBeats
    // deep in a held note → keep the bar downbeat, plus (pulse on) the meter's secondary stress so
    // it doesn't go hollow. A meter without one (3/4, 6/8 …) keeps the downbeat alone.
    return Math.abs(inBar) < 1e-6 || (pulse && mid != null && Math.abs(inBar - mid) < 1e-6)
  })
}

// R2.2 — Metric accent: emphasise the downbeat of each bar, ease off the weak beats and the
// off-beats, so the pulse breathes instead of every note hitting equally hard. Multiplies gain by
// a position factor in [0.72, 1.0]. Reads beats-per-bar from the caller (time signature).
// `meter` (optional) = meterOf(timeSignature). The secondary ("medium") stress used to be placed
// at Math.floor(beatsPerBar / 2), which is the right beat for 4/4 and the wrong one for almost
// everything else — a 3/4 bar came out strong-MEDIUM-weak, i.e. a waltz accented on beat 2, when
// the standard is strong-weak-weak with no secondary stress at all. That is what พี่เปา heard as
// "เสียงหนัก-เบาไปตกผิดที่", and it is why 4/4 was the one meter that sounded fine. stressAt()
// reads the meter properly, and only gives a bar a secondary stress when the meter has one.
export function metricAccent(events, beatsPerBar = 4, meter = null, barOffset = 0) {
  const m = meter || { barBeats: beatsPerBar, pulseBeats: 1, mediumAt: beatsPerBar >= 4 && beatsPerBar % 2 === 0 ? beatsPerBar / 2 : null }
  for (const e of events) {
    // Gentler spread than before (P'Aim 14 ก.ค. "กระแทกหนักไป"): the downbeat still leads the pulse
    // but no longer THUMPS — range narrowed to [0.8, 0.92] so beat 1 isn't a hard stab.
    // What counts as "between the beats" is the METER's business, not a fixed whole-number test:
    // in 6/8 the second beat falls 1.5 quarter-notes in, and an isOffBeat()-style check ahead of
    // the meter would demote that real beat to an off-beat. stressAt decides all four levels.
    const s = stressAt(m, Math.round(e.startBeat * 4) / 4, barOffset)
    e.gain *= s === 'strong' ? 0.92 : s === 'medium' ? 0.86 : s === 'weak' ? 0.82 : 0.8
  }
  return events
}

// R2.3 — Melodic contour: within the tune, rising lines and local peaks get a touch louder while
// long/phrase-ending notes ease off — the shape a singer/player naturally gives a line. Operates
// on the melody events in order; factor clamped to [0.5, 1.2].
export function melodicContour(events) {
  const mel = events.filter((e) => e.role === 'melody')
  for (let i = 0; i < mel.length; i++) {
    const prev = mel[i - 1]
    const next = mel[i + 1]
    let c = 1
    if (prev) c += mel[i].midi > prev.midi ? 0.06 : mel[i].midi < prev.midi ? -0.04 : 0
    if (prev && next && mel[i].midi > prev.midi && mel[i].midi >= next.midi) c += 0.06 // local peak
    if (mel[i].beats >= 3) c -= 0.06 // long / phrase-ending note settles
    mel[i].gain *= Math.max(0.5, Math.min(1.2, c))
  }
  return events
}

// R2.6 — Section dynamics: verse softer, chorus/รับ fuller. sections = [{fromBeat,toBeat,name}]
// (optional — no-op if not provided). map = { verse:0.85, chorus:1.0, bridge:0.9, … }.
export function sectionDynamics(events, sections, map = {}) {
  if (!sections || !sections.length) return events
  for (const e of events) {
    const s = sections.find((x) => e.startBeat >= x.fromBeat && e.startBeat < x.toBeat)
    if (s && map[s.name] != null) e.gain *= map[s.name]
  }
  return events
}

// R2.7 — Crescendo / decrescendo: a linear gain ramp across a beat span (a "hairpin"). hairpins =
// [{fromBeat,toBeat,from,to}] (optional). Events inside a hairpin get gain × interpolated factor.
export function crescendo(events, hairpins) {
  if (!hairpins || !hairpins.length) return events
  for (const e of events) {
    for (const h of hairpins) {
      if (e.startBeat >= h.fromBeat && e.startBeat <= h.toBeat) {
        const t = (e.startBeat - h.fromBeat) / Math.max(1e-6, h.toBeat - h.fromBeat)
        e.gain *= h.from + t * (h.to - h.from)
      }
    }
  }
  return events
}

// R2.8 — Structural rubato (P'Aim ข้อ 4): the music "breathes" at the END OF A ท่อน (section
// boundary) and at the song's end. The last melody note of a ท่อน RINGS LONGER (beats × STRETCH,
// ~12% within the 10–15% ask) and the first note of the next ท่อน comes in a hair late (BREATH) —
// a held breath before the new phrase, กินใจ. The sheet grid (startBeat) is NEVER moved, so timing
// can't drift: only that one note's LENGTH and one onset nudge change; every other note still lands
// on its own grid position. `sections` = [{fromBeat,toBeat,…}] (from sectionBeatRanges); a new
// section's fromBeat (after the first) is a boundary. With NO sections, only the very last note of
// the song ritards. Fires only at ท่อน ends — NOT every long note (that was the old proxy).
const RUBATO_STRETCH = 1.12 // last-note lengthening (P'Aim: 10–15%)
const RUBATO_BREATH = 0.06 // seconds of "breath" before the next ท่อน
// A breath is a WHOLE-BODY gesture, not a melody-only one (พี่เปา 30 ก.ค. item 5: "ช่วงที่ต่อบรรทัด
// บางทีโน้ตมันลากไว้ แล้วเวลาขึ้นมันขึ้นเหลื่อม ๆ ขึ้นไม่ตรงจังหวะ"). The breath used to be added to the
// melody note ALONE, so the tune came in ~60 ms after a left hand that had stayed on the grid — the two
// hands pulled apart at exactly a phrase/line start, which is the seam he can hear. Give the same shift
// to every voice struck at that instant so the whole texture breathes together and still arrives as one.
function breatheAt(events, beat, amount) {
  for (const e of events) {
    if (Math.abs(e.startBeat - beat) > 1e-6) continue
    e.timeShift = (e.timeShift || 0) + amount
    e.breath = amount // tag: lockDownbeats keeps a deliberate shift, discards plain humanize jitter
  }
}

export function rubato(events, sections = []) {
  const mel = events.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  if (!mel.length) return events
  // boundary beats = where a NEW ท่อน starts (skip the first section's start = song start)
  const bounds = (sections || []).map((s) => s.fromBeat).filter((b, i) => i > 0 && b != null)
  for (let i = 0; i < mel.length; i++) {
    const cur = mel[i]
    const next = mel[i + 1]
    // ท่อน-end = a boundary falls between this note and the next (or this is the song's last note)
    const crosses = bounds.some((b) => b > cur.startBeat && (!next || b <= next.startBeat))
    if (!next || crosses) {
      cur.beats *= RUBATO_STRETCH // the ท่อน's last note rings longer (the "ยืด")
      if (next) breatheAt(events, next.startBeat, RUBATO_BREATH) // breath into the new ท่อน, both hands
    }
  }
  return events
}

// Final safety net: guarantee every gain maps into the loaded velocity layer, even if humanize
// is disabled (accent/contour could otherwise leave a product outside the window). §7b.
export function clampAll(events) {
  for (const e of events) e.gain = clampGainToLayer(e.gain)
  return events
}
