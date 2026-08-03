// The running print footer (site · page X of Y · date) as @page margin boxes.
import { describe, it, expect } from 'vitest'
import { thaiPrintDate, footerCss } from './printChrome.js'
import { SITE_NAME } from './songName.js'

describe('thaiPrintDate (Thai Buddhist-era, last two year digits)', () => {
  it('formats "พิมพ์เมื่อ D เดือน YY"', () => {
    // 2026-07-08 → 8 ก.ค. 2569 → "69"
    expect(thaiPrintDate(new Date(2026, 6, 8))).toBe('พิมพ์เมื่อ 8 ก.ค. 69')
    // 2025-01-01 → 1 ม.ค. 2568 → "68"
    expect(thaiPrintDate(new Date(2025, 0, 1))).toBe('พิมพ์เมื่อ 1 ม.ค. 68')
  })
})

describe('footerCss (@page margin boxes, one shared size)', () => {
  const css = footerCss('พิมพ์เมื่อ 8 ก.ค. 69')

  it('places all three footer items as @page margin boxes', () => {
    expect(css).toContain('@page')
    expect(css).toContain('@bottom-left')
    expect(css).toContain('@bottom-center')
    expect(css).toContain('@bottom-right')
  })

  it('left = site name (SSOT) · center = page counter · right = date', () => {
    expect(css).toContain(`content:"${SITE_NAME}"`)
    expect(css).toContain('counter(page)')
    expect(css).toContain('counter(pages)')
    expect(css).toContain('พิมพ์เมื่อ 8 ก.ค. 69')
  })

  it('every box shares the same font-size so they read as one line', () => {
    expect(css.match(/font-size:9pt/g)).toHaveLength(3)
  })
})
