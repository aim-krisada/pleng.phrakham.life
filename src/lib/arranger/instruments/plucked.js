// B107 P2 · §4B — the plucked InstrumentModule (nylon / classical guitar).
//
// A fingerpicked guitar's idiom is the flowing arpeggio / fingerpick figure, not a held pad — so
// this module defaults to `arpeggio` and offers `fingerpick`, and keeps the fuller comp set for a
// preset that wants a strummed block. Voicing stays close to the core voice-leading (a full 6-note
// fret shape voicing is the future guitar module §4B.3 — this module is the nylon SOLO lead, where
// the arpeggio spells the chord one note at a time so the exact fret shape matters less).
//
// register 40–76 ≈ the guitar's sounding range (E2 up); the mirror pitch-shifts beyond its sampled
// notes, so this only bounds the arranger's voicing.

import { arpeggio, fingerpick, sustained, harpRoll } from '../patterns.js'
import { BASS_MODES } from '../bass.js'

export const plucked = {
  id: 'nylon',
  role: 'both',
  register: { lo: 40, hi: 76 },
  // Nylon uses the core voice-leading (nearest-octave upper voices) directly — the arpeggio/
  // fingerpick patterns break it into single plucks, so a hand-shape constraint isn't needed for
  // the solo lead (that's the strummed-block guitar module, future §4B.3).
  voicing(chordEvent) {
    return { bass: chordEvent.bass, up: chordEvent.up }
  },
  patterns: { arpeggio, fingerpick, sustained, harpRoll },
  defaultPattern: 'arpeggio',
  bassModes: BASS_MODES,
  defaultBass: 'root', // a plucked bass note per chord (the thumb), not a sustained pedal
  // A fingerpick lands each string slightly independently, a hair looser than the piano — but not
  // as slow/wide as a bow. (A strummed guitar's one-directional stagger is the future guitar module.)
  humanizeFeel: { velJitter: 0.07, timing: { type: 'independent', sigma: 0.015 } },
}
