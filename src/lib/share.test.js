// ใบ v3/pleng#151 — what each page shares, which glyph, and what happens on share / cancel / copy.
import { describe, it, expect, vi } from 'vitest'
import { shareTarget, isApple, shareLink, siteRoot } from './share.js'

const ROOT = 'https://pleng.phrakham.life/'
const song = { title_th: 'พระคุณพระเจ้า' }

describe('shareTarget — AC6 · AC7 · AC8', () => {
  it('AC6 — a saved song shares its ฝึกร้อง page with the song name, never the edit query', () => {
    expect(shareTarget('/song/42', song, ROOT)).toEqual({
      url: 'https://pleng.phrakham.life/#/song/42',
      title: 'พระคุณพระเจ้า · เพลง.พระคำ.ชีวิต',
    })
  })
  it('AC6 — a song without a name still shares, under the site name', () => {
    expect(shareTarget('/song/7', null, ROOT).title).toBe('เพลง.พระคำ.ชีวิต')
  })
  it('AC7 — home, คู่มือ and เกี่ยวกับเรา share themselves', () => {
    expect(shareTarget('/', null, ROOT).url).toBe(ROOT)
    expect(shareTarget('/guide', null, ROOT).url).toBe(ROOT + '#/guide')
    expect(shareTarget('/about', null, ROOT).url).toBe(ROOT + '#/about')
    expect(shareTarget('/notation', null, 'https://x.test/base').url).toBe('https://x.test/base/#/notation')
  })
  it('AC8 sad path — a new song / unsaved draft (/studio) has nothing to share', () => {
    expect(shareTarget('/studio', song, ROOT)).toBeNull()
  })
})

describe('isApple — AC2 glyph follows the device', () => {
  it('iPhone, iPad (reports Macintosh) and Mac → Apple', () => {
    expect(isApple({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe(true)
    expect(isApple({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })).toBe(true)
    expect(isApple({ userAgentData: { platform: 'macOS' } })).toBe(true)
  })
  it('Android and Windows → not Apple', () => {
    expect(isApple({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' })).toBe(false)
    expect(isApple({ userAgentData: { platform: 'Windows' }, userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })).toBe(false)
  })
})

describe('shareLink — AC4 · AC5 · AC9', () => {
  const t = { url: ROOT + '#/song/42', title: 'พระคุณพระเจ้า · เพลง.พระคำ.ชีวิต' }
  it('AC4 — the device share sheet gets the name (title + text) and the link', async () => {
    const share = vi.fn().mockResolvedValue()
    expect(await shareLink(t, { share })).toBe('shared')
    expect(share).toHaveBeenCalledWith({ title: t.title, text: t.title, url: t.url })
  })
  it('AC9 sad path — closing the sheet is not an error and copies nothing', async () => {
    const writeText = vi.fn()
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }))
    expect(await shareLink(t, { share, clipboard: { writeText } })).toBe('cancel')
    expect(writeText).not.toHaveBeenCalled()
  })
  it('AC5 — no share sheet → the link is copied', async () => {
    const writeText = vi.fn().mockResolvedValue()
    expect(await shareLink(t, { clipboard: { writeText } })).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(t.url)
  })
  it('AC5 — a share sheet that refuses (not a cancel) falls back to copying', async () => {
    const writeText = vi.fn().mockResolvedValue()
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    expect(await shareLink(t, { share, clipboard: { writeText } })).toBe('copied')
  })
  it('AC9 sad path — copying blocked too → manual (the bar shows the link)', async () => {
    expect(await shareLink(t, {})).toBe('manual')
    expect(await shareLink(t, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } })).toBe('manual')
  })
})

describe('siteRoot — the root a shared link starts with', () => {
  it('live site: no stray dot after the domain (base ./ bug)', () => {
    expect(siteRoot({ origin: 'https://pleng.phrakham.life', pathname: '/' })).toBe('https://pleng.phrakham.life/')
    expect(siteRoot({ origin: 'https://pleng.phrakham.life', pathname: '/index.html' })).toBe('https://pleng.phrakham.life/')
  })
  it('GitHub Pages project path keeps its folder', () => {
    expect(siteRoot({ origin: 'https://x.github.io', pathname: '/pleng/' })).toBe('https://x.github.io/pleng/')
  })
})
