// Melody SSOT integrity — the WHOLE published library (P'Aim, gate-level 2026-07-24).
//
// MusicScore data must be 100% correct for the melody: pitch · octave · duration · tie · hold must
// never drift when a song is opened and saved. This test snapshots every published song's melody
// (src/lib/__fixtures__/melody-corpus.json — 170 songs, stanzas only = pure notation, no lyrics)
// and pushes every line through the editor's load→save bridge, FORCING the structural rebuild path
// (delete _source/_pristine) so it proves the worst case: the author edited somewhere on the line
// and every OTHER note still has to survive the rebuild — not the trivial byte-copy passthrough.
//
// Regenerate the fixture from live (read-only) only when the library changes:
//   node -e "import('@supabase/supabase-js').then(async ({createClient})=>{ ... })"  (see PR notes)
import { describe, it, expect } from 'vitest'
import { deserializeLine, serializeLine } from './editorSerde.js'
import { parseNotes } from './notation.js'
import corpus from './__fixtures__/melody-corpus.json' // vite bundles the snapshot at build time

// force the structural rebuild (what happens the moment the author edits anything on the line)
function rebuild(items) {
  const line = deserializeLine(items)
  delete line._source
  delete line._pristine
  return serializeLine(line)
}

// the melody dimensions P'Aim named, extracted so a diff points at WHICH dimension moved:
//  · pitch/octave/duration/tie  → parseNotes(note) tokens (accidental, low, high, pitch, underlines,
//    dots, tieStart, tieEnd, fermata, ext)   · · hold → the segment's holds object
//  · play-order → bar lines + repeat-start/repeat-end/volta/pickup markers
function melodyOf(items) {
  return (Array.isArray(items) ? items : []).map((it) => {
    if (!it || typeof it !== 'object') return it
    if (it.type === 'segment') return { m: parseNotes(it.note || ''), holds: it.holds ?? null }
    const { chord, lyric, ...structural } = it // chord/lyric are not melody
    return structural
  })
}

describe('melody corpus — every published song round-trips with zero melody loss', () => {
  it('fixture actually covers the library', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(160) // 170 at snapshot time; guard against a truncated fixture
  })

  it('holds appear in the fixture (so this test would catch their loss)', () => {
    const holds = corpus.flatMap((s) => s.stanzas).flatMap((st) => st.lines || [])
      .flatMap((ln) => ln).filter((it) => it && it.type === 'segment' && it.holds != null)
    expect(holds.length).toBeGreaterThan(0) // ≥10 real holds-bearing segments live in the corpus
  })

  it('pitch · octave · duration · tie · hold survive an edit-rebuild for ALL 170 songs', () => {
    const melodyDrift = []
    for (const song of corpus) {
      for (const st of song.stanzas) {
        for (const line of (st.lines || [])) {
          const out = rebuild(line)
          if (JSON.stringify(melodyOf(out)) !== JSON.stringify(melodyOf(line))) {
            melodyDrift.push(`#${song.number} ${song.title}`)
          }
        }
      }
    }
    expect(melodyDrift).toEqual([]) // any entry = a real song whose melody moved on save
  })

  it('the FULL content (bytes) is stable too — nothing at all is dropped on an edit-rebuild', () => {
    const changed = []
    for (const song of corpus) {
      for (const st of song.stanzas) {
        for (const line of (st.lines || [])) {
          if (JSON.stringify(rebuild(line)) !== JSON.stringify(line)) changed.push(`#${song.number} ${song.title}`)
        }
      }
    }
    expect([...new Set(changed)]).toEqual([])
  })
})
