// B001 — floating page-scroll buttons. jsdom has no layout, so we drive scrollHeight /
// innerHeight / scrollY by hand and assert the visibility gating + scroll amount.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ScrollButtons from './ScrollButtons.vue'

function setPage({ scrollHeight, innerHeight = 800, scrollY = 0 }) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
}

beforeEach(() => {
  window.scrollBy = vi.fn()
})

describe('ScrollButtons (B001)', () => {
  it('stays hidden when the page is not scrollable', async () => {
    setPage({ scrollHeight: 810 }) // only 10px past the fold → below threshold
    const w = mount(ScrollButtons)
    await nextTick()
    expect(w.find('.scroll-fab').isVisible()).toBe(false)
  })

  it('shows when the page is scrollable and jumps ~one screen', async () => {
    setPage({ scrollHeight: 5000, scrollY: 1000 })
    const w = mount(ScrollButtons)
    await nextTick()
    expect(w.find('.scroll-fab').isVisible()).toBe(true)

    const [up, down] = w.findAll('.scroll-fab-btn')
    await down.trigger('click')
    expect(window.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: Math.round(800 * 0.85) }))

    await up.trigger('click')
    expect(window.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: -Math.round(800 * 0.85) }))
  })

  it('disables ↑ at the top and ↓ at the bottom', async () => {
    setPage({ scrollHeight: 5000, scrollY: 0 })
    const wTop = mount(ScrollButtons)
    await nextTick()
    const [upTop, downTop] = wTop.findAll('.scroll-fab-btn')
    expect(upTop.attributes('disabled')).toBeDefined()
    expect(downTop.attributes('disabled')).toBeUndefined()

    setPage({ scrollHeight: 5000, scrollY: 4200 }) // 5000 - 800 = 4200 = max
    const wBot = mount(ScrollButtons)
    await nextTick()
    const [upBot, downBot] = wBot.findAll('.scroll-fab-btn')
    expect(downBot.attributes('disabled')).toBeDefined()
    expect(upBot.attributes('disabled')).toBeUndefined()
  })
})
