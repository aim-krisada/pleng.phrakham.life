// ใบ v1#166 — the offline list holds only the instruments the site can play.
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { precacheFiles, sampleUrl } from './samplePrecache.js'
import { PIANO_ONLY, PRECACHE_INSTRUMENTS, precacheInstruments } from './soundOptions.js'
import { buildSamplesManifest, manifestText, SAMPLES_ROOT } from '../../tools/sample-precache.mjs'

const MAN = {
  instruments: {
    grand: { baseUrl: 'splendid-grand/samples' },
    felt: { reuses: 'grand' },
    nylon: { baseUrl: 'CC0/nylon' },
    steel: { instrumentUrl: 'FluidR3_GM/steel.js' },
  },
}
const FILES = [
  'manifest.json', 'README.md', '.gitattributes',
  'splendid-grand/samples/PP C4.ogg', 'CC0/nylon/31.ogg', 'CC0/nylon/preset.json', 'FluidR3_GM/steel.js',
]

describe('precacheFiles', () => {
  it('piano only → only the grand files', () => {
    expect(precacheFiles(MAN, FILES, ['grand'])).toEqual(['splendid-grand/samples/PP C4.ogg'])
  })
  it('felt brings the grand files it is built on', () => {
    expect(precacheFiles(MAN, FILES, ['felt'])).toEqual(['splendid-grand/samples/PP C4.ogg'])
  })
  it('null → every sample file (not the manifest or README)', () => {
    expect(precacheFiles(MAN, FILES, null)).toEqual([
      'CC0/nylon/31.ogg', 'CC0/nylon/preset.json', 'FluidR3_GM/steel.js', 'splendid-grand/samples/PP C4.ogg',
    ])
  })
  it('url-encodes each part', () => {
    expect(sampleUrl('splendid-grand/samples/FF A#2.ogg')).toBe('/samples/splendid-grand/samples/FF%20A%232.ogg')
  })
})

describe('soundOptions → what gets precached', () => {
  it('PIANO_ONLY on → piano; off → every instrument', () => {
    expect(PIANO_ONLY).toBe(true)
    expect(PRECACHE_INSTRUMENTS).toEqual(['grand'])
    expect(precacheInstruments(false, ['grand', 'nylon'])).toBeNull()
  })

  it('the real list: piano only = the 120 grand files', async () => {
    const m = await buildSamplesManifest(SAMPLES_ROOT, precacheInstruments(true, ['grand']))
    expect(m.precache).toHaveLength(120)
    expect(m.precache.every((u) => u.startsWith('/samples/splendid-grand/samples/'))).toBe(true)
    expect(m.precacheMB).toBeLessThan(m.totalMB)
    expect(Object.keys(m.instruments)).toEqual(expect.arrayContaining(['grand', 'nylon', 'cello', 'violin', 'steel']))
  })

  it('the real list with PIANO_ONLY off puts the other instruments back', async () => {
    const m = await buildSamplesManifest(SAMPLES_ROOT, precacheInstruments(false, ['grand', 'nylon']))
    expect(m.precache.length).toBeGreaterThan(120)
    for (const dir of ['CC0/nylon/', 'CC0/cello/', 'CC0/violin/', 'FluidR3_GM/', 'splendid-grand/samples/']) {
      expect(m.precache.some((u) => u.startsWith('/samples/' + dir))).toBe(true)
    }
    expect(m.precacheMB).toBe(m.totalMB)
  })

  it('the committed manifest.json matches soundOptions.js (run `npm run samples:precache` if not)', async () => {
    const committed = readFileSync(new URL('../../public/samples/manifest.json', import.meta.url), 'utf8')
    expect(committed).toBe(manifestText(await buildSamplesManifest()))
  })
})
