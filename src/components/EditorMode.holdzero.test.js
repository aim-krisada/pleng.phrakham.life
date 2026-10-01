// ใบ v3/pleng#97 — the editor's 𝄐 chip (– N +) steps the hold down to 0, stops there, and a saved 0
// comes back as 0 (never bounced to 0.5 or the default 2). The tiny editor-only badge reads 𝄐0.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

function songWith(segment) {
  return {
    id: 'song-h0', number: 97, title_th: 'ยืดเสียง 0', title_en: '',
    content: {
      version: 2, key: 'C', timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [[segment]] }],
      arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
    },
  }
}
function mountEditor(song) {
  return mount(EditorMode, { props: { song, tier: 'approver', active: true }, attachTo: document.body, global: { stubs: { Icon: true } } })
}
const firstSeg = (w) => w.emitted('change').at(-1)[0].content.stanzas[0].lines[0].find((it) => it.type === 'segment')
const chip = () => document.querySelector('.fermata-chip')
const minus = () => document.querySelector('.fermata-chip button[aria-label="ค้างสั้นลง"]')
const value = () => document.querySelector('.fermata-chip .fc-value').textContent.trim()

async function openChip(w) {
  const box = w.findAll('.note-boxes input.note-box').find((b) => b.element.value.includes('^'))
  await box.trigger('focus')
  await nextTick()
  await nextTick()
  expect(chip()).not.toBeNull()
}
async function tapMinus(times) {
  for (let i = 0; i < times; i++) {
    minus().click()
    await nextTick()
  }
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})

describe('ใบ#97 เสร็จเมื่อ 1 — the – button steps down to 0 and stops', () => {
  it('a fresh 𝄐 starts at 2; four taps of – reach 0; – is then disabled and a 5th tap stays 0', async () => {
    const w = mountEditor(songWith({ type: 'segment', note: '5^' }))
    await nextTick()
    await openChip(w)
    expect(value()).toBe('2')
    await tapMinus(4)
    expect(value()).toBe('0')
    expect(firstSeg(w).holds).toEqual({ 0: 0 })
    expect(minus().disabled).toBe(true)
    minus().click() // a disabled button: nothing happens
    await nextTick()
    expect(value()).toBe('0')
    expect(firstSeg(w).holds).toEqual({ 0: 0 })
  })

  it('from 0, + goes back up by half a beat', async () => {
    const w = mountEditor(songWith({ type: 'segment', note: '5^', holds: { 0: 0 } }))
    await nextTick()
    await openChip(w)
    expect(value()).toBe('0')
    document.querySelector('.fermata-chip button[aria-label="ค้างยาวขึ้น"]').click()
    await nextTick()
    expect(value()).toBe('0.5')
    expect(minus().disabled).toBe(false)
  })
})

describe('ใบ#97 เสร็จเมื่อ 3 — a saved 0 reopens as 0', () => {
  it('load {0: 0} → serialize → load again: still 0, the chip and the badge both say 0', async () => {
    const w = mountEditor(songWith({ type: 'segment', note: '5^', holds: { 0: 0 } }))
    await nextTick()
    const saved = firstSeg(w)
    expect(saved.holds).toEqual({ 0: 0 }) // not dropped, not 0.5
    w.unmount()

    const w2 = mountEditor(songWith(saved)) // reopen exactly what was saved
    await nextTick()
    expect(firstSeg(w2).holds).toEqual({ 0: 0 })
    expect(w2.find('.note-boxes .note-hold').text()).toBe('𝄐0')
    await openChip(w2)
    expect(value()).toBe('0')
  })
})

describe('ใบ#97 เสร็จเมื่อ 4 — nothing else changes', () => {
  it('a stored 1.5 stays 1.5 · a fresh 𝄐 still shows the default 2', async () => {
    const w = mountEditor(songWith({ type: 'segment', note: '5^ 3^', holds: { 0: 1.5 } }))
    await nextTick()
    expect(firstSeg(w).holds).toEqual({ 0: 1.5 })
    expect(w.findAll('.note-boxes .note-hold').map((b) => b.text())).toEqual(['𝄐1.5', '𝄐2'])
  })
})
