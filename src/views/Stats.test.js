// ใบ v3/pleng#163 · #170 — หน้าสถิติ: team only, and the team-drafts card reads our own drafts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'

const answer = vi.hoisted(() => ({ value: { data: [], error: null } }))
// ga-stats function: not deployed yet by default (404)
const gaAnswer = vi.hoisted(() => ({ value: { data: null, error: { context: { status: 404 } } } }))
const invoked = vi.hoisted(() => [])
const songRows = vi.hoisted(() => ({ value: [] }))
vi.mock('../supabase.js', () => {
  const make = (table) => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'in', 'eq', 'not']) q[m] = () => q
    q.then = (res) => Promise.resolve(table === 'songs' ? { data: songRows.value, error: null } : answer.value).then(res)
    return q
  }
  return {
    supabase: {
      from: (table) => make(table),
      functions: { invoke: (name, opts) => (invoked.push([name, opts]), Promise.resolve(gaAnswer.value)) },
    },
  }
})

import Stats from './Stats.vue'
import { session, profile } from '../store.js'

const ago = (n) => new Date(Date.now() - n * 86400000).toISOString()
let mounted = null // unmounted before each test: a page left mounted would ask again when the login changes
const mountIt = async () => {
  const w = mount(Stats, { global: { stubs: { RouterLink: RouterLinkStub } } })
  mounted = w
  await flushPromises()
  return w
}

beforeEach(() => {
  if (mounted) mounted.unmount()
  mounted = null
  session.value = null
  profile.value = null
  answer.value = { data: [], error: null }
  gaAnswer.value = { data: null, error: { context: { status: 404 } } }
  invoked.length = 0
  songRows.value = []
})

describe('Google numbers (ใบ v3/pleng#164)', () => {
  // ใบ v3/pleng#180 — a visitor asks the public door only
  it('logged out: asks the public door, never the team one', async () => {
    await mountIt()
    expect(invoked).toEqual([['ga-stats', { body: { days: 28, public: true } }]])
  })

  it('logged in but not on the team (403): falls back to the public door', async () => {
    session.value = { user: { id: 'me' } }
    gaAnswer.value = { data: null, error: { context: { status: 403 } } }
    await mountIt()
    expect(invoked.map((x) => x[1].body)).toEqual([{ days: 28 }, { days: 28, public: true }])
  })

  it('asks ga-stats for the chosen range, again when it changes', async () => {
    session.value = { user: { id: 'me' } }
    const w = await mountIt()
    expect(invoked[0]).toEqual(['ga-stats', { body: { days: 28 } }])
    await w.findAll('.st-chip')[2].trigger('click')
    await flushPromises()
    expect(invoked.at(-1)).toEqual(['ga-stats', { body: { days: 90 } }])
  })

  it('Google failing says so — never a 0', async () => {
    session.value = { user: { id: 'me' } }
    gaAnswer.value = { data: null, error: { context: { status: 502 } } }
    const w = await mountIt()
    expect(w.text()).toContain('ดึงตัวเลขจาก Google ไม่ได้ ลองใหม่ภายหลัง')
    expect(w.find('.st-overview').exists()).toBe(false)
  })

  it('draws the overview card from the answer', async () => {
    session.value = { user: { id: 'me' } }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).replace(/-/g, '')
    gaAnswer.value = {
      data: {
        fetchedAt: new Date().toISOString(),
        reports: {
          totals: [[['cur'], 1234], [['prev'], 0]],
          totalsByMode: [[['app', 'cur'], 1], [['web', 'cur'], 3]],
          daily: [[[today, 'web'], 3], [[today, 'app'], 1]],
          hours: [[['20'], 4]],
        },
      },
      error: null,
    }
    const w = await mountIt()
    const card = w.find('.st-overview')
    expect(card.exists()).toBe(true)
    expect(card.find('.st-n').text()).toBe('1,234')
    expect(card.text()).toContain('เปิดจากแอป 25%')
    expect(card.findAll('.st-bar')).toHaveLength(28)
    expect(card.find('.st-parts .top').text()).toContain('เย็น')
  })
})

describe('the other cards (ใบ v3/pleng#165–#174)', () => {
  it('fill from the answer, with song names from the catalog', async () => {
    session.value = { user: { id: 'me' } }
    songRows.value = [
      { id: 's1', number: 12, title_th: 'พระคุณ', category: 'big', content: { key: 'C' } },
      { id: 's2', number: 66, title_th: 'นามพระเยซู', category: 'big', content: { key: 'D' }, deleted_at: '2026-11-10' },
    ]
    gaAnswer.value = {
      data: {
        fetchedAt: new Date().toISOString(),
        reports: {
          songs: [[['/song/s1', 'cur'], 9], [['/song/s2', 'cur'], 3]],
          searches: [[['hosanna', 'no'], 4]],
          deadEnds: [[['sing_no_notes', 's1'], 2]],
          sources: [[['line', 'referral'], 3]],
        },
      },
      error: null,
    }
    const w = await mountIt()
    await flushPromises()
    const top = w.find('.st-top')
    expect(top.text()).toContain('12. พระคุณ')
    expect(top.text()).toContain('9 ครั้ง')
    expect(top.find('li.gone').text()).toContain('ลบแล้ว') // in the trash — still ranked, faded
    expect(w.find('.st-notfound').text()).toContain('hosanna')
    expect(w.find('.st-dead').text()).toContain('เปิดฝึกร้อง แต่เพลงไม่มีโน้ต')
    expect(w.find('.st-fix').text()).toContain('ยังไม่มีโน้ตตัวเลขและคอร์ด')
    expect(w.find('.st-where').text()).toContain('LINE')
    expect(w.find('.st-features').text()).toContain('ข้อมูลยังน้อย') // 12 opens < 30
    expect(w.find('.st-from').text()).toContain('ข้อมูลยังน้อย')
  })

  it('no searches, no dead ends: they say so instead of an empty card', async () => {
    session.value = { user: { id: 'me' } }
    gaAnswer.value = { data: { fetchedAt: new Date().toISOString(), reports: {} }, error: null }
    const w = await mountIt()
    await flushPromises()
    expect(w.find('.st-notfound').text()).toContain('ยังไม่มีคนค้น')
    expect(w.find('.st-dead').text()).toContain('ยังไม่มีใครติด')
  })
})

describe('หน้าสถิติ', () => {
  // ใบ v3/pleng#180 — logged out: ภาพรวม only (top songs · where · how they came), no team sections
  it('logged out: the public part only', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).replace(/-/g, '')
    songRows.value = Array.from({ length: 12 }, (_, i) => ({ id: 's' + i, number: i + 1, title_th: 'เพลง ' + i }))
    gaAnswer.value = {
      data: {
        public: true,
        fetchedAt: new Date().toISOString(),
        reports: {
          totals: [[['cur'], 40], [['prev'], 0]],
          totalsByMode: [[['web', 'cur'], 40]],
          daily: [[[today, 'web'], 40]],
          hours: [[['20'], 40]],
          songs: [...Array.from({ length: 12 }, (_, i) => [['/song/s' + i, 'cur'], 50 - i]), [['/song/gone', 'cur'], 99]],
          regions: [[['Thailand', 'Chiang Mai'], 30]],
          sources: [[['line', 'referral'], 10]],
        },
      },
      error: null,
    }
    const w = await mountIt()
    expect(w.find('[data-test="st-public"]').exists()).toBe(true)
    expect(w.find('.st-range').exists()).toBe(true)
    expect(w.findAll('.st-sec h3').map((h) => h.text())).toEqual(['ภาพรวม'])
    expect(w.find('.st-overview').exists()).toBe(true)
    const top = w.findAll('.st-top li')
    expect(top).toHaveLength(10) // 10, and a removed song is left out
    expect(w.find('.st-top').text()).not.toContain('ลบแล้ว')
    expect(w.find('.st-where').text()).toContain('เชียงใหม่')
    expect(w.find('.st-drafts').exists()).toBe(false)
    expect(w.find('[data-test="st-summary"]').exists()).toBe(false)
    expect(w.find('[data-test="st-changes"]').exists()).toBe(false)
    expect(w.find('[data-test="tip-overview"]').exists()).toBe(false)
  })

  it('logged in: 4 sections, the range line, and the consent note', async () => {
    session.value = { user: { id: 'me' } }
    profile.value = { role: 'approver' }
    const w = await mountIt()
    const heads = w.findAll('.st-sec h3').map((h) => h.text())
    expect(heads).toEqual(['ภาพรวม', 'งานเพลง', 'การใช้งานแอป', 'คนใช้แบบไหน']) // คนใช้แบบไหน: พี่เอม 18 พ.ย. 2569
    expect(w.find('.st-label').text()).toMatch(/\(28 วัน\)$/)
    expect(w.text()).toContain('นับเฉพาะคนที่กดยอมรับการนับ')
    await w.findAll('.st-chip')[0].trigger('click')
    expect(w.find('.st-label').text()).toMatch(/\(7 วัน\)$/)
  })

  it('Google cards say they are not connected — never a 0', async () => {
    session.value = { user: { id: 'me' } }
    const w = await mountIt()
    const wait = w.findAll('.st-wait')
    expect(wait).toHaveLength(4) // ภาพรวม · งานเพลง · การใช้งานแอป · คนใช้แบบไหน
    expect(w.find('[data-test="st-summary"]').exists()).toBe(false) // no numbers → no summary to send
    for (const c of wait) expect(c.text()).not.toMatch(/\d/)
  })

  it('team drafts: counts, the 3 oldest waiting with days and a link, trash not counted', async () => {
    session.value = { user: { id: 'me' } }
    profile.value = { role: 'approver' }
    answer.value = {
      data: [
        { id: 'p1', status: 'pending', title_th: 'เพลง 66', number: 66, updated_at: ago(9) },
        { id: 'p2', status: 'pending', title_th: 'ใหม่', updated_at: ago(1) },
        { id: 'd1', status: 'draft', title_th: 'ร่าง', updated_at: ago(1) },
        { id: 't1', status: 'pending', title_th: 'ในถัง', updated_at: ago(20), deleted_at: ago(1) },
      ],
      error: null,
    }
    const w = await mountIt()
    const nums = w.findAll('.st-n').map((n) => n.text())
    expect(nums).toEqual(['1', '2', '0'])
    const rows = w.findAll('.st-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('66. เพลง 66')
    expect(rows[0].text()).toContain('9 วัน')
    expect(rows[0].findComponent(RouterLinkStub).props('to')).toBe('/studio?draft=p1')
    expect(w.text()).not.toContain('ในถัง')
    expect(w.find('.st-own').exists()).toBe(false)
  })

  it('nothing waiting says so', async () => {
    session.value = { user: { id: 'me' } }
    const w = await mountIt()
    expect(w.text()).toContain('ไม่มีงานรอตรวจ')
    expect(w.find('.st-own').exists()).toBe(true) // an editor sees only their own drafts, and is told
  })

  it('a read error says so instead of showing 0', async () => {
    session.value = { user: { id: 'me' } }
    answer.value = { data: null, error: { message: 'boom' } }
    const w = await mountIt()
    expect(w.text()).toContain('อ่านงานร่างไม่ได้')
    expect(w.find('.st-nums').exists()).toBe(false)
  })
})

// พี่เอม 18 พ.ย. 2569 — "ทำให้ดีกว่านี้อีกได้ไหม": the short summary to send, one line of advice per
// section, and คนใช้แบบไหน (new / coming back · stars · shares · text size).
describe('หน้าสถิติ — summary, advice, and คนใช้แบบไหน', () => {
  it('shows them from the numbers, and the summary can be sent', async () => {
    session.value = { user: { id: 'me' } }
    profile.value = { role: 'approver' }
    songRows.value = [{ id: 's1', number: 12, title_th: 'พระคุณ', category: 'big', content: { key: 'C' } }]
    gaAnswer.value = {
      data: {
        fetchedAt: new Date().toISOString(),
        reports: {
          totals: [[['cur'], 40], [['prev'], 0]],
          songs: [[['/song/s1', 'cur'], 9]],
          searches: [[['hosanna', 'no'], 4]],
          features: [[['star'], 6], [['share_song'], 2], [['visit_new'], 10], [['visit_back'], 25]],
          featureSongs: [[['star', 's1'], 6]],
        },
      },
      error: null,
    }
    const w = await mountIt()
    await flushPromises()
    const sum = w.find('[data-test="st-summary"]')
    expect(sum.text()).toContain('คนใช้ 40 คน')
    expect(sum.text()).toContain('เพลงที่เปิดมากสุด: 12. พระคุณ')
    expect(sum.text()).toContain('คำที่ค้นแล้วไม่เจอ: "hosanna"')
    expect(w.find('[data-test="tip-songs"]').text()).toBe('คนค้น "hosanna" แล้วไม่เจอ 4 ครั้ง ⇒ เพิ่มเพลงนี้ หรือใส่ชื่ออื่นของเพลงให้ค้นเจอ')
    expect(w.find('[data-test="tip-more"]').text()).toContain('กลับมาใช้ซ้ำ 71%')
    expect(w.find('[data-test="st-visitors"]').text()).toContain('10 เครื่อง')
    const act = w.find('[data-test="st-actions"]')
    expect(act.text()).toContain('กดดาวเก็บเพลงไว้6 ครั้ง')
    expect(act.text()).toContain('เพลงที่คนกดดาวมากที่สุด')

    const written = []
    const nav = globalThis.navigator
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async (t) => written.push(t) } } })
    try {
      await w.find('[data-test="st-send"]').trigger('click')
      await flushPromises()
    } finally {
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: nav })
    }
    expect(written[0]).toContain('สรุปการใช้เว็บเพลง')
    expect(w.find('[data-test="st-summary"]').text()).toContain('คัดลอกแล้ว')
  })
})
