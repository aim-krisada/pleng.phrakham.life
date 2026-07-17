// @vitest-environment node
// B102 regression guard — THE MP3 MUST CONTAIN THE WHOLE SONG.
//
// What broke: the sheet writes a "ร้องรับทุกข้อ" refrain ONCE, but the song SINGS it after
// every verse. The viewer expands that (buildPlayNotes + resolvePlayOrder); the export did
// not, so every downloaded MP3 silently lost every refrain repeat — 116s of a 297s song at
// the worst (song #16), across 11 published songs, live for 19 deploys. Nothing errored: the
// file played, it was just short. A comment in audioExport.js even asserted the opposite
// ("MP3 == ฟัง in every musical detail") — which is precisely why nobody looked.
//
// So the invariant is pinned here rather than asserted in prose: what the export renders must
// equal, note for note, what the viewer plays. This test is the reason the claim is safe to
// make. If a future edit drops the play order from either export path, these fail.
//
// The live side is reconstructed the way SongViewer.vue does it (fullNotes = the whole song in
// its real play order) rather than imported, so the test still binds if the viewer is
// refactored — it encodes the REQUIREMENT, not the current call graph.
import { describe, it, expect } from 'vitest'
import { exportPlayNotes, estimateMp3, notesDurationSec, playOrderOf } from './audioExport.js'
import { buildPlayNotes } from './midi.js'
import { resolveContent, resolvePlayOrder } from './songModel.js'

// The real shape of song 141 / #16: the refrain is written once after verse 1 and carries the
// directive; verses 2-4 reuse the verse melody. Verse = 4 notes, refrain = 3 notes.
const strophicSong = {
  version: 2,
  key: 'C',
  bpm: 92,
  timeSignature: '4/4',
  stanzas: [
    { id: 'A', lines: [[{ type: 'segment', note: '1 2' }], [{ type: 'segment', note: '3 4' }]] },
    { id: 'B', lines: [[{ type: 'segment', note: '5 5 5' }]] },
  ],
  arrangement: [
    { stanza: 'A', label: '' }, // ข้อ 1
    { stanza: 'B', label: 'รับ', afterEachVerse: true }, // sung after EVERY verse
    { stanza: 'A', label: 'ข้อ 2' },
    { stanza: 'A', label: 'ข้อ 3' },
    { stanza: 'A', label: 'ข้อ 4' },
  ],
}
// identical song minus the directive → play order == sheet order (most songs)
const plainSong = JSON.parse(JSON.stringify(strophicSong))
delete plainSong.arrangement[1].afterEachVerse

// what "ฟัง" schedules — SongViewer.vue's fullNotes, rebuilt from the same public seams
const viewerNotes = (content) => {
  const resolved = { ...content, lines: resolveContent(content) }
  return buildPlayNotes(resolved, { order: resolvePlayOrder(content) ?? undefined })
}

describe('MP3 export plays the whole song (B102 strophic repeats)', () => {
  it('⭐ export notes === viewer notes, note for note — the invariant that must never regress', () => {
    const mp3 = exportPlayNotes(strophicSong)
    const live = viewerNotes(strophicSong)
    expect(mp3.length).toBe(live.length)
    // not just the count: the same notes in the same order (a wrong order of the right
    // length would pass a length-only check)
    expect(mp3.map((n) => [n.li, n.si, n.midi])).toEqual(live.map((n) => [n.li, n.si, n.midi]))
  })

  it('actually repeats the refrain — 4 verses → the refrain sounds 4×, not once', () => {
    const refrainLi = 2 // the single refrain display line
    const plays = exportPlayNotes(strophicSong).filter((n) => n.li === refrainLi).length
    expect(plays).toBe(3 * 4) // 3 refrain notes × 4 verses
    // the bug's exact signature: the sheet order would sound it only once
    expect(buildPlayNotes({ ...strophicSong, lines: resolveContent(strophicSong) }).filter((n) => n.li === refrainLi).length).toBe(3)
  })

  it('⭐ estimateMp3 promises the length the render delivers (no "≈2 นาที" → 4-minute file)', () => {
    const est = estimateMp3(strophicSong).seconds
    const rendered = notesDurationSec(exportPlayNotes(strophicSong), 92) + 0.25
    expect(est).toBeCloseTo(rendered, 6)
    // and that length is the viewer's length — both paths, one number
    expect(est).toBeCloseTo(notesDurationSec(viewerNotes(strophicSong), 92) + 0.25, 6)
  })

  it('a song with no directive is untouched — whole song, display order, as before', () => {
    expect(playOrderOf(plainSong)).toBeUndefined()
    expect(exportPlayNotes(plainSong).map((n) => n.li)).toEqual(viewerNotes(plainSong).map((n) => n.li))
  })

  it('v1 songs (no arrangement) still export the plain line order', () => {
    const v1 = { key: 'C', bpm: 92, lines: [[{ type: 'segment', note: '1 2 3' }]] }
    expect(playOrderOf(v1)).toBeUndefined()
    expect(exportPlayNotes(v1).length).toBe(3)
  })
})
