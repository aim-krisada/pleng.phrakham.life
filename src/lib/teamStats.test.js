import { describe, it, expect } from 'vitest'
import { draftStats, daysSince, rangeLabel } from './teamStats.js'

const NOW = new Date('2026-11-16T10:00:00+07:00')
const ago = (n) => new Date(NOW.getTime() - n * 86400000).toISOString()

describe('ใบ v3/pleng#170 — งานที่ค้างอยู่ในแต่ละขั้น', () => {
  const rows = [
    { id: 'a', status: 'draft', updated_at: ago(1) },
    { id: 'b', status: 'pending', title_th: 'รอ 2 วัน', updated_at: ago(2) },
    { id: 'c', status: 'pending', title_th: 'รอ 9 วัน', number: 66, updated_at: ago(9) },
    { id: 'd', status: 'pending', title_th: 'รอ 5 วัน', updated_at: ago(5) },
    { id: 'e', status: 'pending', title_th: 'รอ 1 วัน', updated_at: ago(1) },
    { id: 'f', status: 'approved', updated_at: ago(3) },
    { id: 'g', status: 'approved', updated_at: ago(40) },
    { id: 'h', status: 'pending', title_th: 'ในถังขยะ', updated_at: ago(30), deleted_at: ago(1) },
    { id: 'i', status: 'rejected', updated_at: ago(1) },
  ]

  it('counts each stage, approved only inside the range, trash never', () => {
    const s = draftStats(rows, 28, NOW)
    expect(s.draft).toBe(1)
    expect(s.pending).toBe(4)
    expect(s.approved).toBe(1)
    expect(draftStats(rows, 90, NOW).approved).toBe(2)
  })

  it('lists the 3 that waited longest, oldest first, with days', () => {
    expect(draftStats(rows, 28, NOW).oldest).toEqual([
      { id: 'c', number: 66, title: 'รอ 9 วัน', days: 9 },
      { id: 'd', number: undefined, title: 'รอ 5 วัน', days: 5 },
      { id: 'b', number: undefined, title: 'รอ 2 วัน', days: 2 },
    ])
  })

  it('nothing waiting — an empty list, not an error', () => {
    const s = draftStats([], 28, NOW)
    expect(s).toEqual({ draft: 0, pending: 0, approved: 0, oldest: [] })
    expect(draftStats(undefined, 7, NOW).pending).toBe(0)
  })
})

describe('dates', () => {
  it('daysSince is whole days and never negative', () => {
    expect(daysSince(ago(3.5), NOW)).toBe(3)
    expect(daysSince(ago(-2), NOW)).toBe(0)
    expect(daysSince('nonsense', NOW)).toBe(0)
  })

  it('the range line reads in Thai with the Buddhist year and the day count', () => {
    const t = rangeLabel(28, NOW)
    expect(t).toMatch(/ถึง .*2569 \(28 วัน\)$/)
    expect(t).toContain('16 พ.ย.')
  })
})
