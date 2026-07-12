// B107 P2 — seeded PRNG for the auto-arranger. Everything random in the arranger
// (humanize velocity/timing, later embellishments) draws from this, NOT Math.random(),
// because the output must be DETERMINISTIC:
//   (a) the MP3 export (P3) has to render the SAME performance the "ฟัง" button plays,
//   (b) tests must reproduce the exact same numbers every run, and
//   (c) "two loop passes sound genuinely different but repeatable" = seed on (songId, pass).
// mulberry32 is a tiny, fast, well-distributed 32-bit PRNG — plenty for micro-jitter.

// A mulberry32 generator seeded by a 32-bit integer. Returns a function() → [0,1).
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Derive a stable 32-bit seed from a song identity + pass index (FNV-1a over the string).
// Same (songId, pass) → same seed → same performance. Different pass → different performance.
export function seedFor(songId, pass = 0) {
  const s = String(songId ?? '') + '|' + pass
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Convenience: a generator seeded straight from (songId, pass).
export function rngFor(songId, pass = 0) {
  return mulberry32(seedFor(songId, pass))
}
