// B107 P2 · LAYER 1 — voicing transforms (§2). Each takes the voice-led { bass, up[] } (from
// buildChordVoice / the instrument module) and RE-SPACES the upper voices for a richer sound,
// WITHOUT changing which pitch-classes sound (only their octaves). Pure { bass, up } → { bass,
// up }, one export each, chosen per preset (drop-2 OR open, not both).
//
// Invariant for all: output upper pitch-classes == input upper pitch-classes; nothing drops
// below the bass; everything stays in a sane keyboard window. So they can never turn the sheet's
// chord into a different chord — they just voice it more openly.

const UP_LO = 48 // matches midi.js voice-leading window
const UP_HI = 67
const sortUp = (a) => a.slice().sort((x, y) => x - y)

// drop-2 — take the 2nd-voice-from-the-top down one octave, opening a gap in the middle for a
// wider, airier "jazz/pianist" spread (§R1.4). Skipped if the chord has < 3 upper voices, or if
// dropping would cross below the bass / below the window floor.
export function drop2(voiced) {
  const up = sortUp(voiced.up || [])
  if (up.length < 3) return { bass: voiced.bass, up }
  const i = up.length - 2
  const dropped = up[i] - 12
  if (voiced.bass != null && dropped <= voiced.bass) return { bass: voiced.bass, up }
  if (dropped < UP_LO - 12) return { bass: voiced.bass, up }
  const next = up.slice()
  next[i] = dropped
  return { bass: voiced.bass, up: sortUp(next) }
}

// open — if the voicing is bunched (all upper voices within a narrow span), lift the TOP voice an
// octave to spread it out "grand / โอ่อ่า" (§R1.5). Guarded to the window; pitch-classes kept.
export function open(voiced) {
  const up = sortUp(voiced.up || [])
  if (up.length < 2) return { bass: voiced.bass, up }
  const span = up[up.length - 1] - up[0]
  if (span >= 5) return { bass: voiced.bass, up } // already spread enough
  const raised = up[up.length - 1] + 12
  if (raised > UP_HI + 12) return { bass: voiced.bass, up }
  const next = up.slice()
  next[next.length - 1] = raised
  return { bass: voiced.bass, up: sortUp(next) }
}

// Apply the voicing transform named in cfg.voicing (drop2 | open | none). One transform per
// preset — never stack them (they'd fight over the same octave moves).
export function applyVoicing(voiced, cfg = {}) {
  const v = cfg.voicing
  if (v === 'drop2') return drop2(voiced)
  if (v === 'open') return open(voiced)
  return { bass: voiced.bass, up: sortUp(voiced.up || []) }
}
