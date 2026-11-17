// ใบ v1#158 — ตรวจแล้ว is per language. Thai keeps songs.verified; every other language has its own
// content.langVerified[lang]. พี่เอม 17 พ.ย. 2569 (ใบ v3/pleng#177): EVERYONE sees every language; one
// that is not ตรวจแล้ว carries "ยังไม่ได้ตรวจ" on its button — for the public too.
import { describe, it, expect } from 'vitest'
import { readerContent, langMarks, langApproved, songLangs, HIDE_UNCHECKED_LANGS } from './songModel.js'
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

  it('the public ALSO sees a language that is not ตรวจแล้ว yet (same object, nothing hidden)', () => {
    expect(HIDE_UNCHECKED_LANGS).toBe(false)
    const c = v2([ROW])
    expect(readerContent(c, false)).toBe(c)
    expect(songLangs(readerContent(c, false))).toEqual(['th', 'en', 'zh'])
  })

  it('approved or not makes no difference to what the public sees', () => {
    const c = v2([ROW], { langVerified: { en: true } })
    expect(readerContent(c, false)).toBe(c)
  })

  it('a Thai-only song is returned as is (same object) for the public', () => {
    const c = v2([{ stanza: 'A', syllables: ['ก', 'ข'] }])
    expect(readerContent(c, false)).toBe(c)
    expect(readerContent(live.content, false)).toBe(live.content)
  })

})

describe('langMarks — "ยังไม่ได้ตรวจ" on a language button', () => {
  it('the team: every non-Thai language that is not ตรวจแล้ว', () => {
    expect(langMarks(v2([ROW]), true)).toEqual({ en: ['ยังไม่ได้ตรวจ'], zh: ['ยังไม่ได้ตรวจ'] })
    expect(langMarks(v2([ROW], { langVerified: { en: true } }), true)).toEqual({ zh: ['ยังไม่ได้ตรวจ'] })
  })
  it('the public sees the same mark (they see the language too)', () => {
    expect(langMarks(v2([ROW]), false)).toEqual({ en: ['ยังไม่ได้ตรวจ'], zh: ['ยังไม่ได้ตรวจ'] })
    expect(langMarks(v2([ROW], { langVerified: { en: true, zh: true } }), false)).toEqual({})
  })
  it('never on Thai, nothing for a Thai-only song', () => {
    expect(langMarks(v2([{ stanza: 'A', syllables: ['ก'] }]), false)).toEqual({})
    expect(langMarks(v2([{ stanza: 'A', syllables: ['ก'] }]), true)).toEqual({})
    expect(langMarks(live.content, true)).toEqual({})
  })
})
