// B107 P2 · §4B — the bowed InstrumentModule (violin / cello / string ensemble).
//
// Bowed strings are NOT a keyboard: a solo violin/cello can't strike a 4-note block, and their
// idiom is the long, swelling, sustained line — not an arpeggio or an oom-pah. So this module:
//   • voicing: reduce the chord's upper voices to a DOUBLE-STOP (≤2 notes) — the most a solo bow
//     plays at once (§4B guard "ห้ามส่ง block 4 เสียงให้ bowed"). Bass stays as core chose it.
//   • patterns: only sustain / stringPad / harpRoll (a gentle bowed swell) — no arp/waltz/alberti.
//   • humanizeFeel: a slower, wider onset spread than the piano (a bow "leans in" — no percussive
//     attack), so the shared humanize-timing layer reads as strings, not hammers.
// register 48–88 covers violin (G3 up) through the cello's upper range; the mirror pitch-shifts
// beyond the sampled notes, so this only bounds the arranger's voicing, not what the sampler can play.

import { sustained, stringPad, harpRoll } from '../patterns.js'
import { BASS_MODES } from '../bass.js'

// Keep only the outer two voices of the chord (lowest + highest of the upper stack) = a playable
// double-stop. Fewer than 2 → unchanged. This is the bowed idiom guard from §4B.
function doubleStop(up) {
  if (!up || up.length <= 2) return up || []
  return [up[0], up[up.length - 1]]
}

export const bowed = {
  id: 'violin',
  role: 'both',
  register: { lo: 48, hi: 88 },
  voicing(chordEvent) {
    return { bass: chordEvent.bass, up: doubleStop(chordEvent.up) }
  },
  // Only the sustained/swell families — a bow doesn't arpeggiate or strum. `harpRoll` gives a soft
  // bottom-up bloom for a rolled entrance; `stringPad` is the long swell for calm worship.
  patterns: { sustained, stringPad, harpRoll },
  defaultPattern: 'stringPad',
  bassModes: BASS_MODES,
  defaultBass: 'pedal', // sustained low bow, not a struck root
  // A bow leans into the note (no percussive hit) → a slower, slightly wider onset spread than the
  // piano's crisp ±12ms, and a touch more level variation (bow pressure wanders).
  humanizeFeel: { velJitter: 0.07, timing: { type: 'independent', sigma: 0.02 } },
}
