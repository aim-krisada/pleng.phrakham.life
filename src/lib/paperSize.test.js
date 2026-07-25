// Print paper size: the SSOT ref + its CSS @page token (B121).
import { describe, it, expect, beforeEach } from 'vitest'
import { PAPER_SIZES, paperSize, setPaperSize, paperSizeCss } from './paperSize.js'

describe('paperSize', () => {
  beforeEach(() => setPaperSize('A4')) // reset between cases

  it('offers A4, Letter, A5 with A4 first (the default)', () => {
    expect(PAPER_SIZES.map((p) => p.id)).toEqual(['A4', 'Letter', 'A5'])
    expect(paperSize.value).toBe('A4')
  })

  it('paperSizeCss returns the current choice by default', () => {
    expect(paperSizeCss()).toBe('A4')
    setPaperSize('Letter')
    expect(paperSize.value).toBe('Letter')
    expect(paperSizeCss()).toBe('Letter')
  })

  it('maps each id to its CSS @page token', () => {
    expect(paperSizeCss('A4')).toBe('A4')
    expect(paperSizeCss('Letter')).toBe('Letter')
    expect(paperSizeCss('A5')).toBe('A5')
  })

  it('rejects unknown ids (ref unchanged, css falls back to A4)', () => {
    setPaperSize('Foolscap')
    expect(paperSize.value).toBe('A4')
    expect(paperSizeCss('nope')).toBe('A4')
  })

  it('persists the choice to localStorage', () => {
    setPaperSize('A5')
    expect(localStorage.getItem('pk-paper-size')).toBe('A5')
  })
})
