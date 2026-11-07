// ใบ v3/pleng#154 — page counting with Google Analytics: asleep without an id, nothing to Google before
// ยอมรับ, one page_view per page open with only title / location / path, and withdrawing stops it.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  GA_ID, validId, analyticsOn, askConsent, consent, setConsent, trackPage, pageTitle, songPageTitle,
  installPageTracking, _resetForTest,
} from './analytics.js'
import ConsentBar from '../components/ConsentBar.vue'
import About from '../views/About.vue'
import { expectNoAxeViolations } from '../test-utils/ui-invariants.js'

const ID = 'G-TEST000'
const gaScripts = () => [...document.querySelectorAll('script')].filter((s) => /googletagmanager/.test(s.src))
const events = () => (window.dataLayer || []).map((a) => [...a])
const pageViews = () => events().filter((a) => a[0] === 'event' && a[1] === 'page_view').map((a) => a[2])
const stubs = { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }, Icon: true }

function fresh(id) {
  localStorage.clear()
  gaScripts().forEach((s) => s.remove())
  delete window.dataLayer
  delete window.gtag
  delete window['ga-disable-' + ID]
  _resetForTest({ id })
}

describe('the id', () => {
  it('ships empty — the committed code counts nothing', () => {
    expect(GA_ID).toBe('')
  })
  it('accepts only G-XXXX', () => {
    expect(validId('G-ABC123')).toBe(true)
    for (const bad of ['', 'UA-1234-1', 'g-abc', 'G-', 'G-abc', ' G-ABC', 'G-ABC; x', null, undefined]) {
      expect(validId(bad)).toBe(false)
    }
  })
})

describe('asleep: empty or wrong id', () => {
  for (const id of ['', 'UA-1234-1', 'G-lower']) {
    it(`"${id}" → no bar, no script, nothing sent, even after a yes`, () => {
      fresh(id)
      const w = mount(ConsentBar, { global: { stubs } })
      expect(analyticsOn.value).toBe(false)
      expect(w.find('.consent-bar').exists()).toBe(false)
      setConsent('granted')
      trackPage('/song/x', 'เพลง')
      expect(gaScripts()).toHaveLength(0)
      expect(window.dataLayer).toBeUndefined()
      w.unmount()
    })
  }
  it('About shows no counting section', () => {
    fresh('')
    const w = mount(About, { global: { stubs } })
    expect(w.find('#stats').exists()).toBe(false)
  })
})

describe('awake, not answered yet', () => {
  beforeEach(() => fresh(ID))

  it('shows the bar with two answers, loads nothing', async () => {
    const w = mount(ConsentBar, { global: { stubs }, attachTo: document.body })
    expect(askConsent.value).toBe(true)
    const btns = w.findAll('.consent-bar button')
    expect(btns.map((b) => b.text())).toEqual(['ยอมรับ', 'ไม่ยอมรับ'])
    // same look: same class, nothing else that sets one apart
    expect(btns[0].attributes('class')).toBe(btns[1].attributes('class'))
    expect(w.find('.consent-bar').classes()).toContain('no-print')
    trackPage('/', 'รายการเพลง')
    expect(gaScripts()).toHaveLength(0)
    expect(window.dataLayer).toBeUndefined()
    await expectNoAxeViolations(w)
    w.unmount()
  })

  it('ยอมรับ → the script loads, and the page on screen is sent with title / location / path only', async () => {
    trackPage('/song/abc?mode=edit', 'เล่มใหญ่ · 12. พระเจ้าทรงดี')
    const w = mount(ConsentBar, { global: { stubs } })
    await w.findAll('button')[0].trigger('click')
    expect(consent.value).toBe('granted')
    expect(localStorage.getItem('pleng.analyticsConsent')).toBe('granted')
    expect(w.find('.consent-bar').exists()).toBe(false)
    expect(gaScripts()).toHaveLength(1)
    expect(gaScripts()[0].src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST000')
    const cfg = events().find((a) => a[0] === 'config')
    expect(cfg[2]).toEqual({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })
    const pv = pageViews()
    expect(pv).toHaveLength(1)
    expect(pv[0]).toEqual({
      page_title: 'เล่มใหญ่ · 12. พระเจ้าทรงดี',
      page_location: location.origin + '/song/abc',
      page_path: '/song/abc',
    })
  })

  it('once per page open: the same page again (a mode switch) sends nothing more; a new page does', () => {
    setConsent('granted')
    trackPage('/song/abc', 'ก')
    trackPage('/song/abc?mode=edit', 'ก')
    expect(pageViews()).toHaveLength(1)
    trackPage('/', pageTitle('/'))
    trackPage('/song/abc', 'ก')
    expect(pageViews().map((p) => p.page_path)).toEqual(['/song/abc', '/', '/song/abc'])
    expect(pageViews()[1].page_title).toBe('รายการเพลง')
  })

  it('ไม่ยอมรับ → no script and nothing sent, and the bar does not come back', async () => {
    const w = mount(ConsentBar, { global: { stubs } })
    await w.findAll('button')[1].trigger('click')
    trackPage('/song/abc', 'ก')
    expect(gaScripts()).toHaveLength(0)
    expect(window.dataLayer).toBeUndefined()
    expect(localStorage.getItem('pleng.analyticsConsent')).toBe('denied')
    _resetForTest({ id: ID }) // a later visit reads the saved answer
    expect(askConsent.value).toBe(false)
    w.unmount()
  })

  it('the router sends plain pages; song pages are left to the song surface', () => {
    const hooks = []
    installPageTracking({ afterEach: (fn) => hooks.push(fn) })
    setConsent('granted')
    hooks[0]({ path: '/about' })
    hooks[0]({ path: '/song/abc' })
    expect(pageViews().map((p) => p.page_path)).toEqual(['/about'])
    expect(pageViews()[0].page_title).toBe('เกี่ยวกับเรา')
  })

  it('a visitor who said yes before is counted from the start', () => {
    localStorage.setItem('pleng.analyticsConsent', 'granted')
    _resetForTest({ id: ID })
    installPageTracking({ afterEach() {} })
    expect(gaScripts()).toHaveLength(1)
  })

  it('works with the script blocked (ad blocker / offline): no error', () => {
    setConsent('granted')
    gaScripts()[0].dispatchEvent(new Event('error'))
    expect(() => trackPage('/guide', pageTitle('/guide'))).not.toThrow()
  })
})

describe('changing your mind on เกี่ยวกับเรา', () => {
  beforeEach(() => fresh(ID))

  it('shows the current choice and lets it be withdrawn: disabled, consent denied, _ga cookies gone', async () => {
    setConsent('granted')
    document.cookie = '_ga=GA1.1.123; path=/'
    document.cookie = '_ga_TEST000=GS1.1.456; path=/'
    document.cookie = 'keep=1; path=/'
    const w = mount(About, { global: { stubs }, attachTo: document.body })
    expect(w.find('#stats').exists()).toBe(true)
    expect(w.find('.stats-now').text()).toContain('ยอมให้นับ')
    await expectNoAxeViolations(w.find('#stats'))

    await w.findAll('.stats-btns button')[1].trigger('click')
    expect(consent.value).toBe('denied')
    expect(w.find('.stats-now').text()).toContain('ไม่ให้นับ')
    expect(window['ga-disable-' + ID]).toBe(true)
    const upd = events().filter((a) => a[0] === 'consent' && a[1] === 'update').pop()
    expect(upd[2]).toEqual({ analytics_storage: 'denied' })
    expect(document.cookie).not.toMatch(/_ga/)
    expect(document.cookie).toMatch(/keep=1/)
    const before = pageViews().length
    trackPage('/about', 'เกี่ยวกับเรา')
    expect(pageViews().length).toBe(before)

    // and back on again
    await w.findAll('.stats-btns button')[0].trigger('click')
    expect(window['ga-disable-' + ID]).toBe(false)
    expect(gaScripts()).toHaveLength(1) // not loaded twice
    w.unmount()
  })
})

describe('page names', () => {
  it('a song page names the song WITH its book (numbers repeat across books)', () => {
    expect(songPageTitle({ number: 12, title_th: 'พระเจ้าทรงดี', category: 'lem-yai' })).toBe('เล่มใหญ่ · 12. พระเจ้าทรงดี')
    expect(songPageTitle({ number: 12, title_th: 'พระเจ้าทรงดี', category: 'anuchon' })).toBe('อนุชน · 12. พระเจ้าทรงดี')
    expect(songPageTitle({ title_th: 'ไม่มีเล่ม' })).toBe('ไม่มีเล่ม')
    expect(songPageTitle(null)).toBe('ไม่พบเพลง')
  })
  it('other pages get a short name', () => {
    expect(pageTitle('/')).toBe('รายการเพลง')
    expect(pageTitle('/guide')).toBe('คู่มือใช้งานโปรแกรม')
    expect(pageTitle('/notation')).toBe('คู่มือทำเพลง')
    expect(pageTitle('/studio')).toBe('เพลงใหม่')
  })
})
