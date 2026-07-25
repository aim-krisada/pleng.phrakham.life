// Meter — how a time signature divides a bar, and where the stress falls inside it.
//
// The arranger used to derive both of these from the time signature's NUMERATOR alone
// (`beatsPerBar = parseInt(ts)`), plus a mid-bar stress at `Math.floor(numerator / 2)`.
// Both are wrong for most meters, and the second is right for 4/4 only by coincidence —
// which is exactly why 4/4 was the one meter that sounded fine while 3/4 and 6/8 did not.
//
// ── the standard (conventional Western metrical accent) ────────────────────────────────
// A time signature n/d has a BEAT (pulse) and a bar made of some number of those pulses:
//
//   SIMPLE meters — n = 2, 3, 4 (and other n not divisible by 3): the beat IS the note the
//   denominator names, so the bar holds n pulses, each 4/d quarter-notes long.
//     2/4  duple      → strong · weak
//     3/4  triple     → strong · weak · weak          ← NO stress on beat 2
//     4/4  quadruple  → strong · weak · MEDIUM · weak ← the secondary stress is on beat 3
//     3/2  triple     → same shape as 3/4, each pulse a half note (bar = 6 quarter-notes)
//
//   COMPOUND meters — n divisible by 3 and n > 3: the beat is a DOTTED note worth three of
//   the denominator's notes, so the bar holds n/3 pulses, each 3·(4/d) quarter-notes long.
//     6/8   compound duple      → 2 pulses: strong · weak        (bar = 3 quarter-notes)
//     9/8   compound triple     → 3 pulses: strong · weak · weak
//     12/8  compound quadruple  → 4 pulses: strong · weak · MED · weak
//     6/4   compound duple      → 2 pulses of a dotted half      (bar = 6 quarter-notes)
//
// The secondary ("medium") stress exists only where the bar splits into two EQUAL halves,
// each of which then carries its own downbeat — i.e. an EVEN number of pulses, 4 or more.
// A duple bar (2 pulses) has nothing to sub-divide; a triple bar (3 pulses) cannot split
// evenly, which is precisely why a waltz is strong-weak-weak and not strong-weak-medium.
//
// Irregular meters (5/4, 7/8 …) group unevenly (3+2, 2+2+3, …) and the grouping is a
// per-piece editorial choice, not something a time signature alone settles. We therefore
// mark only the downbeat for them rather than guessing a grouping and stressing the wrong
// note. This is a deliberate abstention, not an oversight.
//
// Everything here is in QUARTER-NOTE beats, the unit the whole playback engine counts in
// (`beatCount`, `songToNotes`, `startBeat`), so a caller never has to convert.

// Parse "n/d" → { n, d } or null.
function parseTs(ts) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(ts || '').trim())
  if (!m) return null
  const n = Number(m[1])
  const d = Number(m[2])
  return n > 0 && d > 0 ? { n, d } : null
}

// The meter of a time signature, in quarter-note beats.
//   barBeats   — length of ONE bar (6/8 → 3, NOT 6)
//   pulseBeats — length of one felt beat (6/8 → 1.5 · 3/4 → 1 · 3/2 → 2)
//   pulses     — how many felt beats in a bar (6/8 → 2 · 3/4 → 3 · 12/8 → 4)
//   compound   — is the beat a dotted note
//   strongAt   — quarter-beat offset of the downbeat (always 0)
//   mediumAt   — quarter-beat offset of the secondary stress, or null when the meter has none
// Unparseable / missing → 4/4, the engine's long-standing default.
export function meterOf(timeSignature) {
  const p = parseTs(timeSignature)
  const { n, d } = p || { n: 4, d: 4 }
  const compound = n % 3 === 0 && n > 3
  const pulses = compound ? n / 3 : n
  const pulseBeats = (compound ? 3 : 1) * (4 / d)
  const barBeats = (n * 4) / d
  // a secondary stress only where the bar halves evenly into two accented groups
  const mediumAt = pulses >= 4 && pulses % 2 === 0 ? (pulses / 2) * pulseBeats : null
  return { barBeats, pulseBeats, pulses, compound, strongAt: 0, mediumAt, known: !!p }
}

// Where the bar grid actually starts, in quarter-beats, given the notes being played.
//
// The accompaniment's bars used to be anchored at played beat 0 — the song's first note. That is
// only the downbeat when the song opens ON one. A song that opens with a pickup (ห้องยก: the
// upbeat syllable before the first full bar, which 92 of the library's 163 songs have) puts beat 0
// somewhere in the MIDDLE of a bar, so every bar-locked layer leans on the wrong beat for the
// song's whole length — the melody and the accompaniment disagree about where the bar starts.
// พี่เปา heard that as "คล่อมๆ จังหวะ".
//
// The pickup's length is not something to guess or hard-code: the notes carry their own bar
// numbering (li/bi, from the sheet's own bar lines), so the opening bar's played length IS the
// pickup whenever it comes out shorter than a full bar. Returns the offset to add to the grid,
// 0 for a song that opens on a downbeat (which must therefore be completely unaffected).
export function barOffsetFor(notes, meter) {
  if (!meter || !meter.barBeats || !notes || !notes.length) return 0
  const first = `${notes[0].li}|${notes[0].bi}`
  let len = 0
  for (const n of notes) {
    if (`${n.li}|${n.bi}` !== first) break
    len += n.beats || 0
  }
  // a full (or longer) opening bar = no pickup; otherwise the bar grid starts where it ends
  return len > 0 && len < meter.barBeats - 1e-6 ? len : 0
}

// Stress weight for a position within the bar, as a fraction of the bar's own length.
//   'strong' — the downbeat
//   'medium' — the secondary stress (only in meters that have one)
//   'weak'   — any other felt beat
//   'off'    — between felt beats (a subdivision)
// `beat` is an absolute quarter-beat position; `barOffset` shifts the bar grid (a pickup).
export function stressAt(meter, beat, barOffset = 0) {
  const b = beat - barOffset
  const inBar = ((b % meter.barBeats) + meter.barBeats) % meter.barBeats
  if (Math.abs(inBar) < 1e-6) return 'strong'
  if (meter.mediumAt != null && Math.abs(inBar - meter.mediumAt) < 1e-6) return 'medium'
  const onPulse = Math.abs(inBar / meter.pulseBeats - Math.round(inBar / meter.pulseBeats)) < 1e-6
  return onPulse ? 'weak' : 'off'
}
