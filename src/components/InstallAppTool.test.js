// InstallAppTool + lib/pwaInstall — the visible "ติดตั้งแอพ" affordance (pwa-install stream).
// pleng is already a PWA; this only surfaces install. Covers: Android/desktop button appears
// on beforeinstallprompt and replays prompt(); iOS Safari shows a dismissible manual hint;
// nothing shows when already installed. It never touches the manifest or the service worker.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import InstallAppTool from './InstallAppTool.vue'
import {
  canInstall, isStandalone, iosHintDismissed, isIOS, showIosHint, promptInstall,
} from '../lib/pwaInstall.js'

const stubs = { Icon: true }

function setUA(ua, { platform = 'iPhone', maxTouchPoints = 5 } = {}) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(navigator, 'platform', { value: platform, configurable: true })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true })
}
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile'
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

let wrapper = null
beforeEach(() => {
  // Reset the shared module state to a clean "online, not installed, generic browser" baseline.
  canInstall.value = false
  isStandalone.value = false
  iosHintDismissed.value = false
  try { localStorage.clear() } catch { /* jsdom */ }
  setUA(CHROME_ANDROID, { platform: 'Linux armv8l', maxTouchPoints: 5 })
})
afterEach(() => { if (wrapper) { wrapper.unmount(); wrapper = null } })

describe('InstallAppTool — visibility', () => {
  it('renders nothing by default (no captured prompt, not iOS, not installed)', () => {
    wrapper = mount(InstallAppTool, { global: { stubs } })
    expect(wrapper.find('.ia').exists()).toBe(false)
  })

  it('shows the ติดตั้งแอพ button once beforeinstallprompt was captured', async () => {
    canInstall.value = true
    wrapper = mount(InstallAppTool, { global: { stubs } })
    const btn = wrapper.find('.ia-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('ติดตั้งแอพ')
  })

  it('hides the button when already running installed (standalone)', () => {
    canInstall.value = true
    isStandalone.value = true
    wrapper = mount(InstallAppTool, { global: { stubs } })
    expect(wrapper.find('.ia-btn').exists()).toBe(false)
    expect(wrapper.find('.ia').exists()).toBe(false)
  })

  it('shows the iOS Safari manual hint (not a button) instead of the button', () => {
    setUA(SAFARI_IOS)
    expect(isIOS()).toBe(true)
    expect(showIosHint.value).toBe(true)
    wrapper = mount(InstallAppTool, { global: { stubs } })
    expect(wrapper.find('.ia-btn').exists()).toBe(false)
    const hint = wrapper.find('.ia-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('เพิ่มไปยังหน้าจอหลัก')
  })

  it('Chrome-on-iOS (not Safari) does NOT get the hint — it cannot install', () => {
    // isIOS() reads the UA live; only real iOS Safari (which can Add to Home Screen) qualifies.
    // CriOS/FxiOS/etc. share iOS but can't install, so the hint would be useless there.
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 CriOS/120 Mobile/15E148 Safari/604.1')
    expect(isIOS()).toBe(false)
  })

  it('dismissing the iOS hint persists and hides it', async () => {
    setUA(SAFARI_IOS)
    wrapper = mount(InstallAppTool, { global: { stubs } })
    await wrapper.find('.ia-hint-x').trigger('click')
    await nextTick()
    expect(iosHintDismissed.value).toBe(true)
    expect(localStorage.getItem('pleng:ios-install-hint-dismissed')).toBe('1')
    expect(wrapper.find('.ia-hint').exists()).toBe(false)
  })
})

describe('lib/pwaInstall — event flow', () => {
  it('captures beforeinstallprompt (preventing the mini-infobar) and flips canInstall', () => {
    const evt = new Event('beforeinstallprompt')
    evt.prompt = vi.fn()
    evt.userChoice = Promise.resolve({ outcome: 'accepted' })
    const prevented = vi.spyOn(evt, 'preventDefault')
    window.dispatchEvent(evt)
    expect(prevented).toHaveBeenCalled()
    expect(canInstall.value).toBe(true)
  })

  it('promptInstall replays the captured prompt and retires the affordance', async () => {
    const evt = new Event('beforeinstallprompt')
    evt.prompt = vi.fn()
    evt.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(evt)
    const outcome = await promptInstall()
    expect(evt.prompt).toHaveBeenCalledTimes(1)
    expect(outcome).toBe('accepted')
    expect(canInstall.value).toBe(false)         // single-use — button disappears after choice
    expect(await promptInstall()).toBeNull()      // nothing left to replay
  })

  it('appinstalled retires the button and marks standalone', () => {
    canInstall.value = true
    window.dispatchEvent(new Event('appinstalled'))
    expect(canInstall.value).toBe(false)
    expect(isStandalone.value).toBe(true)
  })
})
