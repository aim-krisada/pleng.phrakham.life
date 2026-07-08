// Core naming lib — the single format shared by JSON download and Save-as-PDF.
import { describe, it, expect } from 'vitest'
import { songName, songBasename } from './songName.js'

describe('songName (on-screen "number. title" form)', () => {
  it('prefixes the number like the song list', () => {
    expect(songName({ number: 12, title_th: 'พระเจ้าดีต่อฉัน' })).toBe('12. พระเจ้าดีต่อฉัน')
  })

  it('omits the prefix when there is no number', () => {
    expect(songName({ title_th: 'พระเจ้าดีต่อฉัน' })).toBe('พระเจ้าดีต่อฉัน')
  })

  it('falls back to the English title, then a Thai label', () => {
    expect(songName({ title_en: 'God is good' })).toBe('God is good')
    expect(songName({})).toBe('เพลง')
    expect(songName(null)).toBe('เพลง')
  })
})

describe('songBasename (safe file base, same format)', () => {
  it('is songName with filesystem-illegal characters stripped', () => {
    expect(songBasename({ number: 12, title_th: 'พระเจ้าดีต่อฉัน' })).toBe('12. พระเจ้าดีต่อฉัน')
    expect(songBasename({ title_th: 'a/b:c*?' })).toBe('abc')
  })

  it('never returns empty', () => {
    expect(songBasename({})).toBe('เพลง')
    expect(songBasename({ title_th: '   ' })).toBe('เพลง')
  })
})
