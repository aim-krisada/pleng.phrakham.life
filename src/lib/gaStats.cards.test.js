// ใบ v3/pleng#165–#174 — the counting behind each stats card, on rows shaped like ga-stats returns
import { describe, it, expect } from 'vitest'
import {
  songIdFromPath, songIds, topSongs, regions, sources, sourceName, notFound, foundNoPick, needsFix, keyChanges,
  features, deadEnds, openFrom, devices,
} from './gaStats.js'

const song = (id, extra = {}) => [id, { id, number: Number(id.slice(1)), title_th: 'เพลง ' + id, content: { key: 'C' }, ...extra }]
const SONGS = new Map([
  song('s1', { content: { key: 'G', arrangement: [{}, {}], stanzas: [{ lines: [[{ note: '1 2', chord: 'C' }]] }] } }),
  song('s2', { content: { key: 'D', stanzas: [{ lines: [[{ note: '1 2' }]] }] } }), // no chords
  song('s3', { deleted_at: '2026-11-10' }),
])
const parts = (c) => ({ notes: JSON.stringify(c || {}).includes('"note":"1'), chords: JSON.stringify(c || {}).includes('"chord":"C') })

const B = {
  reports: {
    songs: [
      [['/song/s1', 'cur'], 40], [['/song/s2', 'cur'], 25], [['/song/s3', 'cur'], 5], [['/song/s9', 'cur'], 2],
      [['/song/s2', 'prev'], 30], [['/', 'cur'], 99],
    ],
    regions: [[['Thailand', 'Bangkok'], 6], [['Thailand', 'Chiang Mai Province'], 3], [['Laos', 'Vientiane'], 1], [['Thailand', '(not set)'], 2]],
    sources: [[['line', 'referral'], 5], [['(direct)', '(none)'], 3], [['google', 'organic'], 2], [['m.facebook.com', 'referral'], 1], [['(not set)', '(not set)'], 4], [['bing', 'organic'], 1]],
    searches: [
      [['พระคุณ', 'yes'], 4], [['Hosanna ', 'no'], 3], [['hosanna', 'no'], 2], [['xyz', 'no'], 1], [['66', 'yes'], 5], [['ทดลอง', 'yes'], 2],
    ],
    searchPicks: [[['66'], 3]],
    features: [[['play'], 20], [['section'], 30], [['print'], 1]],
    deadEnds: [[['sheet_no_chords', 's2'], 4], [['sing_no_notes', 's9'], 1]],
    keyChanges: [[['s1', 'A'], 3], [['s1', 'Bb'], 1], [['s3', 'E'], 9], [['s2', 'C'], 2]],
    openFrom: [[['number'], 20], [['text'], 10], [['book'], 5], [['link'], 5], [['(not set)'], 50]],
    devices: [[['mobile', 'iOS', 'app'], 10], [['mobile', 'Android', 'web'], 15], [['desktop', 'Windows', 'web'], 5], [['tablet', 'iPadOS', 'web'], 2], [['mobile', 'iOS', '(not set)'], 9]],
  },
}

describe('songs', () => {
  it('reads the song id from a page path; other pages are not songs', () => {
    expect(songIdFromPath('/song/abc')).toBe('abc')
    expect(songIdFromPath('/')).toBeNull()
    expect(songIds(B).sort()).toEqual(['s1', 's2', 's3', 's9'])
  })

  it('stat.04 — top songs, removed ones kept but marked, ใหม่ only when the range before was counted', () => {
    const t = topSongs(B, SONGS)
    expect(t.map((r) => [r.id, r.opens])).toEqual([['s1', 40], ['s2', 25], ['s3', 5], ['s9', 2]])
    expect(t.find((r) => r.id === 's3').removed).toBe(true) // in the trash
    expect(t.find((r) => r.id === 's9').removed).toBe(true) // gone for good
    expect(t.every((r) => !r.isNew)).toBe(true)
    const later = topSongs(B, SONGS, { prevComparable: true })
    expect(later.find((r) => r.id === 's1').isNew).toBe(true)
    expect(later.find((r) => r.id === 's2').isNew).toBe(false)
  })

  it('stat.07 — opened often but missing notes or chords; removed songs left out', () => {
    const n = needsFix(B, SONGS, parts)
    expect(n.map((r) => [r.id, r.missing])).toEqual([['s2', ['คอร์ด']]])
  })

  it('stat.07 — key changes per song with the set key and the key most moved to', () => {
    const k = keyChanges(B, SONGS)
    expect(k.map((r) => [r.id, r.n, r.setKey, r.topTo])).toEqual([['s1', 4, 'G', 'A'], ['s2', 2, 'D', 'C']])
  })
})

describe('where people come from', () => {
  it('stat.05 — provinces, then ต่างประเทศ and ไม่ทราบ always shown', () => {
    const r = regions(B)
    expect(r.total).toBe(12)
    expect(r.rows.map((x) => [x.name, x.pct])).toEqual([['Bangkok', 50], ['Chiang Mai', 25], ['ต่างประเทศ', 8], ['ไม่ทราบ', 17]])
  })

  it('stat.05 — channels; unknown is its own row, never typed-in', () => {
    expect(sourceName('l.facebook.com', 'referral')).toBe('Facebook')
    expect(sourceName('(not set)', '(not set)')).toBe('ไม่ทราบ')
    const s = sources(B)
    expect(s.rows.map((x) => [x.name, x.n])).toEqual([
      ['LINE', 5], ['Facebook', 1], ['ค้นจาก Google', 2], ['พิมพ์ที่อยู่เข้ามาเอง', 3], ['อื่น ๆ', 1], ['ไม่ทราบ', 4],
    ])
  })
})

describe('searches', () => {
  it('stat.06 — not found, the same word with other spacing or case counted once', () => {
    const n = notFound(B)
    expect(n.rows.map((r) => [r.term, r.notFound])).toEqual([['hosanna', 5], ['xyz', 1]])
    expect(notFound({ reports: { searches: [[['a', 'yes'], 1]] } }).rows).toEqual([])
    expect(notFound({ reports: {} }).anySearch).toBe(false)
  })

  it('stat.08 — found 3 times or more but never picked, with the first song shown', () => {
    const f = foundNoPick(B, (t) => ({ title_th: 'แรก ' + t }))
    expect(f).toEqual([{ term: 'พระคุณ', searches: 4, first: { title_th: 'แรก พระคุณ' } }]) // 66 was picked; ทดลอง only twice
  })
})

describe('using the app', () => {
  it('stat.10 — features as % of song opens; ข้ามท่อน only over songs with ท่อน', () => {
    const f = features(B, SONGS)
    const by = Object.fromEntries(f.map((r) => [r.key, r]))
    expect(by.play).toMatchObject({ n: 20, base: 72, pct: 28 })
    expect(by.section).toMatchObject({ base: 40, pct: 75 }) // only s1 has more than one ท่อน
    expect(f[0].key).toBe('section')
    expect(by.print.low).toBe(false)
    expect(features({ reports: { songs: [[['/song/s1', 'cur'], 5]] } }, SONGS)[0].low).toBe(true)
  })

  it('stat.11 — dead ends by kind and the songs they happen on', () => {
    const d = deadEnds(B, SONGS)
    expect(d.total).toBe(5)
    expect(d.kinds.map((k) => k.n)).toEqual([1, 4])
    expect(d.songs[0]).toMatchObject({ id: 's2', n: 4 })
    expect(deadEnds({ reports: {} }, SONGS).total).toBe(0)
  })

  it('stat.12 — how people reach a song; pages that are not songs are left out', () => {
    const o = openFrom(B)
    expect(o.total).toBe(40)
    expect(o.rows.map((r) => [r.key, r.pct])).toEqual([['number', 50], ['text', 25], ['book', 13], ['fav', 0], ['link', 13]])
    expect(o.low).toBe(false)
  })

  it('stat.13 — device and system, each split web / app', () => {
    const d = devices(B)
    expect(d.total).toBe(32)
    expect(d.devices.map((r) => [r.name, r.pct, r.appPct])).toEqual([['มือถือ', 78, 40], ['แท็บเล็ต', 6, 0], ['คอม', 16, 0]])
    expect(d.systems.map((r) => r.name)).toEqual(['ไอโฟน ไอแพด', 'แอนดรอยด์', 'อื่น ๆ'])
  })
})
