import { describe, it, expect } from 'vitest'
import { readViewMode, saveViewMode, VIEW_SHEET, VIEW_SING } from './viewMode.js'

const mem = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }
}
const broken = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }

describe('ใบ#160 — the device remembers ฝึกร้อง or แผ่นเพลง', () => {
  it('starts at ฝึกร้อง when nothing is saved', () => {
    expect(readViewMode(mem())).toBe(VIEW_SING)
  })
  it('remembers แผ่นเพลง, then ฝึกร้อง again', () => {
    const s = mem()
    saveViewMode(VIEW_SHEET, s)
    expect(readViewMode(s)).toBe(VIEW_SHEET)
    saveViewMode(VIEW_SING, s)
    expect(readViewMode(s)).toBe(VIEW_SING)
  })
  it('a strange saved value reads as ฝึกร้อง', () => {
    const s = mem()
    s.setItem('pleng.viewMode', 'edit')
    expect(readViewMode(s)).toBe(VIEW_SING)
  })
  it('sad path: a device that cannot save never throws and starts at ฝึกร้อง', () => {
    expect(() => saveViewMode(VIEW_SHEET, broken)).not.toThrow()
    expect(readViewMode(broken)).toBe(VIEW_SING)
  })
})
