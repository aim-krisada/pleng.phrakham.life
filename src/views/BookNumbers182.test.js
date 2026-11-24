// ใบ v3/pleng#182 — หน้าใส่เลขเพลงทั้งเล่ม: who sees it, and what a save writes
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const H = vi.hoisted(() => ({ updates: [], refuse: new Set(), catalog: [] }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { book: 'dek-lek' } }),
  onBeforeRouteLeave: () => {},
}))
vi.mock('../lib/catalogSource.js', () => ({
  fetchFullCatalog: () => Promise.resolve({ data: H.catalog, error: null }),
}))
vi.mock('../supabase.js', () => ({
  supabase: {
    from: (table) => ({
      update: (row) => ({
        eq: (col, id) => ({
          select: () => {
            H.updates.push({ table, row, id })
            // RLS refuses quietly: no error, no row back
            return Promise.resolve({ data: H.refuse.has(id) ? [] : [{ id }], error: null })
          },
        }),
      }),
    }),
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  },
}))

import BookNumbers from './BookNumbers.vue'
import { session, profile } from '../store.js'

let w = null
const mountIt = async () => {
  w = mount(BookNumbers)
  await flushPromises()
  return w
}

beforeEach(() => {
  if (w) w.unmount()
  w = null
  H.updates.length = 0
  H.refuse = new Set()
  H.catalog = [
    { id: 's1', number: 51, title_th: 'ข เพลง', category: 'dek-lek', verified: true },
    { id: 's2', number: 3, title_th: 'ก เพลง', category: 'dek-lek', verified: true },
    { id: 's9', number: 7, title_th: 'อนุชน', category: 'anuchon', verified: true },
  ]
  session.value = null
  profile.value = null
})

const asApprover = () => { session.value = { user: { id: 'u' } }; profile.value = { role: 'approver' } }

describe('who sees the page', () => {
  it('logged out → asks to log in, no list', async () => {
    const p = await mountIt()
    expect(p.find('[data-test="bn-login"]').exists()).toBe(true)
    expect(p.findAll('[data-test="bn-row"]').length).toBe(0)
  })
  it('an editor (not approver) → told it is for approvers, no list', async () => {
    session.value = { user: { id: 'u' } }
    profile.value = { role: 'editor' }
    const p = await mountIt()
    expect(p.find('[data-test="bn-approver"]').exists()).toBe(true)
    expect(p.findAll('[data-test="bn-row"]').length).toBe(0)
  })
  it('an approver → every song of the book, ก-ฮ, with its number in the box', async () => {
    asApprover()
    const p = await mountIt()
    const rows = p.findAll('[data-test="bn-row"]')
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('ก เพลง')
    expect(p.findAll('[data-test="bn-input"]').map((i) => i.element.value)).toEqual(['3', '51'])
  })
})

describe('saving', () => {
  it('writes only the number, only for the changed songs', async () => {
    asApprover()
    const p = await mountIt()
    const inputs = p.findAll('[data-test="bn-input"]')
    await inputs[0].setValue('12')
    expect(p.find('[data-test="bn-save"]').text()).toContain('1 เพลง')
    await p.find('[data-test="bn-save"]').trigger('click')
    await flushPromises()
    expect(H.updates).toEqual([{ table: 'songs', row: { number: 12 }, id: 's2' }])
    expect(p.find('[data-test="bn-status"]').text()).toContain('บันทึกแล้ว 1 เพลง')
    expect(p.find('[data-test="bn-save"]').attributes('disabled')).toBeDefined()
  })

  it('"ล้างเลขทุกช่อง" empties every box; saving writes "no number" for each', async () => {
    asApprover()
    const p = await mountIt()
    await p.find('[data-test="bn-clear"]').trigger('click')
    expect(p.findAll('[data-test="bn-input"]').map((i) => i.element.value)).toEqual(['', ''])
    await p.find('[data-test="bn-save"]').trigger('click')
    await flushPromises()
    expect(H.updates.map((u) => u.row)).toEqual([{ number: null }, { number: null }])
  })

  it('a duplicate is warned with the other song name, and does not block saving', async () => {
    asApprover()
    const p = await mountIt()
    await p.findAll('[data-test="bn-input"]')[0].setValue('51')
    expect(p.find('[data-test="bn-dup"]').text()).toContain('ข เพลง')
    expect(p.find('[data-test="bn-save"]').attributes('disabled')).toBeUndefined()
  })

  it('a box that is not a number blocks saving', async () => {
    asApprover()
    const p = await mountIt()
    await p.findAll('[data-test="bn-input"]')[0].setValue('ห้า')
    expect(p.find('[data-test="bn-bad"]').exists()).toBe(true)
    expect(p.find('[data-test="bn-save"]').attributes('disabled')).toBeDefined()
  })

  it('a quiet refusal from the database counts as NOT saved, and stays to retry', async () => {
    asApprover()
    H.refuse.add('s2')
    const p = await mountIt()
    await p.findAll('[data-test="bn-input"]')[0].setValue('12')
    await p.find('[data-test="bn-save"]').trigger('click')
    await flushPromises()
    expect(p.find('[data-test="bn-status"]').text()).toContain('บันทึกไม่ได้ 1 เพลง')
    expect(p.find('[data-test="bn-save"]').attributes('disabled')).toBeUndefined()
  })
})
