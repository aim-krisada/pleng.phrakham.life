// US-C01 / DS-C01 — a downloaded song must round-trip: writing it to JSON and
// reading it back yields the same data (this is the promise US-C02 relies on to
// reopen the file). Also covers the meaningful-filename rule.
import { describe, it, expect } from 'vitest'
import { exportSong, songFilename, validateSong, parseSongText, importSong } from './jsonIO.js'
import { isV2 } from './songModel.js'

const song = {
  id: 42, // extra viewer-only field that must NOT leak into the file
  number: 12,
  title_th: 'พระเจ้าดีต่อฉัน',
  title_en: 'God is good',
  content: {
    version: 2,
    key: 'C',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1', lyric: 'พระ' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['พระ'] }],
  },
}

describe('exportSong (DS-C01 round-trip)', () => {
  it('serialises then parses back to an equal object', () => {
    const data = exportSong(song)
    const roundTripped = JSON.parse(JSON.stringify(data))
    expect(roundTripped).toEqual(data)
  })

  it('keeps only the portable fields (drops viewer-only keys like id)', () => {
    const data = exportSong(song)
    expect(Object.keys(data).sort()).toEqual(['content', 'number', 'title_en', 'title_th'])
    expect(data.content).toEqual(song.content)
  })

  it('normalises a blank song to null/empty rather than undefined', () => {
    const data = exportSong({})
    expect(data).toEqual({ number: null, title_th: '', title_en: '', content: null })
    // undefined would vanish through JSON — assert the file keeps every key.
    expect(JSON.parse(JSON.stringify(data))).toEqual(data)
  })
})

describe('songFilename (shared basename + .json, matches PDF name)', () => {
  it('is the shared "SITE_NAME - title" basename with a .json extension (US-I2)', () => {
    // exactly the name the Save-as-PDF dialog uses (core: songName.js) — no number
    expect(songFilename(song)).toBe('เพลง.พระคำ.ชีวิต - พระเจ้าดีต่อฉัน.json')
  })

  it('falls back to "แผ่นเพลง" when no Thai title (title_en is not used for filenames)', () => {
    expect(songFilename({ title_en: 'God is good' })).toBe('เพลง.พระคำ.ชีวิต - แผ่นเพลง.json')
  })

  it('strips filesystem-illegal characters', () => {
    expect(songFilename({ title_th: 'a/b:c*?' })).toBe('เพลง.พระคำ.ชีวิต - abc.json')
  })

  it('never yields an empty name', () => {
    expect(songFilename({ title_th: '   ' })).toBe('เพลง.พระคำ.ชีวิต - แผ่นเพลง.json')
    expect(songFilename({})).toBe('เพลง.พระคำ.ชีวิต - แผ่นเพลง.json')
  })
})

describe('validateSong (DS-C04 — reject bad files with a plain reason)', () => {
  it('accepts a v2 song and keeps its portable fields', () => {
    const r = validateSong(exportSong(song))
    expect(r.ok).toBe(true)
    expect(r.song).toEqual({ number: 12, title_th: 'พระเจ้าดีต่อฉัน', title_en: 'God is good', content: song.content })
    expect(isV2(r.song.content)).toBe(true)
  })

  it('migrates a v1 file to v2 automatically', () => {
    const v1 = { title_th: 'เก่า', content: { key: 'C', lines: [[{ type: 'segment', note: '1', lyric: 'ก' }]] } }
    const r = validateSong(v1)
    expect(r.ok).toBe(true)
    expect(isV2(r.song.content)).toBe(true) // stanzas/arrangement now present
  })

  it('rejects a non-object with a human reason (no throw)', () => {
    for (const bad of [null, 42, 'hi', [1, 2]]) {
      const r = validateSong(bad)
      expect(r.ok).toBe(false)
      expect(typeof r.error).toBe('string')
    }
  })

  it('rejects valid JSON that is not a song', () => {
    const r = validateSong({ foo: 1, bar: 2 })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/เนื้อเพลง|ทำนอง/)
  })
})

describe('parseSongText (DS-C04 — corrupt JSON never crashes)', () => {
  it('returns a friendly error for unparseable text', () => {
    const r = parseSongText('{ this is not json ]')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/JSON/)
  })

  it('round-trips a downloaded file back into the same song (C01 ↔ C02)', () => {
    const fileText = JSON.stringify(exportSong(song), null, 2)
    const r = parseSongText(fileText)
    expect(r.ok).toBe(true)
    expect(exportSong(r.song)).toEqual(exportSong(song))
  })
})

describe('importSong (DS-C02 — read a File, no store/DB)', () => {
  // A faithful stand-in for the File it receives: importSong only calls file.text().
  // (jsdom's Blob.text() is unimplemented, so a stub is the reliable way to test.)
  const fileWith = (text) => ({ text: async () => text })

  it('imports a good file into a song object', async () => {
    const r = await importSong(fileWith(JSON.stringify(exportSong(song))))
    expect(r.ok).toBe(true)
    expect(r.song.title_th).toBe('พระเจ้าดีต่อฉัน')
    expect(isV2(r.song.content)).toBe(true)
  })

  it('reports a plain reason when no file is given', async () => {
    const r = await importSong(null)
    expect(r.ok).toBe(false)
    expect(typeof r.error).toBe('string')
  })

  it('does not throw when the file cannot be read', async () => {
    const r = await importSong({ text: async () => { throw new Error('io') } })
    expect(r.ok).toBe(false)
    expect(typeof r.error).toBe('string')
  })
})
