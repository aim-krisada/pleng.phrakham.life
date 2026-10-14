// Chord math: parsing, transposing, and letter <-> Roman-numeral conversion.

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'])

export const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function noteIndex(note) {
  let i = SHARP_SCALE.indexOf(note)
  if (i === -1) i = FLAT_SCALE.indexOf(note)
  return i
}

// ---------------------------------------------------------------------------
// Typing robustness (P'Aim, 11 Oct 2026 — "G/A works on the iPad but not on the
// desktop", "the bass note turns into a different chord").
//
// The iPad auto-capitalises the first letter of a field, a desktop keyboard does
// not — so the very same keystrokes produced "G/A" on one device and "g/a" on the
// other, and the old parser only accepted A-G in UPPER case. Normalising the text
// before parsing makes both devices behave the same, and also soaks up the slash
// characters a Thai/full-width IME emits (／ ∕ ⁄ ⧸ ＼ \) plus any spaces around it.
//
// Rules that must NOT be broken by the normalisation:
//   · "b" after a note letter is a FLAT, so "bb" → "Bb" (never "BB").
//   · the quality is left exactly as typed, so "Gm" stays "Gm" (never "GM").
// ---------------------------------------------------------------------------
const SLASH_CHARS = /[\\/／∕⁄⧸＼╱]/g // \ / ／ ∕ ⁄ ⧸ ＼ ╱
const ACCIDENTAL_SHARP = /[♯＃]/g // ♯ ＃
const ACCIDENTAL_FLAT = /♭/g // ♭

// Raw typed text → the canonical shape parseChord works on (case is fixed later,
// per part, because "b" means flat and the quality must keep its own case).
function normalizeChordText(raw) {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(SLASH_CHARS, '/')
    .replace(ACCIDENTAL_SHARP, '#')
    .replace(ACCIDENTAL_FLAT, 'b')
    .replace(/\s+/g, '') // "G / A" → "G/A"; a chord symbol never contains a space
}

// One quality/extension token. Anything a real chord symbol is built from:
// word qualities (maj, min, sus, add, aug, dim, alt, no, m), the symbol qualities
// (° ø Δ + -), accidentals, digits, and the brackets/commas of "F#(+5)" or "C7(b9)".
// Matched case-insensitively so "SUS4" is accepted; the text itself is kept as typed.
const QUALITY_TOKEN = /^(?:maj|min|sus|add|aug|dim|alt|no|m|Δ|°|ø|\+|-|#|b|\(|\)|,|\d+)/i

// true when every character of `s` belongs to a quality token (empty string is fine)
function isQualityText(s) {
  let rest = s
  while (rest) {
    const t = QUALITY_TOKEN.exec(rest)
    if (!t) return false
    rest = rest.slice(t[0].length)
  }
  return true
}

const NOTE_HEAD = /^([A-Ga-g])([#b]?)/

// The part after the slash. Usually a plain bass note ("G/B"), but the song bank also
// holds "A/F#m" (note + quality) and "C6/9" (no note at all — a "six-nine" chord), and
// both have to keep working exactly as before.
function splitSlashTail(tail) {
  const n = NOTE_HEAD.exec(tail)
  if (n) {
    const rest = tail.slice(n[0].length)
    if (isQualityText(rest)) {
      const note = n[1].toUpperCase() + n[2]
      return { ok: true, text: note + rest, note: rest === '' ? note : null }
    }
    return { ok: false }
  }
  return isQualityText(tail) ? { ok: true, text: tail, note: null } : { ok: false }
}

// "C#m7" -> { root: "C#", rootIndex, quality:"m7", suffix: "m7", bass:null, bassIndex:-1 }
// "G/B"  -> { root: "G",  rootIndex, quality:"",   suffix: "/B", bass:"B", bassIndex:11 }
// `suffix` is the quality PLUS any "/x" (so chordToRoman/chordToIntervals keep working on it);
// `quality` is the part before the slash only, which is what transposeChord rebuilds around.
// Case and odd slash characters are normalised first, so "g / a" parses the same as "G/A".
// Returns null when the text is not a chord (junk, Thai letters, a bad bass note…).
export function parseChord(chord) {
  const text = normalizeChordText(chord)
  const m = NOTE_HEAD.exec(text)
  if (!m) return null
  const root = m[1].toUpperCase() + m[2]
  const idx = noteIndex(root)
  if (idx === -1) return null
  const rest = text.slice(m[0].length)
  const slash = rest.indexOf('/')
  const quality = slash === -1 ? rest : rest.slice(0, slash)
  if (!isQualityText(quality)) return null
  if (slash === -1) {
    return { root, rootIndex: idx, quality, suffix: quality, bass: null, bassIndex: -1 }
  }
  const tail = splitSlashTail(rest.slice(slash + 1))
  if (!tail.ok) return null
  const bassIndex = tail.note ? noteIndex(tail.note) : -1
  return {
    root,
    rootIndex: idx,
    quality,
    suffix: quality + '/' + tail.text,
    bass: bassIndex === -1 ? null : tail.note,
    bassIndex,
  }
}

// Raw typed text → the chord exactly as it should be stored ("g / a" → "G/A"), or
// null when it is not a chord. Used by the editor so what is saved is always canonical.
export function normalizeChord(chord) {
  const p = parseChord(chord)
  return p ? p.root + p.suffix : null
}

// Why a typed chord was refused, in plain Thai — the field used to just snap back with
// no explanation, which is exactly how the "G/A does not work" report started. Returns
// null when the text is fine (or empty, which simply means "no chord").
export function chordError(chord) {
  if (typeof chord !== 'string' || chord.trim() === '') return null
  if (parseChord(chord) != null) return null
  const text = normalizeChordText(chord)
  if (/[\u0E00-\u0E7F]/.test(text)) return 'ตอนนี้แป้นพิมพ์เป็นภาษาไทย กดสลับเป็นภาษาอังกฤษก่อน แล้วพิมพ์ใหม่'
  if (!NOTE_HEAD.test(text)) return 'คอร์ดต้องขึ้นต้นด้วยตัว A ถึง G เช่น G หรือ Am7 หรือ G/A'
  if (text.includes('/')) return 'ตัวหลังขีดทับต้องเป็นโน้ต A ถึง G เช่น G/A หรือ C/E'
  return 'ยังไม่รู้จักคอร์ดนี้ ลองแบบ G, Am7, Fmaj7, Gsus4 หรือ G/A'
}

// Transpose a chord by semitones, spelling for the target key.
// A slash bass moves with the chord (G/B up a whole step into D = A/C#); before this it
// stayed behind, so changing key quietly rewrote the bass note into the wrong one.
// A chord with no slash is rebuilt exactly as before.
export function transposeChord(chord, semitones, targetKey) {
  const p = parseChord(chord)
  if (!p) return chord
  const scale = FLAT_KEYS.has(targetKey) ? FLAT_SCALE : SHARP_SCALE
  const shift = (i) => scale[(i + semitones + 120) % 12]
  const newRoot = shift(p.rootIndex)
  if (p.bassIndex === -1) return newRoot + p.suffix
  return newRoot + p.quality + '/' + shift(p.bassIndex)
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

// Chord quality → semitone intervals above the root (B104 · audio accompaniment).
// Used to turn a chord SYMBOL (segment.chord) into the actual notes to sound, so the
// player can "play what the sheet shows". Covers every suffix the picker (QUALITIES)
// can produce. Kept next to parseChord — parseChord gives the root, this gives the
// shape. Pure (no audio), so it's unit-testable headless.
const CHORD_INTERVALS = {
  '': [0, 4, 7], // major triad
  m: [0, 3, 7], // minor triad
  7: [0, 4, 7, 10], // dominant 7
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  dim: [0, 3, 6],
  6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  9: [0, 4, 7, 10, 14],
  add9: [0, 4, 7, 14],
}

// suffix (from parseChord) → intervals above the root. A slash ("m7/G", "/B") is stripped first so
// the QUALITY before it is honoured (was: any slash fell back to a plain major — so "Cm7/G" lost its
// m7). Unknown suffixes still fall back to a major triad rather than throwing/going silent — the
// accompaniment stays musical on odd input. (The slash BASS is handled by chordVoicing via bassIndex.)
export function chordToIntervals(suffix) {
  let s = (suffix || '').trim()
  const slash = s.indexOf('/')
  if (slash !== -1) s = s.slice(0, slash)
  return CHORD_INTERVALS[s] || CHORD_INTERVALS['']
}

// ใบ v3/pleng#123 — a KEY NAME moved by the same distance as the song (originalKey → displayKey), spelled the
// way the key menus spell it (KEYS: flats for the black keys). A ท่อน in A of a C song, read in D, is in B.
// Unknown names come back as they were.
export function transposeKey(key, originalKey, displayKey) {
  const i = key ? noteIndex(key) : -1
  const semis = semitonesBetween(originalKey, displayKey || originalKey)
  if (i === -1 || semis === 0) return key
  return KEYS[(i + semis) % 12]
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
