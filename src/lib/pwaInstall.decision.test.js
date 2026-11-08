// ใบ v3/pleng#156 — what one tap on ติดตั้งแอพ does, per device. Order:
// in-app → native → iOS Safari → iOS other → Android steps → generic.
import { describe, it, expect } from 'vitest'
import {
  browserInfo, installPlan, lineExternalUrl, chromeIntentUrl,
} from './pwaInstall.js'
import { withoutLineParam } from './cleanUrl.js'

const UA = {
  lineIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.9.0',
  lineAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Line/14.16.1/IAB',
  fbAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  fbIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0;FBBV/1;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBCR/;FBID/phone;FBLC/th_TH;FBOP/5]',
  messengerIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/460.0;FBDV/iPhone15,2]',
  instaAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-G991B Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0 Mobile Safari/537.36 Instagram 350.0.0.0 Android',
  safari26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  safari17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  chromeIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  edgeIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/129.0 Mobile/15E148 Safari/605.1.15',
  firefoxIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
  chromeDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  firefoxDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
}
const HREF = 'https://pleng.phrakham.life/#/song/abc?mode=view'
const plan = (ua, extra = {}) => installPlan({ ua, href: HREF, nav: { maxTouchPoints: 0 }, ...extra })
const sheetId = (ua, extra) => plan(ua, extra).sheet?.id

describe('installPlan — decision order', () => {
  it('installed (standalone) → nothing to do, whatever the browser', () => {
    expect(plan(UA.lineIOS, { standalone: true }).kind).toBe('installed')
    expect(plan(UA.chromeAndroid, { standalone: true, hasPrompt: true }).kind).toBe('installed')
  })

  it('1. in-app browsers come FIRST — even when an install prompt was captured', () => {
    expect(sheetId(UA.lineIOS)).toBe('line')
    expect(sheetId(UA.lineAndroid, { hasPrompt: true })).toBe('line')
    expect(sheetId(UA.fbAndroid, { hasPrompt: true })).toBe('meta-android')
    expect(sheetId(UA.instaAndroid)).toBe('meta-android')
    expect(sheetId(UA.fbIOS)).toBe('meta-ios')
    expect(sheetId(UA.messengerIOS)).toBe('meta-ios')
  })

  it('2. a captured beforeinstallprompt → the browser’s own dialog', () => {
    expect(plan(UA.chromeAndroid, { hasPrompt: true }).kind).toBe('native')
    expect(plan(UA.chromeDesktop, { hasPrompt: true }).kind).toBe('native')
  })

  it('3. iOS Safari → 3 steps; iOS 26 goes through ⋯, older through the share button', () => {
    const s26 = plan(UA.safari26).sheet
    expect(s26.id).toBe('ios-safari')
    expect(s26.steps).toHaveLength(3)
    expect(s26.steps[0].some((p) => p.k === '⋯')).toBe(true)
    const s17 = plan(UA.safari17).sheet
    expect(s17.steps[0][0].t).toContain('แตะปุ่มแชร์')
    expect(s17.steps[0].some((p) => p.k === '⋯')).toBe(false)
    expect(s17.steps[2].map((p) => p.t || p.k).join('')).toContain('เปิดเป็นเว็บแอป')
  })

  it('3. an iPad that calls itself a Mac (touch screen) is still iOS Safari', () => {
    const s = plan(UA.ipadDesktop, { nav: { maxTouchPoints: 5 } }).sheet
    expect(s.id).toBe('ios-safari')
    expect(s.title).toContain('iPad')
  })

  it('4. iOS Chrome / Edge / Firefox → 2 steps named after the browser', () => {
    expect(plan(UA.chromeIOS).sheet).toMatchObject({ id: 'ios-other', title: expect.stringContaining('Chrome') })
    expect(plan(UA.edgeIOS).sheet.title).toContain('Edge')
    expect(plan(UA.firefoxIOS).sheet.title).toContain('Firefox')
    expect(plan(UA.chromeIOS).sheet.steps).toHaveLength(2)
  })

  it('5. Android with no install event (Chrome before 30 s, Firefox) → menu steps', () => {
    expect(sheetId(UA.chromeAndroid)).toBe('android')
    expect(sheetId(UA.firefoxAndroid)).toBe('android-firefox')
  })

  it('Samsung Internet → open in Chrome, never Samsung’s own install (Play Protect warns · ใบ #157)', () => {
    for (const hasPrompt of [false, true]) {
      const p = plan(UA.samsung, { hasPrompt })
      expect(p.kind).toBe('sheet')
      expect(p.sheet.id).toBe('android-samsung-chrome')
      expect(p.sheet.title).toBe('ติดตั้งผ่าน Chrome')
      expect(p.sheet.intro).toContain('ไม่ปลอดภัย')
      expect(p.sheet.action).toEqual({ label: 'เปิดใน Chrome เพื่อติดตั้ง', href: chromeIntentUrl(HREF) })
    }
    // installed already → still nothing to do
    expect(plan(UA.samsung, { standalone: true }).kind).toBe('installed')
  })

  it('6. anything else → generic steps', () => {
    expect(sheetId(UA.firefoxDesktop)).toBe('generic')
    expect(sheetId(UA.macSafari)).toBe('generic')
    expect(sheetId('')).toBe('generic')
  })

  it('every sheet has at most 3 steps', () => {
    for (const ua of Object.values(UA)) {
      const p = plan(ua)
      if (p.sheet) expect(p.sheet.steps.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('leaving an in-app browser', () => {
  it('LINE: the button reloads THIS page with openExternalBrowser=1 before the # (hash route kept)', () => {
    const s = plan(UA.lineAndroid).sheet
    expect(s.action.href).toBe('https://pleng.phrakham.life/?openExternalBrowser=1#/song/abc?mode=view')
    expect(lineExternalUrl('https://pleng.phrakham.life/?a=1#/guide')).toBe('https://pleng.phrakham.life/?a=1&openExternalBrowser=1#/guide')
    expect(lineExternalUrl('https://pleng.phrakham.life/?openExternalBrowser=1#/')).toBe('https://pleng.phrakham.life/?openExternalBrowser=1#/')
  })

  it('Android Facebook / Instagram: a Chrome intent link with the page as fallback', () => {
    const href = plan(UA.fbAndroid).sheet.action.href
    expect(href).toBe(chromeIntentUrl(HREF))
    expect(href.startsWith('intent://pleng.phrakham.life/#/song/abc?mode=view#Intent;scheme=https;package=com.android.chrome;')).toBe(true)
    expect(href).toContain('S.browser_fallback_url=' + encodeURIComponent(HREF) + ';end')
  })

  it('iPhone Facebook: no button (a page cannot open Safari), only steps', () => {
    const s = plan(UA.fbIOS).sheet
    expect(s.action).toBeUndefined()
    expect(s.steps.length).toBeGreaterThan(0)
  })
})

describe('browserInfo', () => {
  it('"Online/" in a UA is not LINE', () => {
    expect(browserInfo('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Online/1').inApp).toBe(null)
  })
})

describe('withoutLineParam — the address bar after a LINE link opened', () => {
  it('drops only openExternalBrowser and keeps the hash route', () => {
    expect(withoutLineParam('https://pleng.phrakham.life/?openExternalBrowser=1#/song/abc')).toBe('https://pleng.phrakham.life/#/song/abc')
    expect(withoutLineParam('https://pleng.phrakham.life/?x=2&openExternalBrowser=1#/')).toBe('https://pleng.phrakham.life/?x=2#/')
    expect(withoutLineParam('https://pleng.phrakham.life/#/guide')).toBe(null)
  })
})
