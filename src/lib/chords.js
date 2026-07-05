// Chord math: parsing, transposing, and letter <-> Nashville-number conversion.

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'])

export const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function noteIndex(note) {
  let i = SHARP_SCALE.indexOf(note)
  if (i === -1) i = FLAT_SCALE.indexOf(note)
  return i
}

// "C#m7" -> { root: "C#", suffix: "m7" }; returns null if not a chord
export function parseChord(chord) {
  const m = /^([A-G][#b]?)(.*)$/.exec(chord.trim())
  if (!m) return null
  const idx = noteIndex(m[1])
  if (idx === -1) return null
  return { root: m[1], rootIndex: idx, suffix: m[2] }
}

// Transpose a chord by semitones, spelling for the target key
export function transposeChord(chord, semitones, targetKey) {
  const p = parseChord(chord)
  if (!p) return chord
  const scale = FLAT_KEYS.has(targetKey) ? FLAT_SCALE : SHARP_SCALE
  const newRoot = scale[(p.rootIndex + semitones + 120) % 12]
  return newRoot + p.suffix
}

export function semitonesBetween(fromKey, toKey) {
  const a = noteIndex(fromKey)
  const b = noteIndex(toKey)
  if (a === -1 || b === -1) return 0
  return (b - a + 12) % 12
}

// Semitone offset from key root -> scale degree (major scale)
const DEGREE_BY_OFFSET = { 0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 11: '7' }
const CHROMATIC_BY_OFFSET = { 1: 'b2', 3: 'b3', 6: 'b5', 8: 'b6', 10: 'b7' }

// "B7" in key E -> "57"; "C#m" in key E -> "6m"
export function chordToNumber(chord, key) {
  const p = parseChord(chord)
  const k = noteIndex(key)
  if (!p || k === -1) return chord
  const offset = (p.rootIndex - k + 12) % 12
  const degree = DEGREE_BY_OFFSET[offset] ?? CHROMATIC_BY_OFFSET[offset] ?? '?'
  return degree + p.suffix
}

// Display a chord under the chosen system, transposed from originalKey to displayKey
export function displayChord(chord, { system, originalKey, displayKey }) {
  if (!chord) return ''
  if (system === 'number') return chordToNumber(chord, originalKey)
  const semis = semitonesBetween(originalKey, displayKey)
  return semis === 0 ? chord : transposeChord(chord, semis, displayKey)
}
