// B001 — the shared pk-scrollnav.js (same file as phrakham.life). It self-mounts to
// <body> on import; here we drive scrollHeight/innerHeight by hand (jsdom has no layout)
// and assert the up/down buttons mount and jump to the very top / bottom.
import { describe, it, expect, vi, beforeAll } from 'vitest'

function setPage({ scrollHeight, innerHeight = 800, scrollY = 0 }) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight })
  Object.defineProperty(window, 'pageYOffset', { configurable: true, value: scrollY })
}

beforeAll(async () => {
  window.scrollTo = vi.fn()
  setPage({ scrollHeight: 5000, scrollY: 1000 })
  await import('./pk-scrollnav.js') // IIFE mounts on import
})

describe('pk-scrollnav (B001)', () => {
  it('mounts two round scroll buttons with Thai labels', () => {
    const wrap = document.querySelector('.pk-scrollnav')
    expect(wrap).not.toBeNull()
    const btns = wrap.querySelectorAll('.pk-sn-btn')
    expect(btns.length).toBe(2)
    expect(btns[0].getAttribute('aria-label')).toContain('บนสุด')
    expect(btns[1].getAttribute('aria-label')).toContain('ล่างสุด')
  })

  it('↑ jumps to the top, ↓ jumps to the bottom of the page', () => {
    const [up, down] = document.querySelectorAll('.pk-sn-btn')
    down.click()
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 5000 })) // scrollHeight
    up.click()
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })
})
