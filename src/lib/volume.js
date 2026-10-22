// ใบ v3/pleng#135 — how loud the melody (เสียงโน้ต) and the chords (เสียงคอร์ด) play.
// พี่เปา 21 ต.ค. 2569 asked for a louder default; พี่เอม 22 ต.ค. 2569 made it settable on both sides:
// the approver sets the site's default, each listener may set their own, and a listener's own setting
// always wins. Both sides use the same panel (VolumePanel.vue) and the same numbers, defined here.
//
// A level is a PERCENT of today's sound: 100 = exactly what the site played before this change (melody
// peak 0.35 · chord pad as voiced), 150 = half again as loud. Never a raw gain — a reader understands
// "100%", and if the base sound is ever re-tuned, every saved setting still means the same thing.
// Capped at 200 (+6 dB): the end of the chain has a limiter (midi.js makeOutputLimiter), so even the top
// of the range does not crackle — but an uncapped slider would let anyone drive it into a wall of sound.

export const VOL_MIN = 0
export const VOL_MAX = 200
export const VOL_STEP = 5
// the code's own default — what "คืนค่าเริ่มต้น" on the site panel goes back to, and what everyone hears
// while the site has no default saved yet (or the settings table is not installed)
export const VOL_DEFAULT = Object.freeze({ melody: 100, chord: 100, linked: true })

export function clampLevel(v) {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return null
  return Math.min(VOL_MAX, Math.max(VOL_MIN, n))
}

// A stored value (localStorage / the site table) → a clean { melody, chord, linked }, or null when it is
// missing or not a volume at all. null = "not set": the caller falls back to the next source.
export function normalizeVolume(v) {
  if (!v || typeof v !== 'object') return null
  const melody = clampLevel(v.melody)
  const chord = clampLevel(v.chord)
  if (melody == null || chord == null) return null
  return { melody, chord, linked: v.linked !== false }
}

// Who wins: the listener's own setting, else the approver's site default, else the code's default.
export function effectiveVolume(listener, site) {
  return normalizeVolume(listener) || normalizeVolume(site) || { ...VOL_DEFAULT }
}

// Move one slider. Unlinked: only that one moves. Linked: the other follows and KEEPS THE RATIO between
// them — not the same number of points, because the chords are meant to sit under the melody, and adding
// the same amount to both would close that gap (ใบ#135 Suggestion ข้อ 4). When the other slider would run
// past the end of the range, both stop together at the edge, so the ratio still holds.
// A slider at 0 has no ratio to keep: moving it moves it alone; moving the other while it is 0 leaves it 0.
export function moveVolume(cur, which, value) {
  const base = normalizeVolume(cur) || { ...VOL_DEFAULT }
  const other = which === 'melody' ? 'chord' : 'melody'
  const v = clampLevel(value)
  if (v == null) return base
  if (!base.linked || base[which] === 0 || base[other] === 0) return { ...base, [which]: v }
  let f = v / base[which]
  // the other slider would leave the range → scale both only as far as it can go
  const otherNext = base[other] * f
  if (otherNext > VOL_MAX) f = VOL_MAX / base[other]
  return { ...base, [which]: clampLevel(base[which] * f), [other]: clampLevel(base[other] * f) }
}

// percent → the gain multiplier the audio graph applies on top of today's levels
export const levelToGain = (level) => (clampLevel(level) ?? 100) / 100

// The live channel between the setting and the sound. The store publishes the levels that win
// (effectiveVolume) and midi.js listens, so a slider moves the song that is playing right now. Neither side
// imports the other: the store must not pull in the audio engine (many tests replace midi.js with a partial
// stand-in, and every page that shows the panel would load it). Values sent are gain multipliers.
let liveLevels = { melody: 1, chord: 1 }
const listeners = new Set()
export function publishLevels(v) {
  liveLevels = { melody: levelToGain(v?.melody), chord: levelToGain(v?.chord) }
  for (const fn of listeners) fn(liveLevels)
}
// fn gets the current levels at once, then every change; returns the unsubscribe
export function onLevels(fn) {
  listeners.add(fn)
  fn(liveLevels)
  return () => listeners.delete(fn)
}
