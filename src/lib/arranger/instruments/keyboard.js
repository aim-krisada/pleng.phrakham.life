// B107 P2 · §4B — the keyboard InstrumentModule (grand / felt piano).
//
// WHY a module: patterns differ per instrument (piano arp ≠ guitar strum). The arranger core
// stays instrument-agnostic (harmony + dynamics + humanize velocity) and calls a module for
// the instrument-idiomatic parts (voicing constraints, comp patterns, bass modes, humanize
// FEEL). Adding an instrument later (guitar/bowed) = write one module, no change to the core.
//
// InstrumentModule shape (§4B.2):
//   id, role, register{lo,hi}, voicing(chordEvent,prevUp,ctx), patterns{}, defaultPattern,
//   bassModes{}, defaultBass, humanizeFeel{ velJitter, timing }.

import { COMP_PATTERNS } from '../patterns.js'
import { BASS_MODES } from '../bass.js'

export const keyboard = {
  id: 'grand',
  role: 'both', // plays melody and comp/bass
  register: { lo: 21, hi: 108 }, // full piano; presets squeeze each role into its band
  // Piano uses the core voice-leading (buildChordVoice already produced bass/up nearest the
  // previous chord) as-is. Wide-voicing choices (drop-2 / open) are applied by the core from
  // cfg.voicing. A guitar module would OVERRIDE this to fret-playable shapes — that's the seam.
  voicing(chordEvent /* , prevUp, ctx */) {
    return { bass: chordEvent.bass, up: chordEvent.up }
  },
  patterns: COMP_PATTERNS, // sustained/arpeggio/harpRoll/stringPad/waltz/alberti/fingerpick
  defaultPattern: 'sustained',
  bassModes: BASS_MODES, // root/pedal/walking
  defaultBass: 'root',
  // Humanize FEEL is idiomatic (§4B.1): piano = each finger lands slightly independently
  // (symmetric spread). A guitar would be a one-directional strum stagger instead. sigma /
  // velJitter are the values P'Aim locked on the demo (±12ms / ±6%).
  humanizeFeel: { velJitter: 0.06, timing: { type: 'independent', sigma: 0.012 } },
}
