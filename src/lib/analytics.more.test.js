// พี่เอม 18 พ.ย. 2569 — "ทำให้ดีกว่านี้อีกได้ไหม": the new things หน้าสถิติ counts — English / Chinese
// switched on, text bigger / smaller, a star, a share, a list sent or kept, and new vs coming back.
import { describe, it, expect, beforeEach } from 'vitest'
import { setConsent, trackPage, trackFeature, trackAction, noteVisit, SEEN_KEY, _resetForTest } from './analytics.js'

const feats = () => (window.dataLayer || []).map((a) => [...a]).filter((a) => a[0] === 'event' && a[1] === 'feature_use').map((a) => a[2])

function fresh({ consent = 'granted', seen } = {}) {
  localStorage.clear()
  if (seen) localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
  delete window.dataLayer
  delete window.gtag
  _resetForTest({ id: 'G-TEST000', host: true })
  if (consent) setConsent(consent)
}
const today = new Date().toISOString().slice(0, 10)

describe('new and coming back — once a day per device', () => {
  it('the first counted page of a new device says visit_new, once', () => {
    fresh()
    trackPage('/', 'รายการเพลง')
    trackPage('/song/a1', 'ก')
    expect(feats().filter((f) => /^visit_/.test(f.feature)).map((f) => f.feature)).toEqual(['visit_new'])
    expect(JSON.parse(localStorage.getItem(SEEN_KEY))).toEqual({ first: today, last: today })
  })
  it('a device seen on an earlier day says visit_back', () => {
    fresh({ seen: { first: '2026-11-01', last: '2026-11-10' } })
    trackPage('/', 'รายการเพลง')
    expect(feats().map((f) => f.feature)).toEqual(['visit_back'])
    expect(JSON.parse(localStorage.getItem(SEEN_KEY)).first).toBe('2026-11-01')
  })
  it('already counted today → nothing more', () => {
    fresh({ seen: { first: '2026-11-01', last: today } })
    trackPage('/', 'รายการเพลง')
    expect(feats()).toEqual([])
  })
  it('nothing — not even the date — before ยอมรับ', () => {
    fresh({ consent: null })
    trackPage('/', 'รายการเพลง')
    expect(noteVisit()).toBe(false)
    expect(localStorage.getItem(SEEN_KEY)).toBeNull()
  })
})

describe('new buttons and actions', () => {
  beforeEach(() => fresh({ seen: { first: '2026-11-01', last: today } }))
  it('English, Chinese and text size are buttons of a song open (once each)', () => {
    trackPage('/song/a1', 'ก')
    for (const f of ['lang_en', 'lang_en', 'lang_zh', 'font_up', 'font_down']) trackFeature(f)
    expect(feats().map((f) => f.feature)).toEqual(['lang_en', 'lang_zh', 'font_up', 'font_down'])
    expect(feats()[0].song_id).toBe('a1')
  })
  it('a star counts once per song, with the song it was given to', () => {
    trackPage('/', 'รายการเพลง')
    trackAction('star', 's1')
    trackAction('star', 's1')
    trackAction('star', 's2')
    expect(feats().map((f) => [f.feature, f.song_id])).toEqual([['star', 's1'], ['star', 's2']])
  })
  it('share and lists; an unknown action sends nothing', () => {
    trackPage('/song/a1', 'ก')
    trackAction('share_song')
    trackPage('/', 'รายการเพลง')
    trackAction('fav_send')
    trackAction('fav_take')
    expect(trackAction('nope')).toBe(false)
    expect(feats().map((f) => [f.feature, f.song_id])).toEqual([['share_song', 'a1'], ['fav_send', ''], ['fav_take', '']])
  })
})
