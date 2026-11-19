// ใบ v3/pleng#179 — "อัปเดตเพลงให้แล้วอัตโนมัติ · แก้ 6 เพลง" — what changed, and (team only) who.
//   1. changeLog.js: which part of a song changed, and the old → new lines for the team.
//   2. offlineReady.js: the device's prints carry one hash per part, so the "ดู" list can name the part;
//      a device that closed the line before #179 (whole-song prints only) still counts right.
//   3. InstallCard: the green line's "ดู" button opens the list; the team link shows only when logged in.
//   4. Changes.vue (/changes): team only; lists published-song changes with who and what.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const revs = { data: [], calls: [] }
vi.mock('../supabase.js', () => {
  const q = () => {
    const call = { eq: [], range: null }
    revs.calls.push(call)
    const b = {
      select: () => b,
      eq: (k, v) => { call.eq.push([k, v]); return b },
      order: () => b,
      in: () => b,
      limit: () => b,
      range: (a, z) => { call.range = [a, z]; return Promise.resolve({ data: revs.data.slice(a, z + 1), error: null }) },
      then: (res) => Promise.resolve({ data: [], error: null }).then(res),
    }
    return b
  }
  return { supabase: { from: q, auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getSession: async () => ({ data: { session: null } }) } } }
})

import { changedParts, changeDetails, partsOf } from '../lib/changeLog.js'
import {
  songPrints, songPrint, diffPrints, newsList, _resetOfflineStatus, refreshOfflineStatus, READY_ACK_KEY,
  readyNews, isOldAck,
} from '../lib/offlineReady.js'
import { isStandalone } from '../lib/pwaInstall.js'
import { session } from '../store.js'
import InstallCard from '../components/InstallCard.vue'
import Changes from './Changes.vue'

const RouterLink = { props: ['to'], template: '<a :href="String(to)"><slot /></a>' }
const STUBS = { global: { stubs: { RouterLink, 'router-link': RouterLink } } }

const v2 = (over = {}) => ({
  id: 'a', number: 12, title_th: 'โมเซ', title_en: '', category: 'A', theme: null, book_refs: null, scripture: null,
  content: {
    key: 'C', timeSignature: '4/4', bpm: 80,
    stanzas: [{ id: 'A', lines: ['1 2 3'] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['เชื่อ', 'ใน', 'พระ'] }],
    ...over,
  },
})

describe('changeLog — which part changed', () => {
  it('names each part on its own', () => {
    const a = v2()
    expect(changedParts(a, v2())).toEqual([])
    expect(changedParts(a, { ...v2(), title_th: 'โมเสส' })).toEqual(['ชื่อเพลง'])
    expect(changedParts(a, v2({ stanzas: [{ id: 'A', lines: ['1 2 4'] }] }))).toEqual(['ทำนอง'])
    expect(changedParts(a, v2({ key: 'D' }))).toEqual(['ทำนอง'])
    expect(changedParts(a, v2({ arrangement: [{ stanza: 'A', label: '', syllables: ['รัก', 'ใน', 'พระ'] }] }))).toEqual(['เนื้อร้อง'])
    expect(changedParts(a, v2({ footnote: 'ร้องช้า' }))).toEqual(['หมายเหตุ'])
    expect(changedParts(a, { ...v2(), category: 'B' })).toEqual(['ข้อมูลเพลง'])
  })
  it('a word note (ใบ #178) is a หมายเหตุ, not the words', () => {
    const b = v2({ arrangement: [{ stanza: 'A', label: '', syllables: ['เชื่อ*', 'ใน', 'พระ'], notes: ['คำอธิบาย'] }] })
    const c = v2({ arrangement: [{ stanza: 'A', label: '', syllables: ['เชื่อ*', 'ใน', 'พระ'], notes: ['แก้คำอธิบาย'] }] })
    expect(changedParts(b, c)).toEqual(['หมายเหตุ'])
    expect(changeDetails(b, c)).toEqual(['แก้หมายเหตุของคำในข้อ 1'])
  })
  it('English / 中文 words added by the AI (ใบ #177) read as เนื้อภาษาอื่น, not a Thai edit', () => {
    const en = v2({
      arrangement: [{ stanza: 'A', label: '', syllables: ['เชื่อ', 'ใน', 'พระ'], lyrics: { en: ['I', 'be-', 'lieve'], zh: ['信', '', '主'] } }],
      langVerified: { en: false },
    })
    const withTitle = { ...en, title_en: 'Moses' }
    expect(changedParts(v2(), withTitle)).toEqual(['เนื้อภาษาอื่น'])
    const d = changeDetails(v2(), withTitle)
    expect(d).toContain('เพิ่มเนื้ออังกฤษในข้อ 1: “I be- lieve”')
    expect(d).toContain('เพิ่มเนื้อจีนในข้อ 1: “信 主”')
    expect(d.join(' ')).not.toContain('แก้เนื้อข้อ')
    expect(d).toContain('ชื่ออังกฤษ: (ว่าง) → “Moses”')
  })
  it('old v1 songs say เนื้อหาเพลง (notes and words share one place)', () => {
    const a = { id: 'b', title_th: 'x', content: { lines: [[{ type: 'segment', note: '1', lyric: 'ก' }]] } }
    const b = { id: 'b', title_th: 'x', content: { lines: [[{ type: 'segment', note: '1', lyric: 'ข' }]] } }
    expect(changedParts(a, b)).toEqual(['เนื้อหาเพลง'])
    expect(changeDetails(a, b)).toEqual(['แก้บรรทัด 1'])
  })
  it('details say old → new, in words', () => {
    const d = changeDetails(v2(), {
      ...v2({ key: 'D', arrangement: [{ stanza: 'A', label: 'สร้อย', syllables: ['รัก', 'ใน', 'พระ'] }] }),
      title_th: 'โมเสส',
    })
    expect(d).toContain('ชื่อเพลง: “โมเซ” → “โมเสส”')
    expect(d).toContain('คีย์: C → D')
    expect(d).toContain('แก้เนื้อสร้อย: “เชื่อในพระ” → “รักในพระ”')
    expect(changeDetails(null, v2())).toEqual(['เพิ่มเพลงเข้าคลัง'])
    expect(changeDetails(v2(), null)).toEqual(['ถอนเพลงออกจากคลัง'])
    expect(changeDetails(v2(), v2())).toEqual([])
  })
  it('partsOf ignores fields a reader never sees', () => {
    expect(partsOf({ ...v2(), verified: false, review_flags: ['x'] })).toEqual(partsOf(v2()))
  })
})

describe('device prints with parts', () => {
  const ROWS = [v2(), { ...v2(), id: 'b', number: 3, title_th: 'สรรเสริญ' }]
  it('the "ดู" list names the song and the part, grouped by kind, then by number', () => {
    const before = songPrints(ROWS)
    const now = songPrints([
      v2({ stanzas: [{ id: 'A', lines: ['5'] }] }),
      { ...ROWS[1], category: 'Z', title_th: 'สรรเสริญพระเจ้า' },
      { ...v2(), id: 'c', number: 1, title_th: 'ใหม่' },
    ])
    const titles = { a: { number: 12, title: 'โมเซ' }, b: { number: 3, title: 'สรรเสริญพระเจ้า' }, c: { number: 1, title: 'ใหม่' } }
    const r = newsList(before, now, titles)
    expect(r.removed).toBe(0)
    expect(r.items).toEqual([
      { id: 'c', number: 1, title: 'ใหม่', kind: 'added', group: 'added', parts: [] },
      { id: 'a', number: 12, title: 'โมเซ', kind: 'edited', group: 'main', parts: ['ทำนอง'] },
      { id: 'b', number: 3, title: 'สรรเสริญพระเจ้า', kind: 'edited', group: 'minor', parts: ['ชื่อเพลง', 'ข้อมูลเพลง'] },
    ])
    expect(newsList(before, songPrints([ROWS[0]]), {}).removed).toBe(1)
  })
  it('whole-song prints from before #179 still compare by song', () => {
    const old = {}
    for (const r of ROWS) old[r.id] = songPrint(r) // the pre-#179 format
    expect(isOldAck(old)).toBe(true)
    expect(isOldAck(songPrints(ROWS))).toBe(false)
    expect(diffPrints(old, songPrints(ROWS))).toEqual({ added: 0, edited: 0, removed: 0 })
    const edited = songPrints([{ ...ROWS[0], title_th: 'แก้' }, ROWS[1]])
    expect(diffPrints(old, edited)).toEqual({ added: 0, edited: 1, removed: 0 })
  })
})

describe('InstallCard — "ดู" on the green line', () => {
  const ROWS = [v2(), { ...v2(), id: 'b', number: 3, title_th: 'สรรเสริญ' }]
  const probe = (rows) => async () => ({
    supported: true, online: true, swActive: true,
    samples: { expected: 1, have: 1 }, shell: { expected: 1, have: 1 },
    catalog: {
      count: rows.length, at: 1, prints: songPrints(rows),
      titles: Object.fromEntries(rows.map((r) => [r.id, { number: r.number, title: r.title_th }])),
    },
  })
  let w = null
  beforeEach(() => {
    try { localStorage.clear() } catch { /* jsdom */ }
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined })
    isStandalone.value = true
    session.value = null
  })
  afterEach(() => { if (w) w.unmount(); w = null; isStandalone.value = false; session.value = null })

  async function changedCard(rowsNow) {
    _resetOfflineStatus(probe(ROWS))
    w = mount(InstallCard, { attachTo: document.body, ...STUBS })
    await refreshOfflineStatus()
    await nextTick()
    expect(w.find('[data-test="news-see"]').exists()).toBe(false) // nothing new yet → no ดู
    await w.find('[data-test="ready-close"]').trigger('click')
    expect(localStorage.getItem(READY_ACK_KEY)).toBeTruthy()
    _resetOfflineStatus(probe(rowsNow))
    await refreshOfflineStatus()
    await nextTick()
  }

  it('lists each changed song and its part; the team link is hidden from visitors', async () => {
    await changedCard([v2({ arrangement: [{ stanza: 'A', label: '', syllables: ['รัก'] }] }), ROWS[1]])
    expect(w.find('[data-test="offline-status"]').text()).toContain('แก้โน้ตหรือเนื้อร้อง 1 เพลง')
    const see = w.find('[data-test="news-see"]')
    expect(see.text()).toBe('ดู')
    expect(see.attributes('aria-expanded')).toBe('false')
    await see.trigger('click')
    expect(see.attributes('aria-expanded')).toBe('true')
    const items = w.findAll('[data-test="news-item"]')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('12โมเซ')
    expect(w.find('[data-test="news-group-main"]').text()).toContain('แก้โน้ตหรือเนื้อร้อง 1 เพลง')
    expect(items[0].find('a').attributes('href')).toBe('/song/a')
    expect(w.find('[data-test="news-team"]').exists()).toBe(false)
    await see.trigger('click')
    expect(w.find('[data-test="news-list"]').exists()).toBe(false)
  })

  it('new and removed songs; logged in → the link to who changed what', async () => {
    session.value = { user: { id: 'u' } }
    await changedCard([ROWS[0], { ...v2(), id: 'c', number: 40, title_th: 'ใหม่' }])
    await w.find('[data-test="news-see"]').trigger('click')
    expect(w.find('[data-test="news-group-added"]').text()).toContain('เพลงใหม่ 1 เพลง')
    expect(w.find('[data-test="news-group-added"]').text()).toContain('40ใหม่')
    expect(w.find('[data-test="news-removed"]').text()).toBe('ถอนออกจากคลัง 1 เพลง')
    expect(w.find('[data-test="news-team"]').attributes('href')).toBe('/changes')
  })

  it('English / 中文 only (the AI, ใบ #177): its own group, last, never "แก้โน้ตหรือเนื้อร้อง"', async () => {
    const en = (r) => ({ ...r, title_en: 'Song', content: { ...r.content, arrangement: [{ ...r.content.arrangement[0], lyrics: { en: ['I'] } }] } })
    await changedCard([en(ROWS[0]), en(ROWS[1])])
    const t = w.find('[data-test="offline-status"]').text()
    expect(t).toContain('ใส่เนื้ออังกฤษ/จีน 2 เพลง')
    expect(t).not.toContain('แก้')
    await w.find('[data-test="news-see"]').trigger('click')
    expect(w.find('[data-test="news-group-langs"]').findAll('[data-test="news-item"]')).toHaveLength(2)
    expect(w.find('[data-test="news-group-main"]').exists()).toBe(false)
  })

  it('a device that closed the line before #179 starts afresh: no line this once, then kinds', async () => {
    const old = {}
    for (const r of ROWS) old[r.id] = songPrint(r)
    localStorage.setItem(READY_ACK_KEY, JSON.stringify(old))
    const changed = [{ ...ROWS[0], title_th: 'แก้' }, ROWS[1]]
    _resetOfflineStatus(probe(changed))
    w = mount(InstallCard, { attachTo: document.body, ...STUBS })
    await refreshOfflineStatus()
    await nextTick()
    expect(readyNews.value.changed).toBe(false)
    expect(w.find('[data-test="offline-status"]').exists()).toBe(false)
    expect(isOldAck(JSON.parse(localStorage.getItem(READY_ACK_KEY)))).toBe(false)
    _resetOfflineStatus(probe([{ ...changed[0], category: 'Z' }, ROWS[1]]))
    await refreshOfflineStatus()
    await nextTick()
    expect(w.find('[data-test="offline-status"]').text()).toContain('แก้ชื่อหรือรายละเอียด 1 เพลง')
  })

  it('✕ closes the line and the list with it', async () => {
    await changedCard([{ ...ROWS[0], title_th: 'แก้' }, ROWS[1]])
    await w.find('[data-test="news-see"]').trigger('click')
    await w.find('[data-test="ready-close"]').trigger('click')
    await nextTick()
    expect(w.find('[data-test="news-list"]').exists()).toBe(false)
    expect(w.find('[data-test="offline-status"]').exists()).toBe(false)
  })
})

describe('Changes page (/changes) — team only', () => {
  beforeEach(() => { revs.data = []; revs.calls = []; session.value = null })
  afterEach(() => { session.value = null })

  it('a visitor sees no history and nothing is read', async () => {
    const w = mount(Changes, STUBS)
    await flushPromises()
    expect(w.find('[data-test="ch-login"]').exists()).toBe(true)
    expect(revs.calls).toHaveLength(0)
    w.unmount()
  })

  it('the team sees who changed which song and what, published songs only', async () => {
    revs.data = [
      { id: 9, created_at: '2026-11-19T07:05:00Z', song_ref: 'a', entity: 'song', event: 'edit_published', actor_name: 'เปา', before: v2(), after: { ...v2({ key: 'D' }), title_th: 'โมเสส' } },
      { id: 8, created_at: '2026-11-18T03:00:00Z', song_ref: 'b', entity: 'song', event: 'edit_published', actor_name: null, actor_id: null, before: v2(), after: v2({ footnote: 'ช้า' }) },
    ]
    session.value = { user: { id: 'u' } }
    const w = mount(Changes, STUBS)
    await flushPromises()
    expect(revs.calls[0].eq).toEqual([['entity', 'song']])
    const items = w.findAll('[data-test="ch-item"]')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('โมเสส')
    expect(items[0].text()).toContain('แก้เพลงในคลัง โดย เปา')
    expect(items[0].text()).toContain('แก้ชื่อเพลง · แก้ทำนอง')
    expect(items[1].find('[data-test="ch-who"]').text()).toBe('ระบบ (ไม่มีชื่อคนแก้)')
    expect(w.findAll('.ch-day')).toHaveLength(2)
    await items[0].find('[data-test="ch-detail-btn"]').trigger('click')
    const det = items[0].find('[data-test="ch-details"]').text()
    expect(det).toContain('ชื่อเพลง: “โมเซ” → “โมเสส”')
    expect(det).toContain('คีย์: C → D')
    w.unmount()
  })
})
