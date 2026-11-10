// ใบ v1#158 — ตรวจแล้ว is per language, and the two never touch each other:
//  · saving English, editing English, ticking / unticking "English ตรวจแล้ว" never writes songs.verified (Thai)
//  · ticking Thai ตรวจแล้ว (songs.verified) never changes content.langVerified
//  · the language button carries "ยังไม่ได้ตรวจ" for the team while a language is not ตรวจแล้ว
// The supabase stub records every write so the tests prove what reached the database.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const calls = vi.hoisted(() => [])
vi.mock('../supabase.js', () => {
  const makeQuery = (table) => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) {
      q[m] = (...args) => {
        calls.push({ table, verb: m, args })
        return q
      }
    }
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: (table) => makeQuery(table),
      rpc: () => Promise.resolve({ data: null, error: null }),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import LangToggle from './LangToggle.vue'
import { session, legacy, setSongLangChoice } from '../store.js'

const TH = ['ก', 'ข', 'ค', 'ง']
const EN = ['Wait', '-ing', 'be', 'side']
const song = (verified, extra = {}) => ({
  id: 'song-2',
  number: 2,
  title_th: 'ของขวัญ',
  title_en: '',
  verified,
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3 4' }]] }],
    arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: [...TH], lyrics: { en: [...EN] } }],
    ...extra,
  },
})

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
  session.value = { user: { id: 'approver-1', email: 'a@x.com' } }
  legacy.value = false
  setSongLangChoice(['th', 'en'])
  calls.length = 0
})
const mountEd = (s, tier = 'approver') =>
  mount(EditorMode, {
    props: { song: s, tier, active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, DockKey: true, ComboSelect: true } },
  })
const inner = (w) => w.vm.$.setupState
const songWrites = () => calls.filter((c) => c.table === 'songs' && (c.verb === 'update' || c.verb === 'insert')).map((c) => c.args[0])

describe('English actions never touch Thai ตรวจแล้ว (songs.verified)', () => {
  for (const thaiVerified of [true, false]) {
    it(`edit English + tick English ตรวจแล้ว + save — Thai stays ${thaiVerified}`, async () => {
      const w = mountEd(song(thaiVerified))
      await nextTick()
      const s = inner(w)
      s.setSyl(s.arrangement[0], 0, 'Waiting', 'en')
      s.setLangVerified('en', true)
      await nextTick()
      expect(await s.saveDirect()).toBe(true)
      s.setLangVerified('en', false)
      await nextTick()
      expect(await s.saveDirect()).toBe(true)
      const writes = songWrites()
      expect(writes.length).toBe(2)
      for (const row of writes) expect(row).not.toHaveProperty('verified')
      expect(writes[0].content.langVerified).toEqual({ en: true })
      expect(writes[1].content).not.toHaveProperty('langVerified')
      expect(writes[0].content.arrangement[0].syllables).toEqual(TH)
      expect(s.verified).toBe(thaiVerified)
      w.unmount()
    })
  }
})

describe('Thai ตรวจแล้ว never touches the other languages', () => {
  it('ticking and unticking Thai writes only songs.verified; langVerified stays', async () => {
    const w = mountEd(song(false, { langVerified: { en: true } }))
    await nextTick()
    await w.find('.ed-verify').trigger('click')
    await new Promise((r) => setTimeout(r))
    await w.find('.ed-verify').trigger('click')
    await new Promise((r) => setTimeout(r))
    const writes = songWrites()
    expect(writes).toEqual([{ verified: true }, { verified: false }])
    expect(inner(w).langVerified).toEqual({ en: true })
    expect(inner(w).previewContent.langVerified).toEqual({ en: true })
    w.unmount()
  })
})

describe('"ยังไม่ได้ตรวจ" on the language button', () => {
  it('LangToggle draws the mark it is given, only on that language', () => {
    const w = mount(LangToggle, { props: { has: ['th', 'en'], marks: { en: ['ยังไม่ได้ตรวจ'] } } })
    expect(w.find('[data-mark-lang="en"]').text()).toBe('ยังไม่ได้ตรวจ')
    expect(w.find('[data-mark-lang="th"]').exists()).toBe(false)
    expect(w.find('.lang-btn[data-lang="en"]').text()).toBe('Englishยังไม่ได้ตรวจ')
  })
  it('no marks → the buttons are exactly as before', () => {
    const a = mount(LangToggle, { props: { has: ['th', 'en'] } }).html()
    const b = mount(LangToggle, { props: { has: ['th', 'en'], marks: {} } }).html()
    expect(b).toBe(a)
    expect(a).not.toContain('lang-mark')
  })
  it('the editor: marked for the team until English is ticked ตรวจแล้ว; Thai is never marked', async () => {
    const w = mountEd(song(false))
    await nextTick()
    expect(w.find('[data-mark-lang="en"]').text()).toBe('ยังไม่ได้ตรวจ')
    expect(w.find('[data-mark-lang="th"]').exists()).toBe(false)
    inner(w).setLangVerified('en', true)
    await nextTick()
    expect(w.find('[data-mark-lang="en"]').exists()).toBe(false)
    w.unmount()
  })
  it('the editor: no mark when not logged in', async () => {
    const w = mountEd(song(false), 'anon')
    await nextTick()
    expect(w.find('.lang-mark').exists()).toBe(false)
    w.unmount()
  })
})
