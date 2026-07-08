// Core naming lib — the single format shared by JSON download and Save-as-PDF.
import { describe, it, expect } from 'vitest'
import { songName, songBasename, SITE_NAME } from './songName.js'

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

describe('songBasename (filename SSOT — "SITE_NAME - title", NO number)', () => {
  it('uses the site name + Thai title, without any song number', () => {
    expect(SITE_NAME).toBe('เพลง.พระคำ.ชีวิต')
    expect(songBasename({ number: 12, title_th: 'พระเจ้าเป็นความรัก' }))
      .toBe('เพลง.พระคำ.ชีวิต - พระเจ้าเป็นความรัก')
  })

  it('strips filesystem-illegal characters (\\ / : * ? " < > |) and collapses spaces', () => {
    expect(songBasename({ title_th: 'a/b:c*?' })).toBe('เพลง.พระคำ.ชีวิต - abc')
    expect(songBasename({ title_th: 'สรร  เสริญ' })).toBe('เพลง.พระคำ.ชีวิต - สรร เสริญ')
  })

  it('falls back to "แผ่นเพลง" when the Thai title is empty/blank', () => {
    expect(songBasename({})).toBe('เพลง.พระคำ.ชีวิต - แผ่นเพลง')
    expect(songBasename({ title_th: '   ' })).toBe('เพลง.พระคำ.ชีวิต - แผ่นเพลง')
    expect(songBasename(null)).toBe('เพลง.พระคำ.ชีวิต - แผ่นเพลง')
  })

  it('ignores title_en for the filename (Thai title / fallback only)', () => {
    expect(songBasename({ title_en: 'God is good' })).toBe('เพลง.พระคำ.ชีวิต - แผ่นเพลง')
  })
})
