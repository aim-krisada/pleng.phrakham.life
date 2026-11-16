// ใบ v3/pleng#163 · #170 — หน้าสถิติ: team only, and the team-drafts card reads our own drafts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'

const answer = vi.hoisted(() => ({ value: { data: [], error: null } }))
// ga-stats function: not deployed yet by default (404)
const gaAnswer = vi.hoisted(() => ({ value: { data: null, error: { context: { status: 404 } } } }))
const invoked = vi.hoisted(() => [])
vi.mock('../supabase.js', () => {
  const q = {}
  for (const m of ['from', 'select', 'order']) q[m] = () => q
  q.then = (res) => Promise.resolve(answer.value).then(res)
  return {
    supabase: {
      from: () => q,
      functions: { invoke: (name, opts) => (invoked.push([name, opts]), Promise.resolve(gaAnswer.value)) },
    },
  }
})

import Stats from './Stats.vue'
import { session, profile } from '../store.js'

const ago = (n) => new Date(Date.now() - n * 86400000).toISOString()
const mountIt = async () => {
  const w = mount(Stats, { global: { stubs: { RouterLink: RouterLinkStub } } })
  await flushPromises()
  return w
}

beforeEach(() => {
  session.value = null
  profile.value = null
  answer.value = { data: [], error: null }
  gaAnswer.value = { data: null, error: { context: { status: 404 } } }
  invoked.length = 0
})

describe('Google numbers (ใบ v3/pleng#164)', () => {
  it('logged out: the function is never called', async () => {
    await mountIt()
    expect(invoked).toHaveLength(0)
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

describe('หน้าสถิติ', () => {
  it('logged out: no numbers, no sections', async () => {
    const w = await mountIt()
    expect(w.text()).toContain('ต้องเข้าระบบก่อน')
    expect(w.find('.st-drafts').exists()).toBe(false)
    expect(w.find('.st-range').exists()).toBe(false)
  })

  it('logged in: 3 sections, the range line, and the consent note', async () => {
    session.value = { user: { id: 'me' } }
    profile.value = { role: 'approver' }
    const w = await mountIt()
    const heads = w.findAll('.st-sec h3').map((h) => h.text())
    expect(heads).toEqual(['ภาพรวม', 'งานเพลง', 'การใช้งานแอป'])
    expect(w.find('.st-label').text()).toMatch(/\(28 วัน\)$/)
    expect(w.text()).toContain('นับเฉพาะคนที่กดยอมรับการนับ')
    await w.findAll('.st-chip')[0].trigger('click')
    expect(w.find('.st-label').text()).toMatch(/\(7 วัน\)$/)
  })

  it('Google cards say they are not connected — never a 0', async () => {
    session.value = { user: { id: 'me' } }
    const w = await mountIt()
    const wait = w.findAll('.st-wait')
    expect(wait).toHaveLength(2)
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
