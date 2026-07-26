// BI-010 regression: a shared link / QR must point at the PUBLIC site, never the dev/preview or
// LAN origin (127.0.0.1 / localhost / 192.168.x.x), which on a phone means "the phone itself" and
// so the scanned QR fails ("null is unreachable" / "127.0.0.1 refused to connect"). See share.js.
import { describe, it, expect, afterEach } from 'vitest'
import { appBase, buildSongUrl, buildListUrl } from './share.js'

const PUBLIC = 'https://pleng.phrakham.life'
function setLocation(loc) {
  globalThis.window = { location: loc }
}
afterEach(() => { delete globalThis.window })

describe('appBase — canonical public base (BI-010)', () => {
  it('swaps a 127.0.0.1 dev origin for the public site', () => {
    setLocation({ origin: 'http://127.0.0.1:5400', pathname: '/', hostname: '127.0.0.1', protocol: 'http:' })
    expect(appBase()).toBe(PUBLIC + '/')
  })

  it('swaps a localhost dev origin', () => {
    setLocation({ origin: 'http://localhost:5173', pathname: '/', hostname: 'localhost', protocol: 'http:' })
    expect(appBase()).toBe(PUBLIC + '/')
  })

  it('swaps a `vite --host` LAN origin (192.168.x.x)', () => {
    setLocation({ origin: 'http://192.168.1.124:5400', pathname: '/', hostname: '192.168.1.124', protocol: 'http:' })
    expect(appBase()).toBe(PUBLIC + '/')
  })

  it('keeps the /v2/ sub-path when swapping a dev origin', () => {
    setLocation({ origin: 'http://localhost:5400', pathname: '/v2/', hostname: 'localhost', protocol: 'http:' })
    expect(appBase()).toBe(PUBLIC + '/v2/')
  })

  it('pins a file:// origin to the public root', () => {
    setLocation({ origin: 'null', pathname: '/C:/build/index.html', hostname: '', protocol: 'file:' })
    expect(appBase()).toBe(PUBLIC + '/')
  })

  it('uses the real origin+path verbatim on the production host (root)', () => {
    setLocation({ origin: PUBLIC, pathname: '/', hostname: 'pleng.phrakham.life', protocol: 'https:' })
    expect(appBase()).toBe(PUBLIC + '/')
  })

  it('preserves the /v2/ sub-path on the production host', () => {
    setLocation({ origin: PUBLIC, pathname: '/v2/', hostname: 'pleng.phrakham.life', protocol: 'https:' })
    expect(appBase()).toBe(PUBLIC + '/v2/')
  })

  it('normalises a trailing index.html on the production host', () => {
    setLocation({ origin: PUBLIC, pathname: '/index.html', hostname: 'pleng.phrakham.life', protocol: 'https:' })
    expect(appBase()).toBe(PUBLIC + '/')
  })
})

describe('buildSongUrl / buildListUrl never leak a dev origin (BI-010)', () => {
  it('song link from a dev origin points at the public site with the hash route', () => {
    setLocation({ origin: 'http://127.0.0.1:5400', pathname: '/', hostname: '127.0.0.1', protocol: 'http:' })
    const url = buildSongUrl('27bc45e4-87e6-4c2c-87ca-2b271e382e8d', 'G')
    expect(url).toBe(PUBLIC + '/#/song/27bc45e4-87e6-4c2c-87ca-2b271e382e8d?key=G')
    expect(url).not.toMatch(/127\.0\.0\.1|localhost|192\.168\./)
  })

  it('list link from a dev origin points at the public site', () => {
    setLocation({ origin: 'http://127.0.0.1:5400', pathname: '/', hostname: '127.0.0.1', protocol: 'http:' })
    const url = buildListUrl('AbC-_blob')
    expect(url).toBe(PUBLIC + '/#/list?d=AbC-_blob')
    expect(url).not.toMatch(/127\.0\.0\.1|localhost/)
  })
})

// 717 — a shared link may also carry WHICH lyric set it was shared on, by the set's PERMANENT
// id (songModel.lyricSetIdAt), never its position: delete a set and a positional link would
// silently start pointing at different words.
describe('buildSongUrl — ?set= carries a permanent set id', () => {
  const ID = '27bc45e4-87e6-4c2c-87ca-2b271e382e8d'
  beforeEach(() => setLocation({ origin: PUBLIC, pathname: '/', hostname: 'pleng.phrakham.life', protocol: 'https:' }))

  it('omits ?set= for an ordinary song / the first set — the common link stays clean', () => {
    expect(buildSongUrl(ID)).toBe(PUBLIC + '/#/song/' + ID)
    expect(buildSongUrl(ID, '', '')).toBe(PUBLIC + '/#/song/' + ID)
  })

  it('adds ?set= alone when the key is untouched', () => {
    expect(buildSongUrl(ID, '', 'sABC123')).toBe(PUBLIC + '/#/song/' + ID + '?set=sABC123')
  })

  it('carries key AND set together', () => {
    expect(buildSongUrl(ID, 'G', 'sABC123')).toBe(PUBLIC + '/#/song/' + ID + '?key=G&set=sABC123')
  })

  it('encodes the set id — a link is user-supplied text by the time it comes back', () => {
    expect(buildSongUrl(ID, '', 'a b&c=d')).toContain('set=a%20b%26c%3Dd')
  })
})
