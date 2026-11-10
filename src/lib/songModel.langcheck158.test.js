// ใบ v1#158 — ตรวจแล้ว is per language. Thai keeps songs.verified; every other language has its own
// content.langVerified[lang]. The public sees a non-Thai language only once it is ตรวจแล้ว; the team
// sees every language, with "ยังไม่ได้ตรวจ" on the button of one that is not.
import { describe, it, expect } from 'vitest'
import { readerContent, langMarks, langApproved, songLangs, shownLangs, missingLangText, resolveContent } from './songModel.js'
import live from '../components/__fixtures__/anuchon-2-live.json'

const v2 = (arrangement, extra = {}) => ({
  version: 2,
  key: 'C',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3 4' }]] }],
  arrangement,
  ...extra,
})
const ROW = { stanza: 'A', syllables: ['ของ', 'ขวัญ', 'ที่', 'รอ'], lyrics: { en: ['trea', '-sure', 'for', 'you'], zh: ['我', '们', '的', '主'] } }

describe('langApproved', () => {
  it('only a real true counts', () => {
    expect(langApproved(v2([], { langVerified: { en: true } }), 'en')).toBe(true)
    expect(langApproved(v2([], { langVerified: { en: 'yes' } }), 'en')).toBe(false)
    expect(langApproved(v2([]), 'en')).toBe(false)
    expect(langApproved(null, 'en')).toBe(false)
  })
})

describe('readerContent — who sees which language', () => {
  it('the team sees every language, approved or not (same object)', () => {
    const c = v2([ROW])
    expect(readerContent(c, true)).toBe(c)
  })

  it('the public sees no language that is not ตรวจแล้ว — the song looks Thai-only', () => {
    const c = v2([ROW])
    const pub = readerContent(c, false)
    expect(pub.arrangement[0]).not.toHaveProperty('lyrics')
    expect(pub.arrangement[0].syllables).toEqual(ROW.syllables)
    expect(songLangs(pub)).toEqual(['th'])
    expect(c.arrangement[0].lyrics.en).toBeDefined() // the stored song is not touched
  })

  it('the public sees an approved language and not the others', () => {
    const pub = readerContent(v2([ROW], { langVerified: { en: true } }), false)
    expect(Object.keys(pub.arrangement[0].lyrics)).toEqual(['en'])
    expect(songLangs(pub)).toEqual(['th', 'en'])
  })

  it('a Thai-only song is returned as is (same object) for the public', () => {
    const c = v2([{ stanza: 'A', syllables: ['ก', 'ข'] }])
    expect(readerContent(c, false)).toBe(c)
    expect(readerContent(live.content, false)).toBe(live.content)
  })

  it('a hidden language counts as "not there": the missing-language line and fixed order still work', () => {
    const pub = readerContent(v2([ROW], { langVerified: { zh: true } }), false)
    const has = songLangs(pub)
    expect(has).toEqual(['th', 'zh'])
    expect(shownLangs(['zh', 'en', 'th'], has).shown).toEqual(['th', 'zh'])
    expect(missingLangText(['th', 'en'], has)).toBe('เพลงนี้ยังไม่มี English · มี ไทย · 中文')
  })

  it('the public sheet of a song with unapproved English is the Thai-only sheet', () => {
    const thaiOnly = v2([{ stanza: 'A', syllables: ROW.syllables }])
    const pub = readerContent(v2([ROW]), false)
    expect(JSON.stringify(resolveContent(pub))).toBe(JSON.stringify(resolveContent(thaiOnly)))
  })
})

describe('langMarks — "ยังไม่ได้ตรวจ" on a language button', () => {
  it('the team: every non-Thai language that is not ตรวจแล้ว', () => {
    expect(langMarks(v2([ROW]), true)).toEqual({ en: ['ยังไม่ได้ตรวจ'], zh: ['ยังไม่ได้ตรวจ'] })
    expect(langMarks(v2([ROW], { langVerified: { en: true } }), true)).toEqual({ zh: ['ยังไม่ได้ตรวจ'] })
  })
  it('never on Thai, never for the public, nothing for a Thai-only song', () => {
    expect(langMarks(v2([ROW]), false)).toEqual({})
    expect(langMarks(v2([{ stanza: 'A', syllables: ['ก'] }]), true)).toEqual({})
    expect(langMarks(live.content, true)).toEqual({})
  })
})
