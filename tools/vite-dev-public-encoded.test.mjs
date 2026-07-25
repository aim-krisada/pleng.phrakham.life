// Guards the gate of the dev-only public/ rescue middleware: it must fire for exactly the paths
// vite mis-decodes (URI-reserved chars like `#`), and for nothing else — especially not for SPA
// routes and not for anything resolving outside publicDir.
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { resolveEncodedPublicFile, contentTypeFor, parseRange } from './vite-dev-public-encoded.mjs'

const ROOT = path.resolve('/proj/public')
const SAMPLE = path.join(ROOT, 'samples', 'splendid-grand', 'samples', 'FF G#2.ogg')

// Pretend disk: only the `#` sample and one plain control file exist.
const EXISTING = new Set([SAMPLE, path.join(ROOT, 'samples', 'splendid-grand', 'samples', 'FF G2.ogg')])
const isFile = (p) => EXISTING.has(p)
const resolve = (url) => resolveEncodedPublicFile(ROOT, url, isFile)

describe('resolveEncodedPublicFile — takes over only where vite decodes wrongly', () => {
  it('serves a name with an encoded # (the actual bug)', () => {
    expect(resolve('/samples/splendid-grand/samples/FF%20G%232.ogg')).toBe(SAMPLE)
  })

  it('still serves it when a harmless query is attached', () => {
    expect(resolve('/samples/splendid-grand/samples/FF%20G%232.ogg?t=1')).toBe(SAMPLE)
  })

  it('ignores a %20-only name — vite already handles those', () => {
    expect(resolve('/samples/splendid-grand/samples/FF%20G2.ogg')).toBeNull()
  })

  it('ignores plain paths with no escapes at all', () => {
    expect(resolve('/site.webmanifest')).toBeNull()
    expect(resolve('/sw.js')).toBeNull()
  })

  it('ignores SPA routes so the html fallback still answers them', () => {
    expect(resolve('/')).toBeNull()
    expect(resolve('/studio')).toBeNull()
    expect(resolve('/song/141')).toBeNull()
    expect(resolve('/no-such-page')).toBeNull()
  })

  it('leaves vite transform queries (?url, ?import, ?raw, ?worker) to vite', () => {
    for (const q of ['url', 'import', 'raw', 'worker', 'inline']) {
      expect(resolve(`/samples/splendid-grand/samples/FF%20G%232.ogg?${q}`)).toBeNull()
    }
  })

  it('refuses to escape publicDir via encoded traversal', () => {
    expect(resolve('/samples/..%2f..%2fpackage.json')).toBeNull()
    expect(resolve('/..%2f..%2f..%2fWindows%2fwin.ini')).toBeNull()
    expect(resolve('/%2e%2e/package.json')).toBeNull()
  })

  it('returns null for a decoded path that is not a real file', () => {
    expect(resolve('/samples/splendid-grand/samples/NOPE%20X%232.ogg')).toBeNull()
  })

  it('survives a malformed escape instead of throwing', () => {
    expect(resolve('/samples/%E0%A4%A.ogg')).toBeNull()
  })

  it('does not treat a fragment as part of the path', () => {
    expect(resolve('/studio#%23')).toBeNull()
  })
})

describe('contentTypeFor — never answers text/html for an asset', () => {
  it('maps the sample extension to audio/ogg', () => {
    expect(contentTypeFor(SAMPLE)).toBe('audio/ogg')
  })

  it('falls back to octet-stream for unknown extensions', () => {
    expect(contentTypeFor('/x/y.weird')).toBe('application/octet-stream')
  })
})

describe('parseRange', () => {
  it('returns null when there is no range header', () => {
    expect(parseRange(undefined, 100)).toBeNull()
  })

  it('parses a closed range', () => {
    expect(parseRange('bytes=10-19', 100)).toEqual({ start: 10, end: 19 })
  })

  it('parses an open-ended range and clamps to the file size', () => {
    expect(parseRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 })
    expect(parseRange('bytes=0-500', 100)).toEqual({ start: 0, end: 99 })
  })

  it('parses a suffix range', () => {
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 })
  })

  it('reports unsatisfiable ranges', () => {
    expect(parseRange('bytes=200-300', 100)).toBe(false)
    expect(parseRange('bytes=-0', 100)).toBe(false)
  })
})
