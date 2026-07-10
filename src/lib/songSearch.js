// Shared song-search logic used by the catalog page and the Studio song picker.
//
// Searches title, number, key, lyrics and (v1) notes. Lyrics come from either the
// v1 flat lines or the v2 arrangement syllables, so the 120-song v2 import batch is
// searchable by the words people actually remember. Matching is forgiving: it
// normalises Thai/whitespace and falls back to fuzzy (edit-distance) matching so a
// half-remembered line with a typo or two still finds the song.

// Normalise for search: canonical composition (Thai combining marks), lower-case,
// collapse runs of whitespace. Latin case-folds; Thai is unaffected by toLowerCase.
export function normalize(s) {
  return (s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Space-free form for fuzzy matching. Thai has no word spaces, so people type a
// remembered phrase with arbitrary spacing — dropping spaces makes the match
// spacing-insensitive instead of charging an edit per space difference.
function compact(s) {
  return normalize(s).replace(/\s+/g, '')
}

// Join syllable tokens into plain search text. A leading '-' means "continue the
// previous word" (e.g. 'ส','-ถิตย์' -> 'สถิตย์'); the hyphen is dropped so the word
// is searchable as a whole. Blank slots (held/rest note boxes) are skipped.
function syllablesToText(syls) {
  let out = ''
  for (const t of syls || []) {
    if (!t) continue
    if (!out) out = t
    else if (t.startsWith('-')) out += t.slice(1)
    else out += ' ' + t
  }
  return out
}

export function lyricsText(content) {
  // v2: lyrics live in the arrangement (one syllable per syllable-bearing note).
  if (content && Array.isArray(content.arrangement)) {
    return content.arrangement.map((a) => syllablesToText(a.syllables)).join(' ')
  }
  // v1: flat lines carry the lyric on each segment.
  return (content?.lines || [])
    .flat()
    .filter((i) => i.type === 'segment')
    .map((i) => i.lyric)
    .join(' ')
}

export function notesText(content) {
  // v2: melody lives in stanzas (each stanza's lines are v1-shaped item arrays);
  // v1: melody is on the flat top-level lines. Both are arrays of lines of items.
  const lines = Array.isArray(content?.stanzas)
    ? content.stanzas.flatMap((s) => s.lines || [])
    : content?.lines || []
  return lines
    .flat()
    .filter((i) => i.type === 'segment')
    .map((i) => i.note)
    .join(' ')
    .replace(/[.\-_'(){}#b]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Notes reduced to a bare scale-degree string (spaces and all decoration removed):
// '5 5 6 1 3' -> '55613'. This is the space-insensitive form matched against a note
// query so "5561", "55 61" and "5 5 6 1" all hit the same song.
export function notesCompact(content) {
  return notesText(content).replace(/[^0-7]/g, '')
}

// Is this query a search *by melody notes* (not by lyric / title / song number)?
// True only when the query is made entirely of note glyphs (scale degrees 0-7, octave
// dots, holds, beams, bars, accidentals, slurs) AND carries at least one pitched
// degree. To keep number search untouched, a *bare* run of digits (no space, no
// decoration) counts as notes only from length 4 up — song numbers are <= 3 digits, so
// "42"/"100"/"117" stay pure number lookups while "5561" is read as notes.
export function isNoteQuery(q) {
  if (!/[1-7]/.test(q)) return false
  if (!/^[0-7\s.'’_|~#b()♮{}-]+$/.test(q)) return false
  const hasSpace = /\s/.test(q)
  const hasDecoration = /[.'’_|~#b()♮{}-]/.test(q)
  return hasSpace || hasDecoration || q.replace(/[^0-7]/g, '').length >= 4
}

export function snippet(content, len = 60) {
  return lyricsText(content).replace(/\s+/g, ' ').slice(0, len)
}

export function songHaystack(song) {
  return normalize(
    [
      String(song.number ?? ''),
      song.title_th,
      song.title_en ?? '',
      song.content?.key ?? '',
      lyricsText(song.content ?? {}),
      notesText(song.content ?? {}),
    ].join(' '),
  )
}

// Fuzzy budget: how many typos we tolerate, scaled to query length. Short queries
// stay exact (fuzzing 2-3 chars matches almost anything); longer phrases get up to 3.
export function fuzzyBudget(q) {
  const len = q.length
  if (len < 4) return 0
  return Math.min(3, Math.floor(len / 4))
}

// Minimum edit distance between `pat` and any substring of `text` (approximate
// substring match). Returns that distance, or a number > maxErr if it exceeds the
// budget (callers only care whether it's <= maxErr). O(text * pat); early-exits.
export function fuzzyDistance(text, pat, maxErr) {
  const n = text.length
  const m = pat.length
  if (m === 0) return 0
  if (m > n + maxErr) return maxErr + 1
  // dp[j] = edits to match pat[0..j) ending at the current text position.
  // Row 0 (empty text prefix) needs j insertions; column 0 is free so the match
  // may start anywhere in the text.
  let prev = new Array(m + 1)
  for (let j = 0; j <= m; j++) prev[j] = j
  let best = m
  for (let i = 1; i <= n; i++) {
    const cur = new Array(m + 1)
    cur[0] = 0
    let rowMin = 0
    const ti = text[i - 1]
    for (let j = 1; j <= m; j++) {
      const cost = ti === pat[j - 1] ? 0 : 1
      const v = Math.min(prev[j - 1] + cost, prev[j] + 1, cur[j - 1] + 1)
      cur[j] = v
      if (v < rowMin) rowMin = v
    }
    if (cur[m] < best) best = cur[m]
    if (best === 0) break
    if (rowMin > maxErr) {
      // No cell in this row is within budget; a match ending later can only cost
      // more, so nothing more to find. (Safe: costs never decrease across rows.)
      return best
    }
    prev = cur
  }
  return best
}

// Score a song against a query. Returns null for no match, else a smaller-is-better
// score (0 = exact substring; fuzzy hits score as their edit distance).
export function scoreSong(song, query) {
  const q = normalize(query)
  if (!q) return 0
  const hay = songHaystack(song)
  if (hay.includes(q)) return 0
  // Note path: a melody query matches space-insensitively. Reduce both the query and
  // the song's notes to bare scale degrees and test substring — so "5561", "55 61" and
  // "5 5 6 1" all find the song whose notes are "5 5 6 1 3". Exact (no fuzz) to stay
  // precise; only runs for note-shaped queries so lyric/title/number search is untouched.
  if (isNoteQuery(q)) {
    const nc = notesCompact(song.content ?? {})
    if (nc && nc.includes(q.replace(/[^0-7]/g, ''))) return 0
  }
  const maxErr = fuzzyBudget(compact(q))
  if (maxErr === 0) return null
  const d = fuzzyDistance(compact(hay), compact(q), maxErr)
  return d <= maxErr ? d : null
}

// Filter to matching songs, order preserved (catalog order). Fuzzy + lyrics aware.
export function filterSongs(songs, query) {
  const q = normalize(query)
  if (!q) return songs
  return songs.filter((s) => scoreSong(s, q) !== null)
}

// Ranked search for a picker UI: best matches first, ties keep catalog order.
export function searchSongs(songs, query) {
  const q = normalize(query)
  if (!q) return songs.map((song) => ({ song, score: 0 }))
  return songs
    .map((song, i) => ({ song, score: scoreSong(song, q), i }))
    .filter((r) => r.score !== null)
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .map(({ song, score }) => ({ song, score }))
}
