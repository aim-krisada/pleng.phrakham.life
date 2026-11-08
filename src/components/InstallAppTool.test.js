// InstallAppTool (☰ drawer row) + lib/pwaInstall event flow — ใบ v3/pleng#156.
// The drawer row uses the SAME logic and sheet as the home card: shown whenever the app is not
// installed, a tap opens the native dialog or the steps sheet. Nothing shows when installed.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import InstallAppTool from './InstallAppTool.vue'
import {
  canInstall, isStandalone, installSheet, promptInstall, _setDeferredPrompt,
  appInstalled, _resetAppInstalled, installPlan,
} from '../lib/pwaInstall.js'
import { shellMenu } from '../store.js'

const stubs = { Icon: true }

function setUA(ua, maxTouchPoints = 5) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true })
}
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

let wrapper = null
beforeEach(() => {
  _setDeferredPrompt(null)
  isStandalone.value = false
  installSheet.value = null
  shellMenu.value = null
  try { localStorage.clear() } catch { /* jsdom */ }
  _resetAppInstalled()
  setUA(CHROME_ANDROID)
})
afterEach(() => { if (wrapper) { wrapper.unmount(); wrapper = null } })

describe('InstallAppTool — the drawer row', () => {
  it('shows ติดตั้งแอพ whenever not installed, even before the browser offers an install', () => {
    wrapper = mount(InstallAppTool, { global: { stubs } })
    expect(wrapper.find('.ia-btn').text()).toContain('ติดตั้งแอพ')
  })

  it('renders nothing when already running installed (standalone)', () => {
    isStandalone.value = true
    wrapper = mount(InstallAppTool, { global: { stubs } })
    expect(wrapper.find('.ia').exists()).toBe(false)
  })

  it('no captured prompt → closes the drawer and opens the steps sheet for this browser', async () => {
    shellMenu.value = 'site'
    wrapper = mount(InstallAppTool, { global: { stubs } })
    await wrapper.find('.ia-btn').trigger('click')
    await nextTick()
    expect(shellMenu.value).toBe(null)
    expect(installSheet.value.id).toBe('android')
  })

  it('iPhone Safari → the iPhone steps sheet (same as the home card)', async () => {
    setUA(SAFARI_IOS)
    wrapper = mount(InstallAppTool, { global: { stubs } })
    await wrapper.find('.ia-btn').trigger('click')
    expect(installSheet.value.id).toBe('ios-safari')
  })

  it('Samsung Internet → the open-in-Chrome sheet, never Samsung’s own dialog (ใบ #157)', async () => {
    setUA('Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36')
    const prompt = vi.fn()
    _setDeferredPrompt({ prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) })
    wrapper = mount(InstallAppTool, { global: { stubs } })
    await wrapper.find('.ia-btn').trigger('click')
    await nextTick()
    expect(prompt).not.toHaveBeenCalled()
    expect(installSheet.value.id).toBe('android-samsung-chrome')
    expect(installSheet.value.action.href.startsWith('intent://')).toBe(true)
  })

  it('captured prompt → the browser’s own dialog, no sheet', async () => {
    const evt = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) }
    _setDeferredPrompt(evt)
    wrapper = mount(InstallAppTool, { global: { stubs } })
    await wrapper.find('.ia-btn').trigger('click')
    await nextTick()
    expect(evt.prompt).toHaveBeenCalledTimes(1)
    expect(installSheet.value).toBe(null)
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

  it('promptInstall replays the captured prompt once', async () => {
    const evt = new Event('beforeinstallprompt')
    evt.prompt = vi.fn()
    evt.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(evt)
    const outcome = await promptInstall()
    expect(evt.prompt).toHaveBeenCalledTimes(1)
    expect(outcome).toBe('accepted')
    expect(canInstall.value).toBe(false)
    expect(await promptInstall()).toBeNull()
  })

  it('appinstalled marks the app installed and closes any open sheet', () => {
    canInstall.value = true
    installSheet.value = { id: 'android', title: 'x', steps: [] }
    window.dispatchEvent(new Event('appinstalled'))
    expect(canInstall.value).toBe(false)
    expect(appInstalled.value).toBe(true)
    expect(isStandalone.value).toBe(false) // this tab is still a normal browser tab
    expect(installSheet.value).toBe(null)
  })

  it('installed, seen from a normal browser tab → the drawer row is hidden (ใบ #158)', async () => {
    wrapper = mount(InstallAppTool, { global: { stubs } })
    expect(wrapper.find('.ia-btn').exists()).toBe(true)
    appInstalled.value = true
    await nextTick()
    expect(wrapper.find('.ia').exists()).toBe(false)
  })

  it('installPlan says installed when the app is installed, even outside standalone', () => {
    expect(installPlan({ ua: CHROME_ANDROID, installed: true })).toEqual({ kind: 'installed' })
  })
})
