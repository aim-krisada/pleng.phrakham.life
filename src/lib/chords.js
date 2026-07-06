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

// Semitone offset from key root -> Roman-numeral scale degree (major scale).
// Roman numerals keep the chord row visually distinct from the melody's Arabic numbers.
const ROMAN_BY_OFFSET = { 0: 'I', 2: 'II', 4: 'III', 5: 'IV', 7: 'V', 9: 'VI', 11: 'VII' }
const CHROMATIC_ROMAN = { 1: 'bII', 3: 'bIII', 6: 'bV', 8: 'bVI', 10: 'bVII' }

// Case-sensitive Roman numeral convention (Open Music Theory; Laitz, "The
// Complete Musician"): UPPERCASE = major (I, IV, V7), lowercase = minor
// (ii, vi7 — the "m" is dropped since case already says it), vii° = diminished.
export function chordToRoman(chord, key) {
  const p = parseChord(chord)
  const k = noteIndex(key)
  if (!p || k === -1) return chord
  const offset = (p.rootIndex - k + 12) % 12
  const degree = ROMAN_BY_OFFSET[offset] ?? CHROMATIC_ROMAN[offset] ?? '?'
  if (/^dim/.test(p.suffix)) return degree.toLowerCase() + '°' + p.suffix.slice(3)
  if (/^m(?!aj)/.test(p.suffix)) return degree.toLowerCase() + p.suffix.slice(1)
  return degree + p.suffix
}

// Display a chord under the chosen system, transposed from originalKey to displayKey
export function displayChord(chord, { system, originalKey, displayKey }) {
  if (!chord) return ''
  if (system === 'roman') return chordToRoman(chord, originalKey)
  const semis = semitonesBetween(originalKey, displayKey)
  return semis === 0 ? chord : transposeChord(chord, semis, displayKey)
}

// Common time signatures, most-used first; the input also accepts any custom n/d.
export const TIME_SIGNATURES = ['4/4', '3/4', '2/4', '6/8', '2/2', '3/2', '6/4', '9/8', '12/8', '5/4', '7/8']

// Valid chord list for the Studio chord picker — diatonic chords of the song's
// key come first (what a worship song almost always uses), then everything else.
const ALL_ROOTS = [...new Set([...SHARP_SCALE, ...FLAT_SCALE])]
const QUALITIES = ['', 'm', '7', 'm7', 'maj7', 'sus4', 'sus2', 'dim', '6', 'm6', '9', 'add9']

export function chordOptions(key) {
  const k = noteIndex(key)
  const scale = FLAT_KEYS.has(key) ? FLAT_SCALE : SHARP_SCALE
  const deg = (offset, suffix) => scale[(k + offset) % 12] + suffix
  const diatonic =
    k === -1
      ? []
      : [deg(0, ''), deg(2, 'm'), deg(4, 'm'), deg(5, ''), deg(7, ''), deg(7, '7'), deg(9, 'm'), deg(11, 'dim')]
  const rest = ALL_ROOTS.flatMap((r) => QUALITIES.map((q) => r + q)).filter((c) => !diatonic.includes(c))
  return [
    { value: '', label: '— ไม่มีคอร์ด —', search: 'ไม่มี ไม่ none clear ลบ' },
    ...diatonic.map((c) => ({ value: c, label: `${c} (คีย์ ${key})` })),
    ...rest.map((c) => ({ value: c, label: c })),
  ]
}
