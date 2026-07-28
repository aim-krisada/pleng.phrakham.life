// lib/pwaInstall — the PROMOTED install affordances (home banner + top-bar button). These sit on
// top of the drawer InstallAppTool (covered in InstallAppTool.test.js) and add: canShowInstall (a
// shared predicate), the dismissible home banner, and openInstall() — the one action every
// affordance calls (replay the prompt, or open the iOS Share instruction sheet).
import { describe, it, expect, beforeEach } from 'vitest'
import {
  canInstall, isStandalone,
  canShowInstall, showInstallBanner, installBannerDismissed, dismissInstallBanner,
  installSheetOpen, closeInstallSheet, openInstall,
} from './pwaInstall.js'

function setUA(ua, { platform = 'iPhone', maxTouchPoints = 5 } = {}) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(navigator, 'platform', { value: platform, configurable: true })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true })
}
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile'
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const CHROME_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

beforeEach(() => {
  canInstall.value = false
  isStandalone.value = false
  installBannerDismissed.value = false
  installSheetOpen.value = false
  try { localStorage.clear() } catch { /* jsdom */ }
  setUA(CHROME_DESKTOP, { platform: 'Win32', maxTouchPoints: 0 })
})

describe('canShowInstall — is install possible & not yet installed', () => {
  it('true once a prompt was captured (Android/desktop), false while none is', () => {
    expect(canShowInstall.value).toBe(false)
    canInstall.value = true
    expect(canShowInstall.value).toBe(true)
  })

  it('true on iOS Safari even with no beforeinstallprompt (Share → Add to Home Screen)', () => {
    setUA(SAFARI_IOS)
    expect(canInstall.value).toBe(false)
    expect(canShowInstall.value).toBe(true)
  })

  it('false when already running installed (standalone), whatever the platform', () => {
    canInstall.value = true
    isStandalone.value = true
    expect(canShowInstall.value).toBe(false)
    setUA(SAFARI_IOS)
    expect(canShowInstall.value).toBe(false)
  })
})

describe('showInstallBanner — dismissible mobile home banner', () => {
  it('shows when install is possible and not dismissed', () => {
    canInstall.value = true
    expect(showInstallBanner.value).toBe(true)
  })

  it('dismiss persists to localStorage and hides the banner', () => {
    canInstall.value = true
    dismissInstallBanner()
    expect(installBannerDismissed.value).toBe(true)
    expect(localStorage.getItem('pleng:install-banner-dismissed')).toBe('1')
    expect(showInstallBanner.value).toBe(false)
  })

  it('stays hidden when install is not possible even if never dismissed', () => {
    setUA(CHROME_ANDROID)
    canInstall.value = false      // no captured prompt, not iOS → nothing to install right now
    expect(showInstallBanner.value).toBe(false)
  })
})

describe('openInstall — the one action every affordance calls', () => {
  it('on iOS (no prompt) opens the Share instruction sheet instead of dead-ending', async () => {
    setUA(SAFARI_IOS)
    expect(installSheetOpen.value).toBe(false)
    const r = await openInstall()
    expect(r).toBe('ios-sheet')
    expect(installSheetOpen.value).toBe(true)
    closeInstallSheet()
    expect(installSheetOpen.value).toBe(false)
  })

  it('replays the captured prompt on Android/desktop (no iOS sheet)', async () => {
    setUA(CHROME_ANDROID)
    const evt = new Event('beforeinstallprompt')
    evt.prompt = () => {}
    evt.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(evt)          // canInstall → true, deferredPrompt stashed
    const r = await openInstall()
    expect(r).toBe('accepted')
    expect(installSheetOpen.value).toBe(false)   // never the iOS path when a prompt exists
  })

  it('does nothing (no sheet) when already installed', async () => {
    setUA(SAFARI_IOS)
    isStandalone.value = true
    const r = await openInstall()
    expect(r).toBeNull()
    expect(installSheetOpen.value).toBe(false)
  })
})
