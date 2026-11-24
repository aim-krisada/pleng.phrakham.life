// ใบ v3/pleng#183 — แก้ไข › จัดการ › สร้างเพลงใหม่จากทำนองนี้: the editor hands the melody up, and the
// new editor opens it as a brand-new song with every word box empty.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const H = vi.hoisted(() => ({ rpc: null, updates: [] }))

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'delete', 'limit']) q[m] = () => q
    q.update = (row) => {
      H.updates.push(row)
      return q
    }
    q.single = () => Promise.resolve({ data: { id: 'x' }, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      rpc: (name, args) => {
        H.rpc = { name, args }
        return Promise.resolve({ data: 'published-song-1', error: null })
      },
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import { shellMenu } from '../store.js'
import { songFromMelody } from '../lib/copyMelody.js'

const song = {
  id: 'song-1',
  number: 12,
  title_th: 'เพลงต้นแบบ',
  title_en: '',
  category: 'dek-lek',
  theme: '',
  verified: true,
  review_flags: [],
  content: {
    version: 2,
    key: 'G',
    timeSignature: '3/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'G', note: '1 2 3' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['พระ', 'เจ้า', 'ดี'] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  shellMenu.value = null
})

const mountEd = (s) =>
  mount(EditorMode, {
    props: { song: s, tier: 'approver', active: true },
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, ComboSelect: true } },
  })

describe('ใบ#183 — สร้างเพลงใหม่จากทำนองนี้', () => {
  it('the จัดการ menu of a saved song has the item, and it hands the melody up', async () => {
    const w = mountEd(song)
    await nextTick()
    shellMenu.value = 'manage'
    await nextTick()
    const btn = document.querySelector('[data-test="from-melody"]')
    expect(btn).toBeTruthy()
    btn.click()
    await nextTick()
    const ev = w.emitted('from-melody')
    expect(ev).toBeTruthy()
    expect(ev[0][0].category).toBe('dek-lek')
    expect(ev[0][0].content.stanzas[0].lines[0][0].note).toBe('1 2 3')
    w.unmount()
  })

  it('a song not saved yet has no such item (nothing to copy from)', async () => {
    const w = mountEd(null)
    await nextTick()
    shellMenu.value = 'manage'
    await nextTick()
    expect(document.querySelector('[data-test="from-melody"]')).toBeNull()
    w.unmount()
  })

  it('the new editor holds a NEW song: same melody, empty words, no title, no number', async () => {
    const src = mountEd(song)
    await nextTick()
    const payload = { content: src.vm.previewContent, category: 'dek-lek', theme: '' }
    src.unmount()

    const w = mountEd(songFromMelody(payload))
    await nextTick()
    expect(w.vm.editingId).toBe(null)
    expect(w.vm.meta.title_th).toBe('')
    expect(w.vm.meta.number).toBe(null)
    expect(w.vm.meta.category).toBe('dek-lek')
    const c = w.vm.previewContent
    expect(c.key).toBe('G')
    expect(c.timeSignature).toBe('3/4')
    expect(c.stanzas[0].lines[0][0]).toMatchObject({ chord: 'G', note: '1 2 3' })
    expect(c.arrangement[0]).toMatchObject({ stanza: 'A', label: 'ร้อง 1', syllables: ['', '', ''] })
    w.unmount()
  })
})
