import { describe, it, expect } from 'vitest'
import { overview, dayList, isWeekend, gaErrorText } from './gaStats.js'

const NOW = new Date('2026-11-22T12:00:00+07:00') // a Sunday; counting began Mon 16 Nov

const bundle = {
  reports: {
    totals: [[['cur'], 50], [['prev'], 0]],
    totalsByMode: [[['app', 'cur'], 15], [['web', 'cur'], 35]],
    daily: [
      [['20261116', 'web'], 10], [['20261116', 'app'], 2],
      [['20261121', 'web'], 30], [['20261121', 'app'], 10], // Saturday
      [['20261122', 'web'], 20],
    ],
    hours: [[['8'], 5], [['19'], 30], [['23'], 1]],
  },
}

describe('ใบ v3/pleng#164 — ภาพรวม', () => {
  it('days are Thai-time dates, oldest first; weekends known', () => {
    expect(dayList(3, NOW)).toEqual(['20261120', '20261121', '20261122'])
    expect(isWeekend('20261121')).toBe(true)
    expect(isWeekend('20261120')).toBe(false)
  })

  it('people, app share, and no % change while the earlier range was not counted', () => {
    const o = overview(bundle, 7, NOW)
    expect(o.users).toBe(50)
    expect(o.appShare).toBe(30)
    expect(o.change).toBeNull() // 9–15 Nov was before counting began
    expect(o.prevAppShare).toBeNull()
  })

  it('bars: web and app split, weekends marked, days before counting are not drawn as 0', () => {
    const o = overview(bundle, 7, NOW)
    expect(o.bars.map((b) => b.date)).toEqual(['20261116', '20261117', '20261118', '20261119', '20261120', '20261121', '20261122'])
    expect(o.bars[0]).toMatchObject({ started: true, web: 10, app: 2, weekend: false })
    expect(o.bars[5]).toMatchObject({ weekend: true, web: 30, app: 10 })
    expect(o.max).toBe(40)
    const longer = overview(bundle, 28, NOW)
    expect(longer.notStartedDays).toBe(21)
    expect(longer.bars[0].started).toBe(false)
  })

  it('weekday vs weekend averages over counted days only', () => {
    const o = overview(bundle, 7, NOW)
    expect(o.weekdayAvg).toBe(Math.round(12 / 5))
    expect(o.weekendAvg).toBe(30) // (40 + 20) / 2
    expect(overview(bundle, 28, NOW).weekdayAvg).toBe(Math.round(12 / 5))
  })

  it('busiest part of the day', () => {
    const o = overview(bundle, 7, NOW)
    expect(o.busiest).toBe('เย็น')
    expect(o.dayParts.find((p) => p.name === 'เย็น').share).toBe(83)
  })

  it('a % change once both ranges were counted', () => {
    const later = new Date('2027-01-30T12:00:00+07:00')
    const b = { reports: { totals: [[['cur'], 60], [['prev'], 40]] } }
    expect(overview(b, 28, later).change).toBe(50)
  })

  it('empty answer: zeros only where counting ran, nothing busiest', () => {
    const o = overview({ reports: {} }, 7, NOW)
    expect(o.users).toBe(0)
    expect(o.busiest).toBeNull()
    expect(o.appShare).toBeNull()
  })

  it('the same visitor under "(not set)" is not counted again (live 16 พ.ย.: 1 คน showed as 2 a day)', () => {
    const b = {
      reports: {
        totals: [[['cur'], 1]],
        daily: [[['20261116', 'web'], 1], [['20261116', '(not set)'], 1]],
      },
    }
    const o = overview(b, 7, NOW)
    expect(o.bars[0]).toMatchObject({ web: 1, app: 0 })
    expect(o.weekdayAvg).toBe(Math.round(1 / 5))
  })

  it('error words: not connected vs failed', () => {
    expect(gaErrorText(503)).toContain('ยังไม่ได้เชื่อม')
    expect(gaErrorText(404)).toContain('ยังไม่ได้เชื่อม')
    expect(gaErrorText(502)).toContain('ดึงตัวเลขจาก Google ไม่ได้')
  })
})

describe('dates under the daily chart', () => {
  it('7 days: every day, month only on the first and where it turns', async () => {
    const { dayTicks } = await import('./gaStats.js')
    const t = dayTicks(['20261027', '20261028', '20261029', '20261030', '20261031', '20261101', '20261102'])
    expect(t.map((x) => x.label)).toEqual(['27 ต.ค.', '28', '29', '30', '31', '1 พ.ย.', '2'])
  })
  it('28 days: every 7th, counted back so today always has its date', async () => {
    const { dayTicks, dayList } = await import('./gaStats.js')
    const d = dayList(28, new Date('2026-11-17T05:00:00Z'))
    const t = dayTicks(d)
    expect(t.map((x) => x.i)).toEqual([6, 13, 20, 27])
    expect(t.at(-1).label).toBe('17')
    expect(t[0].label).toBe('27 ต.ค.')
  })
  it('90 days: every 15th, no more than 6 labels', async () => {
    const { dayTicks, dayList } = await import('./gaStats.js')
    const t = dayTicks(dayList(90, new Date('2026-11-17T05:00:00Z')))
    expect(t.length).toBe(6)
    expect(t.at(-1).i).toBe(89)
  })
})
