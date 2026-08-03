// MIGRATION TOLERANCE — shared across BOTH lines (v1 and /v2).
//
// The migration adds one key, `id`, inside content.lyricSets[n]. This file proves the
// field is INERT for everything the site already does: same sheet, same set switching,
// same print, same MP3 notes, same search. Run the same file on every branch.
//
// Fixture = the real #717 row read off live 2026-07-26 (backup
// C:/gl/pm-inbox/pleng/backup/717-ids-before-20260726-2145.json), before and after the
// two ids the migration would add.
import { describe, it, expect } from 'vitest'
import live from './__fixtures__/717-live.json'
import withIds from './__fixtures__/717-withids.json'
import { resolveContent, resolvePlayOrder, lyricSetName } from '../lib/songModel.js'
import { songToNotes } from '../lib/midi.js'
import { songHaystack, lyricSetsText, lyricSetNames, searchSongs } from '../lib/songSearch.js'

const A = live.content
const B = withIds.content
const j = (x) => JSON.stringify(x)

describe('#717 + permanent lyric-set ids — the extra field is inert', () => {
  it('the fixtures really differ ONLY by the two ids', () => {
    expect(B.lyricSets.map((s) => s.id)).toEqual(['s0a7d42c7e7', 's3b87476c4f'])
    const strip = (c) => j({ ...c, lyricSets: c.lyricSets.map(({ id, ...r }) => r) })
    expect(strip(B)).toBe(strip(A))
    expect(A.lyricSets.every((s) => s.id === undefined)).toBe(true)
  })

  // ── the sheet: what SongSheet actually draws, per set ──────────────────────
  it('resolveContent is byte-identical for every set (0, 1, none, junk)', () => {
    for (const set of [undefined, 0, 1, 2, -1, 'x']) {
      expect(j(resolveContent(B, { set }))).toBe(j(resolveContent(A, { set })))
    }
  })

  // ── playback / MP3: the note stream that the audio engine renders ──────────
  it('resolvePlayOrder and songToNotes are byte-identical for every set', () => {
    for (const set of [undefined, 0, 1]) {
      expect(j(resolvePlayOrder(B, { set }))).toBe(j(resolvePlayOrder(A, { set })))
      // songToNotes takes a v1-shaped content: resolveContent returns the LINES array
      const nb = songToNotes({ ...B, lines: resolveContent(B, { set }) })
      const na = songToNotes({ ...A, lines: resolveContent(A, { set }) })
      expect(j(nb)).toBe(j(na))
      expect(nb.length).toBeGreaterThan(0)
    }
  })

  // ── the set switcher + the print header both read the NAME ─────────────────
  it('lyricSetName is unchanged — an id never leaks out as a name', () => {
    A.lyricSets.forEach((_, i) => {
      expect(lyricSetName(B.lyricSets[i], i)).toBe(lyricSetName(A.lyricSets[i], i))
      expect(lyricSetName(B.lyricSets[i], i)).not.toContain('s0a7d42c7e7')
    })
  })

  // ── search: the id must not enter the index (a hex blob would match junk) ──
  it('the search haystack is unchanged and the id is NOT searchable', () => {
    expect(songHaystack(withIds)).toBe(songHaystack(live))
    expect(lyricSetsText(B)).toBe(lyricSetsText(A))
    expect(j(lyricSetNames(B))).toBe(j(lyricSetNames(A)))
    expect(searchSongs([withIds], 's0a7d42c7e7')).toHaveLength(0)
    // searchSongs returns [{song, score}] wrappers, not raw songs
    expect(searchSongs([withIds], '717').map((r) => r.song.number)).toEqual([717])
  })
})
