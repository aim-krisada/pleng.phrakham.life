// ใบ v3/pleng#164–#174 — what the stats page needs from the counter: web or app on every hit, how a song
// was reached, searches, buttons used once per song open, dead ends, key changes — and still nothing
// before ยอมรับ, nothing off the live site.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  GA_ID, LIVE_HOST, analyticsOn, setConsent, trackPage, noteOpenFrom, trackFeature, trackDeadEnd,
  trackKeyChange, trackSearch, trackSearchSelect, searchTerm, songParts, displayMode, _resetForTest,
} from './analytics.js'

const ID = 'G-TEST000'
const events = () => (window.dataLayer || []).map((a) => [...a]).filter((a) => a[0] === 'event')
const named = (n) => events().filter((a) => a[1] === n).map((a) => a[2])

function fresh({ host = true, consent = 'granted' } = {}) {
  localStorage.clear()
  document.querySelectorAll('script[data-ga]').forEach((s) => s.remove())
  delete window.dataLayer
  delete window.gtag
  _resetForTest({ id: ID, host })
  if (consent) setConsent(consent)
}

describe('switched on', () => {
  it('uses the main site code, on the live host only', () => {
    expect(GA_ID).toBe('G-W3XP4T2FFE')
    expect(LIVE_HOST).toBe('pleng.phrakham.life')
    _resetForTest({ id: GA_ID, host: false }) // the test runner is localhost — like a dev server
    expect(analyticsOn.value).toBe(false)
    _resetForTest({ id: GA_ID, host: true })
    expect(analyticsOn.value).toBe(true)
  })
  it('a dev server sends nothing, even after a yes', () => {
    fresh({ host: false })
    trackPage('/', 'รายการเพลง')
    trackFeature('play')
    expect(window.dataLayer).toBeUndefined()
  })
})

describe('web or installed app', () => {
  beforeEach(() => fresh())
  it('a browser tab is web; full screen (or iPhone standalone) is app', () => {
    expect(displayMode()).toBe('web')
    const mm = window.matchMedia
    window.matchMedia = (q) => ({ matches: q === '(display-mode: standalone)' })
    try { expect(displayMode()).toBe('app') } finally { window.matchMedia = mm }
    window.navigator.standalone = true
    try { expect(displayMode()).toBe('app') } finally { delete window.navigator.standalone }
  })
  it('rides on every page view and every event', () => {
    trackPage('/', 'รายการเพลง')
    trackSearch('พระเจ้า', 3)
    expect(named('page_view')[0].display_mode).toBe('web')
    expect(named('search')[0].display_mode).toBe('web')
  })
})

describe('how a song was reached', () => {
  beforeEach(() => fresh())
  it('the first page of a visit is a link', () => {
    trackPage('/song/a1', 'ก')
    expect(named('page_view')[0].open_from).toBe('link')
  })
  it('the song list says where the tap came from; with no note it is other', () => {
    trackPage('/', 'รายการเพลง')
    noteOpenFrom('number')
    trackPage('/song/a1', 'ก')
    trackPage('/', 'รายการเพลง')
    trackPage('/song/a2', 'ข')
    const pv = named('page_view')
    expect(pv[0].open_from).toBeUndefined() // not a song page
    expect(pv[1].open_from).toBe('number')
    expect(pv[3].open_from).toBe('other')
  })
  it('a page seen before ยอมรับ still counts as the first page', () => {
    fresh({ consent: null })
    trackPage('/', 'รายการเพลง')
    setConsent('granted')
    noteOpenFrom('book')
    trackPage('/song/a1', 'ก')
    expect(named('page_view').map((p) => p.open_from)).toEqual([undefined, 'book'])
  })
})

describe('buttons used — once per song open', () => {
  beforeEach(() => fresh())
  it('a second tap of the same button on the same song sends nothing more', () => {
    trackPage('/song/a1', 'ก')
    trackFeature('play')
    trackFeature('play')
    trackFeature('tempo')
    trackFeature('not-a-feature')
    expect(named('feature_use')).toMatchObject([
      { feature: 'play', song_id: 'a1' },
      { feature: 'tempo', song_id: 'a1' },
    ])
    trackPage('/song/a2', 'ข')
    trackFeature('play')
    expect(named('feature_use')).toHaveLength(3)
  })
  it('dead ends and key changes, once each per song open', () => {
    trackPage('/song/a1', 'ก')
    trackDeadEnd('sing_no_notes')
    trackDeadEnd('sing_no_notes')
    trackKeyChange('C', 'D')
    trackKeyChange('C', 'D')
    trackKeyChange('C', 'C')
    trackKeyChange('C', 'E')
    expect(named('dead_end')).toEqual([expect.objectContaining({ dead_end: 'sing_no_notes', song_id: 'a1' })])
    expect(named('key_change').map((e) => e.key_to)).toEqual(['D', 'E'])
    expect(named('feature_use').map((e) => e.feature)).toEqual(['key'])
  })
  it('nothing before ยอมรับ', () => {
    fresh({ consent: 'denied' })
    trackPage('/song/a1', 'ก')
    trackFeature('play')
    trackSearch('ก', 1)
    expect(window.dataLayer).toBeUndefined()
  })
})

describe('searches', () => {
  beforeEach(() => fresh())
  it('tidies the term and cuts it to 40 characters', () => {
    expect(searchTerm('  Amazing   GRACE ')).toBe('amazing grace')
    expect(searchTerm('ก'.repeat(60))).toHaveLength(40)
  })
  it('found or not, the same term twice in a row is sent once; a pick is its own event', () => {
    trackSearch('ไม่มีเพลงนี้', 0)
    trackSearch('ไม่มีเพลงนี้ ', 0)
    trackSearch('12', 1)
    trackSearchSelect('12')
    expect(named('search')).toMatchObject([
      { search_term: 'ไม่มีเพลงนี้', search_found: 'no' },
      { search_term: '12', search_found: 'yes' },
    ])
    expect(named('search_select')).toMatchObject([{ search_term: '12' }])
  })
})

describe('the song parts behind a dead end', () => {
  it('reads v1 lines and v2 stanzas alike', () => {
    expect(songParts({ lines: [{ type: 'segment', chord: 'C', note: '5 5 4' }] })).toEqual({ notes: true, chords: true })
    expect(songParts({ stanzas: [{ lines: [[{ type: 'segment', chord: '', note: '1 2 3' }]] }] })).toEqual({ notes: true, chords: false })
    expect(songParts({ lines: [{ type: 'segment', chord: 'G', note: '' }] })).toEqual({ notes: false, chords: true })
    expect(songParts(null)).toEqual({ notes: false, chords: false })
  })
})
